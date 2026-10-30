// Corrida da Galera, regras de F1: a batida entre carros troca momento (sim.js, contatoPasso), varre o passo (sem túnel), deixa o
// carro instável, e os outros carros são levados ao presente (extrapolar). O servidor bate a cada passo, com os outros na hora do passo.
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../public/corrida/dinamica.js");
const S = require("../public/corrida/sim.js");
const Humanos = require("../corrida-humanos.js");

const eu = { L: 44, W: 26, massa: 800 };
const carro = (x, y, v) => { const c = D.novoCarro(x, y, 0); c.v = v; c.vx = v; c.z = 0; c.tick = 1; c.x0 = x - v / 120; c.y0 = y; c.a0 = 0; return c; };
const modelo = (x, y, vx, vy = 0, a = 0) => ({ id: "b", x, y, a, vx, vy, r: 0, L: 44, W: 26, massa: 800, z: 0 });

test("batida por trás: quem bate perde velocidade, quem é atingido ganha menos (fica protegido), e a culpa vem da velocidade de antes", () => {
  const A = carro(0, 0, 300), o = modelo(43, 0, 200), ev = [];
  S.contatoPasso(A, eu, [o], ev, null, S.PASSO);
  assert.equal(ev.length, 1);
  assert.ok(Math.abs(ev[0].forca - 100) < 1, `força ${ev[0].forca}`);
  assert.equal(ev[0].culpa, 1, "quem vinha atrás e acertou causou a batida");
  assert.ok(ev[0].pre && ev[0].pre.vx === 300 && ev[0].pre.ovx === 200, "guarda as velocidades de ANTES do impulso");
  assert.ok(A.vx < 300 && A.vx > 200, `o que bateu perdeu velocidade: ${A.vx}`);
  assert.ok(ev[0].de.dvx > 0, "o atingido ganha velocidade para a frente");
  assert.ok(ev[0].de.dvx < (300 - A.vx) * 0.5, `com culpado claro o atingido leva só uma parte do impulso (${ev[0].de.dvx} contra ${300 - A.vx})`);
  assert.ok(A.vx < 242.5, "o causador absorve mais que na troca simétrica: (300+200)/2 mais a volta de 15%");
  assert.ok(A.inst > 0.3 && A.instK > 0, "e fica instável");
});

test("batida frente a frente (os dois se aproximam): sem culpado, o momento se conserva", () => {
  const A = carro(0, 0, 300), o = modelo(43, 0, -300, 0, Math.PI), ev = [];
  S.contatoPasso(A, eu, [o], ev, null, S.PASSO);
  assert.equal(ev[0].culpa, 0);
  assert.ok(Math.abs((300 - A.vx) - ev[0].de.dvx) < 1e-6, "mesma massa: o que um perde o outro ganha");
});

test("culpaEntre: a traseira que acerta é culpada; lado a lado e quem se afasta não", () => {
  assert.equal(S.culpaEntre(300, 0, 200, 0, -1, 0), 1, "A vem atrás (o outro está à frente: n de B para A aponta para trás)");
  assert.equal(S.culpaEntre(0, 0, 300, 0, -1, 0), 0, "quem está parado ou na frente e se afasta não causa");
  assert.equal(S.culpaEntre(200, 0, 300, 0, 1, 0), -1, "o B é que vem atrás");
  assert.equal(S.culpaEntre(300, 3, 300, 0, 0, -1), 0, "toque lado a lado com 3 u/s de lado: ninguém");
  assert.equal(S.culpaEntre(300, 40, 300, 0, 0, -1), 1, "fechou a porta com 40 u/s de lado: causou");
});

test("batida de lado: empurra para o lado e gira o carro", () => {
  const A = carro(0, 0, 300), o = modelo(43, 6, 200), ev = [];
  S.contatoPasso(A, eu, [o], ev, null, S.PASSO);
  assert.ok(Math.abs(A.vy) > 3, `empurrão de lado ${A.vy}`);
  assert.ok(Math.abs(A.r) > 0.2 && Math.abs(A.r) <= 2.5, `guinada ${A.r}`);
});

test("sem túnel: dois carros a 400 u/s de frente nunca se atravessam", () => {
  for (const [vA, vB] of [[400, -400], [400, 0], [150, -300]]) {
    const A = carro(0, 0, vA), o = modelo(200, 0, vB, 0, vB < 0 ? Math.PI : 0); let bateu = false;
    for (let t = 0; t < 200 && !bateu; t++) {
      A.x0 = A.x; A.y0 = A.y; A.a0 = A.a; A.x += A.vx / 120; o.x += o.vx / 120; A.tick++;
      const ev = []; S.contatoPasso(A, eu, [o], ev, null, S.PASSO); bateu = ev.length > 0;
      assert.ok(A.x < o.x, `passo ${t}: atravessou (${A.x} contra ${o.x})`);
    }
    assert.ok(bateu, `${vA} contra ${vB}: tem que bater`);
  }
});

