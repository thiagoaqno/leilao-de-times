// Temas de comida do Leilão: pedido do cliente, receita secreta de cada um e as notas do júri.
const test = require("node:test");
const assert = require("node:assert");
const { io } = require("socket.io-client");
const { subirServidor } = require("./ajuda.js");
global.window = {};
require("../public/presets.js");
const Juri = require("../juri.js");
const PRESETS = global.window.PRESETS;

const semAcento = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

test("toda receita secreta pode ser montada com os ingredientes do tema", () => {
  for (const skin of Juri.SKINS) {
    const todos = Object.values(PRESETS.find((p) => p.id === skin).items).flat().map(semAcento).join(" | ");
    for (const r of Juri.RECEITAS[skin]) for (const alt of r.precisa) {
      assert.ok(alt.split("|").some((k) => Juri.cumpre({ precisa: [k] }, todos).ok), `${skin}/${r.id}: não existe ${alt}`);
    }
  }
});

test("a receita cumprida soma o bônus e o pedido do cliente mexe na nota", () => {
  const rec = Juri.receitaDe("pizza", "frango");
  const prato = ["Massa napolitana (Massa)", "Molho branco (Molho)", "Catupiry (Queijo)", "Frango desfiado (Proteína)"].map((player) => ({ player }));
  const sem = Juri.analisar("pizza", prato, 6, {}), com = Juri.analisar("pizza", prato, 6, { receita: rec });
  assert.ok(com.receitaOk);
  assert.ok(Math.abs(com.nota - sem.nota - Juri.RECEITA_BONUS) < 1e-9);
  const raiz = Juri.analisar("pizza", prato, 6, { pedido: Juri.pedidoDe("pizza", "madrugada") });
  const chique = Juri.analisar("pizza", prato, 6, { pedido: Juri.pedidoDe("pizza", "chef") });
  assert.ok(raiz.pedidoEf > chique.pedidoEf, "madrugada gosta mais de pizza raiz que o chef");
  assert.ok(Math.abs(raiz.pedidoEf) <= 2);
});

test("pelo servidor: o pedido é de todos, a receita só do dono, e o júri comenta os dois", async () => {
  const srv = await subirServidor();
  const abrir = () => { const s = io(srv.url, { transports: ["websocket"], forceNew: true }); s.ultimo = null; s.on("state", (st) => { s.ultimo = st; }); return s; };
  const pedir = (s, ev, d) => new Promise((ok, no) => s.emit(ev, d, (r) => (r && r.ok ? ok(r) : no(new Error(ev + ": " + (r && r.error))))));
  const a = abrir(), b = abrir();
  try {
    const preset = PRESETS.find((p) => p.id === "hamburguer");
    const itens = Object.entries(preset.items).flatMap(([cat, l]) => l.map((n) => `${n} (${cat})`));
    const r = await pedir(a, "create", { perTeam: 6, coins: 500, skips: 0, minBid: 1, mode: "secret", timer: 0, players: itens.join("\n"), terms: { ...preset.terms, prompt: "food", skin: "hamburguer" }, comp: { mode: "free", slots: preset.slots, req: preset.req }, hostPlays: true, hostName: "Ana" });
    const j = await pedir(b, "join", { code: r.code, name: "Beto" });
    await pedir(a, "host", { action: "start" });
    await new Promise((ok) => setTimeout(ok, 300));
    const ca = a.ultimo.comida, cb = b.ultimo.comida;
    assert.ok(ca && cb);
    assert.strictEqual(ca.pedido.id, cb.pedido.id);
    assert.ok(ca.receita && cb.receita, "cada um vê a própria receita");
    assert.notStrictEqual(ca.receita.id, cb.receita.id);
    assert.deepStrictEqual(ca.receitas, {}, "as dos outros só aparecem no fim");
  } finally { a.close(); b.close(); await srv.parar(); }
});

test("a batalha dos pratos fala do pedido e da receita de cada prato", () => {
  const preset = PRESETS.find((p) => p.id === "drink");
  const mk = (name, team) => ({ name, team: team.map((player) => ({ player })) });
  const room = {
    config: { terms: { ...preset.terms, skin: "drink" }, perTeam: 5 }, order: ["a", "b"], judge: { votes: {} },
    captains: { a: mk("Ana", ["Cachaça (Destilado)", "Limão (Cítrico/Fruta)", "Xarope simples (Adoçante)"]), b: mk("Beto", ["Vodka (Destilado)", "Morango (Cítrico/Fruta)"]) },
    comida: { pedido: "calor", receitas: { a: "caipirinha", b: "gintonica" } },
  };
  const texto = Juri.julgar(room).sections.join("\n");
  assert.match(texto, /O pedido do cliente: Tarde de verão/);
  assert.match(texto, /Receita secreta cumprida: \*\*Caipirinha raiz\*\*/);
  assert.match(texto, /A receita secreta era \*\*Gin tônica\*\*/);
});
