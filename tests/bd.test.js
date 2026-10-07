// Banco de dados: migrações e as carreiras de treinador (bd.js), num banco em memória.
const test = require("node:test");
const assert = require("node:assert");
const bd = require("../bd.js");

test.beforeEach(() => { bd.fechar(); bd.abrir(":memory:"); });
test.after(() => bd.fechar());

test("bd: as migrações rodam uma vez só", () => {
  const db = bd.abrir();
  const feitas = db.prepare("SELECT nome FROM migracoes").all().map((m) => m.nome);
  assert.ok(feitas.includes("001-inicio.sql"));
  assert.deepStrictEqual(bd.migrar(db), [], "de novo não roda nada");
});

test("bd: cria a carreira e volta pelo token, sem guardar o token", () => {
  const c = bd.criarCarreira("Thiago", { clube: "teste" });
  assert.match(c.token, /^[a-f0-9]{48}$/);
  assert.match(c.recuperacao, /^[A-Z2-9]{12}$/);
  const lida = bd.carreiraPorToken(c.token);
  assert.strictEqual(lida.nome, "Thiago");
  assert.deepStrictEqual(lida.dados, { clube: "teste" });
  const linha = bd.abrir().prepare("SELECT * FROM carreiras WHERE id = ?").get(c.id);
  assert.ok(!JSON.stringify(linha).includes(c.token) && !JSON.stringify(linha).includes(c.recuperacao), "só o hash fica no banco");
  assert.strictEqual(bd.carreiraPorToken("f".repeat(48)), null);
  assert.strictEqual(bd.carreiraPorToken("não é token"), null);
});

test("bd: o código de recuperação dá um token novo e o antigo deixa de valer", () => {
  const c = bd.criarCarreira("Kizzy");
  const codigo = c.recuperacao.toLowerCase().replace(/(.{4})/g, "$1-").replace(/-$/, ""); // como a pessoa digita
  const r = bd.recuperarCarreira(codigo);
  assert.strictEqual(r.id, c.id);
  assert.notStrictEqual(r.token, c.token);
  assert.strictEqual(bd.carreiraPorToken(c.token), null);
  assert.strictEqual(bd.carreiraPorToken(r.token).nome, "Kizzy");
  assert.strictEqual(bd.recuperarCarreira("AAAAAAAAAAAA"), null);
});

test("bd: o código novo substitui o antigo, e excluir apaga a carreira de vez", () => {
  const c = bd.criarCarreira("Duda");
  const novo = bd.novoCodigoDe(c.id);
  assert.match(novo, /^[A-Z2-9]{12}$/);
  assert.notStrictEqual(novo, c.recuperacao);
  assert.strictEqual(bd.recuperarCarreira(c.recuperacao), null, "o código antigo deixa de valer");
  const r = bd.recuperarCarreira(novo);
  assert.strictEqual(r.id, c.id);
  assert.strictEqual(bd.novoCodigoDe(9999), null);
  assert.ok(bd.excluirCarreira(c.id));
  assert.strictEqual(bd.carreiraPorToken(r.token), null);
  assert.strictEqual(bd.recuperarCarreira(novo), null);
  assert.ok(!bd.excluirCarreira(c.id), "não tem o que excluir de novo");
});

test("bd: salva o andamento da carreira", () => {
  const c = bd.criarCarreira("Rafa");
  assert.ok(bd.salvarCarreira(c.id, { rodada: 3, caixa: 1500000 }));
  assert.deepStrictEqual(bd.carreiraPorToken(c.token).dados, { rodada: 3, caixa: 1500000 });
  assert.ok(!bd.salvarCarreira(9999, {}));
});

test("bd: as cartas que saíram, por jogo, e o recomeço", () => {
  bd.marcarCarta("proibida", "Praia"); bd.marcarCarta("proibida", "Praia"); bd.marcarCarta("proibida", "Café"); bd.marcarCarta("outro", "Praia");
  assert.deepStrictEqual([...bd.cartasSaidas("proibida")].sort(), ["Café", "Praia"]);
  bd.zerarCartas("proibida");
  assert.strictEqual(bd.cartasSaidas("proibida").size, 0);
  assert.strictEqual(bd.cartasSaidas("outro").size, 1, "zerar um jogo não mexe no outro");
});
