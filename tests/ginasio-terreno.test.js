// Ginásio, modo Pokémon: o terreno de cada lugar (regras.js, TERRENOS) muda o jogo de cada tipo: Água nada e bate mais
// forte na água, a água funda é parede para quem não nada nem voa, a lava queima quem não é de Fogo, o gelo faz
// escorregar, quem voa passa por cima das pedras e de tudo. A tela prevê o mesmo movimento.
const test = require("node:test");
const assert = require("node:assert");
const G = require("../public/ginasio/regras.js");
const PokeDex = require("../public/galeramon/pokemon.js");

const DT = 1 / 60;
function partida(arena, timeA = ["blastoise"], timeB = ["snorlax"], extra = {}) {
  const p = G.criarPartida({ seed: "terreno", modo: "pokemon", arena, ...extra }, [[{ id: "a", bot: false, team: [...timeA, "pikachu", "eevee"].slice(0, 3) }], [{ id: "b", bot: false, team: [...timeB, "pikachu", "eevee"].slice(0, 3) }]]);
  return { p, a: p.entidades[0], b: p.entidades[1] };
}
const rodar = (p, n, cmd = {}) => { const ev = []; for (let i = 0; i < n; i++) ev.push(...G.passo(p, DT, cmd)); return ev; };

test("terreno: o lugar escolhido na sala vale; sem escolha, o do líder ou sorteado pela semente; fora do Pokémon, nenhum", () => {
  assert.strictEqual(partida("lagoa").p.bioma, "lagoa");
  assert.strictEqual(G.criarPartida({ modo: "pokemon", lider: "brasa", seed: "x" }).bioma, "vulcao");
  const a = G.criarPartida({ modo: "pokemon", seed: "s1" }).bioma;
  assert.strictEqual(G.criarPartida({ modo: "pokemon", seed: "s1" }).bioma, a, "a mesma semente, o mesmo lugar");
  assert.ok(G.BIOMAS.includes(a));
  assert.strictEqual(G.criarPartida({ modo: "galeramon", arena: "lagoa", seed: "s1" }).bioma, null);
  assert.deepStrictEqual(G.criarPartida({ modo: "galeramon", arena: "lagoa", seed: "s1" }).terreno, []);
});

test("terreno: as zonas ficam na quadra, longe de onde os bichos entram, e cada lado ganha o mesmo", () => {
  for (const [bioma, zonas] of Object.entries(G.TERRENOS)) {
    assert.ok(G.BIOMAS.includes(bioma));
    for (const z of zonas) {
      assert.ok(G.TERRENO[z.tipo], `${bioma}: ${z.tipo}`);
      assert.ok(Math.abs(z.x) + z.rx <= 9 && Math.abs(z.y) + z.ry <= 6, `${bioma}: zona fora da quadra`);
      for (const [x, y] of [[-6.5, -2.2], [-6.5, 2.2], [6.5, 2.2], [6.5, -2.2]]) assert.strictEqual(G.zonaEm([z], x, y), null, `${bioma}: zona em cima da entrada`);
      assert.ok(zonas.some((o) => o.tipo === z.tipo && o.x === -z.x && o.y === -z.y && o.rx === z.rx), `${bioma}: ${z.tipo} sem o espelho`);
    }
  }
});

test("terreno: na água o tipo Água nada mais rápido e bate mais forte; quem anda fica lento", () => {
  const { p, a, b } = partida("lagoa", ["blastoise"], ["snorlax"]);
  for (const e of [a, b]) Object.assign(e, { x: 0, y: 2.0 }); // na rasa, embaixo da funda
  const tA = G.noTerreno(p, a), tB = G.noTerreno(p, b);
  assert.strictEqual(tA.zona.tipo, "agua"); assert.ok(tA.casa); assert.strictEqual(tA.vel, G.VEL_CASA);
  assert.ok(!tB.casa); assert.ok(tB.vel < 1);
  // a mesma investida, com a mesma sorte, fora e dentro da água
  PokeDex.MONS.teste_a = { ...PokeDex.MONS.blastoise, atk: 200, moves: ["tackle", "tackle", "tackle", "tackle"] };
  PokeDex.MONS.teste_b = { ...PokeDex.MONS.snorlax, def: 20, hp: 600 };
  const bater = (x, y) => {
    const q = partida("lagoa", ["teste_a"], ["teste_b"]);
    Object.assign(q.a, { x, y, mira: { x: 1, y: 0 } }); Object.assign(q.b, { x: x + 1.1, y });
    let ev = [];
    for (let i = 0; i < 120 && !ev.some((e) => e.tipo === "dano"); i++) ev = ev.concat(G.passo(q.p, DT, { a: { seq: i, dx: 0, dy: 0, mira: { x: 1, y: 0 }, golpe: i === 0 ? 0 : undefined } }));
    return ev.find((e) => e.tipo === "dano");
  };
  try {
    const seco = bater(-7, 0), molhado = bater(-0.6, 2.3);
    assert.ok(seco && molhado, "os dois acertaram");
    assert.ok(!seco.terreno && molhado.terreno, "o evento avisa quem bateu em casa");
    assert.ok(molhado.dano > seco.dano, `${molhado.dano} > ${seco.dano}`);
  } finally { delete PokeDex.MONS.teste_a; delete PokeDex.MONS.teste_b; }
});

