const test = require("node:test");
const assert = require("node:assert");
const R = require("../public/corrida/temporada/regras.js");
const Analise = require("../corrida-analise.js");

function resultado(s, pos) {
  const vagas = Array.from({ length: 22 }, (_, i) => i + 1).filter((p) => p !== pos);
  return [{ piloto: "voce", equipe: s.equipe, pos, pontos: R.PONTOS[pos - 1] || 0 }, ...R.pilotosNoGrid(s).map((p, i) => ({ piloto: p.id, equipe: p.equipe, pos: vagas[i], pontos: R.PONTOS[vagas[i] - 1] || 0 }))];
}
const analise = (g) => ({ pilotos: { voce: { g } } });

test("a vitória e as metas cumpridas pagam o bônus no caixa, uma vez só", () => {
  const s = R.criar("Piloto", "mclaren", 4, 3, 7);
  const r1 = R.registrarResultado(s, resultado(s, 1), analise(1)); // vitória (+1) e 1 pole de 1 (+3)
  assert.strictEqual(r1.resultado.financas.bonus, 4);
  const r2 = R.registrarResultado(s, resultado(s, 2), analise(1)); // a meta da pole já foi paga; 2 pódios de 2 (+4)
  assert.strictEqual(r2.resultado.financas.bonus, 4);
  const r3 = R.registrarResultado(s, resultado(s, 3), analise(2));
  assert.strictEqual(r3.resultado.financas.bonus, 0);
  assert.ok(R.objetivos(s).bonus.every((m) => m.pago));
});

test("save antigo sem contrato abre e o contrato segue sozinho na virada", () => {
  const s = R.criar("Piloto", "cadillac", 4, 3, 7);
  delete s.contrato;
  assert.strictEqual(R.contrato(s).restam, 4);
  s.gp = s.tamanho; R.proximaTemporada(s);
  assert.strictEqual(s.ano, 2); assert.strictEqual(R.contrato(s).restam, 4);
});

test("renovar exige confiança e estende o contrato", () => {
  const s = R.criar("Piloto", "mclaren", 4, 3, 7);
  R.renovar(s, 2);
  assert.strictEqual(R.contrato(s).fim, 3);
  assert.throws(() => R.renovar(s, 1), /já cobre/);
  const fraca = R.criar("Piloto", "mclaren", 8, 3, 7);
  for (let i = 0; i < 7; i++) R.registrarResultado(fraca, resultado(fraca, 20));
  assert.ok(R.perspectiva(fraca).confianca < 25);
  assert.throws(() => R.renovar(fraca, 1), /diretoria/);
});

test("as propostas abrem nas últimas etapas e só assinam depois do último GP", () => {
  const s = R.criar("Piloto", "cadillac", 4, 3, 7);
  assert.deepStrictEqual(R.propostas(s), []);
  for (let i = 0; i < 3; i++) R.registrarResultado(s, resultado(s, 1));
  const [p] = R.propostas(s);
  assert.ok(p);
  assert.throws(() => R.aceitarProposta(s, p.equipe), /último GP/);
  R.registrarResultado(s, resultado(s, 1));
  R.aceitarProposta(s, p.equipe);
  assert.strictEqual(s.equipe, p.equipe);
  assert.ok(R.tabelas(s).pilotos.some((x) => x.id === s.piloto2));
  assert.strictEqual(s.bonus, 0);
  assert.throws(() => R.aceitarProposta(s, "nao-existe"), /proposta/);
});

test("a análise anota voltas, setores, posição e safety car e faz um resumo do GP", () => {
  const a = { id: "a", laps: 0, bot: false, grid: 2, compostos: ["medio", "duro"], paradas: [{ volta: 1, tempo: 22.1, composto: "duro" }], finish: 180, acrescimo: 5 };
  const b = { id: "b", laps: 0, bot: true, grid: 0, piloto: { id: "ver" } };
  const room = { order: ["a", "b"], players: { a, b }, config: { voltas: 2, hora: "dia" }, direcao: { safety: { ate: 1 }, amarelo: null }, clima: null };
  Analise.setor(a, 4, 1000 + 20000); Analise.setor(a, 8, 1000 + 50000);
  b.laps = 1; Analise.volta(room, b, 79, 1000);
  a.laps = 1; Analise.volta(room, a, 80, 1000);
  a.laps = 2; Analise.volta(room, a, 75.5, 81000);
  room.resultado = [{ id: "a" }, { id: "b" }];
  const r = Analise.resumo(room, (p) => (p.bot ? p.piloto.id : "voce"));
  assert.deepStrictEqual(r.pilotos.voce.v, [80, 75.5]);
  assert.deepStrictEqual(r.pilotos.voce.p, [2, 1]);
  assert.strictEqual(r.pilotos.voce.g, 3);
  assert.strictEqual(r.pilotos.voce.mv, 2);
  assert.deepStrictEqual(r.pilotos.voce.sv[0], [20, 30, 30]);
  assert.deepStrictEqual(r.sc, [1, 2]);
  assert.strictEqual(r.safeties, 1);
  assert.strictEqual(r.pilotos.voce.t, 185);
});
