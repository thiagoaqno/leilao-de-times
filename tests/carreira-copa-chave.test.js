// A chave dos 16 avos da Copa do Mundo (Temporada.separarGrupos): quem é do mesmo grupo nunca se cruza no primeiro
// mata-mata. A chave sai dos 12 primeiros, dos 12 segundos e dos 8 melhores terceiros, em grupos sorteados; aqui são
// milhares de sorteios. Antes, a troca às vezes criava outro encontro do mesmo grupo (e o teste da Copa falhava por acaso).
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/carreira/temporada.js");

function sorteio(semente) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const embaralhar = (l, r) => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };

test("16 avos da Copa: ninguém do mesmo grupo se cruza, em 5000 sorteios", () => {
  const grupos = "ABCDEFGHIJKL".split("");
  for (let s = 1; s <= 5000; s++) {
    const r = sorteio(s), grupoDe = {};
    const primeiros = embaralhar([...grupos], r).map((g) => { grupoDe[g + "1"] = g; return g + "1"; });
    const segundos = embaralhar([...grupos], r).map((g) => { grupoDe[g + "2"] = g; return g + "2"; });
    const terceiros = embaralhar([...grupos], r).slice(0, 8).map((g) => { grupoDe[g + "3"] = g; return g + "3"; });
    const cabecas = [...primeiros, ...segundos, ...terceiros];
    const chave = T.separarGrupos(T.ordemDaChave(32).map((n) => cabecas[n - 1]), grupoDe);
    assert.equal(new Set(chave).size, 32, "ninguém some nem repete");
    for (let i = 0; i < 32; i += 2) assert.notEqual(grupoDe[chave[i]], grupoDe[chave[i + 1]], `sorteio ${s}: ${chave[i]} × ${chave[i + 1]}`);
  }
});
