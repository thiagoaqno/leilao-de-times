// Regras e física de mesa que o servidor e o navegador dividem: Futebol de Botão (public/botao/fisica.js) e
// Dominó (public/domino/regras.js).
const test = require("node:test");
const assert = require("node:assert");
const B = require("../public/botao/fisica.js");
const D = require("../public/domino/regras.js");

// ---------- Botão ----------
test("botão: lineup de 2 a 7 tampinhas, sem peça em cima de peça", () => {
  for (const n of B.TAMPINHAS) for (const saida of [0, 1]) {
    const pcs = B.lineup(saida, ["2-2", "1-2-1"], n);
    assert.strictEqual(pcs.length, 2 * n + 1, `${n} tampinhas`);
    assert.strictEqual(pcs[0].k, "ball");
    for (const t of [0, 1]) assert.strictEqual(pcs.filter((p) => p.t === t).length, n);
    const raio = (p) => (p.k === "ball" ? B.RBALL : B.RB);
    for (let i = 0; i < pcs.length; i++) for (let j = i + 1; j < pcs.length; j++) {
      const d = Math.hypot(pcs[i].x - pcs[j].x, pcs[i].y - pcs[j].y), min = raio(pcs[i]) + raio(pcs[j]);
      assert.ok(d >= min - 1e-9, `${n} tampinhas, saída ${saida}: peças ${i} e ${j} sobrepostas (${d.toFixed(1)} < ${min})`);
    }
    // quem dá a saída fica colado na bola
    const perto = Math.min(...pcs.filter((p) => p.t === saida).map((p) => Math.hypot(p.x - pcs[0].x, p.y - pcs[0].y)));
    assert.ok(perto < B.RB + B.RBALL + 5, `${n} tampinhas: a da saída fica na bola`);
  }
});

test("botão: simulate é determinístico", () => {
  const pcs = B.lineup(0, [], 5);
  const i = pcs.findIndex((p) => p.t === 0 && Math.hypot(p.x - pcs[0].x, p.y - pcs[0].y) < B.RB + B.RBALL + 5);
  const dx = pcs[0].x - pcs[i].x, dy = pcs[0].y - pcs[i].y, l = Math.hypot(dx, dy);
  for (const opt of [{}, { open: true }, { keepers: [B.MID_Y, B.MID_Y] }, { frames: true, events: true }]) {
    const flick = [{ i, dx: dx / l, dy: dy / l, v: B.VMAX * 0.8 }];
    const a = B.simulate(pcs, flick, opt), b = B.simulate(pcs, flick, opt);
    assert.deepStrictEqual(a, b);
    assert.ok(a.touchers.length > 0, "a tampinha encostou na bola");
  }
  // e não mexe nas peças de entrada
  assert.deepStrictEqual(pcs, B.lineup(0, [], 5));
});

// ---------- Dominó ----------
const t = (a, b) => ({ id: 0, a, b });

test("dominó: ends e sides", () => {
  assert.strictEqual(D.ends(null), null);
  assert.deepStrictEqual(D.sides(t(1, 2), null), ["C"]);
  const chain = { center: { a: 3, b: 5 }, L: [], R: [] };
  assert.deepStrictEqual(D.ends(chain), { l: 3, r: 5 });
  chain.L.push({ a: 3, b: 6 }); chain.R.push({ a: 5, b: 0 });
  assert.deepStrictEqual(D.ends(chain), { l: 6, r: 0 });
  assert.deepStrictEqual(D.sides(t(6, 1), D.ends(chain)), ["L"]);
  assert.deepStrictEqual(D.sides(t(2, 0), D.ends(chain)), ["R"]);
  assert.deepStrictEqual(D.sides(t(6, 0), D.ends(chain)), ["L", "R"]);
  assert.deepStrictEqual(D.sides(t(2, 4), D.ends(chain)), []);
  assert.strictEqual(D.canPlay([t(2, 4), t(1, 1)], D.ends(chain)), false);
  assert.strictEqual(D.canPlay([t(2, 4), t(0, 1)], D.ends(chain)), true);
  assert.strictEqual(D.newSet().length, 28);
});

test("dominó: batida de 1, 2, 3 e 4 pontos", () => {
  assert.deepStrictEqual(D.batida(t(2, 4), { l: 4, r: 1 }), { pts: 1, name: "Batida" });
  assert.deepStrictEqual(D.batida(t(4, 4), { l: 4, r: 1 }), { pts: 2, name: "Carroça" });
  assert.deepStrictEqual(D.batida(t(1, 4), { l: 4, r: 1 }), { pts: 3, name: "Lá-e-lô" });
  assert.deepStrictEqual(D.batida(t(4, 4), { l: 4, r: 4 }), { pts: 4, name: "Cruzada" });
  assert.deepStrictEqual(D.batida(t(4, 2), { l: 4, r: 4 }), { pts: 1, name: "Batida" }); // serve nas duas, mas pontas iguais
});
