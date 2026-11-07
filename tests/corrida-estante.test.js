// A estante da F1 com os amigos: pódios e títulos das pessoas (nunca dos robôs) ficam no banco e viram o ranking.
const test = require("node:test");
const assert = require("node:assert");
process.env.DB_PATH = ":memory:";
const bd = require("../bd.js");
const G = require("../public/corrida/temporada/grupo-regras.js");

function salaDeDois() {
  const sala = { codigo: "ABCDE", criadaEm: 1, opcoes: { tamanho: 1 }, pessoas: { a: { nome: "Ana", equipe: "ferrari" }, b: { nome: "Bia", equipe: "ferrari" } }, ordem: ["a", "b"], resultados: [], equipes: { ferrari: {} }, contratos: {}, gp: 1, ano: 1 };
  const linhas = [{ piloto: "h:a", equipe: "ferrari", pos: 1, pontos: 25 }, { piloto: "verstappen", equipe: "red-bull", pos: 2, pontos: 18 }, { piloto: "h:b", equipe: "ferrari", pos: 3, pontos: 15 }];
  const resultado = { ano: 1, gp: 0, pista: "monza", linhas };
  sala.resultados.push(resultado);
  return { sala, resultado };
}

test("o último GP guarda o pódio das pessoas e os títulos, sem robôs e sem repetir", () => {
  const { sala, resultado } = salaDeDois();
  const lista = G.conquistasDoGP(sala, resultado);
  assert.ok(lista.every((c) => c.piloto === "Ana" || c.piloto === "Bia"));
  assert.deepEqual(lista.filter((c) => c.tipo === "gp").map((c) => [c.piloto, c.colocacao]), [["Ana", 1], ["Bia", 3]]);
  assert.ok(lista.some((c) => c.tipo === "pilotos" && c.piloto === "Ana" && c.colocacao === 1));
  assert.equal(lista.filter((c) => c.tipo === "construtores" && c.colocacao === 1).length, 2);
  assert.equal(bd.guardarEstanteCorrida(lista), lista.length);
  assert.equal(bd.guardarEstanteCorrida(lista), 0);
  const e = bd.estanteCorrida();
  assert.equal(e.ranking[0].piloto, "Ana");
  assert.equal(e.ranking[0].titulos, 1);
  assert.equal(e.ranking[0].vitorias, 1);
  assert.equal(e.ranking[1].podios, 1);
  assert.equal(e.vitorias, 1);
});
