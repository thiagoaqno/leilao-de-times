// Corrida da Galera, regras de F1: a velocidade de curva dos robôs bate com a de quem joga. Dado medido: a volta limpa de um jogador em
// Interlagos (Cadillac, pneu médio novo, 49,70 s) em tests/dados. O robô calcula o limite de curva pela física do carro (dinamica.js) sobre
// a linha de MENOR curvatura (não a mais curta, que fechava o raio no ápice), e o volante olha mais longe e contra-esterça pela deriva.
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/pistas.js");
const F1 = require("../public/corrida/f1-regras.js");
const Eq = require("../public/corrida/f1-equipes.js");
const Robos = require("../corrida-robos.js");
const Direcao = require("../corrida-f1-direcao.js");
const volta = require("./dados/volta-interlagos-cadillac.json");

const TEMPO_USUARIO = volta.tempo; // s
// um robô difícil sozinho (Cadillac, médio novo), 3 voltas no tempo de mentira; devolve o tempo das voltas contadas pelo progresso do carro
function solo(pista, voltas = 3) {
  const agora = Date.now, aleatorio = Math.random; let relogio = agora(); Date.now = () => relogio; Math.random = F1.sorteio(`solo:${pista}`);
  try {
    Robos.usarFonte(() => []);
    const room = { config: { pista, regras: "f1", caixas: false, robos: 1, nivel: "dificil", voltas: voltas + 1 }, players: {}, order: [], phase: "race", startAt: relogio, semente: 4321, finishOrder: [] };
    Robos.preparar(room, ["#a"], () => "x");
    const p = room.players[room.order[0]]; p.spec = Eq.specDaEquipe("cadillac");
    Object.assign(p, { grid: 0, laps: 0, sector: T.SECTORS - 1, started: false, finish: null });
    Robos.largar(room);
    p.ia.pneu = F1.pneuNovo("medio"); p.ia.sim.pneu = p.ia.pneu; p.pneu = p.pneuAtual = "medio"; p.ia.plano = null; // o pneu do dado medido
    Direcao.iniciar(room);
    const pf = Robos.perfil(pista, p.spec, 0), n = pf.n, cruz = [], vPorIdx = new Float64Array(n), r = { batidas: 0, avisos: 0, maxLat: 0, pf, ideal: Robos.idealDe(pista, p.spec) };
    let ultima = -1;
    const setor = (q, s) => { if (s === (q.sector + 1) % T.SECTORS) { q.sector = s; if (s === 0 && ++q.laps > voltas) q.finish = 1; } };
    const emit = (e, d) => { if (e === "batida") { r.batidas++; Direcao.bater(room, p, d.forca, d.tipo, relogio, () => {}); } };
    for (let t = 0; t < 400 && p.finish == null; t += 0.05) {
      relogio += 50; if (p.pos) Direcao.registrar(room, p, p.pos, relogio, () => {});
      Robos.passo(room, 0.05, setor, emit);
      const c = p.ia.sim, lap = Math.floor(c.prog / n);
      if (lap !== ultima) { cruz.push(t); ultima = lap; }
      if (lap >= 2) vPorIdx[c.idx] = c.v;
      if (lap >= 1) r.maxLat = Math.max(r.maxLat, Math.abs(p.ia.lat));
    }
    r.voltas = cruz.slice(1).map((x, i) => x - cruz[i]).slice(0, voltas); r.vPorIdx = vPorIdx; r.avisos = p.avisosLimite | 0; r.dano = p.dano | 0; r.meia = T.PISTAS[pista].width / 2;
    return r;
  } finally { Date.now = agora; Math.random = aleatorio; Robos.usarFonte(() => null); }
}

test("o ideal do robô Cadillac em Interlagos fica no tempo da volta limpa de quem joga (49,7 s, 4%)", () => {
  const ideal = Robos.idealDe("interlagos", Eq.specDaEquipe("cadillac"));
  assert.ok(Math.abs(ideal / TEMPO_USUARIO - 1) <= 0.04, `ideal ${ideal.toFixed(2)} s contra ${TEMPO_USUARIO} s`);
});

test("robô difícil sozinho: a volta lançada fica a menos de 6% do ideal, sem bater nem sair da pista (Interlagos e Mônaco)", { timeout: 120000 }, () => {
  for (const pista of ["interlagos", "monaco"]) {
    const r = solo(pista), lancada = Math.min(...r.voltas.slice(1));
    assert.ok(lancada <= r.ideal * 1.06, `${pista}: volta lançada ${lancada.toFixed(2)} s contra ideal ${r.ideal.toFixed(2)} s (${r.voltas.map((x) => x.toFixed(1))})`);
    assert.equal(r.batidas, 0, `${pista}: bateu no muro`);
    assert.equal(r.avisos, 0, `${pista}: saiu da pista`);
    assert.ok(r.maxLat <= r.meia, `${pista}: passou do limite da pista (${r.maxLat.toFixed(0)} de ${r.meia})`);
  }
});

test("nas curvas de Interlagos o robô difícil anda a 90% ou mais da velocidade de quem joga", { timeout: 120000 }, () => {
  const r = solo("interlagos"), n = r.pf.n, topo = Math.max(...volta.amostras.map((a) => a[4]));
  const vu = new Float64Array(n), cont = new Float64Array(n);
  for (const a of volta.amostras) { vu[a[5]] += a[4]; cont[a[5]]++; }
  let soma = 0, k = 0;
  for (let i = 0; i < n; i++) {
    if (!cont[i] || !r.vPorIdx[i] || r.pf.kf[i] < 1 / 600 || vu[i] / cont[i] > topo * 0.93) continue; // só as curvas de verdade (o usuário abaixo de 93% da máxima)
    soma += Math.min(1.1, r.vPorIdx[i] / (vu[i] / cont[i])); k++;
  }
  assert.ok(k > 300, `poucos pontos de curva: ${k}`);
  assert.ok(soma / k >= 0.9, `velocidade de curva do robô: ${(100 * soma / k).toFixed(1)}% da do usuário`);
});
test("robô completa Suzuka com as muretas do viaduto", { timeout: 120000 }, () => {
  const r = solo("suzuka", 2);
  assert.ok(r.voltas.length >= 2, `voltas concluídas: ${r.voltas.length}`);
  assert.equal(r.batidas, 0, `batidas: ${r.batidas}`);
  assert.equal(r.avisos, 0, `saídas: ${r.avisos}`);
});
