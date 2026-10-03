// public/comum.js (os utilitários das páginas) no que dá para testar sem navegador.
const test = require("node:test");
const assert = require("node:assert");
const Comum = require("../public/comum.js");

test("comum: h escapa HTML", () => {
  assert.strictEqual(Comum.h(`<b a="1">'&'</b>`), "&lt;b a=&quot;1&quot;&gt;&#39;&amp;&#39;&lt;/b&gt;");
  assert.strictEqual(Comum.h(null), "");
});

test("comum: store não quebra sem localStorage", () => {
  assert.strictEqual(Comum.store.get("x"), null);
  Comum.store.set("x", 1); Comum.store.del("x");
});

test("comum: act manda {type, ...dados}, devolve true/false e mostra o erro", async () => {
  const avisos = [], enviados = [];
  const socket = { emit: (ev, d, cb) => { enviados.push([ev, d]); cb(d.type === "ruim" ? { ok: false, error: "Não pode." } : d.type === "mudo" ? undefined : { ok: true }); } };
  const act = Comum.criarAct(socket, (m) => avisos.push(m));
  assert.strictEqual(await act("bom", { a: 1 }), true);
  assert.strictEqual(await act("ruim"), false);
  assert.strictEqual(await act("mudo"), undefined);
  assert.deepStrictEqual(enviados, [["act", { type: "bom", a: 1 }], ["act", { type: "ruim" }], ["act", { type: "mudo" }]]);
  assert.deepStrictEqual(avisos, ["Não pode.", "Sem conexão."]);
});

test("comum: relógio do servidor pelo estado e pela pergunta da hora", async () => {
  const r = Comum.relogio();
  r.doEstado(Date.now() + 5000);
  assert.ok(Math.abs(r.agora() - (Date.now() + 5000)) < 50);
  const r2 = Comum.relogio();
  r2.sincronizar({ emit: (ev, cb) => setTimeout(() => cb(Date.now() - 2000), 10) }, 2);
  await new Promise((ok) => setTimeout(ok, 400));
  assert.ok(Math.abs(r2.offset + 2000) < 30, `offset ${r2.offset}`);
  assert.ok(r2.rtt < 60 && r2.bestRtt >= 5);
});
