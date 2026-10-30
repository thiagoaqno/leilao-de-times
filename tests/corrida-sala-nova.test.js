// Corrida: a sala nova nasce com as regras de F1, 5 voltas, robôs no nível médio e o pneu médio de largada. Quem manda uma config
// (a carreira, os outros testes) ou já está numa sala continua com o que escolheu.
const test = require("node:test");
const assert = require("node:assert/strict");
const bd = require("../bd.js");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

test("sala nova sem config: F1, 5 voltas, robôs médios e pneu médio; a config do organizador vale", { timeout: 30000 }, async () => {
  bd.fechar(); bd.abrir(":memory:");
  const srv = await subirServidor();
  const a = await conectar(srv.url, "/corrida"), b = await conectar(srv.url, "/corrida");
  try {
    await pedir(a, "create", { name: "Ana" }); // o botão "Abrir sala nova" não manda config
    let st = await esperarEstado(a, (s) => s.config);
    assert.equal(st.config.regras, "f1");
    assert.equal(st.config.voltas, 5);
    assert.equal(st.config.nivel, "medio");
    assert.equal(st.config.caixas, false);
    assert.equal(st.players[0].pneu, "medio");
    // o organizador muda e o que ele escolheu vale
    await pedir(a, "act", { type: "config", config: { ...st.config, regras: "galera", voltas: 10, nivel: "dificil" } });
    st = await esperarEstado(a, (s) => s.config.voltas === 10);
    assert.equal(st.config.regras, "galera"); assert.equal(st.config.nivel, "dificil");
    // uma config parcial (a carreira e os testes) segue com os padrões de sempre
    await pedir(b, "create", { name: "Beto", config: { pista: "monza" } });
    const sb = await esperarEstado(b, (s) => s.config);
    assert.equal(sb.config.regras, "galera"); assert.equal(sb.config.voltas, 3); assert.equal(sb.config.pista, "monza");
  } finally { a.close(); b.close(); await srv.parar(); bd.fechar(); }
});
