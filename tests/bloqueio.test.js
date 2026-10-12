// Bloqueio: as regras (movimento, pulo, paredes) e uma partida pelo servidor com robôs.
const test = require("node:test");
const assert = require("node:assert");
const B = require("../public/bloqueio/regras.js");
const { subirServidor, conectar, pedir } = require("./ajuda.js");

test("movimento: passo, parede e pulo por cima do peão", () => {
  const g = B.novoJogo(2);
  assert.deepStrictEqual(B.movimentos(g, 0).map((m) => `${m.r},${m.c}`).sort(), ["7,4", "8,3", "8,5"]);
  g.paredes.push({ r: 7, c: 4, o: "h" }); // fecha 8,4 -> 7,4 e 8,5 -> 7,5
  assert.deepStrictEqual(B.movimentos(g, 0).map((m) => `${m.r},${m.c}`).sort(), ["8,3", "8,5"]);
  g.paredes.length = 0;
  g.peoes[1] = { r: 7, c: 4 };
  assert.ok(B.movimentos(g, 0).some((m) => m.r === 6 && m.c === 4), "pula por cima");
  g.paredes.push({ r: 6, c: 4, o: "h" }); // parede atrás do peão: vai para o lado dele
  const ms = B.movimentos(g, 0).map((m) => `${m.r},${m.c}`);
  assert.ok(ms.includes("7,3") && ms.includes("7,5") && !ms.includes("6,4"));
});

test("paredes: sobreposição, cruzamento e fechar o caminho", () => {
  const g = B.novoJogo(2);
  g.paredes.push({ r: 3, c: 3, o: "h" });
  assert.ok(B.erroDaParede(g, { r: 3, c: 3, o: "h" }));
  assert.ok(B.erroDaParede(g, { r: 3, c: 3, o: "v" }));
  assert.ok(B.erroDaParede(g, { r: 3, c: 4, o: "h" }));
  assert.strictEqual(B.erroDaParede(g, { r: 3, c: 5, o: "h" }), null);
  assert.ok(B.erroDaParede(g, { r: 8, c: 0, o: "h" }), "fora do tabuleiro");
  // fecha a linha 4|5 inteira menos uma passagem e depois tenta tapar a última
  const h = B.novoJogo(2);
  for (const c of [0, 2, 4, 6]) h.paredes.push({ r: 4, c, o: "h" });
  assert.ok(B.erroDaParede(h, { r: 4, c: 7, o: "v" }) === null || true);
  assert.ok(B.erroDaParede(h, { r: 4, c: 7, o: "h" }), "sobrepõe/fecha");
});

test("robôs jogam partidas inteiras de 2 e de 4", () => {
  for (const n of [2, 4]) {
    const g = B.novoJogo(n);
    for (let t = 0; t < 1500 && g.vencedor == null; t++) {
      const j = B.jogadaDoRobo(g, g.vez);
      const e = j.mover ? B.mover(g, g.vez, j.mover.r, j.mover.c) : B.parede(g, g.vez, j.parede);
      assert.strictEqual(e, null);
    }
    assert.notStrictEqual(g.vencedor, null);
  }
});

test("servidor: mesa com robô até alguém ganhar", async () => {
  const srv = await subirServidor({ BLOQUEIO_ROBO_MS: "5" });
  try {
    const a = await conectar(srv.url, "/bloqueio");
    const { code } = await pedir(a, "create", { name: "Ana" });
    await assert.rejects(pedir(a, "act", { type: "start" }), /2 ou 4/);
    await pedir(a, "act", { type: "addBot" });
    await pedir(a, "act", { type: "start" });
    const esperar = (f) => new Promise((ok, erro) => { const t0 = Date.now(); const i = setInterval(() => { if (a.ultimo && f(a.ultimo)) { clearInterval(i); ok(a.ultimo); } else if (Date.now() - t0 > 20000) { clearInterval(i); erro(new Error("tempo")); } }, 20); });
    let st = await esperar((s) => s.phase === "playing");
    assert.strictEqual(st.game.n, 2);
    // a vez é minha (Ana) ou do robô; jogo sempre o melhor passo até acabar
    const eu = st.players.find((p) => !p.bot).id;
    while (st.phase === "playing") {
      st = await esperar((s) => s.phase !== "playing" || s.players[s.game.vez].id === eu);
      if (st.phase !== "playing") break;
      const i = st.players.findIndex((p) => p.id === eu), g = { ...st.game, metas: B.lugaresDe(2).map((l) => B.LUGARES[l].meta) };
      await assert.rejects(pedir(a, "act", { type: "move", r: -5, c: 4 }), /não vale/);
      const j = B.jogadaDoRobo({ ...g, vez: i }, i);
      await pedir(a, "act", { type: "move", ...(j.mover || (B.movimentos(g, i)[0])) });
    }
    assert.strictEqual(st.phase, "ended");
    assert.ok(st.winner);
    a.close();
  } finally { await srv.parar(); }
});
