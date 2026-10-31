// Corrida da Galera, regras de F1: o servidor manda no carro (autoridade) e o navegador prevê e se corrige sem tranco.
// Reconciliação (sim.js), carros dos outros (interpolação com atraso fixo) e o laço dos humanos no servidor (corrida-humanos.js).
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../public/corrida/dinamica.js");
const S = require("../public/corrida/sim.js");
const T = require("../public/corrida/pistas.js");
const F1 = require("../public/corrida/f1-regras.js");
const Equipes = require("../public/corrida/f1-equipes.js");
const Humanos = require("../corrida-humanos.js");
const Pose = require("../public/corrida/pose.js");
const { subirServidor, conectar, pedir } = require("./ajuda.js");

process.env.CORRIDA_TV_MS = "0"; // sem a transmissão de TV antes das luzes: a largada vem logo
const mclaren = Equipes.specDaEquipe("mclaren");
const tr = S.criarPista(T.PISTAS.interlagos, "interlagos");

// as entradas de teste: acelera, vira de leve de um lado e do outro e freia de vez em quando (o código de cada passo)
const entradaDoPasso = (k) => ({ gas: k % 700 < 560 ? 1 : 0, brake: k % 700 >= 600 && k % 700 < 660 ? 1 : 0, steer: Math.sin(k * 0.011) * 0.25 });

// Uma corrida de dois lados. O servidor recebe a entrada do passo k `atrasoEntrada` passos depois (a internet), manda o estado a cada
// `cadencia` passos e ele chega `atrasoAck` passos depois. `servidor` tem um carro um pouco diferente do que o navegador prevê (a
// previsão nunca é perfeita). `pausa`: de que passo a que passo o `ack` fica preso (o pico de lag) e é entregue de uma vez no fim.
function rodar({ passos = 1800, atrasoEntrada = 8, atrasoAck = 10, cadencia = 6, vmaxServidor = 1.012, pausa = null, ingenuo = false }) {
  // Isola a reconciliação da colisão com barreiras e bordas do mapa: o piloto sintético não segue o circuito.
  const tr = { ...S.criarPista(T.PISTAS.interlagos, "interlagos"), t: { ...T.PISTAS.interlagos, world: 1000000 }, wallLat: Infinity, murosEscape: null, pneus: new Int8Array(S.criarPista(T.PISTAS.interlagos, "interlagos").n) };
  const cliente = S.novo(tr, { grid: 0, f1: true, pneu: F1.pneuNovo("medio") }), srv = S.novo(tr, { grid: 0, f1: true, pneu: F1.pneuNovo("medio") });
  const specS = { ...mclaren, vmax: mclaren.vmax * vmaxServidor };
  const ambC = { spec: mclaren, voltas: 3, laps: 0, f1: true, outros: [] }, ambS = { spec: specS, voltas: 3, laps: 0, f1: true, outros: [] };
  const cod = new Int32Array(1024), hx = new Float64Array(1024), hy = new Float64Array(1024), entC = {}, entS = {};
  const desvio = { ex: 0, ey: 0, ea: 0 }, acks = [];
  let anterior = null, maiorErro = 0, maiorSalto = 0, menorAvanco = Infinity, saltos = 0, passoMax = 0;
  const estadosDoServidor = new Map();
  for (let k = 0; k < passos; k++) {
    // o navegador: prevê o passo k
    const code = S.empacotar(entradaDoPasso(k)); cod[k & 1023] = code;
    S.passo(cliente, S.desempacotar(code, entC), ambC, tr, null);
    hx[(k + 1) & 1023] = cliente.x; hy[(k + 1) & 1023] = cliente.y;
    // o servidor: anda o passo (k - atrasoEntrada), com a entrada que já chegou
    const s = k - atrasoEntrada;
    if (s >= 0) {
      S.passo(srv, S.desempacotar(cod[s & 1023], entS), ambS, tr, null);
      if ((s + 1) % cadencia === 0) acks.push({ chega: k + atrasoAck, st: JSON.parse(JSON.stringify(S.serializar(srv))) });
    }
    // os acks que chegam agora (se houver pausa, ficam presos e saem todos juntos)
    const preso = pausa && k >= pausa[0] && k < pausa[1];
    while (acks.length && acks[0].chega <= k && !preso) {
      const a = acks.shift();
      if (ingenuo) { // o jeito antigo: adota o estado do servidor, sem reaplicar as entradas que ele ainda não viu
        const antes = { x: cliente.x, y: cliente.y }; S.aplicar(cliente, a.st, tr);
        maiorSalto = Math.max(maiorSalto, Math.hypot(antes.x - cliente.x, antes.y - cliente.y));
        continue;
      }
      const r = S.reconciliar(cliente, a.st, tr, { mascara: 1023, hx, hy, passo: (car, i) => S.passo(car, S.desempacotar(cod[i & 1023], entC), ambC, tr, null) });
      if (r.erro !== Infinity) maiorErro = Math.max(maiorErro, r.erro);
      if (r.erro > S.ERRO_SALTO) { saltos++; desvio.ex = desvio.ey = desvio.ea = 0; } else { desvio.ex += r.dx; desvio.ey += r.dy; desvio.ea += r.da; }
    }
    S.decairDesvio(desvio, S.PASSO);
    // o desenho: o carro mais o desvio (o que o jogador vê); mede os saltos de um passo para o outro
    const vis = { x: cliente.x + desvio.ex, y: cliente.y + desvio.ey };
    if (anterior) {
      const dx = vis.x - anterior.x, dy = vis.y - anterior.y, passo = Math.hypot(dx, dy);
      const avanco = dx * Math.cos(cliente.a) + dy * Math.sin(cliente.a);
      if (k > 300) { passoMax = Math.max(passoMax, passo); menorAvanco = Math.min(menorAvanco, avanco); }
    }
    anterior = vis;
  }
  return { maiorErro, maiorSalto, passoMax, menorAvanco, saltos, vmax: cliente.v, cliente };
}

