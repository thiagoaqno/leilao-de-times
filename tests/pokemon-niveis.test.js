// Nível, experiência, evolução e Pokébola (public/galeramon/niveis.js, com os dados da PokéAPI de pokeapi-dados.js), a
// cena 2D da captura (captura2d.js: a linha do tempo) e o nível no motor do Ginásio.
const test = require("node:test");
const assert = require("node:assert");
const N = require("../public/galeramon/niveis.js");
const Dados = require("../public/galeramon/pokeapi-dados.js");
const PokeDex = require("../public/galeramon/pokemon.js");
const Captura2D = require("../public/galeramon/captura2d.js");
const G = require("../public/ginasio/regras.js");

test("pokeapi: todo Pokémon tem ritmo, experiência e taxa; as evoluções apontam para quem existe", () => {
  for (const id of PokeDex.IDS) {
    const d = Dados.POKEMON[id];
    assert.ok(d && Dados.CRESCIMENTO[d.cresc], id);
    assert.ok(d.taxa >= 3 && d.taxa <= 255 && d.xp > 0, id);
    for (const ev of d.evolui || []) { assert.ok(PokeDex.MONS[ev.para], `${id} → ${ev.para}`); assert.ok(ev.nivel >= 2 && ev.nivel <= 100); }
  }
  for (const t of Object.values(Dados.CRESCIMENTO)) { assert.strictEqual(t.length, 100); for (let i = 1; i < 100; i++) assert.ok(t[i] > t[i - 1]); }
  assert.deepStrictEqual(Dados.POKEMON.charmander.evolui, [{ para: "charmeleon", nivel: 16, como: "nível" }]);
  assert.strictEqual(Dados.POKEMON.pikachu.evolui[0].como, "Pedra do Trovão");
  assert.strictEqual(Dados.POKEMON.eevee.evolui.length, 7);
  assert.strictEqual(Dados.POKEMON.mewtwo.taxa, 3);
});

test("niveis: no nível 50 os atributos são os da Pokédex; abaixo, menores", () => {
  for (const id of ["pikachu", "charizard", "mewtwo", "victini"]) {
    const a = N.atributos(id, 50), m = PokeDex.MONS[id];
    for (const k of ["hp", "atk", "def", "sat", "sdf", "spd"]) assert.strictEqual(a[k], m[k], `${id}.${k}`);
    assert.ok(N.atributos(id, 5).hp < a.hp / 4);
  }
});

test("niveis: a experiência sobe o nível e evolui no nível da PokéAPI (até duas fases de uma vez)", () => {
  const um = N.ganharXp({ id: 1, bicho: "charmander", nivel: 5, xp: 0 }, N.faltaParaSubir("charmander", 5));
  assert.strictEqual(um.nivel, 6); assert.strictEqual(um.xp, 0); assert.strictEqual(um.evolucoes.length, 0);
  const muito = N.ganharXp({ id: 1, bicho: "charmander", nivel: 15, xp: 0 }, 200000);
  assert.ok(muito.nivel >= 36);
  assert.deepStrictEqual(muito.evolucoes.map((e) => e.para), ["charmeleon", "charizard"]);
  assert.strictEqual(muito.bicho, "charizard");
  // Eevee: cada indivíduo tem o seu caminho, sempre o mesmo
  const caminhos = new Set([1, 2, 3, 4, 5, 6, 7].map((id) => N.ganharXp({ id, bicho: "eevee", nivel: 40, xp: 0 }, 0).bicho));
  assert.ok(caminhos.size >= 5, [...caminhos].join());
  assert.strictEqual(N.ganharXp({ id: 3, bicho: "eevee", nivel: 40, xp: 0 }, 0).bicho, N.ganharXp({ id: 3, bicho: "eevee", nivel: 40, xp: 0 }, 0).bicho);
  assert.strictEqual(N.ganharXp({ id: 1, bicho: "mew", nivel: 100, xp: 0 }, 99999).nivel, 100);
  // vencer um mais forte rende mais
  assert.ok(N.xpDaVitoria("pidgey", 20, 5) > N.xpDaVitoria("pidgey", 5, 20));
});

