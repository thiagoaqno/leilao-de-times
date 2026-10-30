// O relógio do HUD de F1 (hud-mfd.js): nunca fica parado em zero nem reinicia na linha de largada (regressão do PR do HUD novo).
const test = require("node:test");
const assert = require("node:assert/strict");
const H = require("../public/corrida/hud-mfd.js");

test("antes de cruzar a linha a volta e a corrida já andam desde a largada", () => {
  const r = H.relogioDaVolta({ now: 12000, startAt: 10000, lapIni: 10000, started: false, finish: null, last: null });
  assert.equal(r.corrida, 2); assert.equal(r.volta, 2);
});
test("a volta 1 conta desde a largada, não desde a linha; as seguintes desde o começo da volta", () => {
  const r1 = H.relogioDaVolta({ now: 20000, startAt: 10000, lapIni: 10000, started: true, finish: null, last: null });
  assert.equal(r1.volta, 10);
  const r2 = H.relogioDaVolta({ now: 100000, startAt: 10000, lapIni: 80000, started: true, finish: null, last: 70 });
  assert.equal(r2.volta, 20); assert.equal(r2.corrida, 90);
});
test("antes da largada o relógio é zero e com a bandeirada para no tempo final", () => {
  assert.equal(H.relogioDaVolta({ now: 5000, startAt: 10000, lapIni: 10000, started: false }).corrida, 0);
  const f = H.relogioDaVolta({ now: 999999, startAt: 10000, lapIni: 80000, started: true, finish: 123.4, last: 70.2 });
  assert.equal(f.corrida, 123.4); assert.equal(f.volta, 70.2); assert.equal(f.parado, true);
});
test("formatos do tempo", () => {
  assert.equal(H.tempoVolta(74.803), "1:14.803"); assert.equal(H.tempoVolta(null), "—:--.---");
  assert.equal(H.tempoCorrida(754.56), "12:34.6"); assert.equal(H.tempoCorrida(null), "0:00.0");
});
test("o HUD escreve o relógio onde o jogador vê (alto à direita e página Tempos do MFD)", () => {
  const fs = require("node:fs"), p = (f) => fs.readFileSync(require("node:path").join(__dirname, "../public/corrida", f), "utf8");
  assert.match(p("hud-painel.js"), /relogioDaVolta/); assert.match(p("hud-painel.js"), /htCorrida/);
  assert.match(p("mfd.js"), /hudRelogio/); assert.match(p("index.html"), /id="hTempo"/);
});