test("terreno: a água funda é parede para quem anda; quem nada ou voa atravessa", () => {
  for (const [bicho, passa] of [["snorlax", false], ["blastoise", true], ["charizard", true]]) {
    const { p, a } = partida("lagoa", [bicho]);
    Object.assign(a, { x: -4, y: 0 });
    rodar(p, 120, { a: { seq: 1, dx: 1, dy: 0, mira: { x: 1, y: 0 } } });
    if (passa) assert.ok(a.x > 2.5, `${bicho} atravessou (x=${a.x.toFixed(2)})`);
    else assert.ok(a.x < -2.1 - a.raio + 0.05, `${bicho} parou na beira (x=${a.x.toFixed(2)})`);
  }
});

test("terreno: quem voa passa por cima das pedras; quem não voa bate nelas", () => {
  for (const [bicho, passa] of [["snorlax", false], ["charizard", true]]) {
    const { p, a } = partida("floresta", [bicho]);
    Object.assign(a, { x: -5, y: -2.1 });
    rodar(p, 120, { a: { seq: 1, dx: 1, dy: 0, mira: { x: 1, y: 0 } } });
    if (passa) assert.ok(a.x > -1, `${bicho} passou (x=${a.x.toFixed(2)})`);
    else assert.ok(a.x < -3.2 - 0.62 - a.raio + 0.05, `${bicho} bateu (x=${a.x.toFixed(2)})`);
  }
});

test("terreno: a lava queima quem não é de Fogo (e quem voa passa ileso)", () => {
  for (const [bicho, queima] of [["snorlax", true], ["arcanine", false], ["charizard", false]]) {
    const { p, a } = partida("vulcao", [bicho]);
    Object.assign(a, { x: 0, y: 0 });
    const antes = a.bicho.hp, ev = rodar(p, 60);
    const dano = antes - a.bicho.hp;
    if (queima) { assert.ok(Math.abs(dano - Math.floor(a.bicho.max * G.QUEIMA)) <= 1, `${bicho}: ${dano}`); assert.ok(ev.some((e) => e.tipo === "lava")); }
    else assert.strictEqual(dano, 0, bicho);
  }
});

test("terreno: no gelo o empurrão escorrega mais longe para quem não é de Gelo", () => {
  const deslize = (arena, bicho) => {
    const { p, a } = partida(arena, [bicho]);
    p.terreno = arena === "neve" ? p.terreno : [];
    Object.assign(a, { x: -1.5, y: 0, kx: 6, ky: 0 });
    rodar(p, 40);
    return a.x + 1.5;
  };
  assert.ok(deslize("neve", "snorlax") > deslize("floresta", "snorlax") * 1.4);
});

test("terreno: a previsão da tela anda igual ao servidor na água, na funda e nas pedras", () => {
  for (const [arena, bicho] of [["lagoa", "snorlax"], ["lagoa", "blastoise"], ["floresta", "charizard"]]) {
    const { p, a } = partida(arena, [bicho]);
    Object.assign(a, { x: -5, y: 0.3 });
    const e = structuredClone(a), mundo = { dex: p.dex, entidades: [], ev: [], terreno: G.terrenoDe(arena) };
    for (let i = 0; i < 180; i++) {
      const c = { seq: i, dx: i < 90 ? 1 : 0.3, dy: i < 90 ? 0.1 : -1, mira: { x: 1, y: 0 } };
      G.passo(p, DT, { a: c });
      G.preverMovimento(mundo, e, DT, c);
      assert.ok(Math.hypot(e.x - a.x, e.y - a.y) < 1e-6, `${arena}/${bicho} no passo ${i}`);
    }
  }
});
