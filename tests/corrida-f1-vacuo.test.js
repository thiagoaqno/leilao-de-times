// Corrida, regras de F1: o vácuo de verdade (pouco na reta, ar sujo na curva) e o DRS valendo mais que ele.
const test = require("node:test");
const assert = require("node:assert/strict");
const F1 = require("../public/corrida/f1-regras.js");

test("vácuo da F1: pouco na reta, menos que o DRS, e sem nada longe", () => {
  const longe = F1.vacuoF1(0, false), colado = F1.vacuoF1(1, false);
  assert.equal(longe.final, 0); assert.equal(longe.acel, 0); assert.equal(longe.aderencia, 1);
  assert.ok(colado.final > 0 && colado.final < 0.05, "o vácuo ganha menos velocidade final que o DRS (0,05)");
  assert.equal(colado.aderencia, 1, "na reta não tira aderência");
  // colado no vácuo, abrir o DRS ainda ganha velocidade (o teto não come o DRS)
  assert.ok(Math.min(F1.AERO_MAX, colado.final + 0.05) > colado.final + 0.04);
});

test("ar sujo: colado na curva o carro de trás perde aderência", () => {
  const curva = F1.vacuoF1(1, true), meio = F1.vacuoF1(0.5, true);
  assert.ok(curva.aderencia < 1 && curva.aderencia >= 0.85);
  assert.ok(meio.aderencia > curva.aderencia, "quanto mais colado, mais ar sujo");
  assert.equal(F1.vacuoF1(2, true).aderencia, curva.aderencia, "o draft passa de 1 não piora mais");
});
