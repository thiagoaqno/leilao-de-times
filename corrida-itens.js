// Itens da corrida, como no Mario Kart: os seis da Batalha (banana, casco verde, casco vermelho, cogumelo, estrela e
// bomba) e os cinco só da corrida: casco azul (voa até o líder e explode), raio (encolhe todos os outros), cogumelo
// triplo (três turbos), lula (tinta na tela de quem está na frente) e bala (piloto automático, derrubando quem
// estiver no caminho). A roleta dá os mais fortes para quem vem atrás.
// A sala decide coleta, uso e acerto; o navegador só envia intenção e desenha.
const Pistas = require("./public/corrida/pistas.js");

const PICK_RADIUS = 65, HIT_RADIUS = 22, RESPAWN_MS = 5000;
const SPIN_MS = 1100, SAFE_MS = 1700, ESTRELA_MS = 6000, BALA_MS = 3500, TINTA_MS = 4500, AZUL_RAIO = 75;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const vmaxDe = (p) => (Pistas.CARROS[p && p.car] || Pistas.CARROS.equilibrado).vmax;
const CASCO = 1.7; // o casco anda a 1,7× a velocidade máxima do carro que ele persegue (o verde, a do dono)
const AZUL = 2.1; // o azul voa mais rápido: alcança o líder de qualquer lugar da pista
// onde o carro está agora: a última posição recebida, empurrada pela velocidade (chega 10 vezes por segundo)
const agora = (q, now) => { const k = Math.min(0.2, (now - q.pos.at) / 1000); return { x: q.pos.x + Math.cos(q.pos.a) * q.pos.v * k, y: q.pos.y + Math.sin(q.pos.a) * q.pos.v * k }; };
const nowPos = (p) => p.pos && Date.now() - p.pos.at < 1500;
const ITENS = ["banana", "verde", "vermelho", "cogumelo", "triplo", "estrela", "bomba", "azul", "raio", "lula", "bala"];
// a roleta pela colocação (rank: 0 = líder, 1 = último), no jeito do Mario Kart: na frente, banana e casco verde
// para se defender; atrás, cogumelos, estrela, bala, casco azul e raio para voltar para a briga
function rollItem(rank, rnd = Math.random) {
  const w = {
    banana: 4 - 2.8 * rank, verde: 4 - 2 * rank, vermelho: 0.8 + 2.4 * rank, cogumelo: 1.6 + 0.8 * rank, triplo: 0.2 + 2.2 * rank,
    estrela: 1.6 * rank, bomba: 0.4 + 1.2 * rank, azul: 2.4 * Math.max(0, rank - 0.35), raio: 2.2 * Math.max(0, rank - 0.6),
    lula: 0.3 + 1.2 * rank * (1 - rank) * 2, bala: 3 * Math.max(0, rank - 0.55),
  };
  let s = 0; for (const k of ITENS) s += Math.max(0, w[k]);
  let x = rnd() * s; for (const k of ITENS) { x -= Math.max(0, w[k]); if (x <= 0) return k; }
  return "banana";
}
// a ordem da corrida agora (quem está mais adiante primeiro), só de quem ainda corre
const ordem = (room) => room.order.map((id) => room.players[id]).filter((q) => q && q.finish == null).sort((a, b) => (b.pos?.prog || 0) - (a.pos?.prog || 0));