test("dois carros que se afastam não grudam", () => {
  const A = carro(0, 0, 150), ev = [];
  assert.equal(S.contatoPasso(A, eu, [modelo(-40, 0, -50, 0, Math.PI)], ev, null, S.PASSO), 0);
  assert.equal(ev.length, 0);
});

test("fantasma (bandeirada, box) e perda total não batem nem levam batida", () => {
  const ev = [];
  assert.equal(S.contatoPasso(carro(0, 0, 300), eu, [{ ...modelo(43, 0, 200), fant: true }, { ...modelo(43, 0, 200), dnf: true }], ev, null, S.PASSO), 0);
  const f = carro(0, 0, 300); f.fant = true;
  assert.equal(S.contatoPasso(f, eu, [modelo(43, 0, 200)], ev, null, S.PASSO), 0);
  assert.equal(ev.length, 0);
});

test("a instabilidade viaja no estado da rede e se apaga em 0,2 a 2 s conforme a força", () => {
  const leve = carro(0, 0, 100), forte = carro(0, 0, 300);
  S.contatoPasso(leve, eu, [modelo(43, 0, 70)], [], null, S.PASSO); // ~30 u/s de aproximação
  S.contatoPasso(forte, eu, [modelo(43, 0, 0)], [], null, S.PASSO); // 300
  assert.ok(leve.inst < forte.inst);
  const dur = (c) => c.inst / c.instK;
  assert.ok(dur(leve) >= 0.2 && dur(leve) < dur(forte) && dur(forte) <= 2.01, `${dur(leve)} e ${dur(forte)}`);
  const tr = S.criarPista(require("../public/corrida/pistas.js").PISTAS.interlagos, "interlagos"), n = S.novo(tr, { grid: 0, f1: true });
  Object.assign(n, { inst: forte.inst, instK: forte.instK, rIns: 0.5 });
  const copia = S.novo(tr, { grid: 0, f1: true }); S.aplicar(copia, S.serializar(n), tr);
  assert.ok(Math.abs(copia.inst - n.inst) < 1e-3 && Math.abs(copia.rIns - 0.5) < 1e-3, "serializa e aplica");
  const sem = S.novo(tr, { grid: 0, f1: true }); const ss = S.serializar(sem); assert.equal(ss.ni, undefined, "carro sem batida não gasta bytes");
});

test("o carro instável segura menos de lado e a instabilidade decai", () => {
  const tr = S.criarPista(require("../public/corrida/pistas.js").PISTAS.interlagos, "interlagos");
  const spec = require("../public/corrida/f1-equipes.js").specDaEquipe("mclaren");
  const roda = (inst) => { const c = S.novo(tr, { grid: 0, f1: true }), q = tr.pts[1000]; Object.assign(c, { x: q.x, y: q.y, a: Math.atan2(q.ty, q.tx), idx: 1000, z: q.h, v: 200, marcha: 6, inst, instK: inst / 1 });
    c.vx = Math.cos(c.a) * 200; c.vy = Math.sin(c.a) * 200;
    const amb = { spec, voltas: 3, laps: 0, f1: true, outros: [] }; let pico = 0;
    for (let i = 0; i < 120; i++) { S.passo(c, { gas: 1, steer: 0.5 }, amb, tr, null); pico = Math.max(pico, c.slip); } return { c, pico }; };
  const firme = roda(0), instavel = roda(1);
  assert.ok(instavel.pico > firme.pico, `escorrega mais: ${instavel.pico} contra ${firme.pico}`);
  assert.ok(instavel.c.inst < 0.01, "decaiu em 1 s");
});

test("outros carros no presente: extrapolar segue a velocidade e a guinada, limitado, e nunca anda para trás", () => {
  const B = { t: 1000, x: 100, y: 50, z: 0, a: 0, v: 300, vx: 300, vy: 0, r: 0.5 };
  const a = S.extrapolar(B, 1100, {});
  assert.ok(Math.abs(a.x - 130) < 1e-9 && Math.abs(a.a - 0.05) < 1e-9);
  assert.ok(Math.abs(S.extrapolar(B, 5000, {}).x - (100 + 300 * S.EXTRAPOLA_MAX)) < 1e-9, "limitado");
  assert.equal(S.extrapolar(B, 900, {}).x, 100, "antes da amostra: fica nela");
});

