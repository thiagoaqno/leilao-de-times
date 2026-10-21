import test from "node:test";
import assert from "node:assert/strict";
import { LANE_X, PERFECT_MAX, ENGINE_RECOVERY_RATE, makeCar, requestLane, shift, stepCar } from "../public/corrida/drag/logic.mjs";

test("troca de faixa é suave e pode ser revertida", () => {
  const car = makeCar();
  assert.equal(requestLane(car, 1), true);
  stepCar(car, .1);
  assert.ok(car.x > 0 && car.x < LANE_X[2]);
  assert.equal(requestLane(car, -1), true);
  for (let i = 0; i < 30; i++) stepCar(car, .02);
  assert.ok(Math.abs(car.x) < .001);
});

test("faixa ocupada impede entrada colada no rival", () => {
  const car = makeCar(), rival = makeCar({ lane: 2, z: 3 });
  assert.equal(requestLane(car, 1, [rival]), false);
  assert.equal(car.targetLane, 1);
});

test("W acelera e soltar o acelerador reduz velocidade", () => {
  const car = makeCar();
  for (let i = 0; i < 100; i++) stepCar(car, .02, [], true);
  const speed = car.speed;
  assert.ok(speed > 0);
  for (let i = 0; i < 100; i++) stepCar(car, .02, [], false);
  assert.ok(car.speed < speed);
});

test("câmbio limita marchas e reduzir aumenta o giro", () => {
  const car = makeCar();
  assert.equal(shift(car, -1), false);
  assert.equal(shift(car, 1), true);
  assert.equal(shift(car, 1), false);
  for (let i = 0; i < 30; i++) stepCar(car, .02, [], true);
  const before = car.rpm;
  assert.equal(shift(car, -1), true);
  assert.ok(car.rpm > before);
});

test("quatro segundos de giro acima da troca perfeita explodem o motor", () => {
  const car = makeCar({ speed: 62 });
  assert.ok(car.rpm > PERFECT_MAX);
  let result;
  for (let i = 0; i < 200; i++) result = stepCar(car, .02, [], true);
  assert.equal(result.blown, true);
  assert.equal(car.engineBlown, true);
});

test("giro normal recupera lentamente o tempo de risco", () => {
  const car = makeCar({ speed: 62 });
  for (let i = 0; i < 100; i++) stepCar(car, .02, [], true);
  const debt = car.overrev;
  assert.ok(debt > 1.8 && debt < 2.1);
  assert.equal(shift(car, 1), true);
  for (let i = 0; i < 50; i++) stepCar(car, .02, [], false);
  assert.ok(Math.abs(car.overrev - (debt - ENGINE_RECOVERY_RATE)) < .05);
});

test("batida frontal reduz velocidade sem ricochete", () => {
  const car = makeCar({ z: 10, speed: 170 });
  const rival = makeCar({ z: 15.1, speed: 70 });
  const { collision } = stepCar(car, .02, [rival]);
  assert.equal(collision, true);
  assert.ok(car.speed >= 0 && car.speed <= rival.speed + 2);
  assert.ok(car.z < rival.z);
});
