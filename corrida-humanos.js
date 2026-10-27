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
//  - o tempo dos eventos (checkpoint, batida, box) é o do passo em que aconteceram, não o da chegada do pacote.
const Sim = require("./public/corrida/sim.js");
const D = require("./public/corrida/dinamica.js");
const T = require("./public/corrida/pistas.js");
const Equipes = require("./public/corrida/f1-equipes.js");

const PASSO_MS = D.PASSO * 1000;
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
  const c = Sim.novo(tr, { grid: p.grid || 0, f1: true, pneu: Sim.pneuDaLargada(room.phase, p.pneu), box: !quali, tick: tick0 });
  return { serie, tr, c, fila: new Map(), inicio: agora, k0: tick0, ancora: agora - tick0 * PASSO_MS, ultimoAgora: agora, ultimoAck: 0, ultimoRegistro: 0, mudou: true, eventos: [], avisos: [], pos: null };
}
// uma mensagem `inp` do navegador: { s: a largada (room.startAt), t0: o passo da primeira entrada, k: [entradas empacotadas] }
function entrada(room, p, d, agora = Date.now()) {
  if (!d || typeof d !== "object" || !Array.isArray(d.k) || d.k.length > 240 || !Number.isInteger(d.t0) || d.t0 < 0 || d.s !== room.startAt) return false;
  if (room.config.regras !== "f1" || (room.phase !== "race" && room.phase !== "quali")) return false;
  if (room.phase === "quali" && (room.quali.pausaAte || !room.quali.ativos.includes(p.id))) return false;
  let S = p.sim;
  if (!S || S.serie !== d.s) S = p.sim = criarSim(room, p, d.s, d.t0, agora);
  for (let i = 0; i < d.k.length; i++) {
    const tk = d.t0 + i, code = d.k[i];
    if (tk < S.c.tick || !Number.isInteger(code) || code < 0 || code > 0x7fffffff) continue; // já processado ou lixo
    if (S.fila.size >= FILA_MAX) break;
    S.fila.set(tk, code);
  }
  return true;
}
// os outros carros, para o vácuo e a batida
function outrosDe(room, p) {
  const out = [];
  for (const id of room.order) {
    const o = room.players[id]; if (!o || o === p) continue;
    const pos = o.sim ? o.sim.c : o.pos; if (!pos) continue;
    out.push({ id, x: pos.x, y: pos.y, z: pos.z || 0, a: pos.a, v: pos.v || 0, car: o.car, dnf: !!o.dnf, fant: o.finish != null || !!o.box }); // (quem recebeu a bandeirada ou está no box é fantasma: não bate)
  }
  return out;
}
// o ambiente do passo, o mesmo que fisica.js monta no navegador
function ambiente(room, p, S) {
  const d = room.direcao, quali = room.phase === "quali", amb = S.amb || (S.amb = {});
  amb.spec = specDoPiloto(p); amb.manual = room.config.cambio === "manual"; amb.dano = p.dano || 0; amb.drsZona = p.drsZona ?? -1;
  amb.safety = !!(d && d.safety); amb.setorAmarelo = d && d.amarelo ? d.amarelo.setor : -1; amb.ersAuto = room.config.ers !== "manual";
  amb.voltas = room.config.voltas; amb.laps = p.laps || 0; amb.paradas = (p.paradas || []).length; amb.semente = room.semente; amb.id = p.id; amb.grid = p.grid;
  amb.finish = p.finish; amb.dnf = !!p.dnf; amb.quali = quali; amb.fantasma = p.finish != null; amb.f1 = true;
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
    const amb = ambiente(room, p, S), outros = outrosDe(room, p), ev = S.eventos; ev.length = 0;
    amb.outros = outros;
    const antes = c.tick;
    let temEntrada = false;
    while (c.tick < limite && S.fila.has(c.tick)) {
      const code = S.fila.get(c.tick); S.fila.delete(c.tick);
      const ent = Sim.desempacotar(code, S.ent || (S.ent = {}));
      const t = S.ancora + c.tick * PASSO_MS;
      amb.amarela = amb.setorAmarelo === Math.floor(c.idx / (S.tr.n / T.SECTORS));
      amb.segurar = room.luzes ? t < room.startAt && !ent.gas : t < room.startAt; // as luzes: o freio de mão segura até alguém acelerar
      amb.fantasma = p.finish != null; amb.finish = p.finish; amb.dnf = !!p.dnf;
      Sim.passo(c, ent, amb, S.tr, ev);
      temEntrada = true;
      if (ev.length) { for (const e of ev) mudou = tratar(room, p, S, e, t, h) || mudou; ev.length = 0; }
    }
    if (!temEntrada) continue;
    // o relógio dos passos: a âncora só desce quando o piloto está em dia (as rajadas atrasadas não a empurram)
    S.ancora = Math.min(S.ancora + (agora - S.ultimoAgora) * 0.0005, agora - (c.tick - 1) * PASSO_MS); S.ultimoAgora = agora;
    const quando = Math.min(agora, S.ancora + c.tick * PASSO_MS);
    // as batidas entre carros (uma conferência por rodada): cada um empurra só o seu carro; quem recebeu a bandeirada não bate
    if (corrida && p.finish == null && !p.box && !p.dnf) {
      Sim.baterNosOutros(c, p.car, outros, ev);
      for (const e of ev) mudou = tratar(room, p, S, e, quando, h) || mudou; ev.length = 0;
    }
    const pos = { x: c.x, y: c.y, z: c.z, a: c.a, v: c.v, prog: c.prog, at: agora };
    S.pos = pos; S.mudou = true;
    if (agora - S.ultimoRegistro >= REGISTRO_MS) { S.ultimoRegistro = agora; mudou = h.registrar(room, p, pos, quando) || mudou; }
    if (agora - S.ultimoAck >= ACK_MS) { S.ultimoAck = agora; S.mudou = false; h.mandarAck(p, { s: S.serie, st: Sim.serializar(c), ev: S.avisos.length ? S.avisos.splice(0) : undefined }); }
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
      if (e.forca > 40) (S.avisos || (S.avisos = [])).push({ t: "carro", forca: Math.round(e.forca) }); // o navegador toca a batida
      return mudou;
    }
    case "box":
      if (e.fase === "entra") { p.box = { entrou: t, volta: e.volta }; return true; }
      p.box = null; h.aoParada(room, p, { composto: e.composto, tempo: e.tempo, volta: e.volta }); return true;
    default: return false;
  }
}
// a posição de todos os carros, para desenhar os outros (20 vezes por segundo): [id, x, y, z, a, v, prog]
const R = (v, k) => Math.round(v * k) / k;
function snap(room) {
  const c = [];
  for (const id of room.order) {
    const p = room.players[id]; if (!p || p.dnf) continue;
    let q = p.sim ? p.sim.pos || p.sim.c : p.pos;
    if (!q && !p.bot && (room.phase === "race" || (room.phase === "quali" && room.quali && room.quali.ativos.includes(id)))) { // humano que ainda não mandou entrada: está no grid
      const tr = pistaDe(room), v = Sim.vagaDoGrid(tr.pts, p.grid || 0, tr.W, true);
      q = { x: v.x, y: v.y, z: tr.pts[v.idx].h, a: v.a, v: 0, prog: v.idx - tr.n };
    }
    if (!q) continue;
    c.push([id, R(q.x, 100), R(q.y, 100), R(q.z || 0, 10), R(q.a, 1000), R(q.v || 0, 10), R(q.prog ?? p.pos?.prog ?? 0, 10)]);
  }
  return c;
}

module.exports = { entrada, andar, snap, specDoPiloto, criarSim, outrosDe, ambiente, FOLGA, PASSO_MS, ACK_MS };
