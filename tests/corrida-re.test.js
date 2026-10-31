// Corrida da Galera: a ré. Parado, ou quase parado, segurar só o freio engata a ré e o carro anda para trás com velocidade limitada
// (dinamica.js, a mesma física no navegador e no servidor). Antes a ré só engatava abaixo de 1 u/s e o carro que acabava de parar
// rastejava a ~1,2 u/s por mais de 1 s sem engatar.
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../public/corrida/dinamica.js");
const F1 = require("../public/corrida/f1-regras.js");
const Eq = require("../public/corrida/f1-equipes.js");

const spec = Eq.specDaEquipe("mclaren"), p = D.parametros(spec);
const roda = (c, ent, s, manual = false) => { const amb = { chao: true, pn: F1.aderencia(F1.pneuNovo("medio"), 0), manual, marchaManual: 1 }; for (let i = 0; i < Math.round(s / D.PASSO); i++) D.passo(c, ent, amb, p); return c; };

test("parado, só o freio: engata a ré e anda para trás (automático e manual)", () => {
  for (const manual of [false, true]) {
    const c = D.novoCarro(0, 0, 0); c.marcha = 1;
    roda(c, { brake: 1 }, 2, manual);
    assert.ok(c.re === true && c.v < -20, `ré em ${manual ? "manual" : "automático"}: v = ${c.v}`);
  }
});

test("quase parado e rastejando para a frente (1 a 3 u/s) com o freio: vira ré em menos de 1 s, sem ficar travado", () => {
  for (const v0 of [1.2, 2, 2.9]) {
    const c = D.novoCarro(0, 0, 0); c.marcha = 1; c.v = v0;
    roda(c, { brake: 1 }, 1);
    assert.ok(c.v < -3, `v0 ${v0}: depois de 1 s está a ${c.v}`);
  }
});

test("a ré tem velocidade limitada (uns 70 u/s) e com o acelerador não engata", () => {
  const c = D.novoCarro(0, 0, 0); c.marcha = 1;
  roda(c, { brake: 1 }, 15);
  assert.ok(c.v < -50 && c.v > -75, `velocidade máxima de ré ${c.v}`);
  const d = D.novoCarro(0, 0, 0); d.marcha = 1;
  roda(d, { brake: 1, gas: 1 }, 2);
  assert.ok(!d.re && d.v >= -0.5, "freio e acelerador juntos não dão ré");
});

test("andando a mais de 3 u/s o freio freia (não dá ré de repente)", () => {
  const c = D.novoCarro(0, 0, 0); c.marcha = 1; c.v = 60;
  roda(c, { brake: 1 }, 0.1);
  assert.ok(c.v > 0 && !c.re);
});
