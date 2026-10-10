// Carreira: o zoom entre a sede e as telas de gestão e o botão do cabeçalho (public/carreira/zoom.js).
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const fonte = fs.readFileSync(path.join(__dirname, "../public/carreira/zoom.js"), "utf8");
// o navegador de mentira: o cabeçalho, a lista das chamadas de mostrarTela e se o sistema pede menos movimento
function mundo({ telaAtual = "sede", reduz = false } = {}) {
  const voltar = { textContent: "← Vila", href: "/", dataset: {}, setAttribute(k, v) { this[k] = v; } };
  const chamadas = [];
  const ctx = { document: { addEventListener() {}, getElementById: () => null, querySelector: (s) => (s === "#barra .voltar" ? voltar : null), body: { classList: { add() {}, remove() {} }, append() {} }, createElement: () => ({ style: {}, classList: { add() {} }, dataset: {}, animate: () => ({ finished: Promise.resolve() }), remove() {} }) },
    matchMedia: () => ({ matches: reduz }), innerWidth: 1000, innerHeight: 600, scrollY: 0, scrollTo() {}, telaAtual, mostrarTela: (id) => chamadas.push(id) };
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
  }
  for (const id of ["sede", "inicio", "grupo", "partida"]) {
    Zoom.cabecalho(id);
    assert.strictEqual(voltar.textContent, "← Vila", id);
    assert.strictEqual(voltar.dataset.ir, undefined);
    assert.strictEqual(voltar.href, "/");
  }
});

test("zoom: quem pede menos movimento troca de tela na hora", () => {
  const { Zoom, chamadas } = mundo({ reduz: true });
  Zoom.ir("mercado", { closest: () => ({}) });
  assert.deepStrictEqual(chamadas, ["mercado"]);
});

test("zoom: telas sem bloco na sede (as notícias pelo \"Ver todas\") trocam direto", () => {
  const { Zoom, chamadas } = mundo();
  Zoom.ir("feed", { closest: () => null }); // o botão "Ver todas" não está num bloco
  assert.deepStrictEqual(chamadas, ["feed"]);
});

test("a página carrega o zoom depois do inicio.js e o clique de [data-ir] passa por ele", () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/carreira/index.html"), "utf8");
  assert.ok(html.indexOf('src="zoom.js"') > html.indexOf('src="inicio.js"'));
  const inicio = fs.readFileSync(path.join(__dirname, "../public/carreira/inicio.js"), "utf8");
  assert.match(inicio, /Zoom\.ir\(b\.dataset\.ir, b\)/);
  assert.match(inicio, /Zoom\.cabecalho\(id\)/);
});
