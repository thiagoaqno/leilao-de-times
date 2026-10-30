const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../public/corrida/temporada/regras.js");

function resultado(s, pos, dnf = false) {
  const vagas = Array.from({ length: 20 }, (_, i) => i + 1).filter((i) => i !== pos);
  return [{ piloto: "voce", equipe: s.equipe, pos, dnf, pontos: dnf ? 0 : R.PONTOS[pos - 1] || 0 },
    ...R.pilotosNoGrid(s).map((p, i) => ({ piloto: p.id, equipe: p.equipe, pos: vagas[i], pontos: R.PONTOS[vagas[i] - 1] || 0 }))];
}
test("metas, confiança e rival acompanham os resultados e sobrevivem à troca de temporada", () => {
  const s = R.criar("Piloto", "cadillac", 4, 2, 7), meta = R.metas(s);
  assert.equal(R.imersao(s).confianca, 50);
  assert.equal(R.imersao(s).rival, null);
  R.registrarResultado(s, resultado(s, 1));
  assert.equal(R.imersao(s).confianca, 56);
  assert.equal(s.resultados[0].objetivoGP, meta.gp);
  assert.equal(R.imersao(s).rival.encontros, 1);
  R.registrarResultado(s, resultado(s, 20, true));
  assert.equal(R.imersao(s).confianca, 52);
  R.registrarResultado(s, resultado(s, 1));
  R.registrarResultado(s, resultado(s, 1));
  const anterior = R.imersao(s).confianca;
  assert.equal(anterior, 74); // duas metas de GP e a meta da temporada cumpridas
  R.proximaTemporada(s);
  assert.equal(R.imersao(s).confianca, anterior);
  assert.equal(R.imersao(s).rival, null);
});
test("saves antigos sem metas continuam acessíveis e contam resultados", () => {
  const s = R.criar("Piloto", "cadillac", 4, 2, 9);
  R.registrarResultado(s, resultado(s, 1));
  delete s.resultados[0].objetivoGP; delete s.resultados[0].objetivoTemporada;
  assert.equal(R.imersao(JSON.parse(JSON.stringify(s))).confianca, 56);
});