test("reconciliação: o erro pequeno se corrige sem salto e o carro nunca anda para trás no desenho", () => {
  const r = rodar({});
  assert.ok(r.maiorErro < 10, `erro entre a previsão e o servidor: ${r.maiorErro}`);
  assert.equal(r.saltos, 0);
  assert.ok(r.passoMax < 6, `o desenho nunca anda mais de ${r.passoMax} u por passo (um passo a 300 u/s é 2,5)`);
  assert.ok(r.menorAvanco > -1.5, `nunca volta: menor avanço de um passo ${r.menorAvanco}`);
});

test("reconciliação: a internet oscila (acks presos por 1,3 s e entregues de uma vez) e o carro não teletransporta para trás", () => {
  const preso = rodar({ pausa: [700, 856] });
  assert.ok(preso.passoMax < 6, `maior passo do desenho ${preso.passoMax}`);
  assert.ok(preso.menorAvanco > -1.5, `menor avanço ${preso.menorAvanco}`);
  assert.equal(preso.saltos, 0);
  // o jeito antigo (adotar o estado do servidor, sem reaplicar o que ele ainda não viu) mostra o bug: o carro volta no tempo
  const ingenuo = rodar({ pausa: [700, 856], ingenuo: true });
  assert.ok(ingenuo.maiorSalto > 10, `sem reaplicar as entradas o carro salta ${ingenuo.maiorSalto} u para trás`);
  // lag grande e constante também: 250 ms para ir e 250 ms para voltar
  const lento = rodar({ atrasoEntrada: 30, atrasoAck: 30 });
  assert.ok(lento.passoMax < 6 && lento.menorAvanco > -1.5 && lento.saltos === 0, JSON.stringify({ ...lento, cliente: undefined }));
});

