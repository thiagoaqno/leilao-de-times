// Calibração do Leclerc: Mônaco, ar livre e pneu médio; compara a física real com a referência anterior.
const test = require("node:test");
const assert = require("node:assert/strict");
const { simular } = require("../ferramentas/calibrar-monaco.js");
const { podeUsar } = require("../corrida-monaco-calibracao.js");

test("calibração de Mônaco: voltas livres sem sair ou bater, com tempo próximo do anterior", { timeout: 60000 }, () => {
  const anterior = [], calibrado = [];
  for (const semente of [901, 902, 903, 904]) {
    const a = simular({ semente, voltas: 2 }), b = simular({ semente, voltas: 2, experimento: true });
    assert.equal(a.tempos.length, 2); assert.equal(b.tempos.length, 2); assert.equal(b.dnf, false);
    for (const volta of b.tempos) { assert.equal(volta.batidas, 0); assert.equal(volta.fora, 0); assert.equal(volta.recuperacoes, 0); assert.equal(volta.calibracao, 1); }
    anterior.push(...a.tempos); calibrado.push(...b.tempos);
  }
  const media = (voltas) => voltas.reduce((s, v) => s + v.tempo, 0) / voltas.length;
  assert.ok(media(calibrado) <= media(anterior) * 1.05, `média ${media(calibrado)} s versus ${media(anterior)} s`);
});

test("calibração fica restrita ao piloto e às condições avaliadas", () => {
  const F1 = { climaEm: (c) => ({ agua: c?.agua || 0 }) }, room = { config: { pista: "monaco", nivel: "dificil" }, direcao: {} };
  const p = { piloto: { id: "leclerc" }, spec: { chave: "5-3-3-3-2-3" }, pos: { x: 0, y: 0 } }, ia = { perfilCalibrado: {}, sim: { x: 0, y: 0, pneu: { composto: "medio", desgaste: 0 } } };
  assert.equal(podeUsar(room, p, ia, [p.pos], 0, F1), true);
  assert.equal(podeUsar(room, { ...p, piloto: { id: "hamilton" } }, ia, [], 0, F1), false);
  assert.equal(podeUsar({ ...room, config: { pista: "interlagos", nivel: "dificil" } }, p, ia, [], 0, F1), false);
  assert.equal(podeUsar({ ...room, config: { pista: "monaco", nivel: "medio" } }, p, ia, [], 0, F1), false);
  assert.equal(podeUsar({ ...room, clima: { agua: 1 } }, p, ia, [], 0, F1), false);
  assert.equal(podeUsar(room, p, ia, [p.pos, { x: 100, y: 0 }], 0, F1), false);
  assert.equal(podeUsar(room, { ...p, dano: 1 }, ia, [], 0, F1), false);
  assert.equal(podeUsar(room, { ...p, spec: { chave: "outra" } }, ia, [], 0, F1), false);
  assert.equal(podeUsar(room, p, { ...ia, sim: { ...ia.sim, pneu: { composto: "chuva", desgaste: 0 } } }, [], 0, F1), false);
});

// Com desgaste acumulado, o limite de aderência muda; a comparação não promete ausência de toques.
test("duas voltas com o mesmo pneu: calibração não piora os contatos no conjunto medido", { timeout: 60000 }, () => {
  let antes = 0, depois = 0;
  for (const semente of [901, 902, 903, 904]) {
    const a = simular({ semente, voltas: 2, renovarPorVolta: false });
    const b = simular({ semente, voltas: 2, renovarPorVolta: false, experimento: true });
    assert.equal(a.tempos.length, 2); assert.equal(b.tempos.length, 2);
    antes += a.tempos.reduce((n, v) => n + v.batidas, 0); depois += b.tempos.reduce((n, v) => n + v.batidas, 0);
  }
  assert.ok(depois < antes, `calibrado ${depois} contatos; anterior ${antes}`);
});

test("a linha exibida em Mônaco usa o mesmo deslocamento do piloto calibrado", async () => {
  const R = require("../corrida-robos.js"), E = require("../public/corrida/f1-equipes.js");
  await R.prepararTracado("monaco");
  const linha = R.linhaF1Pronta("monaco"), pf = R.perfil("monaco", E.specDaEquipe("ferrari"), 0);
  assert.equal(linha.lat.length, pf.n);
  assert.equal(linha.velocidades.length, pf.n);
  assert.ok(linha.velocidades.every((v) => Number.isFinite(v) && v > 0));
  const C = require("../corrida-monaco-calibracao.js");
  assert.equal(C.validaPara(pf.pts), true);
  const alterada = pf.pts.map((p, i) => i === 0 ? { ...p, x: p.x + 1 } : p);
  assert.equal(C.validaPara(alterada), false, "um circuito alterado não usa a calibração antiga");
  for (let i = 0; i < pf.n; i += 31) assert.ok(Math.abs(linha.lat[i] - pf.lat[(i + 2) % pf.n] * C.pesoDaLinha(((i + 2) % pf.n) / pf.n)) <= 0.0051);
});
