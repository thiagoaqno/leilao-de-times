// O canteiro do miolo do grampo de Mônaco é um sólido da física (pistas.js `obstaculosDaPista`, usado por sim.js no servidor e no navegador e por fisica.js no jogo clássico):
// o carro que mira nele bate e não o atravessa; inclusive quando tenta passar por cima.
const test = require("node:test");
const assert = require("node:assert/strict");
global.window = global;
const P = require("../public/corrida/pistas.js");
global.Pistas = P;
const Sim = require("../public/corrida/sim.js");

function carroMirando(tr, ob, i) {
  const p = tr.pts[i], dx = ob.x - p.x, dy = ob.y - p.y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, c = Sim.novo(tr, { f1: false });
  Object.assign(c, { x: p.x, y: p.y, idx: i, idxAnt: i, z: p.h, a: Math.atan2(uy, ux), v: 130, vx: 130 * ux, vy: 130 * uy });
  return c;
}

test("Mônaco declara o canteiro como obstáculo e o servidor e o navegador usam a mesma conta", () => {
  const tr = Sim.criarPista(P.PISTAS.monaco, "monaco");
  assert.equal(tr.obstaculos.length, 1);
  const o = tr.obstaculos[0], outro = P.obstaculosDaPista(P.PISTAS.monaco, P.pontos(P.PISTAS.monaco, 6))[0];
  assert.deepEqual(o, outro);
  assert.ok(o.r > 9 && o.r < 14 && o.alt >= 3, JSON.stringify(o));
  assert.deepEqual(Sim.criarPista(P.PISTAS.interlagos, "interlagos").obstaculos, [], "outras pistas não têm obstáculos");
});

test("o carro que mira o canteiro para nele e não o atravessa (Sim.passo, o mesmo do servidor)", () => {
  const tr = Sim.criarPista(P.PISTAS.monaco, "monaco"), o = tr.obstaculos[0];
  // a perna mais baixa do U perto do canteiro
  let melhor = -1; tr.pts.forEach((p, i) => { if (Math.hypot(p.x - o.x, p.y - o.y) < 75 && (melhor < 0 || p.h < tr.pts[melhor].h)) melhor = i; });
  const c = carroMirando(tr, o, melhor), amb = { spec: P.CARROS.equilibrado, f1: false, outros: [], voltas: 3 }, ev = [];
  let min = Infinity;
  for (let k = 0; k < 360; k++) { Sim.passo(c, { gas: 1, steer: 0 }, amb, tr, ev); min = Math.min(min, Math.hypot(c.x - o.x, c.y - o.y)); }
  assert.ok(min >= o.r + 11 - 0.6, `o carro entrou no canteiro: distância mínima ${min.toFixed(1)} (raio ${o.r.toFixed(1)} + 11)`);
  assert.ok(ev.some((e) => e.t === "muro"), "houve batida no canteiro");
  assert.ok(Math.hypot(c.x - o.x, c.y - o.y) >= o.r + 10, "o carro não está dentro do canteiro no fim");
});

test("o canteiro bloqueia também um carro acima do topo", () => {
  const tr = Sim.criarPista(P.PISTAS.monaco, "monaco"), o = tr.obstaculos[0];
  let alta = -1; tr.pts.forEach((p, i) => { if (Math.hypot(p.x - o.x, p.y - o.y) < 75 && (alta < 0 || p.h > tr.pts[alta].h)) alta = i; });
  assert.ok(tr.pts[alta].h > o.z + o.alt + 2, "a perna de cima está acima do meio-fio");
  const c = carroMirando(tr, o, alta), amb = { spec: P.CARROS.equilibrado, f1: false, outros: [], voltas: 3 }, ev = [];
  let min = Infinity;
  for (let k = 0; k < 240; k++) { Sim.passo(c, { gas: 1, steer: 0 }, amb, tr, ev); min = Math.min(min, Math.hypot(c.x - o.x, c.y - o.y)); }
  assert.ok(min >= o.r + 11 - 0.6, `o carro passou por cima do canteiro (distância mínima ${min.toFixed(1)})`);
});

test("borda e grama acompanham o asfalto dos dois lados do grampo", { timeout: 120000 }, async () => {
  const { montar } = await import("./ajuda-cena/index.mjs");
  const { tr } = await montar("monaco"), ob = tr.obstaculos[0];
  const mesh = tr.grp.getObjectByName("monaco-canteiro");
  assert.ok(mesh, "canteiro montado na cena");
  const v = mesh.geometry.attributes.position;
  let menorPista = Infinity, maiorPista = -Infinity;
  for (let k = 0; k < 48; k++) {
    for (const i of [3, 4, 5, 6, 7, 8]) {
      const j = k * 21 + i, x = mesh.position.x + v.getX(j), y = mesh.position.z + v.getZ(j);
      const pista = P.alturaPistaMaisProxima(tr.pts, x, y), altura = v.getY(j) - pista;
      assert.ok(Math.abs(altura - ob.alt) < 0.05, `borda a ${altura} unidades acima da pista`);
      menorPista = Math.min(menorPista, pista); maiorPista = Math.max(maiorPista, pista);
    }
  }
  assert.ok(maiorPista - menorPista > 4, "a verificação cobre as duas alturas da pista");
});
