// Carreira de Treinador: a base do Brasileirão 2026 (public/carreira/base/brasileirao-2026.js) e os escudos.
const test = require("node:test");
const assert = require("node:assert");
const base = require("../public/carreira/base/brasileirao-2026.js");
const Escudos = require("../public/carreira/escudos.js");
const Motor = require("../public/carreira/motor.js");
const { grupoDe } = Motor;
const ferramenta = require("../ferramentas/base-mundo.js");

const mundo = require("../public/carreira/base/mundo-2026.js");
const basesMundo = ["brasileirao", "inglaterra", "espanha", "italia", "alemanha", "franca", "argentina", "sulamericanos"]
  .map((id) => require(`../public/carreira/base/${id}-2026.js`));
const clubesMundo = basesMundo.flatMap((b) => b.clubes);
const mediaOnze = (c) => c.jogadores.slice().sort((a, b) => b.nota - a.nota).slice(0, 11).reduce((s, j) => s + j.nota, 0) / 11;

test("base: os 20 clubes da Série A 2026", () => {
  assert.strictEqual(base.clubes.length, 20);
  assert.strictEqual(new Set(base.clubes.map((c) => c.id)).size, 20);
  for (const id of ["flamengo", "palmeiras", "corinthians", "saopaulo", "remo", "chapecoense", "coritiba", "athletico"]) assert.ok(base.clubes.some((c) => c.id === id), id);
});

test("base: cada elenco tem goleiros, defesa, meio e ataque para escalar", () => {
  const ids = new Set();
  for (const c of base.clubes) {
    const n = (gs) => c.jogadores.filter((j) => gs.includes(grupoDe(j.pos))).length;
    assert.ok(n(["GK"]) >= 3, `${c.nome}: ${n(["GK"])} goleiros`);
    assert.ok(n(["DEF"]) >= 8, `${c.nome}: ${n(["DEF"])} defensores`);
    assert.ok(n(["VOL", "MID", "MEI"]) >= 7, `${c.nome}: ${n(["VOL", "MID", "MEI"])} meias`);
    assert.ok(n(["ATT"]) >= 5, `${c.nome}: ${n(["ATT"])} atacantes`);
    assert.strictEqual(new Set(c.jogadores.map((j) => j.nome)).size, c.jogadores.length, `${c.nome}: nome repetido`);
    for (const j of c.jogadores) {
      assert.ok(j.nota >= 50 && j.nota <= 92, `${j.nome}: nota ${j.nota}`);
      assert.ok(!ids.has(j.id), `id repetido ${j.id}`); ids.add(j.id);
      for (const k of ["rit", "fin", "pas", "dri", "def", "fis", "gol"]) assert.ok(j.atr[k] >= 20 && j.atr[k] <= 95, `${j.nome}: ${k}`);
    }
  }
});

test("escudos: todo clube tem um escudo de 16x18 com contorno", () => {
  for (const c of base.clubes) {
    const g = Escudos.grade(c);
    assert.strictEqual(g.length, Escudos.H); assert.strictEqual(g[0].length, Escudos.W);
    const cores = new Set(g.flat().filter(Boolean));
    assert.ok(cores.has("#0b1510") && cores.size >= 3, `${c.nome}: ${cores.size} cores`);
    assert.match(Escudos.svg(c), /^<svg viewBox="0 0 16 18"/);
  }
});

test("base mundial: elencos, notas, goleiros e ids válidos", () => {
  const clubes = new Set(), jogadores = new Set();
  assert.strictEqual(clubesMundo.length, 142);
  for (const c of clubesMundo) {
    assert.ok(!clubes.has(c.id), `clube repetido ${c.id}`); clubes.add(c.id);
    assert.ok(c.jogadores.length >= 18 && c.jogadores.length <= 28, `${c.nome}: ${c.jogadores.length} jogadores`);
    assert.ok(c.jogadores.filter((j) => j.pos === "GOL").length >= 3, `${c.nome}: menos de 3 goleiros`);
    assert.ok(c.liga && c.pais && c.orcamento > 0, `${c.nome}: metadados incompletos`);
    for (const j of c.jogadores) {
      assert.ok(!jogadores.has(j.id), `jogador repetido ${j.id}`); jogadores.add(j.id);
      assert.ok(j.nota >= 40 && j.nota <= 95, `${j.nome}: nota ${j.nota}`);
    }
  }
});

