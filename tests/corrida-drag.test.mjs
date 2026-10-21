import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../public/corrida/drag/logic.mjs";

const { LANE_X, ZONA, ZONA_PNEU, makeCar, requestLane, shift, stepCar } = L;
const correr = (car, s, opts = {}) => { for (let i = 0; i < s / 0.02; i++) stepCar(car, 0.02, opts.outros || [], opts.gas ?? true, opts.freio); };

test("troca de faixa é suave e pode ser desfeita", () => {
  const car = makeCar({ lane: 1 });
  assert.equal(requestLane(car, 1), true);
  stepCar(car, 0.1);
  assert.ok(car.x > LANE_X[1] && car.x < LANE_X[2]);
  assert.equal(requestLane(car, -1), true);
  for (let i = 0; i < 40; i++) stepCar(car, 0.02);
  assert.ok(Math.abs(car.x - LANE_X[1]) < 0.001);
  assert.equal(car.lane, 1);
});

test("quatro faixas: não passa da beirada e não entra com carro do lado", () => {
  const car = makeCar({ lane: 0 });
  assert.equal(requestLane(car, -1), false);
  const vizinho = makeCar({ lane: 1, z: 2 });
  assert.equal(requestLane(car, 1, [vizinho]), false);
  assert.equal(car.targetLane, 0);
});

test("acelerar sobe a velocidade, soltar e frear derrubam", () => {
  const car = makeCar();
  car.rpm = 0.7; L.largar(car);
  correr(car, 2);
  const v = car.speed;
  assert.ok(v > 40);
  correr(car, 1, { gas: false });
  const solto = car.speed;
  assert.ok(solto < v);
  correr(car, 1, { gas: false, freio: true });
  assert.ok(car.speed < solto - 25);
});

test("a troca vale pelo giro: perfeita na faixa verde, boa na azul, cedo e tarde fora", () => {
  for (const [rpm, q] of [[0.9, "perfeita"], [0.83, "boa"], [0.95, "boa"], [0.7, "cedo"], [0.98, "tarde"]]) {
    const car = makeCar({ speed: 40 });
    car.rpm = rpm;
    assert.equal(shift(car, 1), q, `giro ${rpm}`);
    assert.equal(car.gear, 2);
    assert.equal(car.trocas[q], 1);
  }
  const car = makeCar();
  assert.equal(shift(car, -1), null); // já na primeira
});

test("troca perfeita rende mais que a troca cedo", () => {
  const tempoAte = (giro) => {
    const car = makeCar();
    let t = 0;
    while (car.speed < 160 && t < 30) {
      if (car.rpm >= giro && car.gear < car.marchas.length && car.shiftCut <= 0) shift(car, 1);
      stepCar(car, 0.02, [], true); t += 0.02;
    }
    return t;
  };
  assert.ok(tempoAte(0.9) < tempoAte(0.72) - 0.3);
  assert.ok(tempoAte(0.9) < tempoAte(0.995));
});

test("segurar no corte de giro estoura o motor; fora dele o motor esfria", () => {
  const car = makeCar({ speed: 64 });
  let r;
  for (let i = 0; i < (L.ENGINE_LIMIT_SECONDS + 0.5) / 0.02; i++) r = stepCar(car, 0.02, [], true);
  assert.equal(r.blown, true);
  const outro = makeCar({ speed: 64 });
  for (let i = 0; i < 2 / 0.02; i++) stepCar(outro, 0.02, [], true);
  const calor = outro.overrev;
  assert.ok(calor > 1.8 && calor < 2.1);
  outro.rpm = 0.9; shift(outro, 1);
  for (let i = 0; i < 1 / 0.02; i++) stepCar(outro, 0.02, [], false);
  assert.ok(Math.abs(outro.overrev - (calor - L.ENGINE_RECOVERY_RATE)) < 0.05);
});

test("aquecimento: o ponteiro na faixa esquenta o pneu e a largada vale pelo giro", () => {
  const car = makeCar();
  for (let i = 0; i < 4 / 0.02; i++) L.aquecer(car, 0.02, car.rpm < (ZONA_PNEU.min + ZONA_PNEU.max) / 2);
  assert.ok(car.pneu > 0.95);
  assert.equal(L.largar(car), "perfeita");
  const alto = makeCar(); alto.rpm = 0.97;
  assert.equal(L.largar(alto), "patinou");
  const baixo = makeCar(); baixo.rpm = 0.2;
  assert.equal(L.largar(baixo), "fraca");
  // pneu quente e largada perfeita chegam antes
  const frio = makeCar(); frio.rpm = 0.97; L.largar(frio);
  car.speed = 0; correr(car, 2); correr(frio, 2);
  assert.ok(car.z > frio.z + 1);
});

test("nitro empurra mais, gasta e na primeira marcha só patina", () => {
  const com = makeCar({ gear: 3, speed: 110 }), sem = makeCar({ gear: 3, speed: 110 });
  com.nitroOn = true;
  correr(com, 1); correr(sem, 1);
  assert.ok(com.speed > sem.speed + 4);
  assert.ok(com.nitro < com.nitroMax - 0.9);
  const primeira = makeCar({ speed: 20 }); primeira.pneu = 1; primeira.nitroOn = true;
  stepCar(primeira, 0.02, [], true);
  assert.ok(primeira.grip < 0.8);
});

