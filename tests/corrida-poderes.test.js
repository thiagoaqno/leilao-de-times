// Os poderes do Mario Kart na corrida (corrida-itens.js): a roleta pela colocação, o casco azul, o raio, o cogumelo
// triplo, a lula e a bala, e quem está de estrela ou de bala derrubando quem encosta.
const test = require("node:test");
const assert = require("node:assert/strict");
const Itens = require("../corrida-itens.js");

// uma sala na corrida com os pilotos em fila na reta (prog: quanto já andou; o maior é o líder)
function sala(n = 4) {
  const now = Date.now(), players = {}, order = [];
  for (let k = 0; k < n; k++) {
    const id = "p" + k; order.push(id);
    players[id] = { id, name: id, car: "equilibrado", finish: null };
  }
  const room = { config: { pista: "interlagos", caixas: true }, phase: "race", startAt: now - 5000, order, players };
  Itens.start(room);
  // p0 na frente (prog 400), p3 lá atrás (prog 100), um a cada 300 de distância
  order.forEach((id, k) => { players[id].pos = { x: 2000 - k * 300, y: 1000, z: 0, a: 0, v: 200, prog: 400 - k * 100, at: now }; });
  return { room, P: (k) => players["p" + k], now };
}
const usar = (room, p, tipo, back = false) => { p.item = tipo; p.cargas = tipo === "triplo" ? 3 : 0; p.rolling = 0; const ev = []; const ok = Itens.use(room, p, back, (e, d) => ev.push([e, d])); return { ok, ev }; };

test("a roleta dá os poderes fortes para quem vem atrás, como no Mario Kart", () => {
  const conta = (rank) => { const n = {}; for (let k = 0; k < 20000; k++) { const t = Itens.rollItem(rank); n[t] = (n[t] || 0) + 1; } return n; };
  const lider = conta(0), ultimo = conta(1);
  for (const forte of ["azul", "raio", "bala", "estrela"]) assert.ok(!lider[forte], `o líder não deveria tirar ${forte}`);
  for (const forte of ["azul", "raio", "bala", "estrela", "triplo"]) assert.ok(ultimo[forte] > 400, `o último tira ${forte}`);
  assert.ok((lider.banana || 0) + (lider.verde || 0) > 12000, "o líder tira mais banana e casco verde");
  for (const t of Object.keys({ ...lider, ...ultimo })) assert.ok(Itens.ITENS.includes(t), t);
});

test("cogumelo triplo: três turbos, um por vez", () => {
  const { room, P } = sala(1), p = P(0);
  p.item = "triplo"; p.cargas = 3; p.rolling = 0;
  for (const resta of [2, 1, 0]) {
    p.boostUntil = 0;
    assert.equal(Itens.use(room, p, false, () => {}), true);
    assert.ok(p.boostUntil > Date.now(), "deu turbo");
    assert.equal(p.cargas, resta);
    assert.equal(p.item, resta ? "triplo" : null);
  }
});

test("raio: todos os outros rodam, perdem o item e encolhem; quem vai na frente fica mais tempo pequeno", () => {
  const { room, P } = sala(4);
  P(1).item = "banana"; P(1).rolling = 0;
  P(2).starUntil = Date.now() + 3000; // de estrela, o raio não pega
  const { ok, ev } = usar(room, P(3), "raio");
  assert.ok(ok);
  assert.equal(P(3).shrinkUntil, 0, "quem usou não encolhe");
  assert.equal(P(2).shrinkUntil, 0, "a estrela protege");
  assert.ok(P(0).shrinkUntil > P(1).shrinkUntil, "o líder fica mais tempo pequeno");
  assert.ok(P(1).spinUntil > Date.now() && P(1).item === null, "rodou e perdeu a banana");
  assert.deepEqual(ev.find(([e]) => e === "item:use")[1].alvos.sort(), ["p0", "p1"]);
});

test("lula: tinta só na tela de quem está na frente", () => {
  const { room, P } = sala(4);
  const { ev } = usar(room, P(2), "lula");
  assert.ok(P(0).inkUntil > Date.now() && P(1).inkUntil > Date.now());
  assert.equal(P(3).inkUntil, 0); assert.equal(P(2).inkUntil, 0);
  assert.deepEqual(ev.find(([e]) => e === "item:use")[1].alvos.sort(), ["p0", "p1"]);
});

test("casco azul: voa por cima de todo mundo até o líder e explode nele (e em quem está perto)", () => {
  const { room, P } = sala(4);
  P(1).pos.x = P(0).pos.x - 40; // o segundo colado no líder: também roda
  usar(room, P(3), "azul");
  const h = room.hazards[0];
  assert.equal(h.type, "azul"); assert.equal(h.target, "p0");
  const ev = [];
  for (let k = 0; k < 60 && room.hazards.length; k++) {
    for (const id of room.order) room.players[id].pos.at = Date.now(); // as posições continuam chegando
    Itens.tick(room, (e, d) => ev.push([e, d]));
  }
  assert.equal(room.hazards.length, 0, "explodiu");
  assert.ok(ev.some(([e, d]) => e === "item:boom" && d.type === "azul"));
  assert.ok(P(0).spinUntil > Date.now() && P(1).spinUntil > Date.now(), "o líder e quem estava colado rodaram");
  assert.equal(P(2).spinUntil, 0, "quem estava longe, não");
  assert.equal(P(3).spinUntil, 0, "quem jogou, não");
});

test("bala: piloto automático imune, e quem encosta nela (ou na estrela) roda", () => {
  const { room, P } = sala(2);
  usar(room, P(1), "bala");
  assert.ok(P(1).balaUntil > Date.now());
  P(1).pos.x = P(0).pos.x - 10; // encostou no líder
  const ev = []; Itens.tick(room, (e, d) => ev.push([e, d]));
  assert.ok(P(0).spinUntil > Date.now(), "derrubou o líder");
  assert.equal(P(1).spinUntil, 0, "a bala não roda");
  assert.ok(ev.some(([e, d]) => e === "item:hit" && d.id === "p0" && d.type === "bala"));
});
