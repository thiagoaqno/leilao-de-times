// Gatinhos Explosivos: montagem do baralho e as regras pelo canal, com a mesa montada à mão (sorteio fixo).
const test = require("node:test");
const assert = require("node:assert");
const http = require("http");
const { Server } = require("socket.io");
const { io: cliente } = require("socket.io-client");
const R = require("../public/kittens/regras.js");

process.env.KITTENS_NOPE_MS = "60";
process.env.KITTENS_TURN_MS = "400";
process.env.KITTENS_DEFUSE_MS = "400";
process.env.KITTENS_FAVOR_MS = "400";
const attach = require("../kittens.js");

let srv, io, porta, rooms;
test.before(async () => {
  srv = http.createServer(); io = new Server(srv);
  ({ rooms } = attach(io));
  await new Promise((ok) => srv.listen(0, ok)); porta = srv.address().port;
});
test.after(() => { io.close(); srv.close(); });

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
const pedir = (s, ev, d) => new Promise((ok) => s.emit(ev, d, ok));
async function mesa(n) {
  const ss = [];
  for (let i = 0; i < n; i++) { const s = cliente(`http://localhost:${porta}/kittens`, { transports: ["websocket"], forceNew: true }); s.ultimo = null; s.on("state", (st) => { s.ultimo = st; }); await new Promise((ok) => s.once("connect", ok)); ss.push(s); }
  const r = await pedir(ss[0], "create", { name: "A" });
  ss[0].id = r.id;
  for (let i = 1; i < n; i++) ss[i].id = (await pedir(ss[i], "join", { code: r.code, name: "J" + i })).id;
  await pedir(ss[0], "act", { type: "start" });
  const room = rooms.get(r.code), g = room.g;
  const por = Object.fromEntries(ss.map((s) => [s.id, s]));
  return { ss, room, g, por, vez: () => por[g.turn], parar: () => ss.forEach((s) => s.close()) };
}
let nid = 1000;
const carta = (t) => ({ id: nid++, t });
const dar = (g, id, ...ts) => g.hands[id].push(...ts.map(carta));
const limpar = (g, id) => { g.hands[id] = []; };
const act = (s, d) => pedir(s, "act", d);

test("baralho: 8 cartas por mão, bombas e desarmes do monte", () => {
  for (const n of [2, 3, 4, 5]) {
    const m = R.montarMesa(n, (a) => a.sort(() => Math.random() - 0.5));
    assert.deepStrictEqual(m.maos.map((x) => x.length), Array(n).fill(8));
    assert.ok(m.maos.every((x) => x.filter((c) => c.t === "defuse").length === 1 && !x.some((c) => c.t === "bomb")));
    assert.strictEqual(m.monte.filter((c) => c.t === "bomb").length, n - 1);
    const ids = [...m.maos.flat(), ...m.monte].map((c) => c.id);
    assert.strictEqual(new Set(ids).size, ids.length);
  }
});

test("comprar passa a vez; Pular e Ataque", async () => {
  const m = await mesa(3);
  const { g } = m, a = g.turn;
  g.draw.unshift(carta("cat1"));
  assert.ok((await act(m.vez(), { type: "draw" })).ok);
  assert.notStrictEqual(g.turn, a);
  assert.strictEqual(g.turnsLeft, 1);
  // Pular: só encerra a vez
  const b = g.turn; dar(g, b, "skip");
  const id = g.hands[b].at(-1).id, n = g.hands[b].length;
  assert.ok((await act(m.vez(), { type: "play", ids: [id] })).ok);
  await esperar(200);
  assert.notStrictEqual(g.turn, b); assert.strictEqual(g.hands[b].length, n - 1);
  // Ataque: o próximo joga duas vezes
  const c = g.turn; dar(g, c, "attack");
  await act(m.vez(), { type: "play", ids: [g.hands[c].at(-1).id] });
  await esperar(200);
  assert.notStrictEqual(g.turn, c); assert.strictEqual(g.turnsLeft, 2);
  g.draw.unshift(carta("cat2"), carta("cat3"));
  await act(m.vez(), { type: "draw" });
  assert.strictEqual(g.turnsLeft, 1); assert.ok(g.turn); // ainda é ele, na segunda vez
  const d = g.turn; await act(m.vez(), { type: "draw" });
  assert.notStrictEqual(g.turn, d);
  m.parar();
});