test("base mundial: nomes licenciados e clubes homônimos não se confundem", () => {
  const italianos = require("../public/carreira/base/italia-2026.js").clubes.map((c) => c.nome);
  for (const nome of ["Inter de Milão", "Milan", "Lazio", "Atalanta"]) assert.ok(italianos.includes(nome), nome);
  const racings = clubesMundo.filter((c) => c.nome === "Racing Club");
  assert.strictEqual(racings.length, 2);
  assert.notStrictEqual(racings[0].id, racings[1].id);
  assert.deepStrictEqual(new Set(racings.map((c) => c.pais)), new Set(["Argentina", "Uruguai"]));
});

test("base mundial: o Brasil fica entre a Argentina e a Premier League", () => {
  const argentinos = require("../public/carreira/base/argentina-2026.js").clubes;
  const ingleses = require("../public/carreira/base/inglaterra-2026.js").clubes;
  const topoBrasil = Math.max(...base.clubes.map(mediaOnze));
  const topoArgentina = Math.max(...argentinos.map(mediaOnze));
  const topoInglaterra = Math.max(...ingleses.map(mediaOnze));
  assert.ok(topoBrasil >= topoArgentina + 1 && topoBrasil <= topoArgentina + 3, `${topoBrasil.toFixed(1)} x ${topoArgentina.toFixed(1)}`);
  assert.ok(topoBrasil < topoInglaterra, `${topoBrasil.toFixed(1)} x ${topoInglaterra.toFixed(1)}`);
});

test("base mundial: a Libertadores tem 32 clubes sem repetir", () => {
  assert.strictEqual(mundo.libertadores.length, 32);
  assert.strictEqual(new Set(mundo.libertadores).size, 32);
  const ids = new Set(clubesMundo.map((c) => c.id));
  for (const id of mundo.libertadores) assert.ok(ids.has(id), id);
});

test("ferramenta mundial: CSV com aspas e os dois formatos de data", () => {
  const lido = ferramenta.lerCSV('id,nome,estilos\r\n1,"Fulano, Jr.","Passe, Chute"\r\n');
  assert.deepStrictEqual(lido, [{ id: "1", nome: "Fulano, Jr.", estilos: "Passe, Chute" }]);
  assert.strictEqual(ferramenta.idadeEm("6/15/1992 12:00:00 AM"), 34);
  assert.strictEqual(ferramenta.idadeEm("1998-12-20"), 27);
  assert.notStrictEqual(ferramenta.chaveClube("LPF", "Racing Club"), ferramenta.chaveClube("Sudamericana", "Racing Club"));
});

test("motor: Liverpool vence Sunderland na maioria, mas não em todos os jogos", () => {
  const ingleses = require("../public/carreira/base/inglaterra-2026.js").clubes;
  const liverpool = ingleses.find((c) => c.nome === "Liverpool"), sunderland = ingleses.find((c) => c.nome === "Sunderland");
  let vitorias = 0;
  for (let i = 0; i < 1000; i++) {
    const casa = i % 2 ? liverpool : sunderland, fora = i % 2 ? sunderland : liverpool;
    const placar = Motor.simularPartida({ casa, fora, semente: `mundo-${i}` }).placar;
    const golsLiverpool = i % 2 ? placar[0] : placar[1], golsSunderland = i % 2 ? placar[1] : placar[0];
    if (golsLiverpool > golsSunderland) vitorias++;
  }
  assert.ok(vitorias > 500 && vitorias < 1000, `${vitorias}/1000 vitórias`);
});
