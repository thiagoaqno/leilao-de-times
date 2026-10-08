const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../public/galeramon/naruto.js");
const G = require("../galeramon.js");

function luta() {
  return G.createBattle(
    { id: "a", name: "A", team: ["naruto", "sakura", "kakashi"] },
    { id: "b", name: "B", team: ["sasuke", "itachi", "lee"] },
    "naruto",
  );
}

test("Naruto: elenco, golpes e time de três válidos", () => {
  assert.equal(D.IDS.length, 12);
  assert.deepEqual(D.cleanTeam(["naruto", "naruto", "sakura"]), D.DEFAULT_TEAM);
  assert.deepEqual(D.cleanTeam(["__proto__", "naruto", "sakura"]), D.DEFAULT_TEAM);
  for (const id of D.IDS) {
    const ninja = D.MONS[id];
    assert.equal(ninja.moves.length, 4);
    assert.ok(D.sprite(id).endsWith(`${ninja.imagem}.png`));
    for (const golpe of ninja.moves) assert.ok(D.MOVES[golpe], `${id}: ${golpe}`);
  }
});

test("Naruto: chakra limita jutsus e concentrar recupera até o máximo", () => {
  const b = luta(), ninja = b.sides[0].team[0];
  ninja.chakra = 10;
  assert.equal(G.validChoice(b, 0, { move: 1 }), null);
  assert.deepEqual(G.validChoice(b, 0, { move: 0 }), { move: 0 });
  b.sides[0].choice = G.validChoice(b, 0, { focus: true });
  b.sides[1].choice = { focus: true };
  G.resolve(b);
  assert.equal(ninja.chakra, 45);
  assert.equal(b.sides[1].team[0].chakra, 95);
  assert.equal(G.validChoice(b, 0, { move: 1 }).move, 1);
});

test("Naruto: substituição bloqueia um ataque e consome chakra e uso", () => {
  const b = luta(), hp = b.sides[0].team[0].hp;
  b.sides[0].choice = G.validChoice(b, 0, { substitute: true });
  b.sides[1].choice = G.validChoice(b, 1, { move: 0 });
  const events = G.resolve(b);
  assert.equal(b.sides[0].team[0].hp, hp);
  assert.equal(b.sides[0].team[0].chakra, 40);
  assert.equal(b.sides[0].substitutes, 1);
  assert.ok(events.some((e) => e.t === "substitute" && e.s === 0));
  b.sides[0].substitutes = 0;
  assert.equal(G.validChoice(b, 0, { substitute: true }), null);
});

test("Naruto: jutsu pago debita chakra no servidor", () => {
  const b = luta();
  b.sides[0].choice = G.validChoice(b, 0, { move: 1 });
  b.sides[1].choice = G.validChoice(b, 1, { move: 0 });
  G.resolve(b);
  assert.equal(b.sides[0].team[0].chakra, 30);
  assert.equal(b.sides[1].team[0].chakra, 60);
  assert.equal(G.view(b, 0).sides[0].team[0].chakra, 30);
});