// ---------- o servidor: dois humanos, um alcança o outro ----------
const mk = (id, grid) => ({ id, name: id, grid, laps: 0, car: "equilibrado", pneu: "medio", sockets: new Set(), finish: null, dano: 0, paradas: [], bot: false });
const ganchos = () => { const g = { batidas: [] }; return Object.assign(g, { aoSetor: () => true, aoBater: (r, p, f, tipo, chave) => { g.batidas.push({ id: p.id, f, tipo, chave }); return true; }, aoParada() {}, registrar: () => false, mandarAck() {}, mudou() {} }); };

test("servidor: o carro rápido bate na traseira do lento, os dois sentem, e nenhum atravessa o outro", () => {
  const a = mk("a", 0), b = mk("b", 2), t0 = Date.now() + 5000, h = ganchos();
  const room = { phase: "race", startAt: t0 - 1000, luzes: { espera: 1 }, config: { pista: "interlagos", regras: "f1", voltas: 3, cambio: "auto", ers: "auto" }, players: { a, b }, order: ["a", "b"], semente: 7, direcao: null };
  const ea = [], eb = [];
  for (let k = 0; k < 1440; k++) { ea.push(S.empacotar(k < 400 ? { gas: 1 } : { brake: 1 })); eb.push(S.empacotar({ gas: 1 })); }
  for (let i = 0; i < 1440; i += 240) { Humanos.entrada(room, a, { s: room.startAt, t0: i, k: ea.slice(i, i + 240) }, t0); Humanos.entrada(room, b, { s: room.startAt, t0: i, k: eb.slice(i, i + 240) }, t0); }
  let vAntes = null, vDepois = null, ultimo = null;
  const vel = (c) => Math.hypot(c.vx, c.vy), forte = () => h.batidas.filter((x) => x.f > 20 && x.chave.startsWith("carro:")).length; // (a primeira batida forte entre os dois carros)
  for (let ms = 0; ms <= 9000; ms += 10) {
    const fortesAntes = forte();
    Humanos.andar(room, t0 + ms, h);
    if (!a.sim || !b.sim) continue;
    const A = a.sim.c, B = b.sim.c;
    if (vAntes === null && forte() > fortesAntes) { vAntes = ultimo; vDepois = { a: vel(A), b: vel(B) }; } // (a velocidade de cada um logo antes da primeira batida forte e logo depois dela)
    ultimo = { a: vel(A), b: vel(B) };
  }
  assert.ok(h.batidas.some((x) => x.id === "a" && x.chave === "carro:b") && h.batidas.some((x) => x.id === "b" && x.chave === "carro:a"), "os dois levam a batida (dano e som)");
  assert.ok(vAntes && vAntes.b > vAntes.a + 15, `antes da batida o B vinha mais rápido (${vAntes && vAntes.b} contra ${vAntes && vAntes.a})`);
  assert.ok(vDepois && vDepois.a > vAntes.a, `o atingido ganhou velocidade: ${vAntes.a} → ${vDepois.a}`);
  assert.ok(vDepois.b < vAntes.b, `o que bateu perdeu: ${vAntes.b} → ${vDepois.b}`);
});

test("servidor: o snap leva a idade da pose, a velocidade e a guinada; o ack leva a hora do servidor", () => {
  const a = mk("a", 0), t0 = Date.now() + 5000, h = ganchos(), acks = [];
  h.mandarAck = (p, ack) => acks.push(ack);
  const room = { phase: "race", startAt: t0 - 1000, luzes: { espera: 1 }, config: { pista: "interlagos", regras: "f1", voltas: 3, cambio: "auto", ers: "auto" }, players: { a }, order: ["a"], semente: 7, direcao: null };
  Humanos.entrada(room, a, { s: room.startAt, t0: 0, k: new Array(120).fill(S.empacotar({ gas: 1 })) }, t0);
  for (let ms = 0; ms <= 400; ms += 10) Humanos.andar(room, t0 + ms, h);
  const r = Humanos.snap(room, t0 + 450)[0];
  assert.equal(r.length, 11);
  assert.ok(r[7] >= 0 && r[7] <= 600, `idade ${r[7]}`);
  assert.ok(Math.hypot(r[8], r[9]) > 5, "velocidade no mundo");
  assert.ok(acks.length && Number.isFinite(acks[acks.length - 1].q), "o ack leva a hora (q) do passo");
});
