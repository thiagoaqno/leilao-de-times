// Corrida da Galera — os pilotos humanos nas regras de F1: o SERVIDOR é a autoridade.
// O navegador não manda mais a posição do carro; manda o que o piloto apertou em cada passo da física (`inp`: a entrada
// empacotada de cada 1/120 s, em ordem). O servidor anda o carro com a mesma física do navegador (public/corrida/sim.js e
// dinamica.js), conta os checkpoints, as batidas e as paradas, e devolve a cada ~50 ms o estado verdadeiro (`ack`), com o
// número do último passo que processou. O navegador prevê com a mesma física e se corrige aos poucos (fisica.js).
//
// Regras do servidor:
//  - o carro só anda com as entradas que o piloto mandou, na ordem: se a internet engasga, o carro espera as entradas e,
//    quando elas chegam, anda tudo de uma vez (nada de adivinhar entrada, que depois teria que ser desfeita);
//  - quem manda passos mais rápido que o relógio (mais de FOLGA passos adiantados) espera: a velocidade é a do servidor;
//  - o tempo dos eventos (checkpoint, batida, box) é o do passo em que aconteceram, não o da chegada do pacote;
//  - a batida entre carros acontece em CADA passo (nada de conferir só no fim do pacote), varrendo o caminho do passo, com os outros
//    carros na hora daquele passo (corrida-contato.js), e troca momento de verdade (sim.js: contatoCom);
//  - a HORA REAL de cada passo vem do navegador (`tt` no `inp`: a hora do servidor, pelo relógio NTP dele, em que o último passo do pacote
//    terminou), e não do momento em que o pacote chegou: a chegada soma a ida pela rede, e dois pilotos com pings diferentes eram
//    comparados em horas diferentes. O servidor só confere que a hora é possível (não vem do futuro nem de muito tempo atrás) e que só cresce.
const Sim = require("./public/corrida/sim.js");
const D = require("./public/corrida/dinamica.js");
const T = require("./public/corrida/pistas.js");
const Equipes = require("./public/corrida/f1-equipes.js");
const F1 = require("./public/corrida/f1-regras.js"); // o clima: a água na pista de cada hora
const Contato = require("./corrida-contato.js"); // as batidas entre carros, a cada passo (histórico dos carros e impulsos)
const Pose = require("./public/corrida/pose.js"); // a pose dos outros carros (o pacote binário de posições)

const PASSO_MS = D.PASSO * 1000;
const QUEIMA_FOLGA_MS = 150; // folga do relógio: acelerar nos últimos 150 ms antes das luzes apagarem não conta como queimar a largada
const FOLGA = 90;          // quantos passos (0,75 s) à frente do relógio um piloto pode estar (a latência da rede cabe aqui)
const FILA_MAX = 1500;     // o máximo de entradas esperando (12 s)
const ACK_MS = 40;         // de quanto em quanto tempo cada piloto recebe o estado verdadeiro
const REGISTRO_MS = 50;    // de quanto em quanto tempo a direção de prova olha o carro (DRS, limites, bandeiras)

// o carro de cada um: o da equipe (p.spec) ou um dos cinco; quebrado, anda no modo de emergência (o mesmo de estado.js)
function specDoPiloto(p) {
  const base = p.spec || T.CARROS[p.car] || T.CARROS.equilibrado;
  return p.quebrou ? { ...base, vmax: base.vmax * Equipes.EMERGENCIA, acc: base.acc * 0.5 } : base;
}
const pistaDe = (room) => Sim.criarPista(T.PISTAS[room.config.pista], room.config.pista);

