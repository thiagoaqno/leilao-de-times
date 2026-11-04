// Corrida, regras de F1: o vácuo na reta, o ar sujo na curva e o DRS.
const test = require("node:test");
const assert = require("node:assert/strict");
const F1 = require("../public/corrida/f1-regras.js");
const Sim = require("../public/corrida/sim.js");
const T = require("../public/corrida/pistas.js");
const Equipes = require("../public/corrida/f1-equipes.js");

test("vácuo só atua a partir de 100 km/h e nunca na classificação", () => {
  const tr = Sim.criarPista(T.PISTAS.interlagos, "interlagos");
  const c = Sim.novo(tr, { grid: 0, f1: true, pneu: F1.pneuNovo("medio") });
  const frente = { x: c.x + Math.cos(c.a) * 50, y: c.y + Math.sin(c.a) * 50, z: c.z, a: c.a };
  c.v = 99.9 / 0.75;
  assert.equal(Sim.vacuoAlvo(c, [frente]), 0);
  c.v = 100 / 0.75;
  assert.ok(Sim.vacuoAlvo(c, [frente]) > 0);
  const amb = { spec: Equipes.specDaEquipe("mclaren"), voltas: 10, f1: true, outros: [frente], quali: true };
  c.v = 200; c.draft = 1;
  Sim.passo(c, {}, amb, tr, []);
  assert.equal(c.draft, 0, "classificação remove inclusive vácuo acumulado");
  c.draft = 1; c.v = 99 / 0.75; amb.quali = false;
  Sim.passo(c, {}, amb, tr, []);
  assert.equal(c.draft, 0, "abaixo do limite não sobra impulso");
  c.v = 200; Sim.passo(c, {}, amb, tr, []);
  assert.ok(c.draft > 0, "na corrida acima do limite o vácuo funciona");
});

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
