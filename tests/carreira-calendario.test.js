// Carreira: o calendário só mostra o que já está definido; o resto vira "TBA" (carreira.js, estadoMundo: meus e tba).
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const { novaCarreira, estado, proximoJogoMundo, simularMinha, sementeDoJogo, fecharRodada } = require("../carreira.js").paraTestes;

const save0 = novaCarreira("Teste", "palmeiras", "", 2);
const copia = () => JSON.parse(JSON.stringify(save0));
// o jogo da semana tal passou (sem resultado fixado: só para ver o que o calendário esconde)
const ate = (save, semana) => { save.jogosJogados = save.calendarioMundo.filter((j) => (j.casa === save.clube || j.fora === save.clube) && j.semana < semana).map((j) => j.id); return save; };
const doMata = (e, comp) => e.meus.filter((j) => j.competicao === comp && j.mataMata);

test("no começo: o mata-mata da Libertadores e da Copa do Brasil vira TBA e nenhum confronto de mata-mata aparece", () => {
  const e = estado(copia());
  assert.strictEqual(e.meus.filter((j) => j.mataMata).length, 0, "nenhum confronto de mata-mata é mostrado antes de estar definido");
  const tba = e.tba, lib = tba.filter((t) => t.competicao === "libertadores"), cdb = tba.filter((t) => t.competicao === "copadobrasil");
  assert.deepStrictEqual([...new Set(lib.map((t) => t.fase))], ["oitavas", "quartas", "semifinal", "final"]);
  assert.deepStrictEqual(lib.map((t) => t.semana), [40, 42, 46, 48, 52, 54, 58], "ida e volta, e a final em jogo único");
  assert.ok(cdb.length >= 7 && cdb.every((t) => t.fase !== "preliminar" || t.semana === 4), "a Copa do Brasil tem as fases com a semana de cada uma");
  assert.ok(tba.every((t, i) => i === 0 || tba[i - 1].semana <= t.semana), "em ordem de semana");
  assert.ok(!JSON.stringify(tba).includes("palmeiras"), "o TBA não diz quem joga nem se o clube passa");
});

test("só o que a participação já garante: nada de Sul-Americana, Super Mundial e Mundial antes de definidos", () => {
  const e = estado(copia());
  for (const comp of ["sulamericana", "supermundial", "mundial"]) {
    assert.strictEqual(e.meus.filter((j) => j.competicao === comp).length, 0, `${comp} não aparece como previsão`);
    assert.ok(!e.tba.some((t) => t.competicao === comp));
  }
});

test("depois dos grupos da Libertadores: quem passou vê as oitavas de verdade e o resto TBA; quem não passou não vê mais nada dela", () => {
  const s = ate(copia(), 35), e = estado(s), lib = s.competicoes.libertadores;
  const passou = lib.jogos.some((j) => j.mataMata && (j.casa === "palmeiras" || j.fora === "palmeiras"));
  if (passou) {
    assert.ok(doMata(e, "libertadores").some((j) => j.fase === "oitavas"), "as oitavas definidas aparecem com o adversário");
    assert.ok(e.tba.some((t) => t.competicao === "libertadores" && t.fase === "quartas"), "as quartas ainda são TBA");
    assert.ok(!e.tba.some((t) => t.competicao === "libertadores" && t.fase === "oitavas"), "as oitavas já não são TBA");
  } else {
    assert.ok(!e.tba.some((t) => t.competicao === "libertadores") && doMata(e, "libertadores").length === 0, "eliminado nos grupos: nada mais da Libertadores");
  }
  // a Sul-Americana passa a existir quando os grupos da Libertadores acabam
  assert.ok(e.competicoes.sulamericana.participantes.length === 16);
  assert.ok(e.meus.filter((j) => j.competicao === "sulamericana").every((j) => !j.mataMata));
});

test("a Copa do Brasil: as oitavas só ficam definidas depois da fase preliminar", () => {
  const antes = estado(ate(copia(), 3)), depois = estado(ate(copia(), 6));
  assert.ok(antes.tba.some((t) => t.competicao === "copadobrasil" && t.fase === "oitavas"));
  assert.ok(depois.meus.some((j) => j.competicao === "copadobrasil" && j.fase === "oitavas") || !depois.tba.some((t) => t.competicao === "copadobrasil"),
    "passada a preliminar, as oitavas aparecem de verdade (ou o clube já caiu)");
  assert.ok(!depois.tba.some((t) => t.competicao === "copadobrasil" && t.fase === "oitavas"));
  assert.ok(depois.tba.length === 0 || depois.tba.every((t) => t.semana > 6));
});

test("perdeu a chave: o clube eliminado não ganha mais linhas TBA da competição", () => {
  const s = ate(copia(), 3), c = s.competicoes.copadobrasil;
  const meu = c.jogos.filter((j) => j.casa === "palmeiras" || j.fora === "palmeiras");
  if (!meu.length) return;
  // força a derrota nas oitavas (ida e volta) e deixa passar as oitavas
  for (const j of meu.filter((x) => x.fase === "oitavas")) { j.placar = j.casa === "palmeiras" ? [0, 3] : [3, 0]; delete j.penaltis; }
  const e = estado(ate(s, 15));
  assert.ok(!e.tba.some((t) => t.competicao === "copadobrasil"), "eliminado nas oitavas: sem TBA da Copa do Brasil");
});