// A simulação de um piloto: o estado do carro, a fila de entradas e o relógio dos passos.
function criarSim(room, p, serie, tick0, agora) {
  const tr = pistaDe(room), quali = room.phase === "quali";
  // (na classificação o pneu depende da água na pista quando a sessão abre: `serie` é a hora de abertura, `room.startAt`)
  const c = Sim.novo(tr, { grid: p.grid || 0, f1: true, pneu: Sim.pneuDaLargada(room.phase, p.pneu, F1.climaEm(room.clima, serie).agua), box: !quali, tick: tick0 });
  return { serie, tr, c, fila: new Map(), tfim: new Map(), tReal: 0, inicio: agora, k0: tick0, ancora: agora - tick0 * PASSO_MS, ultimoAgora: agora, ultimoAck: 0, ultimoRegistro: 0, mudou: true, eventos: [], avisos: [], pos: null };
}
const TT_PASSADO_MS = 1500, TT_FUTURO_MS = 8; // a hora do passo: no máximo 1,5 s antes da chegada do pacote e nunca depois dela (com folga de 8 ms para o relógio do navegador)
// uma mensagem `inp` do navegador: { s: a largada (room.startAt), t0: o passo da primeira entrada, k: [entradas empacotadas], tt: a hora do
// servidor (ms, pelo relógio NTP do navegador) em que o último passo do pacote terminou }
function entrada(room, p, d, agora = Date.now()) {
  if (!d || typeof d !== "object" || !Array.isArray(d.k) || d.k.length > 240 || !Number.isInteger(d.t0) || d.t0 < 0 || d.s !== room.startAt) return false;
  if (room.config.regras !== "f1" || (room.phase !== "race" && room.phase !== "quali")) return false;
  if (room.phase === "quali" && (room.quali.pausaAte || !room.quali.ativos.includes(p.id))) return false;
  let S = p.sim;
  if (!S || S.serie !== d.s) S = p.sim = criarSim(room, p, d.s, d.t0, agora);
  const n = d.k.length;
  let tt = Number.isFinite(d.tt) ? d.tt : null; // a hora real do último passo do pacote: possível ou ignorada (sem ela vale a hora da chegada, como antes)
  if (tt != null) { if (tt > agora + TT_FUTURO_MS) tt = agora + TT_FUTURO_MS; if (tt < agora - TT_PASSADO_MS) tt = null; }
  for (let i = 0; i < n; i++) {
    const tk = d.t0 + i, code = d.k[i];
    if (tk < S.c.tick || !Number.isInteger(code) || code < 0 || code > 0x7fffffff) continue; // já processado ou lixo
    if (S.fila.size >= FILA_MAX) break;
    S.fila.set(tk, code);
    if (tt != null) S.tfim.set(tk, tt - (n - 1 - i) * PASSO_MS);
    if (!(tk <= S.ultimoTk)) S.ultimoTk = tk; // o passo mais novo que chegou: é o "agora" do navegador
  }
  return true;
}
// os outros carros, para o vácuo e a batida
function outrosDe(room, p) {
  const out = [];
  for (const id of room.order) {
    const o = room.players[id]; if (!o || o === p) continue;
    const pos = o.sim ? o.sim.c : o.pos; if (!pos) continue;
    out.push({ id, x: pos.x, y: pos.y, z: pos.z || 0, a: pos.a, v: pos.v || 0, car: o.car, dnf: !!o.dnf, fant: o.finish != null || Contato.fantasmaDoBox(o) }); // (quem recebeu a bandeirada ou está no box, ou acabou de sair dele, é fantasma: não bate)
  }
  return out;
}
// o ambiente do passo, o mesmo que fisica.js monta no navegador
function ambiente(room, p, S, agora = Date.now()) {
  const d = room.direcao, quali = room.phase === "quali", amb = S.amb || (S.amb = {});
  amb.agua = F1.climaEm(room.clima, agora).agua; // a água na pista agora (o relógio do roteiro do clima: f1-regras.js)
  amb.spec = specDoPiloto(p); amb.manual = room.config.cambio === "manual"; amb.dano = p.dano || 0; amb.drsZona = p.drsZona ?? -1;
  amb.safety = !!(d && d.safety); amb.setorAmarelo = d && d.amarelo ? d.amarelo.setor : -1; amb.ersAuto = room.config.ers !== "manual";
  amb.voltas = room.config.voltas; amb.laps = p.laps || 0; amb.paradas = (p.paradas || []).length; amb.semente = room.semente; amb.id = p.id; amb.grid = p.grid;
  amb.finish = p.finish; amb.dnf = !!p.dnf; amb.quali = quali; amb.fantasma = p.finish != null; amb.f1 = true;
  amb.jogos = F1.jogosRestantes(p); // (os jogos de pneu: a recomendação do menu do box usa os mesmos nos dois lados)
  amb.stopGo = p.stopGo ? p.stopGo.s : 0; // stop-and-go pendente: a próxima visita ao box é só ele (segundos parado, sem trocar o pneu)
  return amb;
}
// Anda todos os pilotos humanos do `room` com as entradas que já chegaram. `h`: os ganchos do jogo (corrida.js):
//   aoSetor(room, p, s, quando) · aoBater(room, p, forca, tipo, chave, quando) · aoParada(room, p, { composto, tempo, volta }) ·
//   registrar(room, p, pos, quando) · mandarAck(p, ack) · mudou() (algo do estado público mudou: manda o estado)
function andar(room, agora, h) {
  if (room.config.regras !== "f1" || (room.phase !== "race" && room.phase !== "quali")) return;
  let mudou = false;
  const corrida = room.phase === "race";
  for (const id of room.order) {
    const p = room.players[id]; if (!p || p.bot || !p.sim) continue;
    const S = p.sim, c = S.c;
    if (S.serie !== room.startAt) { delete p.sim; continue; } // largada nova: a simulação velha não vale
    if (room.phase === "quali" && (room.quali.pausaAte || !room.quali.ativos.includes(p.id))) continue;
    const limite = S.k0 + Math.floor((agora - S.inicio) / PASSO_MS) + FOLGA;
    const amb = ambiente(room, p, S, agora), outros = outrosDe(room, p), ev = S.eventos; ev.length = 0;
    amb.outros = outros;
    const antes = c.tick;
    let temEntrada = false;
    // antes das luzes o carro está parado no grid, então o relógio dos passos pode saltar para a hora real sem mudar nada: se
    // o navegador perdeu passos (um engasgo na montagem da pista, na transmissão de TV ou na aba escondida), a âncora velha
    // deixava o servidor achando que as luzes ainda não tinham apagado e segurava o carro (só o volante mexia)
    if (S.ultimoTk != null && S.ancora + c.tick * PASSO_MS < room.startAt) S.ancora = Math.max(S.ancora, agora - (S.ultimoTk + 1) * PASSO_MS);
    while (c.tick < limite && S.fila.has(c.tick)) {
      const code = S.fila.get(c.tick); S.fila.delete(c.tick);
      const ent = Sim.desempacotar(code, S.ent || (S.ent = {}));
      const t = S.ancora + c.tick * PASSO_MS;
      amb.amarela = amb.setorAmarelo === Math.floor(c.idx / (S.tr.n / T.SECTORS));
      amb.segurar = t < room.startAt; // o carro fica parado no grid até as luzes apagarem: o acelerador antes disso não move nada
      if (room.luzes && ent.gas && t < room.startAt - QUEIMA_FOLGA_MS && t >= room.startAt - (4 + room.luzes.espera) * 1000) p.gasNasLuzes = (p.gasNasLuzes || 0) + PASSO_MS; else if (!ent.gas) p.gasNasLuzes = 0; // (a direção de prova pune quem acelera com as luzes acesas: queimou a largada)
      amb.fantasma = p.finish != null; amb.finish = p.finish; amb.dnf = !!p.dnf;
      // com o pedido de box feito e a menos de 2 s da entrada do corredor, o carro já é fantasma (ninguém bate em quem está entrando)
      const cor = S.tr.corredor;
      if (cor && ent.pedido && !p.box && !c.air && amb.finish == null && (amb.laps || 0) + 1 < (amb.voltas || 1) && !amb.quali && (S.tr.n - ((c.idx - cor.i0 + S.tr.n) % S.tr.n)) % S.tr.n * 6 < Math.max(c.v, 60) * Contato.BOX_FANTASMA_MS / 1000) p.boxFant = Math.max(p.boxFant || 0, t + 250);
      Sim.passo(c, ent, amb, S.tr, ev);
      // a batida deste passo (sob safety car o pelotão se comprime: sem batida; na classificação cada um faz a sua volta)
      const k = c.tick - 1; // (o passo que acabou de andar)
      let tReal = S.tfim.get(k); S.tfim.delete(k);
      if (tReal === undefined) tReal = t + PASSO_MS; // sem a hora do navegador (versão velha): a da chegada
      if (!(tReal > S.tReal)) tReal = S.tReal + 0.5; // só cresce
      S.tReal = tReal;
      Contato.depoisDoPasso(room, p, c, tReal, ev, corrida && !amb.safety && !amb.segurar && p.finish == null && !p.box && !c.box?.fase && !p.dnf);
      temEntrada = true;
      // A contagem da corrida usa a hora real validada do passo, não o relógio acumulado da simulação:
      // depois de uma travada, este pode ficar muito atrás dos bots e dar ao humano um tempo de chegada anterior ao deles.
      const tEvento = Math.min(agora, Math.max(tReal, agora - TT_PASSADO_MS));
      if (ev.length) { for (const e of ev) mudou = tratar(room, p, S, e, tEvento, h) || mudou; ev.length = 0; }
    }
    if (!temEntrada) continue;
    // o relógio dos passos: a âncora só desce quando o piloto está em dia (as rajadas atrasadas não a empurram)
    S.ancora = Math.min(S.ancora + (agora - S.ultimoAgora) * 0.0005, agora - (c.tick - 1) * PASSO_MS); S.ultimoAgora = agora;
    const quando = Math.min(agora, S.ancora + c.tick * PASSO_MS);
    const pos = { x: c.x, y: c.y, z: c.z, a: c.a, v: c.v, vx: c.vx, vy: c.vy, r: c.r, prog: c.prog, at: agora, q: quando, qr: S.tReal }; // (q: a hora do servidor, pela chegada, a que esta pose pertence: o ack e a contagem de voltas; qr: a hora REAL, pelo relógio do navegador: a batida e o desenho)
    S.pos = pos; S.mudou = true;
    if (agora - S.ultimoRegistro >= REGISTRO_MS) { S.ultimoRegistro = agora; mudou = h.registrar(room, p, pos, quando) || mudou; }
    if (agora - S.ultimoAck >= ACK_MS) { S.ultimoAck = agora; S.mudou = false; h.mandarAck(p, { s: S.serie, st: Sim.serializar(c), q: Math.round(quando), ev: S.avisos.length ? S.avisos.splice(0) : undefined }); }
  }
  if (mudou && h.mudou) h.mudou();
}
// um evento da física → as regras da sala. Devolve true se o estado público mudou.
function tratar(room, p, S, e, t, h) {
  switch (e.t) {
    case "setor": return !!h.aoSetor(room, p, e.s, t);
    case "muro": return !!h.aoBater(room, p, e.forca, "muro", "muro", t);
    case "carro": {
      const mudou = !!h.aoBater(room, p, e.forca, "carro", "carro:" + e.id, t);
      (S.avisos || (S.avisos = [])).push({ t: "carro", forca: Math.round(e.forca), id: e.id, k: e.k }); // o navegador toca a batida e confere com a que previu (k: o passo)
      return mudou;
    }
    case "box":
      if (e.fase === "entra") { p.box = { entrou: t, volta: e.volta }; return true; }
      p.box = null; p.boxFant = t + Contato.BOX_FANTASMA_MS; h.aoParada(room, p, { composto: e.composto, tempo: e.tempo, volta: e.volta, stopGo: !!e.stopGo, troca: !!e.troca, sg: e.sg, manter: !!e.manter }); return true;
    default: return false;
  }
}
// a posição de todos os carros, para desenhar os outros (20 vezes por segundo):
// [id, x, y, z, a, v, prog, idade, vx, vy, r]. `idade` (ms) é há quanto tempo, no relógio do servidor, o carro estava assim: o navegador
// põe a amostra na hora certa e leva o carro dali até o presente pela velocidade (vx, vy) e pela guinada (r).
const R = (v, k) => Math.round(v * k) / k;
function snap(room, agora = Date.now()) {
  const c = [];
  for (const id of room.order) {
    const p = room.players[id]; if (!p || p.dnf) continue;
    let q = p.sim ? p.sim.pos || p.sim.c : p.pos;
    if (!q && !p.bot && (room.phase === "race" || (room.phase === "quali" && room.quali && room.quali.ativos.includes(id)))) { // humano que ainda não mandou entrada: está no grid
      const tr = pistaDe(room), v = Sim.vagaDoGrid(tr.pts, p.grid || 0, tr.W, true);
      q = { x: v.x, y: v.y, z: tr.pts[v.idx].h, a: v.a, v: 0, prog: v.idx - tr.n };
    }
    if (!q) continue;
    const idade = Math.max(0, Math.min(600, Math.round((agora - (q.qr ?? q.q ?? q.at ?? agora)) * 10) / 10)); // (décimos de ms: o pacote leva a hora da pose)
    const vx = q.vx ?? Math.cos(q.a) * (q.v || 0), vy = q.vy ?? Math.sin(q.a) * (q.v || 0);
    c.push([id, R(q.x, 100), R(q.y, 100), R(q.z || 0, 10), R(q.a, 1000), R(q.v || 0, 10), R(q.prog ?? p.pos?.prog ?? 0, 10), idade, R(vx, 10), R(vy, 10), R(q.r || 0, 100)]);
  }
  return c;
}

