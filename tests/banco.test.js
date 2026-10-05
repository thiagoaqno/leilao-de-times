// Banco: a vez passa sozinha (não tem mais "Passar a vez") e imóvel com casa pode entrar numa troca.
const test = require("node:test");
const assert = require("node:assert");
const TB = require("../public/banco/tabuleiro.js");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

test("banco: a vez passa sozinha depois da jogada e a troca leva o imóvel com as casas", async () => {
  const srv = await subirServidor({ BANCO_ANIM: "0" });
  const BOARD = TB.makeBoard("normal").BOARD;
  const a = await conectar(srv.url, "/banco"), b = await conectar(srv.url, "/banco");
  try {
    const ra = await pedir(a, "create", { name: "Ana", config: { quick: true, specials: false, auction: false, startCash: 5000, maxMinutes: 0 } });
    const rb = await pedir(b, "join", { code: ra.code, name: "Beto" });
    const ids = { [ra.id]: a, [rb.id]: b };
    await pedir(a, "act", { type: "start" });

    // joga sem nunca passar a vez: só dados, comprar e pagar
    let vezes = 0, ultima = null, dono = null, imovel = null;
    for (let k = 0; k < 400 && imovel == null; k++) {
      const st = await esperarEstado(a, (s) => s.phase === "playing" && s.stage !== "moving" && !(s.stage === "done" && !s.debts.length));
      if (st.turn !== ultima) { vezes++; ultima = st.turn; }
      const meu = Object.entries(st.props).find(([i, pr]) => BOARD[i].type === "prop" && !pr.mortgaged);
      if (meu) { dono = meu[1].owner; imovel = +meu[0]; break; }
      const dev = st.debts[0];
      const quem = dev ? dev.from : st.turn, s = ids[quem];
      const tipo = dev ? "pay" : st.stage === "buy" ? (BOARD[st.buyOffer].type === "prop" ? "buy" : "decline") : "roll";
      const antes = st.seq;
      await pedir(s, "act", { type: tipo }).catch(() => {});
      await esperarEstado(a, (x) => x.seq > antes);
    }
    assert.ok(imovel != null, "alguém comprou uma cidade");
    // a vez passa sozinha: depois da compra, chega na outra pessoa sem ninguém apertar nada
    const outro = dono === ra.id ? rb.id : ra.id;
    await esperarEstado(a, (s) => s.turn === outro || s.stage === "roll");

    await pedir(ids[dono], "act", { type: "build", i: imovel });
    let st = await esperarEstado(a, (s) => s.props[imovel].houses === 1);
    await pedir(ids[dono], "act", { type: "propose", to: outro, give: { props: [imovel] }, get: { cash: 10 } });
    st = await esperarEstado(a, (s) => s.trades.length === 1);
    await pedir(ids[outro], "act", { type: "accept", id: st.trades[0].id });
    st = await esperarEstado(a, (s) => s.props[imovel].owner === outro);
    assert.strictEqual(st.props[imovel].houses, 1, "a casa vai junto com o imóvel");
    assert.ok(vezes >= 1);
  } finally { a.close(); b.close(); await srv.parar(); }
});
