// Corrida, HUD de F1: as contas da torre de posições (diferença, ordem e recorte).
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/hud-torre.js");

const c = (id, prog, extra = {}) => ({ id, prog, v: 300, sigla: id.toUpperCase(), pneu: "medio", ...extra });

test("diferença: líder, segundos, metros e voltas", () => {
  assert.equal(T.diferenca({ lider: true }).texto, "Leader");
  assert.equal(T.diferenca({ dist: 600, v: 300, voltas: 0 }).texto, "+2.0");
  assert.equal(T.diferenca({ dist: 18000, v: 300, voltas: 0 }).texto, "+1:00.0");
  const m = T.diferenca({ dist: 100, v: 3, voltas: 0 });
  assert.equal(m.tipo, "m"); assert.match(m.texto, /^-\d+\.\d m$/);
  assert.equal(T.diferenca({ dist: 9, v: 300, voltas: 1 }).texto, "+1 V");
  assert.equal(T.diferenca({ dnf: true, v: 0 }).texto, "Out");
});

test("torre: ordem, líder, DNF no fim e volta mais rápida", () => {
  const rows = T.torre([c("nor", 1000, { best: 80 }), c("ham", 700, { best: 79.5 }), c("lec", 900, { dnf: true }), c("ver", 400)], { n: 1000, meuId: "ham" });
  assert.deepEqual(rows.map((r) => r.id), ["nor", "ham", "ver", "lec"]);
  assert.equal(rows[0].dif.texto, "Leader");
  assert.equal(rows[1].dif.texto, "+1.0"); assert.ok(rows[1].eu); assert.ok(rows[1].volta);
  assert.equal(rows[3].dif.texto, "Out");
  assert.equal(rows[0].letra, "M");
});

test("torre: voltas de atraso e tempo final de quem já chegou", () => {
  const r = T.torre([c("a", 3000), c("b", 1900)], { n: 1000, meuId: "a" });
  assert.equal(r[1].dif.texto, "+1 V");
  const f = T.torre([c("a", 3000, { done: 100 }), c("b", 2999, { done: 103.456 })], { n: 1000, meuId: "a" });
  assert.equal(f[1].dif.texto, "+3.5");
});

test("recorte: tudo se couber, senão o líder e a janela em volta do jogador", () => {
  assert.deepEqual(T.recortar(5, 2, 8), [0, 1, 2, 3, 4]);
  assert.deepEqual(T.recortar(20, 10, 5), [0, 8, 9, 10, 11]);
  assert.deepEqual(T.recortar(20, 19, 5), [0, 16, 17, 18, 19]);
  assert.deepEqual(T.recortar(20, 0, 5), [0, 1, 2, 3, 4]);
  assert.equal(T.recortar(20, -1, 6).length, 6);
});
