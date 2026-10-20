// Itens da corrida: as seis recompensas e a roleta são as mesmas da Batalha.
// A sala decide coleta, uso e acerto; o navegador só envia intenção e desenha.
const Batalha = require("./public/batalha/regras.js");
const Pistas = require("./public/corrida/pistas.js");

const PICK_RADIUS = 65, HIT_RADIUS = 22, RESPAWN_MS = 5000;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const vmaxDe = (p) => (Pistas.CARROS[p && p.car] || Pistas.CARROS.equilibrado).vmax;
const CASCO = 1.7; // o casco anda a 1,7× a velocidade máxima do carro que ele persegue (o verde, a do dono)
// onde o carro está agora: a última posição recebida, empurrada pela velocidade (chega 10 vezes por segundo)
const agora = (q, now) => { const k = Math.min(0.2, (now - q.pos.at) / 1000); return { x: q.pos.x + Math.cos(q.pos.a) * q.pos.v * k, y: q.pos.y + Math.sin(q.pos.a) * q.pos.v * k }; };
const nowPos = (p) => p.pos && Date.now() - p.pos.at < 1500;

function start(room) {
  room.itemBoxes = room.config.caixas ? Pistas.boxesFor(room.config.pista) : [];
  room.boxReady = room.itemBoxes.map(() => 0);
  room.hazards = [];
  room.itemSeq = 0;
  for (const p of Object.values(room.players)) Object.assign(p, { item: null, rolling: 0, boostUntil: 0, starUntil: 0, spinUntil: 0, safeUntil: 0, pos: null });
}
function publicBoxes(room) { return room.boxReady || []; }
function publicHazards(room) { return (room.hazards || []).map(({ id, type, x, y, h, vx, vy }) => ({ id, type, x, y, h, vx: Math.round(vx || 0), vy: Math.round(vy || 0) })); }
function pick(room, p, i, emit) {
  const now = Date.now(), box = room.itemBoxes && room.itemBoxes[i];
  if (!room.config.caixas || room.phase !== "race" || now < room.startAt || p.finish != null || !box || !nowPos(p) || p.item || p.rolling > now || room.boxReady[i] > now) return false;
  if (dist(p.pos, box) > PICK_RADIUS || Math.abs(p.pos.z - box.h) > 24) return false;
  const order = room.order.map((id) => room.players[id]).filter((q) => q.finish == null).sort((a, b) => (b.pos?.prog || 0) - (a.pos?.prog || 0));
  const rank = order.length > 1 ? order.indexOf(p) / (order.length - 1) : 0.5;
  p.item = Batalha.rollItem(rank);
  p.rolling = now + 1100;
  room.boxReady[i] = now + RESPAWN_MS;
  emit("item:box", { i, id: p.id });
  return true;
}
function use(room, p, back, emit) {
  const now = Date.now();
  if (!room.config.caixas || room.phase !== "race" || now < room.startAt || p.finish != null || !nowPos(p) || !p.item || p.rolling > now || p.spinUntil > now) return false;
  const type = p.item; p.item = null;
  if (type === "banana" || type === "bomba") back = true; // banana e bomba sempre ficam para trás, no caminho de quem vem atrás
  const pos = p.pos, fx = Math.cos(pos.a), fy = Math.sin(pos.a), dir = back ? -1 : 1;
  if (type === "cogumelo") p.boostUntil = now + Pistas.TURBO_MS;
  else if (type === "estrela") p.starUntil = now + 6000;
  else {
    const d = type === "banana" ? -36 : type === "bomba" ? -70 : 32 * dir;
    const hazard = { id: ++room.itemSeq, type, owner: p.id, x: pos.x + fx * d, y: pos.y + fy * d,
      h: pos.z + 3, vel: vmaxDe(p) * CASCO, vx: 0, vy: 0, target: null, born: now,
      end: now + (type === "banana" ? 45000 : type === "bomba" ? 2200 : 4500) };
    if (type === "vermelho" && !back) {
      const targets = room.order.map((id) => room.players[id]).filter((q) => q !== p && nowPos(q) && q.finish == null && dist(pos, q.pos) < 900 && ((q.pos.x - pos.x) * fx + (q.pos.y - pos.y) * fy) > 0);
      targets.sort((a, b) => dist(pos, a.pos) - dist(pos, b.pos)); hazard.target = targets[0]?.id || null;
    }
    if (type === "vermelho" && back) hazard.type = "verde";
    if (hazard.target) hazard.vel = vmaxDe(room.players[hazard.target]) * CASCO;
    hazard.vx = fx * dir * hazard.vel; hazard.vy = fy * dir * hazard.vel;
    if (type === "banana" || type === "bomba") hazard.vx = hazard.vy = 0;
    room.hazards.push(hazard);
  }
  emit("item:use", { id: p.id, type, x: pos.x, y: pos.y, z: pos.z });
  return true;
}
function hit(room, p, hazard, now, emit) {
  if (p.starUntil > now || p.safeUntil > now) return false;
  p.spinUntil = now + 1100; p.safeUntil = now + 1700; p.boostUntil = 0;
  emit("item:hit", { id: p.id, type: hazard.type, x: p.pos.x, y: p.pos.y, z: p.pos.z });
  return true;
}
function tick(room, emit) {
  if (room.phase !== "race" || !room.config.caixas) return;
  const now = Date.now(), dt = 0.05, world = Pistas.PISTAS[room.config.pista].world;
  room.hazards = room.hazards.filter((h) => {
    if (h.type === "bomba" && now >= h.end) {
      for (const p of Object.values(room.players)) if (p.id !== h.owner && nowPos(p) && p.finish == null && dist(p.pos, h) < 105 && Math.abs(p.pos.z - h.h) < 35) hit(room, p, h, now, emit);
      emit("item:boom", { x: h.x, y: h.y, h: h.h }); return false;
    }
    if (now >= h.end) return false;
    const acerta = (pt) => { // alguém encostou no item?
      for (const p of Object.values(room.players)) {
        if (p.id === h.owner && now - h.born < 500) continue;
        if (!nowPos(p) || p.finish != null || Math.abs(p.pos.z - h.h) > 28) continue;
        if (dist(agora(p, now), pt) < HIT_RADIUS) { if (hit(room, p, h, now, emit) || p.starUntil > now) return true; }
      }
      return false;
    };
    if (h.type === "verde" || h.type === "vermelho") {
      // rápido demais para um passo só (passaria por cima do carro): anda em 4 pedacinhos e confere em cada um
      for (let k = 0; k < 4; k++) {
        const target = room.players[h.target], d = dt / 4;
        if (target && nowPos(target)) {
          const alvo = agora(target, now), want = Math.atan2(alvo.y - h.y, alvo.x - h.x), angle = Math.atan2(h.vy, h.vx);
          const turn = Math.atan2(Math.sin(want - angle), Math.cos(want - angle));
          const next = angle + Math.max(-0.09, Math.min(0.09, turn)); h.vx = Math.cos(next) * h.vel; h.vy = Math.sin(next) * h.vel;
        }
        h.x += h.vx * d; h.y += h.vy * d;
        if (h.x < 0 || h.y < 0 || h.x > world || h.y > world) return false;
        if (acerta(h)) return false;
      }
      return true;
    }
    return !acerta(h);
  });
}
module.exports = { start, pick, use, tick, publicBoxes, publicHazards };