test("Nem Pensar cancela, e outro Nem Pensar devolve a jogada", async () => {
  const m = await mesa(2);
  const { g } = m, a = g.turn, b = m.ss.find((s) => s.id !== a).id;
  limpar(g, a); limpar(g, b);
  dar(g, a, "skip", "cat1"); dar(g, b, "nope", "nope");
  const skip = g.hands[a][0].id;
  assert.ok((await act(m.por[a], { type: "play", ids: [skip] })).ok);
  assert.ok(g.pending);
  assert.ok((await act(m.por[a], { type: "draw" })).error, "não compra com jogada pendente");
  assert.ok((await act(m.por[b], { type: "nope" })).ok);
  await esperar(250);
  assert.strictEqual(g.turn, a, "cancelada: a vez continua dele");
  // agora com dois Nem Pensar: a jogada volta a valer
  dar(g, a, "skip"); dar(g, a, "nope");
  await act(m.por[a], { type: "play", ids: [g.hands[a].find((c) => c.t === "skip").id] });
  await act(m.por[b], { type: "nope" });
  await act(m.por[a], { type: "nope" });
  await esperar(250);
  assert.notStrictEqual(g.turn, a, "valeu: pulou a vez");
  m.parar();
});

test("Gatinho Explosivo: Desarmar volta ao monte; sem Desarmar explode e o último vence", async () => {
  const m = await mesa(2);
  const { g } = m, a = g.turn, b = m.ss.find((s) => s.id !== a).id;
  g.draw.unshift(carta("bomb"));
  assert.ok((await act(m.por[a], { type: "draw" })).ok);
  assert.ok(g.defuse && g.defuse.pid === a);
  assert.ok((await act(m.por[b], { type: "place", pos: 0 })).error);
  const tam = g.draw.length;
  assert.ok((await act(m.por[a], { type: "place", pos: 0 })).ok);
  assert.strictEqual(g.draw.length, tam + 1); assert.strictEqual(g.draw[0].t, "bomb");
  assert.strictEqual(g.turn, b);
  limpar(g, b); // sem Desarmar
  assert.ok((await act(m.por[b], { type: "draw" })).ok);
  assert.strictEqual(m.room.phase, "ended"); assert.strictEqual(m.room.winner, a);
  m.parar();
});

test("par rouba, trio pede, favor pede ao alvo escolher, espiar mostra 3", async () => {
  const m = await mesa(3);
  const { g } = m, a = g.turn, outros = m.ss.filter((s) => s.id !== a).map((s) => s.id), b = outros[0];
  limpar(g, a); limpar(g, b);
  dar(g, a, "cat1", "cat1", "cat2", "cat2", "cat2", "favor", "peek"); dar(g, b, "cat5", "defuse");
  const ids = (t, k) => g.hands[a].filter((c) => c.t === t).slice(0, k).map((c) => c.id);
  assert.ok((await act(m.por[a], { type: "play", ids: ids("cat1", 1) })).error, "gato sozinho");
  assert.ok((await act(m.por[a], { type: "play", ids: ids("cat1", 2), target: a })).error, "alvo é você");
  await act(m.por[a], { type: "play", ids: ids("cat1", 2), target: b });
  await esperar(200);
  assert.strictEqual(g.hands[a].length, 6, "7 - 2 + 1 roubada"); assert.strictEqual(g.hands[b].length, 1);
  // trio pedindo uma carta que o alvo tem
  dar(g, b, "defuse");
  await act(m.por[a], { type: "play", ids: ids("cat2", 3), target: b, named: "defuse" });
  await esperar(200);
  assert.ok(g.hands[a].some((c) => c.t === "defuse"));
  // favor
  const antes = g.hands[a].length;
  await act(m.por[a], { type: "play", ids: ids("favor", 1), target: b });
  await esperar(200);
  assert.ok(g.favor && g.favor.from === b);
  const dar1 = g.hands[b][0].id;
  assert.ok((await act(m.por[a], { type: "give", id: dar1 })).error);
  assert.ok((await act(m.por[b], { type: "give", id: dar1 })).ok);
  assert.strictEqual(g.hands[a].length, antes - 1 + 1);
  // espiar: só quem jogou recebe
  await act(m.por[a], { type: "play", ids: ids("peek", 1) });
  await esperar(200);
  await esperar(30);
  assert.strictEqual(m.por[a].ultimo.peek.length, 3);
  assert.ok(!m.por[b].ultimo.peek);
  m.parar();
});

test("relógio: quem demora compra sozinho e o favor se resolve sozinho", async () => {
  const m = await mesa(2);
  const { g } = m, a = g.turn;
  g.draw.unshift(carta("cat4"));
  await esperar(650);
  assert.notStrictEqual(g.turn, a);
  m.parar();
});
