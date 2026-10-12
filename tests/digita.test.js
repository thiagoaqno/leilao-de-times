// Corrida de Digitação: as contas da frase e uma partida de uma rodada pelo servidor.
const test = require("node:test");
const assert = require("node:assert");
const D = require("../public/digita/frases.js");
const { subirServidor, conectar, pedir } = require("./ajuda.js");

test("digita: frases, prefixo certo, palavras por minuto e pontos por lugar", () => {
  assert.ok(D.FRASES.length >= 40 && new Set(D.FRASES).size === D.FRASES.length);
  assert.ok(D.FRASES.every((f) => f.length > 25 && f.length < 90));
  const f = "O rato roeu a roupa.";
  assert.equal(D.prefixoCerto(f, ""), 0);
  assert.equal(D.prefixoCerto(f, "O rato roeu"), 11);
  assert.equal(D.prefixoCerto(f, "O rato Roeu"), 7, "maiúscula conta");
  assert.equal(D.prefixoCerto(f, f + "x"), f.length);
  assert.equal(D.wpm(300, 60), 60, "300 letras em 1 minuto = 60 palavras");
  assert.equal(D.wpm(50, 10), 60);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 9].map(D.pontosDoLugar), [10, 7, 5, 3, 2, 1, 1, 1]);
});

test("digita: uma rodada pelo servidor (contagem, digitação certa e errada, robôs, pontos)", async () => {
  const srv = await subirServidor({ DIGITA_CONTAGEM_MS: "400", DIGITA_RESULTADO_MS: "30000" });
  try {
    const a = await conectar(srv.url, "/digita"), b = await conectar(srv.url, "/digita");
    const cria = await pedir(a, "create", { name: "Ana" });
    await pedir(b, "join", { code: cria.code, name: "Beto" });
    const espera = (s, f, ms = 20000) => new Promise((ok, erro) => { const t = setTimeout(() => erro(new Error("tempo: " + (s.ultimo && s.ultimo.phase))), ms); const ver = () => { if (s.ultimo && f(s.ultimo)) { clearTimeout(t); s.off("state", ver); ok(s.ultimo); } }; s.on("state", ver); ver(); });
    await assert.rejects(pedir(b, "act", { type: "start" }), /organizador/);
    await pedir(a, "act", { type: "config", config: { rodadas: 1, bots: true } });
    await pedir(a, "act", { type: "start" });
    const run = await espera(a, (s) => s.phase === "run");
    assert.ok(D.FRASES.includes(run.frase));
    assert.equal(run.corredores.length, 4, "2 humanos + 2 robôs");
    a.emit("digitou", { texto: run.frase }); // antes do verde: não vale
    await new Promise((ok) => setTimeout(ok, 700));
    b.emit("digitou", { texto: run.frase.slice(0, 5) + "ZZ" }); // erra: não termina
    a.emit("digitou", { texto: run.frase });
    await new Promise((ok) => setTimeout(ok, 300));
    b.emit("digitou", { texto: run.frase }); // agora o Beto termina (a rodada fecha quando todo humano terminou)
    const res = await espera(a, (s) => s.phase === "result");
    const ord = res.resultado.ordem;
    const ana = ord.find((o) => o.nome === "Ana"), beto = ord.find((o) => o.nome === "Beto");
    assert.ok(ana.fim != null && ana.pontos > 0 && ana.wpm > 0);
    assert.ok(beto.fim > ana.fim, "o erro do Beto custou tempo");
    assert.equal(ord.length, 4);
    assert.ok(ord.every((o, i) => i === 0 || o.fim == null || (ord[i - 1].fim != null && ord[i - 1].fim <= o.fim)), "ordenado por tempo");
    assert.equal(res.players.find((p) => p.name === "Ana").pontos, ana.pontos);
    a.close(); b.close();
  } finally { await srv.parar(); }
});
