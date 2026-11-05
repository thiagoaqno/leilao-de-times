const test = require("node:test"), assert = require("node:assert/strict");
const Solo = require("../public/corrida/temporada/regras.js");
const Grupo = require("../public/corrida/temporada/grupo-regras.js");
const equipes = require("../public/corrida/f1-equipes.js");

test("resultado antigo com 20 carros continua aceito na carreira solo", () => {
  const s = Solo.criar("Ana", "mclaren", 4, 2, 7);
  const pilotos = [{ id: "voce", equipe: s.equipe }, ...Solo.pilotosNoGrid(s).slice(0, 19)];
  const linhas = pilotos.map((p, i) => ({ piloto: p.id, equipe: p.equipe, pos: i + 1, pontos: Solo.PONTOS[i] || 0 }));
  assert.equal(Solo.registrarResultado(s, linhas).resultado.linhas.length, 20);
});

test("grid de grupo tem 22 vagas e aceita resultado de 20 em andamento", () => {
  const s = Grupo.criarSala("ABCDE", { id: "a", nome: "Ana", tokenHash: "x" });
  Grupo.escolherEquipe(s, "a", "ferrari"); Grupo.iniciar(s, "a", 7);
  const grid = Grupo.gridDoGP(s), carros = [...grid.humanos.map(h => ({ id: "h:" + h.pid, equipe: h.equipe })), ...grid.robos];
  assert.equal(carros.length, 22);
  assert.equal(new Set(carros.map(p => p.id)).size, 22);
  for (const e of Object.keys(equipes.EQUIPES)) assert.equal(carros.filter(p => p.equipe === e).length, 2);
  const linhas = carros.slice(0, 20).map((p, i) => ({ piloto: p.id, equipe: p.equipe, pos: i + 1, pontos: Solo.PONTOS[i] || 0 }));
  assert.equal(Grupo.registrarResultado(s, linhas).linhas.length, 20);
});
