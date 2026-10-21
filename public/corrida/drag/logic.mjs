// Regras do drag: acelerador manual, câmbio manual e três faixas.
export const TOP_SPEEDS = [62, 104, 148, 197, 258]; // km/h por marcha
export const LANE_X = [-4.4, 0, 4.4];
export const PERFECT_MIN = 0.78;
export const PERFECT_MAX = 0.94;
export const ENGINE_LIMIT_SECONDS = 4;
export const ENGINE_RECOVERY_RATE = 0.35;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function rpmFor(speed, gear) {
  const top = TOP_SPEEDS[gear - 1];
  const low = gear === 1 ? 0 : TOP_SPEEDS[gear - 2] * 0.58;
  return clamp(0.19 + (speed - low) / Math.max(20, top - low) * 0.81, 0.19, 1.4);
}

export function makeCar({ lane = 1, z = 0, speed = 0, gear = 1 } = {}) {
  return { lane, targetLane: lane, laneFrom: lane, laneTime: 1, x: LANE_X[lane], z,
    speed, gear, rpm: rpmFor(speed, gear), shiftCut: 0, collisionTime: 0, overrev: 0, engineBlown: false };
}

export function requestLane(car, direction, rivals = []) {
  const next = clamp(car.targetLane + direction, 0, 2);
  if (next === car.targetLane) return false;
  // Evita uma entrada impossível ao lado de outro carro. Uma manobra já iniciada pode ser revertida.
  if (rivals.some((r) => Math.abs(r.z - car.z) < 7 && Math.abs(r.x - LANE_X[next]) < 2.7)) return false;
  car.laneFrom = car.x;
  car.targetLane = next;
  car.laneTime = 0;
  return true;
}

export function shift(car, direction) {
  if (car.shiftCut > 0.04) return false;
  const next = clamp(car.gear + direction, 1, TOP_SPEEDS.length);
  if (next === car.gear) return false;
  car.gear = next;
  car.shiftCut = 0.19;
  car.rpm = rpmFor(car.speed, next);
  return true;
}

export function stepCar(car, dt, rivals = [], gas = false) {
  if (car.engineBlown || dt <= 0) return { collision: false, blown: false };
  dt = Math.min(dt, 0.05);
  car.shiftCut = Math.max(0, car.shiftCut - dt);
  car.collisionTime = Math.max(0, car.collisionTime - dt);
  car.laneTime = Math.min(1, car.laneTime + dt / 0.42);
  const u = car.laneTime;
  const eased = u * u * (3 - 2 * u);
  car.x = car.laneFrom + (LANE_X[car.targetLane] - car.laneFrom) * eased;
  if (u === 1) car.lane = car.targetLane;

  const top = TOP_SPEEDS[car.gear - 1];
  car.rpm = rpmFor(car.speed, car.gear);
  const torque = car.rpm < 0.45 ? 0.55 + car.rpm : car.rpm > 0.95 ? 0.45 : 1.05;
  const acceleration = !gas || car.shiftCut > 0 ? -8 : car.speed >= top ? 0 : (car.gear === 1 ? 27 : 18) * torque;
  car.speed = clamp(car.speed + (acceleration - car.speed * 0.015) * dt, 0, 272);
  car.z += car.speed / 3.6 * dt;

  let collision = false;
  for (const rival of rivals) {
    const dx = Math.abs(car.x - rival.x), dz = rival.z - car.z;
    if (dx >= 2.5 || Math.abs(dz) >= 5.8) continue;
    if (dz >= 0) {
      // Encosta no carro à frente e acompanha seu ritmo; sem velocidade negativa nem ricochete.
      const overlap = 5.8 - dz;
      car.z -= Math.min(overlap * 0.72, 1.8);
      car.speed = Math.min(car.speed, rival.speed + 2);
    } else {
      car.z += Math.min(5.8 + dz, 0.65);
      car.speed = Math.max(car.speed, rival.speed * 0.75);
    }
    if (car.collisionTime <= 0) { collision = true; car.collisionTime = 0.45; }
  }
  car.rpm = rpmFor(car.speed, car.gear);
  car.overrev = clamp(car.overrev + (car.rpm > PERFECT_MAX ? dt : -dt * ENGINE_RECOVERY_RATE), 0, ENGINE_LIMIT_SECONDS);
  if (car.overrev >= ENGINE_LIMIT_SECONDS) car.engineBlown = true;
  return { collision, blown: car.engineBlown };
}
