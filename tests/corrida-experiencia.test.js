const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/pistas.js");
const Itens = require("../corrida-itens.js");

test("Rio refeito e circuitos longos têm volta, relevo e caixas válidos", () => {
  for (const id of ["rio", "serra", "deserto"]) {
    const pista = T.PISTAS[id], pts = T.elevate(T.sample(pista.points), pista.hills);
    assert.ok(pts.length * 6 > 8000, `${id} deve ser uma volta longa`);
    assert.ok(pts.every((p) => Number.isFinite(p.h) && p.x > 0 && p.y > 0 && p.x < pista.world && p.y < pista.world));
    const boxes = T.boxesFor(id);
    assert.equal(boxes.length, 18);
    assert.ok(boxes.every((b) => Number.isFinite(b.h) && b.x > 0 && b.y > 0 && b.x < pista.world && b.y < pista.world));
  }
});

test("caixa exige opção, posição recente e respeita recarga; item só pode ser usado após a roleta", () => {
  const p = { id: "a", finish: null }, q = { id: "b", finish: null };
  const room = { config: { pista: "rio", caixas: false }, phase: "race", startAt: Date.now() - 5000,
    order: ["a", "b"], players: { a: p, b: q } };
  const events = [], emit = (type, data) => events.push({ type, data });
  Itens.start(room);
  assert.equal(Itens.pick(room, p, 0, emit), false);
  room.config.caixas = true; Itens.start(room);
  const box = room.itemBoxes[0]; p.pos = { x: box.x + 300, y: box.y, z: box.h, a: 0, v: 200, prog: 50, at: Date.now() };
  assert.equal(Itens.pick(room, p, 0, emit), false);
  p.pos.x = box.x;
  assert.equal(Itens.pick(room, p, 0, emit), true);
  assert.ok(p.item);
  assert.equal(Itens.pick(room, q, 0, emit), false);
  assert.equal(Itens.use(room, p, false, emit), false);
  p.rolling = Date.now() - 1; p.item = "cogumelo";
  assert.equal(Itens.use(room, p, false, emit), true);
  assert.ok(p.boostUntil > Date.now());
  assert.equal(p.item, null);
  assert.ok(events.some((e) => e.type === "item:box"));
  assert.ok(events.some((e) => e.type === "item:use"));
});

test("banana acerta rival próximo, estrela protege e bomba expira", () => {
  const now = Date.now(), p = { id: "a", finish: null, pos: { x: 500, y: 500, z: 0, a: 0, v: 0, prog: 5, at: now } },
    q = { id: "b", finish: null, pos: { x: 565, y: 500, z: 0, a: 0, v: 0, prog: 6, at: now } };
  const room = { config: { pista: "rio", caixas: true }, phase: "race", startAt: now - 5000,
    order: ["a", "b"], players: { a: p, b: q } };
  const events = [], emit = (type) => events.push(type); Itens.start(room);
  p.pos = { x: 500, y: 500, z: 0, a: 0, v: 0, prog: 5, at: Date.now() };
  q.pos = { x: 565, y: 500, z: 0, a: 0, v: 0, prog: 6, at: Date.now() };
  p.item = "banana"; assert.equal(Itens.use(room, p, false, emit), true);
  Itens.tick(room, emit); assert.ok(q.spinUntil > Date.now());
  q.spinUntil = 0; q.safeUntil = 0; q.starUntil = Date.now() + 6000;
  p.item = "bomba"; Itens.use(room, p, false, emit);
  const bomb = room.hazards.find((h) => h.type === "bomba"); bomb.x = q.pos.x; bomb.y = q.pos.y; bomb.end = Date.now() - 1;
  Itens.tick(room, emit);
  assert.equal(q.spinUntil, 0);
  assert.ok(events.includes("item:boom"));
});

test("ajuda do pelotão é pequena e desaparece perto da chegada", async () => {
  const { ajudaDePelotao } = await import("../public/corrida/equilibrio.js");
  assert.equal(ajudaDePelotao(1, 1, 0), 0);
  assert.equal(ajudaDePelotao(1, 1.5, 0, false), 0);
  const full = ajudaDePelotao(1, 1.5, 0);
  assert.ok(full > 0 && full <= 0.055);
  assert.ok(ajudaDePelotao(1, 1.5, 0.97) < full);
});
