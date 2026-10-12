// Arrancada JDM: as contas do 1/4 de milha, o tuning, as apostas e uma rodada inteira pelo servidor.
const test = require("node:test");
const assert = require("node:assert");
const D = require("../public/drag/regras.js");
const { subirServidor, conectar, pedir } = require("./ajuda.js");

test("drag: os 12 JDM fazem o 1/4 de milha em tempos de carro de rua e cada peça deixa mais rápido", () => {
  assert.equal(D.CARROS.length, 12);
  for (const c of D.CARROS) {
    const t = D.estimar(D.ficha(c)).tempo;
    assert.ok(t > 12.5 && t < 16, `${c.id} ${t}`);
    let ant = t;
    for (const peca of Object.keys(D.PECAS)) {
      const f = D.ficha(c, { ...D.pecasZeradas(), [peca]: 3 }), novo = D.estimar(f).tempo;
      assert.ok(novo <= ant + 1e-9 || peca === "pneus" || peca === "cambio", `${c.id} ${peca}`);
      assert.ok(novo <= t + 0.001, `${c.id} ${peca} piorou`);
    }
  }
  const supra = D.carroPorId("jza80"), ae86 = D.carroPorId("ae86");
  assert.ok(D.estimar(D.ficha(supra)).tempo < D.estimar(D.ficha(ae86)).tempo);
  const cheio = { turbo: 3, pneus: 3, peso: 3, cambio: 3, nitro: 3 };
  assert.ok(D.estimar(D.ficha(ae86, cheio)).tempo < D.estimar(D.ficha(ae86)).tempo - 2);
});

test("drag: pneu ruim patina com muito motor; o nitro ajuda e só vale uma vez", () => {
  const s = D.carroPorId("jza80");
  const f = D.ficha(s, { ...D.pecasZeradas(), turbo: 3 });
  const c = D.correrSozinho(f, null);
  assert.ok(D.correrSozinho(D.ficha(s, { ...D.pecasZeradas(), turbo: 3, pneus: 3 })).fim < c.fim, "pneu melhor ganha");
  const n = D.ficha(s, { ...D.pecasZeradas(), nitro: 2 });
  assert.ok(D.correrSozinho(n, 2).fim < D.correrSozinho(n, null).fim);
  const r = D.novoCorredor(n); assert.equal(D.usarNitro(r), true); assert.equal(D.usarNitro(r), false);
  assert.equal(D.usarNitro(D.novoCorredor(D.ficha(s))), false, "sem a peça não tem nitro");
});

test("drag: aposta pari-mutuel divide o bolo entre quem acertou e devolve se ninguém acertou", () => {
  const ap = [{ id: "a", alvo: "x", valor: 100 }, { id: "b", alvo: "y", valor: 300 }, { id: "c", alvo: "x", valor: 300 }];
  const r = D.pagar(ap, "x");
  assert.deepEqual(r.map((x) => x.delta), [75, -300, 225]);
  assert.equal(r.reduce((s, x) => s + x.delta, 0), 0);
  assert.deepEqual(D.pagar(ap, "z").map((x) => x.delta), [0, 0, 0]);
});

test("drag: uma partida de uma rodada pelo servidor (compra, tuning, apostas, largada, pagamento)", async () => {
  const srv = await subirServidor({ DRAG_LUZES_MS: "300", DRAG_GARAGEM_MS: "20000", DRAG_APOSTAS_MS: "20000", DRAG_RESULTADO_MS: "20000" });
  try {
    const a = await conectar(srv.url, "/drag"), b = await conectar(srv.url, "/drag");
    const cria = await pedir(a, "create", { name: "Ana" });
    await pedir(b, "join", { code: cria.code, name: "Beto" });
    const espera = (s, f, ms = 15000) => new Promise((ok, erro) => { const t = setTimeout(() => erro(new Error("tempo: " + JSON.stringify(s.ultimo && s.ultimo.phase))), ms); const ver = () => { if (s.ultimo && f(s.ultimo)) { clearTimeout(t); s.off("state", ver); ok(s.ultimo); } }; s.on("state", ver); ver(); });
    await pedir(a, "act", { type: "config", config: { rodadas: 1, bots: true } });
    await pedir(a, "act", { type: "start" });
    await espera(a, (s) => s.phase === "garage");
    await assert.rejects(pedir(a, "act", { type: "pronto" }), /carro/i);
    await pedir(a, "act", { type: "carro", id: "jza80" });
    await pedir(b, "act", { type: "carro", id: "ae86" });
    await assert.rejects(pedir(b, "act", { type: "carro", id: "bnr34" }), /já tem carro/);
    await pedir(a, "act", { type: "peca", peca: "nitro" });
    await pedir(b, "act", { type: "peca", peca: "nitro" });
    await assert.rejects(pedir(b, "act", { type: "peca", peca: "xyz" }), /inválida/);
    const sa = a.ultimo.players.find((p) => p.name === "Ana");
    assert.equal(sa.caixa, 2000 - 720 - 110);
    await pedir(a, "act", { type: "pronto" }); await pedir(b, "act", { type: "pronto" });
    const bets = await espera(a, (s) => s.phase === "bets");
    assert.equal(bets.corredores.length, 4, "2 humanos + 2 robôs");
    assert.ok(bets.corredores.every((c) => c.estimativa > 10 && c.estimativa < 17));
    await pedir(a, "act", { type: "apostar", alvo: sa.id, valor: 500 });
    await pedir(b, "act", { type: "apostar", alvo: sa.id, valor: 100000 }); // passa do caixa: vira o caixa todo
    await pedir(a, "act", { type: "pronto" }); await pedir(b, "act", { type: "pronto" });
    await espera(a, (s) => s.phase === "race");
    await new Promise((ok) => setTimeout(ok, 700)); // passa o verde
    await pedir(a, "act", { type: "largar", t: Date.now() }); await pedir(b, "act", { type: "largar", t: Date.now() });
    await pedir(a, "act", { type: "nos" });
    const fim = await espera(a, (s) => s.phase === "result", 40000);
    assert.equal(fim.resultado.ordem.length, 4);
    assert.ok(fim.resultado.ordem.every((o) => o.total > 9 && o.total < 25), JSON.stringify(fim.resultado.ordem));
    const somaDelta = fim.resultado.pagamentos.reduce((s, x) => s + x.delta, 0);
    assert.equal(somaDelta, 0, "o bolo é do tamanho das apostas");
    const premio = fim.resultado.premio;
    const total = fim.players.reduce((s, p) => s + p.caixa, 0);
    assert.equal(total, 2 * 2000 - 720 - 250 - 2 * 110 + premio, "o caixa total só muda pelo carro, peças e prêmio");
    a.close(); b.close();
  } finally { await srv.parar(); }
});
