// Carreira: só o Brasileirão conta como rodada. A janela de transferências e o número da rodada seguem as rodadas do Brasileirão
// que o mundo já jogou (pela semana), então quem joga copa ou outra liga está na mesma rodada e a janela do meio abre junto para todos.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Carreira = require("../carreira.js");
const G = Carreira.grupo, T = Carreira.paraTestes;
const Mercado = require("../public/carreira/mercado.js");

const semanasBR = (save) => [...new Set(save.calendarioMundo.filter((j) => j.competicao === "brasileirao-2026").map((j) => j.semana))].sort((a, b) => a - b);
// cada técnico joga tudo o que tem até a semana s (inclusive)
function ate(save, s) {
  for (const [c, hm] of Object.entries(save.humanos)) hm.estado.jogosJogados = save.calendarioMundo.filter((j) => (j.casa === c || j.fora === c) && j.semana <= s).map((j) => j.id);
}

test("na sala, clubes de ligas diferentes ficam na mesma rodada e a janela do meio abre junto", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "arsenal", nome: "Bia" }, { clube: "fc-bayern-munchen", nome: "Caio" }], { temporadas: 1 });
  const clubes = Object.keys(save.humanos); assert.strictEqual(clubes.length, 3);
  const br = semanasBR(save);
  for (let s = 0; s <= br[br.length - 1]; s++) {
    ate(save, s);
    const rodadas = clubes.map((c) => G.ajudas.rodadaDaJanela(G.vistaDe(save, c)));
    const esperado = br.filter((x) => x <= s).length;
    assert.deepStrictEqual(rodadas, clubes.map(() => esperado), `semana ${s}`);
    const janelas = clubes.map((c) => Mercado.janelaAberta(G.ajudas.rodadaDaJanela(G.vistaDe(save, c))));
    assert.ok(janelas.every((x) => x === janelas[0]), `a janela é a mesma para todos na semana ${s}`);
  }
});

test("os jogos de copa não contam como rodada", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "palmeiras", nome: "Bia" }], { temporadas: 1 });
  const copa = save.calendarioMundo.find((j) => j.competicao !== "brasileirao-2026" && (j.casa === "flamengo" || j.fora === "flamengo"));
  assert.ok(copa, "o Flamengo tem jogo de copa");
  ate(save, copa.semana - 1);
  const antes = G.ajudas.rodadaDaJanela(G.vistaDe(save, "flamengo"));
  ate(save, copa.semana);
  assert.strictEqual(G.ajudas.rodadaDaJanela(G.vistaDe(save, "flamengo")), antes, "jogar a copa não muda a rodada");
});

test("sozinho, a rodada é a do Brasileirão também para quem é de outra liga, e o calendário marca a janela pela semana", () => {
  const save = T.novaCarreira("Ana", "arsenal");
  const br = semanasBR(save), meio = br[16]; // a rodada 17 do Brasileirão abre a janela do meio
  save.jogosJogados = save.calendarioMundo.filter((j) => (j.casa === "arsenal" || j.fora === "arsenal") && j.semana < meio).map((j) => j.id);
  assert.strictEqual(T.ajudas.rodadaDaJanela(save), 16);
  const e = T.estado(save);
  assert.strictEqual(e.rodadaLiga, 16);
  assert.strictEqual(e.rodadasLiga, br.length);
  assert.strictEqual(e.janela.aberta, true);
  for (const j of e.meus) assert.strictEqual(j.janela, Mercado.janelaAberta(br.filter((x) => x < j.semana).length), j.id);
});