test("reconciliação: só um erro enorme faz o carro saltar", () => {
  const c = S.novo(tr, { grid: 0, f1: true, pneu: F1.pneuNovo("medio") });
  const amb = { spec: mclaren, voltas: 3, laps: 0, f1: true, outros: [] };
  const hx = new Float64Array(1024), hy = new Float64Array(1024), cod = new Int32Array(1024);
  let st = null;
  for (let k = 0; k < 300; k++) { cod[k] = S.empacotar({ gas: 1, steer: 0 }); S.passo(c, S.desempacotar(cod[k]), amb, tr, null); hx[k + 1] = c.x; hy[k + 1] = c.y; if (k === 199) st = JSON.parse(JSON.stringify(S.serializar(c))); } // o estado verdadeiro no passo 200
  const pequeno = { ...st, x: st.x + 2 }, enorme = { ...st, x: st.x + 600, y: st.y + 100 };
  const ctx = { mascara: 1023, hx, hy, passo: (car, i) => S.passo(car, S.desempacotar(cod[i]), amb, tr, null) };
  const a = S.reconciliar(c, pequeno, tr, ctx);
  assert.ok(a.erro > 1.9 && a.erro < 2.1 && a.erro < S.ERRO_SALTO);
  assert.ok(Math.hypot(a.dx, a.dy) > 1.5 && Math.hypot(a.dx, a.dy) < 6, `a correção moveu ${Math.hypot(a.dx, a.dy)} u`);
  assert.equal(c.tick, 300, "voltou a 300 passos (reaplicou as entradas)");
  const b = S.reconciliar(c, enorme, tr, ctx);
  assert.ok(b.erro > S.ERRO_SALTO, `erro ${b.erro}`);
  // o desvio do desenho se apaga em uma fração de segundo
  const d = { ex: 5, ey: -3, ea: 0.2 };
  for (let i = 0; i < 60; i++) S.decairDesvio(d, S.PASSO);
  assert.ok(Math.abs(d.ex) < 0.1 * 5 && Math.abs(d.ey) < 0.1 * 3, `depois de 0,5 s: ${d.ex}, ${d.ey}`);
});

test("os outros carros: interpolação com atraso fixo, sem tremer nem voltar quando um pacote atrasa ou se perde", () => {
  // o outro carro anda reto a 250 u/s; o servidor manda a posição a cada 50 ms, mas alguns pacotes chegam atrasados ou nunca chegam
  const amostra = (t) => ({ t, x: 100 + 0.25 * (t - 1000), y: 50, z: 0, a: 0, v: 250 });
  const buf = [];
  const chegada = (t) => t + ((t / 50) % 7 === 0 ? 400 : 40); // um pacote em cada sete chega 400 ms depois
  const perdido = (t) => (t / 50) % 11 === 5;
  const todos = []; for (let t = 1000; t <= 4000; t += 50) if (!perdido(t)) todos.push({ ...amostra(t), chega: chegada(t) });
  let x0 = null, pior = 0, voltou = 0, maiorPasso = 0;
  for (let agora = 1300; agora < 4000; agora += 8) { // o relógio do jogo anda de 8 em 8 ms
    for (const a of todos) if (a.chega <= agora && a.chega > agora - 8) { const ult = buf[buf.length - 1]; if (!ult || a.t > ult.t) buf.push(a); else { const i = buf.findIndex((b) => b.t > a.t); buf.splice(i < 0 ? buf.length : i, 0, a); } } // (se vier fora de ordem, entra no lugar)
    if (!buf.length) continue;
    const r = S.amostraEm(buf, agora - S.ATRASO, {});
    if (x0 !== null) { const passo = r.x - x0; maiorPasso = Math.max(maiorPasso, passo); if (passo < -0.001) voltou++; pior = Math.min(pior, passo); }
    x0 = r.x;
  }
  assert.equal(voltou, 0, `o carro andou para trás ${voltou} vezes (pior ${pior})`);
  assert.ok(maiorPasso < 0.25 * 8 * 2.2, `o maior passo em 8 ms foi ${maiorPasso} u (a 250 u/s é ${0.25 * 8})`);
  // depois da última amostra segue na direção por até 0,2 s e depois para
  const b = [amostra(1000), amostra(1050)];
  assert.ok(Math.abs(S.amostraEm(b, 1050 + 100, {}).x - (b[1].x + 250 * 0.1)) < 1e-6);
  assert.ok(Math.abs(S.amostraEm(b, 1050 + 900, {}).x - (b[1].x + 250 * S.EXTRAPOLA)) < 1e-6);
  assert.equal(S.amostraEm(b, 900, {}).x, b[0].x, "antes da primeira amostra: fica nela");
  // o ângulo interpola pelo caminho curto
  const g = [{ t: 0, x: 0, y: 0, z: 0, a: 3.0, v: 0 }, { t: 100, x: 0, y: 0, z: 0, a: -3.0, v: 0 }];
  assert.ok(Math.abs(Math.abs(S.amostraEm(g, 50, {}).a) - Math.PI) < 0.1);
});

