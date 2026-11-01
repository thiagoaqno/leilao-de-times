const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../public/corrida/pistas.js");
const Sim = require("../public/corrida/sim.js");
const Direcao = require("../corrida-f1-direcao.js");

test("autódromos têm barreira afastada, recortada sem invadir outros trechos; ruas preservam o muro", () => {
  for (const id of ["barcelona", "interlagos", "suzuka", "spa"]) {
    const tr = Sim.criarPista(P.PISTAS[id], id);
    assert.ok(tr.murosEscape && tr.murosEscape[1].some(Boolean), id);
    assert.ok(!tr.pneus.some(Boolean), `${id}: sem pneus genéricos colados`);
    for (const lado of [-1, 1]) for (let i = 0; i < tr.n; i += 17) if (tr.murosEscape[lado][i]) {
      const L = tr.W / 2 + tr.murosEscape[lado][i], p = tr.pts[i], x = p.x - p.ty * lado * L, y = p.y + p.tx * lado * L;
      assert.ok(tr.pts.every(q => (q.x-x)**2 + (q.y-y)**2 >= (L-12)**2 - 1e-5));
    }
  }
  for (const id of ["monaco", "baku", "jeddah", "lasvegas"]) { // (Singapura saiu da lista: seus muros são por trecho, `muros` em pistas.js)
    const tr = Sim.criarPista(P.PISTAS[id], id); assert.equal(tr.murosEscape, undefined); assert.ok(Number.isFinite(tr.wallLat));
  }
});

