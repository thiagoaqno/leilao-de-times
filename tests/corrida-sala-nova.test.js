// Corrida: a sala nova nasce em Mônaco, com as regras de F1, 5 voltas, grid de 20 (19 robôs médios), clima variável, classificação pulada,
// o pneu médio de largada e cada piloto já numa equipe (não no carro avulso). Quem manda uma config (a carreira, os outros testes) ou já
// está numa sala continua com o que escolheu.
const Pilotos = require("../public/corrida/f1-pilotos-2026.js");
const test = require("node:test");
const assert = require("node:assert/strict");
const bd = require("../bd.js");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

test("sala nova sem config: Mônaco, F1, grid de 20, clima variável, sem classificação, equipe escolhida e pneu médio; a config do organizador vale", { timeout: 30000 }, async () => {
  bd.fechar(); bd.abrir(":memory:");
  const srv = await subirServidor();
  const a = await conectar(srv.url, "/corrida"), b = await conectar(srv.url, "/corrida");
  try {
    await pedir(a, "create", { name: "Ana" }); // o botão "Abrir sala nova" não manda config
    let st = await esperarEstado(a, (s) => s.config);
    assert.equal(st.config.regras, "f1");
    assert.equal(st.config.pista, "monaco");
    assert.equal(st.config.voltas, 5);
    assert.equal(st.config.nivel, "medio");
    assert.equal(st.config.robos, 19, "19 robôs + o organizador = grid de 20");
    assert.equal(st.config.clima, "variavel");
    assert.equal(st.config.classificacao, "pular");
    assert.equal(st.config.caixas, false);
    assert.equal(st.players[0].pneu, "medio");
    // já entra com uma equipe de 2026 (não o carro avulso), e quem chega depois pega uma equipe que ainda está livre
    const eqA = st.players[0].equipe;
    assert.ok(eqA && Pilotos.EQUIPES[eqA], "o organizador já nasce numa equipe");
    await pedir(b, "join", { code: st.code, name: "Beto" });
    st = await esperarEstado(a, (s) => s.players.length === 2);
    const eqB = st.players[1].equipe;
    assert.ok(eqB && Pilotos.EQUIPES[eqB], "quem chega também entra numa equipe");
    assert.notEqual(eqB, eqA, "as equipes sem ninguém vêm primeiro");
    // o organizador muda e o que ele escolheu vale
    await pedir(a, "act", { type: "config", config: { ...st.config, regras: "galera", voltas: 10, nivel: "dificil" } });
    st = await esperarEstado(a, (s) => s.config.voltas === 10);
    assert.equal(st.config.regras, "galera"); assert.equal(st.config.nivel, "dificil");
    // uma config parcial (a carreira e os testes) segue com os padrões de sempre
    const c = await conectar(srv.url, "/corrida");
    try {
      await pedir(c, "create", { name: "Cris", config: { pista: "monza" } });
      const sc = await esperarEstado(c, (s) => s.config);
      assert.equal(sc.config.regras, "galera"); assert.equal(sc.config.voltas, 3); assert.equal(sc.config.pista, "monza");
      assert.equal(sc.config.robos, 0); assert.equal(sc.players[0].equipe, null, "com config não há equipe sorteada");
    } finally { c.close(); }
  } finally { a.close(); b.close(); await srv.parar(); bd.fechar(); }
});