// ---------- o servidor ----------
const salaDeTeste = (extra = {}) => {
  const p = { id: "a", name: "Ana", grid: 0, laps: 0, car: "equilibrado", pneu: "medio", sockets: new Set(), finish: null, dano: 0, paradas: [], bot: false };
  const room = { phase: "race", startAt: Date.now() - 20000, luzes: { espera: 1 }, config: { pista: "interlagos", regras: "f1", voltas: 3, cambio: "auto", ers: "auto" }, players: { a: p }, order: ["a"], semente: 7, direcao: null, ...extra };
  return { room, p };
};
const ganchos = () => { const g = { setores: [], batidas: [], paradas: [], registros: 0, acks: [] }; return Object.assign(g, {
  aoSetor: (r, p, s, t) => { g.setores.push({ s, t }); return true; }, aoBater: (r, p, f, tipo, chave, t) => { g.batidas.push({ f, tipo, chave, t }); return true; },
  aoParada: (r, p, d) => g.paradas.push(d), registrar: () => { g.registros++; return false; }, mandarAck: (p, ack) => g.acks.push(ack), mudou: () => {} }); };

test("servidor: anda o carro só com as entradas que o piloto mandou, na ordem, e devolve o estado verdadeiro", () => {
  const { room, p } = salaDeTeste(), h = ganchos(), agora = Date.now();
  const cod = S.empacotar({ gas: 1, steer: 0 });
  assert.equal(Humanos.entrada(room, p, { s: room.startAt + 1, t0: 0, k: [cod] }, agora), false, "largada de outra corrida: ignorada");
  assert.equal(Humanos.entrada(room, p, { s: room.startAt, t0: 0, k: "lixo" }, agora), false);
  assert.equal(Humanos.entrada(room, p, { s: room.startAt, t0: 0, k: new Array(300).fill(cod) }, agora), false, "pacote enorme: recusado");
  assert.equal(Humanos.entrada(room, p, { s: room.startAt, t0: 0, k: new Array(60).fill(cod) }, agora), true);
  Humanos.andar(room, agora + 20, h);
  assert.equal(p.sim.c.tick, 60);
  assert.ok(p.sim.c.v > 5, "andou");
  assert.ok(h.acks.length === 1 && h.acks[0].st.tk === 60 && h.acks[0].s === room.startAt, "ack com o número do último passo processado");
  // um buraco na fila (o passo 70 não chegou): o carro espera, não adivinha entrada
  Humanos.entrada(room, p, { s: room.startAt, t0: 70, k: new Array(10).fill(cod) }, agora + 30);
  Humanos.andar(room, agora + 60, h);
  assert.equal(p.sim.c.tick, 60);
  Humanos.entrada(room, p, { s: room.startAt, t0: 60, k: new Array(10).fill(cod) }, agora + 70);
  Humanos.andar(room, agora + 100, h);
  assert.equal(p.sim.c.tick, 80, "chegou o que faltava: anda tudo");
  // entradas repetidas (o navegador reenvia depois de reconectar) não andam o carro duas vezes
  Humanos.entrada(room, p, { s: room.startAt, t0: 0, k: new Array(80).fill(cod) }, agora + 110);
  Humanos.andar(room, agora + 140, h);
  assert.equal(p.sim.c.tick, 80);
});