test("niveis: a Pokébola pega mais com a vida baixa e com o Pokémon tonto, pela taxa da PokéAPI", () => {
  const cheia = N.chanceDeCaptura({ bicho: "pidgey", hp: 100, max: 100 }), metade = N.chanceDeCaptura({ bicho: "pidgey", hp: 50, max: 100 });
  const um = N.chanceDeCaptura({ bicho: "pidgey", hp: 1, max: 100 }), tonto = N.chanceDeCaptura({ bicho: "pidgey", hp: 50, max: 100, tonto: true });
  assert.ok(cheia < metade && metade < um && metade < tonto);
  assert.ok(Math.abs(cheia - 255 / 765) < 1e-9, "vida cheia: taxa / 3 / 255");
  assert.ok(N.chanceDeCaptura({ bicho: "mewtwo", hp: 1, max: 300 }) < 0.02, "lendário continua difícil");
  // as quatro checagens: pega com q^4; a bola balança uma vez por checagem que passou
  assert.deepStrictEqual(N.jogarPokebola(1, () => 0.99), { pegou: true, balancos: 3 });
  assert.deepStrictEqual(N.jogarPokebola(0, () => 0), { pegou: false, balancos: 0 });
  let i = 0; const sorte = () => [0.1, 0.1, 0.99][i++] ?? 0.99;
  assert.deepStrictEqual(N.jogarPokebola(0.5, sorte), { pegou: false, balancos: 2 });
  let pegou = 0, n = 0; const lcg = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  for (let k = 0; k < 20000; k++) if (N.jogarPokebola(0.3, lcg).pegou) pegou++;
  assert.ok(Math.abs(pegou / 20000 - 0.3) < 0.02, `${pegou / 20000}`);
  assert.strictEqual(N.porcento(0.004), "0,4%"); assert.strictEqual(N.porcento(0.336), "34%");
});

test("captura2d: a cena dura o mesmo que a pausa do servidor e o voo sai da mão e chega no Pokémon", () => {
  for (const [b, p] of [[0, false], [1, false], [3, false], [3, true]]) {
    const f = Captura2D.fasesDe(N.TEMPOS_DA_BOLA, b, p);
    assert.strictEqual(f.total, N.duracaoDaCaptura(b, p));
    assert.ok(f[p ? "pegou" : "escapou"] && (b === 0 || f[`balanco${b}`]));
  }
  const de = { x: 0, y: 100 }, alvo = { x: 300, y: 50 };
  assert.deepStrictEqual(Captura2D.noVoo(0, de, alvo), de);
  const fim = Captura2D.noVoo(1, de, alvo); assert.ok(Math.abs(fim.x - 300) < 1e-9 && Math.abs(fim.y - 50) < 1e-6);
  assert.ok(Captura2D.noVoo(0.5, de, alvo).y < 75, "faz o arco por cima");
  assert.strictEqual(Captura2D.inclinacao(0.9), 0, "o balanço para antes do próximo");
});

test("motor: o nível muda a vida, o dano e nada da velocidade; o selvagem vem sozinho com o nível dele", () => {
  const p = G.criarPartida({ modo: "pokemon", seed: "nivel", nivelRobo: 10, selvagem: { bicho: "pidgey", nivel: 7, hp: 12 } },
    [[{ id: "a", bot: false, time: ["charmander", "squirtle", "bulbasaur"], niveis: [12, 5, 5] }], [{ bot: true }]]);
  const [a, s] = p.entidades;
  assert.strictEqual(a.bicho.nivel, 12); assert.strictEqual(a.bicho.max, N.atributos("charmander", 12).hp);
  assert.strictEqual(a.jogador.time[1].nivel, 5);
  assert.strictEqual(s.jogador.time.length, 1, "o selvagem é sozinho");
  assert.strictEqual(s.bicho.id, "pidgey"); assert.strictEqual(s.bicho.nivel, 7); assert.strictEqual(s.bicho.hp, 12);
  // o dano: o mesmo golpe, nível 50 contra nível 10
  const hab = G.habilidadeDeGolpe("flamethrower", PokeDex.MOVES.flamethrower);
  const alvo = { bicho: { id: "caterpie", hp: 999, max: 999, st: {}, ficha: { ...PokeDex.MONS.caterpie, def: 25 } } };
  const forte = G.calcularDano(p, { bicho: { id: "charmander", st: {}, hp: 1, max: 1, nivel: 50, ficha: { ...PokeDex.MONS.charmander, ...N.atributos("charmander", 50) } } }, alvo, hab, { critico: false, variacao: 1 });
  const fraco = G.calcularDano(p, { bicho: { id: "charmander", st: {}, hp: 1, max: 1, nivel: 10, ficha: { ...PokeDex.MONS.charmander, ...N.atributos("charmander", 10) } } }, alvo, hab, { critico: false, variacao: 1 });
  assert.ok(forte.dano > fraco.dano * 3, `${forte.dano} x ${fraco.dano}`);
  // sem nível (as salas liberadas), tudo como antes
  const livre = G.criarPartida({ modo: "pokemon", seed: "x" }, [[{ id: "a", bot: false, time: ["charmander", "squirtle", "bulbasaur"] }], [{ bot: true }]]);
  assert.strictEqual(livre.entidades[0].bicho.nivel, undefined); assert.strictEqual(livre.entidades[0].bicho.max, PokeDex.MONS.charmander.hp);
  assert.strictEqual(livre.entidades[1].jogador.time.length, 3);
});
