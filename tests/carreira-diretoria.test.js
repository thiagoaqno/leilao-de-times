// Carreira: a meta da diretoria (definida pela força do clube na liga), os pop-ups de aviso e o fundo da sede com a foto do estádio.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const Temporada = require("../public/carreira/temporada.js");
const { novaCarreira, estado, novaTemporada } = require("../carreira.js").paraTestes;

const brasil = require("../public/carreira/base/brasileirao-2026.js").clubes;
const forca = (c) => { const n = c.jogadores.map((j) => j.nota).sort((a, b) => b - a).slice(0, 11); return n.reduce((s, x) => s + x, 0) / n.length; };

test("a meta da diretoria vem da força do elenco em relação aos outros clubes da mesma liga", () => {
  const ordem = [...brasil].sort((a, b) => forca(b) - forca(a));
  const amostra = [0, 1, 4, 8, 11, 14, 19].map((i) => ordem[i].id);
  let anterior = 0;
  for (const id of amostra) {
    const save = novaCarreira("Teste", id, "x"), m = estado(save).meta;
    assert.ok(m, id);
    assert.strictEqual(m.temporada, 1); assert.strictEqual(m.total, 20); assert.ok(m.rank >= 1 && m.rank <= 20);
    const esperado = m.rank <= 2 ? [2, "titulo"] : m.rank <= 6 ? [6, "continental"] : m.rank <= 12 ? [12, "meio"] : [16, "rebaixamento"];
    assert.deepStrictEqual([m.alvo, m.nivel], esperado, `${id} (${m.rank}º mais forte)`);
    assert.ok(m.texto.length > 10);
    assert.ok(m.alvo >= anterior, "quanto mais fraco o elenco, menos exigente a meta"); anterior = m.alvo;
  }
  // o mais forte tem a meta mais dura e o mais fraco só precisa fugir do rebaixamento
  assert.strictEqual(estado(novaCarreira("Teste", ordem[0].id, "x")).meta.alvo, 2);
  assert.strictEqual(estado(novaCarreira("Teste", ordem[19].id, "x")).meta.nivel, "rebaixamento");
});

test("a meta é por liga: um clube europeu é comparado só com os clubes da liga dele", () => {
  const save = novaCarreira("Teste", "real-madrid", "x"), m = estado(save).meta;
  assert.strictEqual(m.liga, "espanha-2026"); assert.strictEqual(m.total, 20);
  assert.strictEqual(m.nivel, "titulo");
});

test("no fim da temporada a diretoria avalia a meta, entra no histórico e uma nova meta é definida na temporada seguinte", () => {
  const save = novaCarreira("Teste", "flamengo", "x");
  const meus = Temporada.jogosDoClube({ jogos: save.calendarioMundo }, save.clube);
  save.jogosJogados = meus.map((j) => j.id); save.rodada = save.jogosJogados.length;
  const e = estado(save), h = e.historico[0];
  assert.ok(h && h.meta, "o histórico guarda a meta");
  assert.strictEqual(h.meta.cumprida, h.posicao <= h.meta.alvo, "cumprida quando a posição final é a da meta ou melhor");
  assert.ok(e.caixaEntrada.some((x) => x.tipo === "diretoria"), "a diretoria avisa o resultado");
  assert.ok(!(typeof novaTemporada(save) === "string"), "a virada de temporada funcionou");
  assert.strictEqual(estado(save).meta.temporada, 2, "meta nova na temporada seguinte");
});

test("os pop-ups e o fundo da sede estão ligados na página", () => {
  const raiz = path.join(__dirname, "..", "public", "carreira"), ler = (f) => fs.readFileSync(path.join(raiz, f), "utf8");
  const html = ler("index.html");
  for (const s of ["popups.js", "fundo-estadio.js", "estadios-api.js"]) assert.ok(html.includes(`src="${s}"`), s);
  assert.ok(html.includes('id="fundoEstadio"') && html.includes('id="creditoEstadio"'));
  assert.ok(ler("telas.js").includes("confirmarAntesDoJogo") && ler("grupo.js").includes("confirmarAntesDoJogo"), "o aviso de antes do jogo no jogo solo e na rodada da sala");
  assert.ok(ler("grupo.js").includes("Popups.verificar"), "a proposta de troca abre o pop-up");
  assert.ok(ler("inicio.js").includes("atualizarFundoEstadio") && ler("inicio.js").includes("energia: E.energia"));
  const js = ler("estadios-api.js"), api = JSON.parse(js.slice(js.indexOf("{"), js.lastIndexOf("}") + 1));
  assert.ok(Object.keys(api).length >= 100, `a maioria dos clubes tem foto de estádio (${Object.keys(api).length})`);
  assert.ok(Object.values(api).every((x) => /^https:\/\/(r2\.)?thesportsdb\.com\/images\/media\/venue\//.test(x.url)), "só fotos de estádio da TheSportsDB");
  assert.ok(api.flamengo && api.palmeiras);
});