test("servidor: quem manda passos mais rápido que o relógio espera (a velocidade é a do servidor)", () => {
  const { room, p } = salaDeTeste(), h = ganchos(), t0 = Date.now(), cod = S.empacotar({ gas: 1, steer: 0 });
  for (let i = 0; i < 10; i++) Humanos.entrada(room, p, { s: room.startAt, t0: i * 240, k: new Array(240).fill(cod) }, t0); // 20 s de entradas de uma vez
  Humanos.andar(room, t0 + 10, h);
  assert.ok(p.sim.c.tick <= Humanos.FOLGA + 2, `processou ${p.sim.c.tick} passos de uma vez (máximo ${Humanos.FOLGA})`);
  for (let t = 1; t <= 10; t++) Humanos.andar(room, t0 + t * 1000, h);
  assert.ok(p.sim.c.tick >= 10 * 120 && p.sim.c.tick <= 10 * 120 + Humanos.FOLGA + 5, `em 10 s: ${p.sim.c.tick} passos (120 por segundo)`);
});

test("servidor: os checkpoints e as batidas saem da física, com a hora do passo", () => {
  // o carro sai do grid e cruza a linha de largada (o setor 0)
  const { room, p } = salaDeTeste(), h = ganchos(), t0 = Date.now(), cod = S.empacotar({ gas: 1, steer: 0 });
  Humanos.entrada(room, p, { s: room.startAt, t0: 0, k: new Array(120).fill(cod) }, t0);
  Humanos.entrada(room, p, { s: room.startAt, t0: 120, k: new Array(120).fill(cod) }, t0);
  Humanos.andar(room, t0 + 1500, h);
  assert.ok(h.setores.length >= 1 && h.setores[0].s === 0, `setores ${JSON.stringify(h.setores)}`);
  assert.ok(h.setores[0].t <= t0 + 1500 && h.setores[0].t > t0 - 2000, "a hora do evento é a do passo, nunca no futuro");
  // no muro (Mônaco tem guard-rail): vira o volante para o lado até bater; cada raspada vira um evento "muro" com a chave "muro"
  const m = salaDeTeste({ config: { pista: "monaco", regras: "f1", voltas: 3, cambio: "auto", ers: "auto" } }), hm = ganchos(), tm = Date.now();
  const vira = S.empacotar({ gas: 1, steer: -1 });
  for (let i = 0; i < 6; i++) Humanos.entrada(m.room, m.p, { s: m.room.startAt, t0: i * 200, k: new Array(200).fill(vira) }, tm);
  for (let t = 1; t <= 12; t++) Humanos.andar(m.room, tm + t * 1000, hm);
  assert.ok(hm.batidas.length > 0 && hm.batidas.every((b) => b.tipo === "muro" && b.chave === "muro" && b.f > 0), `batidas ${hm.batidas.length}`);
});

test("servidor: quem recebeu a bandeirada é fantasma (não bate), sai da linha e desacelera; quem chega depois não bate nele", () => {
  const c = S.novo(tr, { grid: 0, f1: true }), outro = { id: "b", x: 530, y: 500, z: c.z, a: 0, v: 0, car: "equilibrado", fant: false };
  c.vx = 200; c.vy = 0; c.a = 0; c.x = 500; c.y = 500; // 200 u/s direto na traseira do outro, que está parado
  const ev = [];
  S.baterNosOutros(c, "equilibrado", [{ ...outro, fant: true }], ev);
  assert.equal(ev.length, 0, "o outro é fantasma: sem batida");
  S.baterNosOutros(c, "equilibrado", [outro], ev);
  assert.ok(ev.length === 1 && ev[0].forca > 100, "sem fantasma, a batida acontece");
  c.fant = true; ev.length = 0; const antes = c.x;
  S.baterNosOutros(c, "equilibrado", [outro], ev);
  assert.ok(ev.length === 0 && c.x === antes, "o fantasma não bate em ninguém");
  // desacelera sozinho e sai da linha de corrida
  const p0 = tr.pts[1000], f = S.novo(tr, { grid: 0, f1: true }), amb = { spec: mclaren, voltas: 3, laps: 0, f1: true, outros: [], fantasma: true };
  Object.assign(f, { x: p0.x, y: p0.y, a: Math.atan2(p0.ty, p0.tx), v: 290, marcha: 8, idx: 1000, z: p0.h });
  for (let i = 0; i < 120 * 12; i++) S.passo(f, { gas: 1 }, amb, tr, null);
  assert.ok(f.fant && f.v < 100 && f.v > 20, `o fantasma anda devagar: ${f.v}`);
  assert.ok(Math.abs(S.quadro(tr, f.x, f.y, f.idx).lat) > tr.W / 2 - 45, "saiu da linha de corrida, para a beira da pista");
});

