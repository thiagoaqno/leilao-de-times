// Carreira: a troca que desliza entre as abas da sede e as telas de gestão e o botão do cabeçalho (public/carreira/zoom.js).
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const fonte = fs.readFileSync(path.join(__dirname, "../public/carreira/zoom.js"), "utf8");
// o navegador de mentira: o cabeçalho, a lista das chamadas de mostrarTela e se o sistema pede menos movimento
function mundo({ telaAtual = "sede", reduz = false, abaSede = "central" } = {}) {
  const voltar = { textContent: "← Vila", href: "/", dataset: {}, setAttribute(k, v) { this[k] = v; }, classes: new Set() };
  voltar.classList = { toggle: (c, sim) => (sim ? voltar.classes.add(c) : voltar.classes.delete(c)), contains: (c) => voltar.classes.has(c) };
  const chamadas = [];
  const tiles = ["elenco", "mercado", "tabela", "calendario", "trocas", "clube", "temporadas"].map((ir) => ({ dataset: { ir }, hidden: false, classList: { contains: (c) => c === "hidden" && ir === "trocas" } }));
  const ctx = { document: { addEventListener() {}, getElementById: () => null, querySelectorAll: (s) => (s.includes(".tile") ? tiles : []), querySelector: (s) => (s === "#barra .voltar" ? voltar : null), body: { classList: { add() {}, remove() {} }, append() {} }, createElement: () => ({ style: {}, classList: { add() {} }, dataset: {}, animate: () => ({ finished: Promise.resolve() }), remove() {} }) },
    matchMedia: () => ({ matches: reduz }), innerWidth: 1000, innerHeight: 600, scrollY: 0, scrollTo() {}, telaAtual, mostrarTela: (id) => chamadas.push(id),
    ABAS_SEDE: ["central", "time", "temporada"], abaSede, mostrarAbaSede: (aba) => chamadas.push(`aba:${aba}`) };
  vm.createContext(ctx);
  vm.runInContext(`${fonte}; this.Zoom = Zoom;`, ctx);
  return { Zoom: ctx.Zoom, voltar, chamadas };
}

test("cabeçalho: ← Vila na sede, na entrada e na partida; ← Sede em todas as telas de gestão", () => {
  const { Zoom, voltar } = mundo();
  for (const id of ["elenco", "mercado", "tabela", "calendario", "feed", "trocas", "temporadas", "clube"]) {
    Zoom.cabecalho(id);
    assert.strictEqual(voltar.textContent, "← Sede", id);
    assert.strictEqual(voltar.dataset.ir, "sede");
    assert.strictEqual(voltar.href, "#sede");
    assert.ok(voltar.classes.has("para-sede"), id); // o "← Sede" ganha a cor do clube
  }
  for (const id of ["sede", "inicio", "grupo", "partida"]) {
    Zoom.cabecalho(id);
    assert.strictEqual(voltar.textContent, "← Vila", id);
    assert.strictEqual(voltar.dataset.ir, undefined);
    assert.strictEqual(voltar.href, "/");
    assert.ok(!voltar.classes.has("para-sede"), id);
  }
});

test("zoom: quem pede menos movimento troca de tela na hora", () => {
  const { Zoom, chamadas } = mundo({ reduz: true });
  Zoom.ir("mercado", { closest: () => ({}) });
  assert.deepStrictEqual(chamadas, ["mercado"]);
});

test("deslizar: sem a tela na página, troca direto", () => {
  const { Zoom, chamadas } = mundo();
  Zoom.ir("feed", { closest: () => null }); // o botão "Ver todas" das notícias
  assert.deepStrictEqual(chamadas, ["feed"]);
});

test("arrastar o dedo anda na fila da faixa: das abas para os blocos (Trocas só na sala) e de volta", () => {
  let m = mundo({ abaSede: "temporada" });
  m.Zoom.passo(1); // da última aba para o primeiro bloco
  assert.deepStrictEqual(m.chamadas, ["elenco"]);
  m = mundo({ telaAtual: "elenco", abaSede: "central" });
  m.Zoom.passo(-1); // do primeiro bloco para a última aba
  assert.deepStrictEqual(m.chamadas, ["aba:temporada", "sede"]);
  m = mundo({ telaAtual: "calendario" });
  m.Zoom.passo(1); // a Trocas está escondida (carreira solo): pula para o Clube
  assert.deepStrictEqual(m.chamadas, ["clube"]);
  m = mundo({ telaAtual: "temporadas" });
  m.Zoom.passo(1); // depois do último bloco não há nada
  assert.deepStrictEqual(m.chamadas, []);
  m = mundo({ telaAtual: "partida" });
  m.Zoom.passo(-1); // fora da sede e da gestão, nada
  assert.deepStrictEqual(m.chamadas, []);
});

test("a página carrega o zoom depois do inicio.js e o clique de [data-ir] passa por ele", () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/carreira/index.html"), "utf8");
  assert.ok(html.indexOf('src="zoom.js"') > html.indexOf('src="inicio.js"'));
  const inicio = fs.readFileSync(path.join(__dirname, "../public/carreira/inicio.js"), "utf8");
  assert.match(inicio, /Zoom\.ir\(b\.dataset\.ir, b\)/);
  assert.match(inicio, /Zoom\.cabecalho\(id\)/);
});
