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
  assert.equal(D.IDS.length, 30);
  assert.deepEqual(D.cleanTeam(["naruto", "naruto", "sakura"]), D.DEFAULT_TEAM);
  assert.deepEqual(D.cleanTeam(["__proto__", "naruto", "sakura"]), D.DEFAULT_TEAM);
  for (const id of D.IDS) {
    const ninja = D.MONS[id];
    assert.equal(ninja.moves.length, 4);
    assert.ok(D.sprite(id).endsWith(`${ninja.imagem}.png`));
    for (const golpe of ninja.moves) assert.ok(D.MOVES[golpe], `${id}: ${golpe}`);
  }
});

const fs = require("node:fs");
const path = require("node:path");
const Ginasio = require("../public/ginasio/regras.js");
const publico = (url) => path.join(__dirname, "..", "public", url);
const largura = (arquivo) => fs.readFileSync(arquivo).readUInt32BE(16); // a largura do PNG fica no cabeçalho (IHDR)

test("Naruto: cada ninja tem a imagem parada, a tira do parado e os dados da base", () => {
  for (const id of D.IDS) {
    const ninja = D.MONS[id], parada = publico(D.sprite(id));
    assert.ok(fs.existsSync(parada), `${id}: falta ${D.sprite(id)}`);
    assert.ok(ninja.quadros >= 2 && ninja.quadros <= 8, `${id}: quadros`);
    const tira = publico(D.animacao(id));
    assert.ok(fs.existsSync(tira), `${id}: falta ${D.animacao(id)}`);
    assert.equal(largura(tira) % ninja.quadros, 0, `${id}: a tira não divide em ${ninja.quadros} quadros`);
    const base = D.perfil(id);
    assert.ok(base && base.api > 0 && base.nome, `${id}: sem dados na base`);
    assert.ok(D.ficha(id), `${id}: sem ficha`);
  }
});

test("Naruto: tiras de ataque, lançamento e dano dos ninjas com poses nas folhas", () => {
  const comCombate = D.IDS.filter((id) => D.MONS[id].quadrosAtaque);
  assert.equal(comCombate.length, 21);
  for (const id of ["naruto", "sasuke", "sakura", "kakashi", "shikamaru", "itachi", "kisame", "deidara", "lee", "sai", "sasori", "yamato", "tsunade", "temari", "kankuro", "guy", "tenten"]) {
    assert.ok(comCombate.includes(id), `${id}: sem quadros de combate`);
  }
  for (const id of D.IDS) {
    const ninja = D.MONS[id];
    for (const [tipo, campo] of [["ataque", "quadrosAtaque"], ["lance", "quadrosLance"], ["dano", "quadrosDano"]]) {
      const url = D.animacao(id, tipo), n = ninja[campo] || 0;
      if (!n) { assert.equal(url, "", `${id}: ${tipo} sem pose`); continue; }
      assert.ok(n >= 2 && n <= 8, `${id}: ${tipo} tem ${n} quadros`);
      const arquivo = publico(url);
      assert.ok(fs.existsSync(arquivo), `${id}: falta ${url}`);
      assert.equal(largura(arquivo) % n, 0, `${id}: ${tipo} não divide em ${n} quadros`);
      assert.ok(fs.readFileSync(arquivo).readUInt32BE(20) > 0, `${id}: ${tipo} sem altura`);
    }
  }
});

test("Naruto: todo golpe diz como aparece na arena e a regra do Ginásio respeita", () => {
  const formas = new Set(["corpo", "projetil", "area", "investida"]);
  for (const [id, mv] of Object.entries(D.MOVES)) {
    assert.ok(mv.fx, `${id}: sem fx`);
    const hab = Ginasio.habilidadeDeGolpe(id, mv);
    if (mv.forma) assert.equal(hab.classe, mv.forma, `${id}: ${hab.classe}`);
    else if (mv.p > 0 && !mv.pri) assert.fail(`${id}: golpe de dano sem forma`);
    if (mv.p > 0) assert.ok(mv.forma ? formas.has(mv.forma) : mv.pri > 0, id);
  }
  assert.equal(Ginasio.habilidadeDeGolpe("chidori", D.MOVES.chidori).classe, "investida");
  assert.equal(Ginasio.habilidadeDeGolpe("katon", D.MOVES.katon).classe, "projetil");
  assert.equal(Ginasio.habilidadeDeGolpe("presa", D.MOVES.presa).giro, true);
  assert.equal(Ginasio.habilidadeDeGolpe("funeral", D.MOVES.funeral).raio, 2.2);
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