test("ganhar posição fora da pista recebe punição, mas sair sem ultrapassar não", () => {
  const room = { phase: "race", startAt: 0, config: { pista: "interlagos", voltas: 5 }, semente: 12, order: ["a", "b"], players: { a: { id: "a", name: "A" }, b: { id: "b", name: "B" } } };
  Direcao.iniciar(room); const n = room.direcao.pista.length;
  const pos = (i, lat) => { const p = room.direcao.pista[i]; return { x: p.x - p.ty * lat, y: p.y + p.tx * lat, prog: i, v: 100 }; };
  room.players.b.pos = pos(210, 0); const a = room.players.a, log = () => {};
  Direcao.registrar(room, a, pos(200, P.PISTAS.interlagos.width / 2 + 25), 1000, log);
  Direcao.registrar(room, a, pos(205, 0), 1100, log); assert.equal(a.penal, 0);
  Direcao.registrar(room, a, pos(206, P.PISTAS.interlagos.width / 2 + 25), 1200, log);
  Direcao.registrar(room, a, pos(215, 0), 1300, log); assert.equal(a.penal, 5); assert.equal(a.avisosLimite, 2);
});
test("carro percorre o escape e encontra a barreira afastada", () => {
  const tr = Sim.criarPista(P.PISTAS.barcelona, "barcelona"), lado = 1;
  const i = tr.pts.findIndex((p, k) => k > 50 && tr.murosEscape[lado][k] && !p.k);
  const p = tr.pts[i], nx = -p.ty, ny = p.tx, c = Sim.novo(tr, { f1: false });
  Object.assign(c, { x: p.x + nx * (tr.W / 2 + 35), y: p.y + ny * (tr.W / 2 + 35), idx: i, idxAnt: i, z: p.h,
    a: Math.atan2(ny, nx), v: 110, vx: 110 * nx, vy: 110 * ny });
  const ev = [], amb = { spec: P.CARROS.equilibrado, f1: false, outros: [], voltas: 3 };
  for (let k = 0; k < 120; k++) Sim.passo(c, { gas: 1, steer: 0 }, amb, tr, ev);
  const lat = Sim.quadro(tr, c.x, c.y, c.idx).lat;
  assert.ok(lat > tr.W / 2 + 40, `escape ficou bloqueado a ${lat}`);
  assert.ok(lat <= tr.W / 2 + 111, `atravessou o muro: ${lat}`);
  assert.ok(ev.some(e => e.t === "muro"), "houve contato físico com a barreira");
});
test("sair do asfalto reduz a velocidade do carro", () => {
  const tr = Sim.criarPista(P.PISTAS.barcelona, "barcelona"), i = 51, p = tr.pts[i], a = Math.atan2(p.ty, p.tx);
  const carro = lat => { const c = Sim.novo(tr, { f1: false }); Object.assign(c, { x: p.x - p.ty * lat, y: p.y + p.tx * lat, idx: i, idxAnt: i, z: p.h, a, v: 160, vx: p.tx * 160, vy: p.ty * 160 }); return c; };
  const asfalto = carro(0), escape = carro(tr.W / 2 + 12), amb = { spec: P.CARROS.equilibrado, f1: false, outros: [], voltas: 3 };
  for (let k = 0; k < 90; k++) for (const c of [asfalto, escape]) Sim.passo(c, { gas: 1, steer: 0 }, amb, tr, []);
  assert.ok(escape.v < asfalto.v - 5, `escape ${escape.v}, asfalto ${asfalto.v}`);
});
test("o Muro dos Campeões tem colisão no mesmo trecho desenhado", () => {
  const tr = Sim.criarPista(P.PISTAS.montreal, "montreal"), muro = P.muroCampeoes(tr.pts);
  assert.ok(muro); for (let i = muro.i0; i <= muro.i1; i++) assert.equal(tr.pneus[i], muro.lado);
});
test("a física distingue asfalto pintado, brita e grama nas faixas de Barcelona", () => {
  const tr = Sim.criarPista(P.PISTAS.barcelona, "barcelona"), m = tr.superficiesEscape, lateral = tr.W / 2 + 15;
  for (const [valor, esperado] of [[1, "brita"], [2, "asfalto"]]) {
    const lado = [-1, 1].find(s => m[s].includes(valor)); assert.ok(lado);
    const i = m[lado].indexOf(valor); assert.equal(P.superficieEscape(tr, i, lateral * lado), esperado);
    assert.equal(P.superficieEscape(tr, i, (tr.W / 2 + 60) * lado), "grama");
  }
});
test("na mesma curva, a brita desacelera mais que o asfalto pintado", () => {
  const tr = Sim.criarPista(P.PISTAS.barcelona, "barcelona"), m = tr.superficiesEscape;
  const i = tr.pts.findIndex((p, k) => !p.k && ((m[1][k] === 1 && m[-1][k] === 2) || (m[-1][k] === 1 && m[1][k] === 2)));
  assert.ok(i >= 0); const p = tr.pts[i], s = m[1][i] === 1 ? 1 : -1, lat = tr.W / 2 + 15;
  const carro = lado => { const c = Sim.novo(tr, { f1: false }); Object.assign(c, { x: p.x - p.ty * lat * lado, y: p.y + p.tx * lat * lado, idx: i, idxAnt: i, z: p.h, a: Math.atan2(p.ty, p.tx), v: 160, vx: p.tx * 160, vy: p.ty * 160 }); return c; };
  const brita = carro(s), asfalto = carro(-s), amb = { spec: P.CARROS.equilibrado, f1: false, outros: [], voltas: 3 };
  for (let k = 0; k < 30; k++) for (const c of [brita, asfalto]) Sim.passo(c, { gas: 1, steer: 0 }, amb, tr, []);
  assert.ok(brita.v < asfalto.v - 3, `brita ${brita.v}, asfalto ${asfalto.v}`);
});
test("o muro de escape não corta o corredor dos boxes", () => {
  const tr = Sim.criarPista(P.PISTAS.barcelona, "barcelona"), cor = require("../public/corrida/f1-regras.js").corredor(tr.t, tr.n, tr.W);
  for (let i = 0; i <= cor.len; i++) assert.equal(tr.murosEscape[cor.lado][(cor.i0 + i) % tr.n], 0);
});
test("a cena e a simulação usam o mesmo muro e as mesmas superfícies", { timeout: 120000 }, async () => {
  const { montar } = await import("./ajuda-cena/index.mjs"), visual = (await montar("barcelona")).tr;
  const fisica = Sim.criarPista(P.PISTAS.barcelona, "barcelona");
  for (const lado of [-1, 1]) {
    assert.deepEqual(visual.murosEscape[lado], fisica.murosEscape[lado]);
    assert.deepEqual(visual.superficiesEscape[lado], fisica.superficiesEscape[lado]);
  }
});