function start(room) {
  room.itemBoxes = room.config.caixas ? Pistas.boxesFor(room.config.pista) : [];
  room.boxReady = room.itemBoxes.map(() => 0);
  room.hazards = [];
  room.itemSeq = 0;
  for (const p of Object.values(room.players)) Object.assign(p, { item: null, cargas: 0, rolling: 0, boostUntil: 0, starUntil: 0, spinUntil: 0, safeUntil: 0, shrinkUntil: 0, inkUntil: 0, balaUntil: 0, pos: null });
}
function publicBoxes(room) { return room.boxReady || []; }
function publicHazards(room) { return (room.hazards || []).map(({ id, type, x, y, h, vx, vy }) => ({ id, type, x, y, h, vx: Math.round(vx || 0), vy: Math.round(vy || 0) })); }
function pick(room, p, i, emit) {
  const now = Date.now(), box = room.itemBoxes && room.itemBoxes[i];
  if (!room.config.caixas || room.phase !== "race" || now < room.startAt || p.finish != null || !box || !nowPos(p) || p.item || p.rolling > now || room.boxReady[i] > now) return false;
  if (dist(p.pos, box) > PICK_RADIUS || Math.abs(p.pos.z - box.h) > 24) return false;
  const lista = ordem(room);
  const rank = lista.length > 1 ? lista.indexOf(p) / (lista.length - 1) : 0.5;
  p.item = rollItem(rank); p.cargas = p.item === "triplo" ? 3 : 0;
  p.rolling = now + 1100;
  room.boxReady[i] = now + RESPAWN_MS;
  emit("item:box", { i, id: p.id });
  return true;
}
const imune = (p, now) => p.starUntil > now || p.balaUntil > now;
function use(room, p, back, emit) {
  const now = Date.now();
  if (!room.config.caixas || room.phase !== "race" || now < room.startAt || p.finish != null || !nowPos(p) || !p.item || p.rolling > now || p.spinUntil > now) return false;
  const type = p.item;
  if (type === "triplo") { p.cargas = Math.max(0, (p.cargas || 1) - 1); if (!p.cargas) p.item = null; } else p.item = null;
  if (type === "banana" || type === "bomba") back = true; // banana e bomba sempre ficam para trás, no caminho de quem vem atrás
  const pos = p.pos, fx = Math.cos(pos.a), fy = Math.sin(pos.a), dir = back ? -1 : 1;
  const extra = {};
  if (type === "cogumelo" || type === "triplo") p.boostUntil = now + Pistas.TURBO_MS;
  else if (type === "estrela") p.starUntil = now + ESTRELA_MS;
  else if (type === "bala") { p.balaUntil = now + BALA_MS; p.spinUntil = 0; p.shrinkUntil = 0; }
  else if (type === "raio") {
    // todo mundo menos quem usou: roda, perde o item e fica pequeno (e lento); quem vai na frente fica mais tempo
    const lista = ordem(room).filter((q) => q !== p);
    extra.alvos = [];
    lista.forEach((q, i) => {
      if (imune(q, now)) return;
      q.shrinkUntil = now + 2500 + 3500 * (1 - (lista.length > 1 ? i / (lista.length - 1) : 0));
      q.spinUntil = now + 800; q.safeUntil = now + 800; q.boostUntil = 0;
      if (q.item && q.rolling <= now) { q.item = null; q.cargas = 0; }
      extra.alvos.push(q.id);
    });
  } else if (type === "lula") {
    // tinta na tela de todo mundo que está na frente de quem usou
    const lista = ordem(room), eu = lista.indexOf(p);
    extra.alvos = lista.slice(0, Math.max(0, eu)).filter((q) => !imune(q, now)).map((q) => { q.inkUntil = now + TINTA_MS; return q.id; });
  } else {
    const d = type === "banana" ? -36 : type === "bomba" ? -70 : 32 * dir;
    const hazard = { id: ++room.itemSeq, type, owner: p.id, x: pos.x + fx * d, y: pos.y + fy * d,
      h: pos.z + 3, vel: vmaxDe(p) * CASCO, vx: 0, vy: 0, target: null, born: now,
      end: now + (type === "banana" ? 45000 : type === "bomba" ? 2200 : type === "azul" ? 15000 : 4500) };
    if (type === "vermelho" && !back) {
      const targets = room.order.map((id) => room.players[id]).filter((q) => q !== p && nowPos(q) && q.finish == null && dist(pos, q.pos) < 900 && ((q.pos.x - pos.x) * fx + (q.pos.y - pos.y) * fy) > 0);
      targets.sort((a, b) => dist(pos, a.pos) - dist(pos, b.pos)); hazard.target = targets[0]?.id || null;
    }
    if (type === "vermelho" && back) hazard.type = "verde";
    if (type === "azul") { // vai atrás do líder (de quem está na frente de todos, sem contar quem usou)
      const lider = ordem(room).find((q) => q !== p && nowPos(q));
      if (lider) { hazard.target = lider.id; hazard.x = pos.x; hazard.y = pos.y; hazard.h = pos.z + 30; } else hazard.type = "verde";
    }
    if (hazard.target) hazard.vel = vmaxDe(room.players[hazard.target]) * (hazard.type === "azul" ? AZUL : CASCO);
    hazard.vx = fx * dir * hazard.vel; hazard.vy = fy * dir * hazard.vel;
    if (type === "banana" || type === "bomba") hazard.vx = hazard.vy = 0;
    room.hazards.push(hazard);
  }
  emit("item:use", { id: p.id, type, x: pos.x, y: pos.y, z: pos.z, ...extra });
  return true;
}
function hit(room, p, hazard, now, emit) {
  if (imune(p, now) || p.safeUntil > now) return false;
  p.spinUntil = now + SPIN_MS; p.safeUntil = now + SAFE_MS; p.boostUntil = 0;
  emit("item:hit", { id: p.id, type: hazard.type, x: p.pos.x, y: p.pos.y, z: p.pos.z });
  return true;
}
// a explosão (bomba e casco azul): todo mundo perto roda
function explodir(room, h, raio, now, emit, poupa = null) {
  for (const p of Object.values(room.players)) if (p.id !== poupa && nowPos(p) && p.finish == null && dist(agora(p, now), h) < raio && Math.abs(p.pos.z - h.h) < 45) hit(room, p, h, now, emit);
  emit("item:boom", { x: h.x, y: h.y, h: h.h, type: h.type });
}
function tick(room, emit) {
  if (room.phase !== "race" || !room.config.caixas) return;
  const now = Date.now(), dt = 0.05, world = Pistas.PISTAS[room.config.pista].world;
  // de estrela ou de bala, quem encosta nos outros derruba (como no Mario Kart)
  const correndo = Object.values(room.players).filter((p) => nowPos(p) && p.finish == null);
  for (const p of correndo) if (imune(p, now)) for (const q of correndo) {
    if (q === p || Math.abs(p.pos.z - q.pos.z) > 20 || dist(agora(p, now), agora(q, now)) > HIT_RADIUS * 1.4) continue;
    hit(room, q, { type: p.balaUntil > now ? "bala" : "estrela" }, now, emit);
  }
  room.hazards = room.hazards.filter((h) => {
    if (h.type === "bomba" && now >= h.end) { explodir(room, h, 105, now, emit, h.owner); return false; }
    if (now >= h.end) return false;
    const acerta = (pt) => { // alguém encostou no item?
      for (const p of Object.values(room.players)) {
        if (p.id === h.owner && now - h.born < 500) continue;
        if (!nowPos(p) || p.finish != null || Math.abs(p.pos.z - h.h) > 28) continue;
        if (dist(agora(p, now), pt) < HIT_RADIUS) { if (hit(room, p, h, now, emit) || imune(p, now)) return true; }
      }
      return false;
    };
    if (h.type === "azul") {
      // voa por cima de todo mundo até o alvo e desce em cima dele; o alvo terminou ou sumiu: vai para o novo líder
      let target = room.players[h.target];
      if (!target || target.finish != null || !nowPos(target)) { target = ordem(room).find((q) => q.id !== h.owner && nowPos(q)); h.target = target?.id || null; }
      if (!target) return false;
      const alvo = agora(target, now), dx = alvo.x - h.x, dy = alvo.y - h.y, d = Math.hypot(dx, dy), passo = h.vel * dt;
      h.h += ((target.pos.z || 0) + (d < 160 ? 4 : 30) - h.h) * Math.min(1, dt * 4);
      if (d <= Math.max(passo, 26)) { h.x = alvo.x; h.y = alvo.y; explodir(room, h, AZUL_RAIO, now, emit); return false; }
      h.vx = (dx / d) * h.vel; h.vy = (dy / d) * h.vel; h.x += h.vx * dt; h.y += h.vy * dt;
      return true;
    }
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
module.exports = { start, pick, use, tick, publicBoxes, publicHazards, rollItem, ITENS };