// O que cada piloto recebe, a cada pacote (~30 ms, 33 por segundo): quem está perto (menos de RAIO_PERTO) vem em todo pacote (33/s), quem está
// a meia distância em um de cada dois (17/s) e o resto em um de cada quatro (8/s); o meu próprio registro só serve para a torre (o
// progresso oficial) e vem em um de cada quatro. `n` conta os pacotes. Quem só assiste (sem carro) recebe todos em todo pacote.
const RAIO_PERTO = 650, RAIO_MEDIO = 1800; // u (uns 135 m e 375 m)
function snapPara(lista, id, n) {
  const eu = id ? lista.find((r) => r[0] === id) : null, out = [];
  for (const r of lista) {
    if (eu && r === eu) { if (n % 4 === 0) out.push(r); continue; }
    const d = eu ? Math.hypot(r[1] - eu[1], r[2] - eu[2]) : 0, cada = d < RAIO_PERTO ? 1 : d < RAIO_MEDIO ? 2 : 4;
    if (n % cada === 0) out.push(r);
  }
  return out;
}
// o pacote binário (pose.js, Snap) com a hora `agora` do servidor
const pacote = (agora, lista) => Pose.Snap.codificar(agora, lista);

module.exports = { entrada, andar, snap, snapPara, pacote, specDoPiloto, criarSim, outrosDe, ambiente, FOLGA, PASSO_MS, ACK_MS, RAIO_PERTO, RAIO_MEDIO };