test("quem abre vantagem grande ao cortar também é punido", () => {
  const room = { phase: "race", startAt: 0, config: { pista: "interlagos", voltas: 5 }, semente: 12, order: ["a", "b"], players: { a: { id: "a", name: "A" }, b: { id: "b", name: "B" } } };
  Direcao.iniciar(room); const pos = (i, lat) => { const p = room.direcao.pista[i]; return { x: p.x - p.ty * lat, y: p.y + p.tx * lat, prog: i, v: 100 }; };
  room.players.b.pos = pos(210, 0); const a = room.players.a;
  Direcao.registrar(room, a, pos(200, P.PISTAS.interlagos.width / 2 + 25), 1000, () => {});
  Direcao.registrar(room, a, pos(300, 0), 2000, () => {});
  assert.equal(a.penal, 5);
});
test("as muretas dos dois níveis do viaduto de Suzuka mantêm colisão", () => {
  const tr = Sim.criarPista(P.PISTAS.suzuka, "suzuka"), [baixo, cima] = tr.t.cruza[0];
  for (const [f, margem] of [[baixo, 2], [cima, 0]]) {
    const i = Math.floor(f * tr.n); assert.equal(P.limiteViaduto(tr.t, tr.n, i, tr.W), tr.W / 2 + margem);
    assert.equal(tr.murosEscape[1][i], 0); assert.equal(tr.murosEscape[-1][i], 0);
  }
});
test("Hungaroring conserva brita na saída da curva 5 e barreira à esquerda na 14", () => {
  const tr = Sim.criarPista(P.PISTAS.hungaroring, "hungaroring"), info = require("../public/corrida/gp-info.js").REAIS.hungaroring;
  const i5 = Math.floor(info.curvas.find(c => c.n === 5).f * tr.n), p = tr.pts[i5], q = tr.pts[(i5 + 3) % tr.n];
  const fora = p.tx * q.ty - p.ty * q.tx > 0 ? -1 : 1;
  assert.equal(tr.superficiesEscape[fora][(i5 + 8) % tr.n], 1);
  const i14 = Math.floor(info.curvas.find(c => c.n === 14).f * tr.n);
  assert.ok(tr.murosEscape[1][i14] > 0);
});
test("Red Bull Ring tem brita nas saídas das duas últimas curvas", () => {
  const tr = Sim.criarPista(P.PISTAS.redbullring, "redbullring");
  for (const f of [0.868, 0.92]) assert.equal(tr.superficiesEscape[-1][Math.floor(f * tr.n)], 1);
});

test("Singapura: barreira só onde a pista real tem (muros por trecho), aberta no gramado do Flyer e sem muro em volta da volta toda", () => {
  const tr = Sim.criarPista(P.PISTAS.singapura, "singapura"), n = tr.n, m = tr.murosEscape;
  assert.ok(m, "murosEscape existe");
  const f = (x) => Math.floor(x * n);
  // por dentro de T18 e T19 (esquerda de quem anda) não há muro; por fora (a baía) há, e é o escape largo
  for (let i = f(0.91); i < f(0.95); i++) assert.equal(m[-1][i], 0, "o gramado do Flyer fica aberto (fração " + (i / n).toFixed(3) + ")");
  assert.ok(m[1][f(0.93)] >= 30, "o escape pintado vai até a cerca da orla");
  // a rua é murada dos dois lados na Raffles Boulevard
  assert.ok(m[1][f(0.22)] > 0 && m[-1][f(0.22)] > 0, "a Raffles Boulevard tem barreira dos dois lados");
  // nenhum ponto de outro trecho a menos de L - 12 da barreira (a mesma folga do autódromo)
  for (const lado of [-1, 1]) for (let i = 0; i < n; i += 11) if (m[lado][i]) {
    const L = tr.W / 2 + m[lado][i], p = tr.pts[i], x = p.x - p.ty * lado * L, y = p.y + p.tx * lado * L;
    assert.ok(tr.pts.every((q) => (q.x - x) ** 2 + (q.y - y) ** 2 >= (L - 12) ** 2 - 1e-5));
  }
});