// ---------- o servidor de verdade, com um navegador de mentira ----------
test("servidor de verdade: os acks e os snaps chegam, a previsão bate com o servidor, e pos/sector/box/batida do navegador não valem", { timeout: 60000 }, async () => {
  const srv = await subirServidor(), s = await conectar(srv.url, "/corrida");
  try {
    const r = await pedir(s, "create", { name: "Ana", config: { regras: "f1", robos: 3, classificacao: "pular", voltas: 3, pista: "interlagos" } });
    const meus = []; let snaps = 0, snapsComigo = 0;
    s.on("ack", (a) => meus.push(a)); s.on("snap", (buf) => { const d = Pose.Snap.decodificar(buf); snaps++; if (d.c.some((q) => q[0] === r.id)) snapsComigo++; }); // (o pacote é binário: pose.js)
    await pedir(s, "act", { type: "start" });
    const espera = (cond, ms = 20000) => new Promise((ok, erro) => { const t0 = Date.now(), k = setInterval(() => { if (cond()) { clearInterval(k); ok(); } else if (Date.now() - t0 > ms) { clearInterval(k); erro(new Error("tempo esgotado")); } }, 20); });
    await espera(() => s.ultimo && s.ultimo.phase === "race" && s.ultimo.startAt);
    const st = s.ultimo, eu = st.players.find((p) => p.id === r.id);
    // as ações que agora saem da física são ignoradas
    assert.equal((await new Promise((ok) => s.emit("act", { type: "sector", s: 0 }, ok))).ignored, true);
    assert.equal((await new Promise((ok) => s.emit("act", { type: "batida", forca: 200, tipo: "muro" }, ok))).ignored, true);
    assert.equal((await new Promise((ok) => s.emit("act", { type: "box", fase: "entra" }, ok))).ignored, true);
    s.emit("pos", { x: 1, y: 1, a: 0, v: 400, prog: 5000 }); // posição inventada: não vale
    // o navegador de mentira: espera as luzes apagarem, acelera 4 s e confere com o servidor
    await new Promise((ok) => setTimeout(ok, Math.max(0, st.startAt - Date.now()) + 100));
    const c = S.novo(tr, { grid: eu.grid, f1: true, pneu: S.pneuDaLargada("race", eu.pneu), box: true }), spec = T.CARROS.equilibrado;
    const cod = new Int32Array(1024), hx = new Float64Array(1024), hy = new Float64Array(1024), amb = { spec, voltas: 3, laps: 0, f1: true, outros: [], id: r.id, grid: eu.grid, semente: st.semente }, entC = {};
    const ate = Date.now() + 4500; let enviado = 0, acc = 0, ultimo = performance.now(), maiorErro = 0, nAcks = 0, ultimoTk = -1, voltouTk = false;
    await new Promise((ok) => {
      const timer = setInterval(() => {
        const agora = performance.now(), g = S.gastarTempo(acc, (agora - ultimo) / 1000); acc = g.acc; ultimo = agora;
        for (let i = 0; i < g.passos; i++) {
          const code = S.empacotar({ gas: 1, steer: 0 }); cod[c.tick & 1023] = code; amb.segurar = false;
          S.passo(c, S.desempacotar(code, entC), amb, tr, null); hx[c.tick & 1023] = c.x; hy[c.tick & 1023] = c.y;
        }
        if (enviado < c.tick) { const k = []; for (let i = enviado; i < c.tick; i++) k.push(cod[i & 1023]); s.emit("inp", { s: st.startAt, t0: enviado, k, tt: Date.now() }); enviado = c.tick; } // (tt: a hora do servidor em que o último passo terminou: aqui o relógio é o mesmo)
        while (meus.length) {
          const a = meus.shift(); nAcks++; if (a.st.tk < ultimoTk) voltouTk = true; ultimoTk = a.st.tk;
          const rr = S.reconciliar(c, a.st, tr, { mascara: 1023, hx, hy, passo: (car, i) => { S.passo(car, S.desempacotar(cod[i & 1023], entC), amb, tr, null); } });
          if (rr.erro !== Infinity) maiorErro = Math.max(maiorErro, rr.erro);
        }
        if (Date.now() > ate) { clearInterval(timer); ok(); }
      }, 4);
    });
    assert.ok(nAcks >= 40, `acks recebidos: ${nAcks}`);
    assert.ok(!voltouTk, "o número do passo nunca volta atrás");
    assert.ok(snaps >= 40, `snaps recebidos: ${snaps}`);
    assert.ok(snapsComigo >= 5 && snapsComigo < snaps / 2, `o servidor manda a posição dos outros em todo pacote e a minha (só para a torre) em um de cada quatro: ${snapsComigo} de ${snaps}`);
    const hora = await new Promise((ok) => s.emit("clock", ok)); assert.ok(Math.abs(hora - Date.now()) < 1000, "o servidor responde a hora (relógio NTP do navegador)");
    assert.ok(c.v > 150, `acelerou: ${c.v}`);
    assert.ok(maiorErro < 3, `a previsão do navegador e o servidor andaram juntos (erro máximo ${maiorErro} u)`);
    assert.ok(c.prog > 40, `e o carro de verdade andou (a posição inventada de pos não valeu): progresso ${c.prog}`);
  } finally { s.close(); await srv.parar(); }
});

