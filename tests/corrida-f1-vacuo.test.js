// Corrida, regras de F1: o vácuo na reta, o ar sujo na curva e o DRS.
const test = require("node:test");
const assert = require("node:assert/strict");
const F1 = require("../public/corrida/f1-regras.js");

test("vácuo da F1: 20% na reta, DRS de 50% e sem vácuo longe", () => {
  const longe = F1.vacuoF1(0, false), colado = F1.vacuoF1(1, false);
  assert.equal(longe.final, 0); assert.equal(longe.acel, 0); assert.equal(longe.aderencia, 1);
  assert.equal(colado.final, 0.20); assert.equal(F1.DRS_GANHO, 0.50);
  assert.equal(colado.aderencia, 1, "na reta não tira aderência");
  // colado no vácuo, abrir o DRS ainda ganha velocidade (o teto não come o DRS)
  assert.ok(Math.min(F1.AERO_MAX, colado.final + F1.DRS_GANHO) > colado.final + F1.DRS_GANHO - 0.01);
});

test("ar sujo: colado na curva o carro de trás perde aderência", () => {
  const curva = F1.vacuoF1(1, true), meio = F1.vacuoF1(0.5, true);
  assert.ok(curva.aderencia < 1 && curva.aderencia >= 0.85);
  assert.ok(meio.aderencia > curva.aderencia, "quanto mais colado, mais ar sujo");
  assert.equal(F1.vacuoF1(2, true).aderencia, curva.aderencia, "o draft passa de 1 não piora mais");
});
