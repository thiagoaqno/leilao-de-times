// A volta tem que contar em todas as pistas: o carro percorre a linha central (e a beirada, e um pouco por fora) com a
// mesma conferência de checkpoints do navegador (`setores` em fisica.js) e a volta fecha com os 12 setores em ordem.
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/pistas.js");

const montar = (t) => { const pts = T.pontos(t, 6), n = pts.length; for (const p of pts) { p.nx = -p.ty; p.ny = p.tx; } return { pts, n, W: t.width }; };
// o ponto da pista mais perto, como em jogo.js (procura perto do último, ou na pista toda)
function nearest(tr, x, y, from) {
  let best = from, bd = Infinity;
  const scan = (i0, i1, st = 1) => { for (let k = i0; k <= i1; k += st) { const i = (k + tr.n) % tr.n, p = tr.pts[i], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i; } } };
  scan(from - 40, from + 40);
  if (bd > 160 * 160) { scan(0, tr.n - 1, 2); scan(best - 3, best + 3); }
  return best;
}
function lateral(tr, x, y, idx) {
  const a = tr.pts[idx], b = tr.pts[(idx + 1) % tr.n], c = tr.pts[(idx - 1 + tr.n) % tr.n];
  const proj = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y, l2 = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / l2)), px = p.x + dx * k, py = p.y + dy * k; return { d2: (x - px) ** 2 + (y - py) ** 2, px, py }; };
  const f = proj(a, b), g = proj(c, a), r = f.d2 <= g.d2 ? f : g;
  return (x - r.px) * a.nx + (y - r.py) * a.ny;
}
// uma volta inteira andando 4 pontos de pista por passo (a 300 u/s, ~10 u por quadro: o passo daqui é de 5 a 10 u)
function volta(id, lado, passo = 5, ondas = 0) {
  const t = T.PISTAS[id], tr = montar(t), n = tr.n;
  let idx = n - 30, sector = T.SECTORS - 1, laps = 0, ant = null;
  const ordem = [];
  for (let s = -30; s < n + 40; s += passo / 6) {
    const f = ((s % n) + n) % n, i = Math.floor(f), fr = f - i, a = tr.pts[i], b = tr.pts[(i + 1) % n];
    const off = lado + (ondas ? Math.sin(s / 11) * ondas : 0);
    const x = a.x + (b.x - a.x) * fr + a.nx * off, y = a.y + (b.y - a.y) * fr + a.ny * off, z = a.h + (b.h - a.h) * fr;
    idx = nearest(tr, x, y, idx);
    const lat = lateral(tr, x, y, idx), prox = (sector + 1) % T.SECTORS, gi = T.checkpoint(prox, n), depois = (idx - gi + n) % n;
    const cruzou = ant && T.cruzouSetor(tr.pts, n, prox, ant.x, ant.y, x, y, z, tr.W / 2 + 70);
    ant = { x, y };
    if ((depois < 30 && Math.abs(lat) < tr.W / 2 + 70) || cruzou) { sector = prox; ordem.push(prox); if (prox === 0) laps++; }
  }
  return { laps, sector, ordem };
}

test("a volta conta em todas as pistas: pelo meio, pela beirada e um pouco por fora", () => {
  for (const [id, t] of Object.entries(T.PISTAS)) {
    for (const lado of [0, t.width / 2 - 6, -(t.width / 2 - 6), t.width / 2 + 30, -(t.width / 2 + 30), t.width / 2 + 50, -(t.width / 2 + 50)]) {
      for (const ondas of [0, 14]) {
        const r = volta(id, lado, 5, ondas);
        assert.equal(r.laps, 2, `${id}: lado ${lado.toFixed(0)} ondas ${ondas}: ${r.laps} passagens pela linha (parou no setor ${r.sector}, ordem ${r.ordem})`); // a 1ª é a largada, a 2ª fecha a volta
        assert.deepEqual(r.ordem, [...Array(T.SECTORS).keys(), 0], `${id}: lado ${lado.toFixed(0)}: setores fora de ordem ${r.ordem}`);
      }
    }
  }
});

test("o tempo mínimo (minLap) de cada pista é menor que a volta do carro mais veloz sem erro nenhum (média de 85% da velocidade final)", () => {
  for (const [id, t] of Object.entries(T.PISTAS)) {
    const comp = T.pontos(t, 6).length * 6, vmax = Math.max(...Object.values(T.CARROS).map((c) => c.vmax));
    assert.ok(comp / (vmax * 0.85) > t.minLap, `${id}: ${comp} u a ${vmax} u/s dá ${(comp / vmax).toFixed(1)} s, o mínimo é ${t.minLap} s`);
  }
});

test("o portão do checkpoint só vale para a frente, dentro da pista e na altura dela", () => {
  const t = T.PISTAS.xangai, tr = montar(t), k = 5, p = tr.pts[T.checkpoint(k, tr.n)];
  const em = (a, l, z) => [p.x + p.tx * a + p.nx * l, p.y + p.ty * a + p.ny * l, z];
  const vai = (a0, a1, l, z) => { const [ax, ay] = em(a0, l, 0), [bx, by] = em(a1, l, 0); return T.cruzouSetor(tr.pts, tr.n, k, ax, ay, bx, by, z, t.width / 2 + 70); };
  assert.ok(vai(-4, 4, 0, p.h), "de frente passa");
  assert.ok(vai(-4, 4, 100, p.h), "pela beirada de fora passa");
  assert.ok(!vai(4, -4, 0, p.h), "de ré não conta");
  assert.ok(!vai(-4, 4, 200, p.h), "longe da pista não conta");
  assert.ok(!vai(-4, 4, 0, p.h + 60), "por cima da ponte não conta");
  assert.ok(!vai(-100, 100, 0, p.h), "teleporte (respawn) não conta");
});