test("servidor de verdade: bater no muro dá 1% de dano, sem punição de tempo, e a raspada seguida não conta antes de 4 s", { timeout: 60000 }, async () => {
  const srv = await subirServidor(), s = await conectar(srv.url, "/corrida");
  try {
    const r = await pedir(s, "create", { name: "Ana", config: { regras: "f1", robos: 0, classificacao: "pular", voltas: 3, pista: "monaco" } });
    const meus = []; s.on("ack", (a) => meus.push(a));
    await pedir(s, "act", { type: "start" });
    const espera = (cond, ms = 20000) => new Promise((ok, erro) => { const t0 = Date.now(), k = setInterval(() => { if (cond()) { clearInterval(k); ok(); } else if (Date.now() - t0 > ms) { clearInterval(k); erro(new Error("tempo esgotado")); } }, 20); });
    await espera(() => s.ultimo && s.ultimo.phase === "race" && s.ultimo.startAt);
    const st = s.ultimo; await new Promise((ok) => setTimeout(ok, Math.max(0, st.startAt - Date.now()) + 100));
    const eu = () => s.ultimo.players.find((p) => p.id === r.id), trM = S.criarPista(T.PISTAS.monaco, "monaco");
    // acelera virando sempre para o mesmo lado: bate no guard-rail e fica raspando nele
    const code = S.empacotar({ gas: 1, steer: -1 }); let enviado = 0, acc = 0, ultimo = performance.now(); const t0 = Date.now();
    await new Promise((ok) => {
      const timer = setInterval(() => {
        const agora = performance.now(), g = S.gastarTempo(acc, (agora - ultimo) / 1000); acc = g.acc; ultimo = agora;
        if (g.passos) { s.emit("inp", { s: st.startAt, t0: enviado, k: new Array(g.passos).fill(code) }); enviado += g.passos; }
        if (Date.now() - t0 > 13000) { clearInterval(timer); ok(); }
      }, 8);
    });
    await new Promise((ok) => setTimeout(ok, 300));
    const p = eu(), segundos = (13000 + 300) / 1000;
    assert.ok(p.batidas === undefined || true);
    const batidasNoLog = s.ultimo.log.filter((l) => /batida/.test(l.text));
    assert.ok(batidasNoLog.length >= 1, "bateu pelo menos uma vez");
    assert.equal(p.penal, 0); assert.equal(p.acrescimo, 0);
    assert.ok(p.dano >= 1 && p.dano <= Math.ceil(segundos / 4) + 1, `dano ${p.dano}% em ${segundos} s de raspada (uma batida a cada 4 s no máximo)`);
    assert.equal(p.dano, batidasNoLog.length, "cada batida é 1% de dano");
    assert.ok(batidasNoLog.every((l) => /dano \d+% \(sem punição de tempo\)/.test(l.text)));
  } finally { s.close(); await srv.parar(); }
});