test("vácuo enche atrás de outro piloto na mesma faixa", () => {
  const eu = makeCar({ lane: 1, z: 100, speed: 180 }), frente = makeCar({ lane: 1, z: 112, speed: 180 }), lado = makeCar({ lane: 2, z: 112, speed: 180 });
  for (let i = 0; i < 100; i++) L.atualizarVacuo(eu, [eu, frente], 0.02);
  assert.equal(eu.vacuo, 1);
  const outro = makeCar({ lane: 1, z: 100, speed: 180 });
  for (let i = 0; i < 100; i++) L.atualizarVacuo(outro, [outro, lado], 0.02);
  assert.equal(outro.vacuo, 0);
});

test("bater de frente rápido é perda total; encostar devagar só segura", () => {
  const car = makeCar({ z: 10, speed: 170 });
  const trafego = { kind: "trafego", x: LANE_X[1], z: 14.6, speed: 80, len: 4.5, w: 2.1 };
  const r = stepCar(car, 0.02, [trafego], true);
  assert.equal(r.totaled, true);
  assert.ok(car.z < trafego.z);
  const devagar = makeCar({ z: 10, speed: 100 });
  const rival = makeCar({ z: 14.5, speed: 80 });
  const r2 = stepCar(devagar, 0.02, [rival], true);
  assert.equal(r2.totaled, false);
  assert.equal(r2.collision, true);
  assert.ok(devagar.speed <= rival.speed + 1);
});

test("raspão no meio da troca de faixa devolve o carro para a faixa dele", () => {
  const car = makeCar({ lane: 1, z: 50, speed: 150 });
  assert.equal(requestLane(car, 1), true);
  const vizinho = { kind: "trafego", x: LANE_X[2], z: 50.5, speed: 150, len: 4.5, w: 2.1 };
  let raspou = false;
  for (let i = 0; i < 30; i++) { vizinho.z += 150 / 3.6 * 0.02; raspou ||= stepCar(car, 0.02, [vizinho], true).raspao; }
  assert.equal(raspou, true);
  assert.equal(car.targetLane, 1);
  assert.equal(car.totaled, false);
});

test("tráfego: mesma faixa no mesmo ritmo e nada atrás das obras", () => {
  const { trafego, obstaculos } = L.gerarTrafego(1600, L.rng(7));
  assert.ok(trafego.length > 8 && obstaculos.length >= 2);
  for (const lane of [0, 1, 2, 3]) assert.equal(new Set(trafego.filter((t) => t.lane === lane).map((t) => t.speed)).size <= 1, true);
  for (const o of obstaculos) assert.ok(!trafego.some((t) => t.lane === o.lane && t.z < o.z + 40 && t.z > o.z - 900));
});

function correrInteira(semente, comprimento = 1400) {
  const c = L.criarCorrida({ comprimento, semente, laneJogador: semente % 4 });
  const sorte = L.rng(semente * 3), j = c.jogador;
  const ia = { habilidade: 1, alvo: 0.9, nitroMarcha: 3, reflexo: 1.45, esperaFaixa: 0 };
  for (let k = 0; k < 60 * 120 && c.fase !== "fim"; k++) {
    if (c.fase !== "corrida") { L.passoCorrida(c, 1 / 60, { gas: j.rpm < 0.69 }); continue; }
    j.ia = ia; const ent = L.pilotar(j, 1 / 60, [...c.pilotos, ...c.trafego, ...c.obstaculos], sorte); j.ia = null;
    L.passoCorrida(c, 1 / 60, ent);
  }
  return c;
}

test("a corrida inteira termina, com a classificação dos quatro", () => {
  for (const semente of [1, 2, 3, 4, 5, 6]) {
    const c = correrInteira(semente);
    assert.equal(c.fase, "fim", `semente ${semente}`);
    assert.equal(c.resultado.ordem.length, 4);
    assert.ok(["chegada", "perda-total", "motor"].includes(c.resultado.motivo));
    if (c.resultado.motivo === "chegada") assert.ok(c.jogador.chegada > 20 && c.jogador.chegada < 40);
  }
});

test("a mesma semente dá a mesma corrida", () => {
  const a = correrInteira(11), b = correrInteira(11);
  assert.deepEqual(a.resultado, b.resultado);
});

test("quem dirige bem ganha a maioria das corridas", () => {
  let vitorias = 0, chegadas = 0;
  for (let s = 1; s <= 24; s++) {
    const c = correrInteira(s);
    if (c.resultado.motivo !== "chegada") continue;
    chegadas++;
    if (c.resultado.posicao === 1) vitorias++;
  }
  assert.ok(chegadas >= 20);
  assert.ok(vitorias / chegadas > 0.5, `${vitorias}/${chegadas}`);
});
