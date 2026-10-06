// Ginásio: motor em tempo real e previsão de movimento da tela.
const test = require("node:test");
const assert = require("node:assert");
const G = require("../public/ginasio/regras.js");
const Galeramon = require("../public/galeramon/dados.js");
const PokeDex = require("../public/galeramon/pokemon.js");

function simular(seed, modo = "galeramon") {
  const p = G.criarPartida({ seed, modo }, [[{ bot: true }], [{ bot: true }]]);
  for (let i = 0; i < 60 * 245 && !p.fim; i++) G.passo(p, 1 / 60);
  assert.strictEqual(p.fim, true, `${modo} ${seed} terminou`);
  assert.ok(p.t <= G.TEMPO_MAX + 0.1, `${modo} ${seed}: ${p.t.toFixed(2)} s`);
  return p.t;
}

test("ginásio: todos os golpes viram uma habilidade válida", () => {
  for (const [modo, D] of Object.entries({ galeramon: Galeramon, pokemon: PokeDex })) {
    const habilidades = G.habilidadesDoDex(modo);
    assert.strictEqual(Object.keys(habilidades).length, Object.keys(D.MOVES).length, modo);
    for (const [id, mv] of Object.entries(D.MOVES)) {
      const h = habilidades[id];
      assert.ok(h && h.classe, `${modo}/${id}: tem classe`);
      assert.ok(Number.isFinite(h.recarga) && h.recarga >= 1 && h.recarga <= 12, `${modo}/${id}: recarga ${h.recarga}`);
      assert.ok(Number.isFinite(h.poder) && h.poder >= 0, `${modo}/${id}: poder`);
      assert.ok(Number.isFinite(h.velocidade) && h.velocidade > 0, `${modo}/${id}: velocidade`);
      if (mv.p > 0 || mv.halve) assert.notStrictEqual(h.classe, "nada", `${modo}/${id}: golpe de ataque não vira nada`);
    }
  }
});

test("ginásio: quem está na esquiva não leva dano", () => {
  const p = G.criarPartida({ seed: "esquiva" }, [
    [{ id: "a", team: ["churrasquilo", "sirizao", "caipirito"] }],
    [{ id: "b", team: ["capivarao", "pedrolho", "saci"] }],
  ]);
  const [a, b] = p.entidades;
  Object.assign(a, { x: -3, y: 0 });
  Object.assign(b, { x: 0, y: 0 });
  G.passo(p, 1 / 60, { a: { golpe: 1, alvo: { x: b.x, y: b.y } } }); // Picanha: área com aviso.
  assert.strictEqual(p.areas.length, 1, "criou a área");
  p.areas[0].t = 0.01;
  const hp = b.bicho.hp;
  G.passo(p, 0.02, { b: { esquiva: true, dx: 1, dy: 0 } });
  assert.strictEqual(b.bicho.hp, hp);
  assert.ok(p.ev.some((e) => e.tipo === "esquivou" && e.id === "b"));
});

test("ginásio: vantagem de tipo dobra o dano", () => {
  const p = G.criarPartida({ seed: "tipo" }, [
    [{ id: "a", team: ["churrasquilo", "sirizao", "caipirito"] }],
    [{ id: "b", team: ["capivarao", "pedrolho", "saci"] }],
  ]);
  const [a, b] = p.entidades;
  const base = Galeramon.MONS.capivarao;
  Galeramon.MONS.alvo_neutro = { ...base, types: ["Normal"] };
  Galeramon.MONS.alvo_fraco = { ...base, types: ["Grama"] };
  const hab = G.habilidadeDeGolpe("espetinho", Galeramon.MOVES.espetinho);
  b.bicho.id = "alvo_neutro";
  const neutro = G.calcularDano(p, a, b, hab, { critico: false, variacao: 1 }).dano;
  b.bicho.id = "alvo_fraco";
  const forte = G.calcularDano(p, a, b, hab, { critico: false, variacao: 1 }).dano;
  delete Galeramon.MONS.alvo_neutro;
  delete Galeramon.MONS.alvo_fraco;
  assert.ok(Math.abs(forte - neutro * 2) <= 1, `${forte} deveria ser o dobro de ${neutro}`);
});

test("ginásio: robô contra robô termina e a duração média fica boa", () => {
  const tempos = [];
  for (let i = 0; i < 12; i++) tempos.push(simular(`galeramon-${i}`, "galeramon"));
  for (let i = 0; i < 12; i++) tempos.push(simular(`pokemon-${i}`, "pokemon"));
  const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;
  assert.ok(media >= 90 && media <= 210, `média ${(media / 60).toFixed(2)} min`);
});

test("ginásio: previsão repete movimento, pilastras, paredes e esquiva sem mudar vida", () => {
  for (const modo of ["galeramon", "pokemon"]) {
    const p = G.criarPartida({ seed: "previsao", modo, bots: false }, [[{ id: "a" }], [{ id: "b" }]]);
    const a = p.entidades[0], e = structuredClone(a);
    const mundo = { dex: p.dex, entidades: [], ev: [] };
    for (let i = 0; i < 720; i++) {
      const c = { dx: i < 240 ? 1 : i < 480 ? -1 : 0, dy: i < 480 ? -0.2 : 1, mira: { x: 1, y: 0 }, esquiva: i % 200 === 0 };
      G.passo(p, 1 / 60, { a: c }); G.preverMovimento(mundo, e, 1 / 60, c);
      for (const campo of ["x", "y", "vx", "vy", "esquivaT", "esquivaCd", "invulneravel"]) assert.strictEqual(e[campo], a[campo], `${modo}/${i}/${campo}`);
    }
    assert.strictEqual(e.bicho.hp, e.bicho.max);
  }
});

test("ginásio: prever investida ou canalização não aplica dano nem cura", () => {
  const p = G.criarPartida({ seed: "prever-sem-dano", bots: false }, [[{ id: "a" }], [{ id: "b" }]]);
  const [a, b] = p.entidades, hab = G.habilidadeDeGolpe("investida", { n: "Investida", t: "Normal", p: 40, pri: 1 });
  Object.assign(a, { x: -0.4, y: 0, dash: { x: 1, y: 0, falta: 3, hab, hit: new Set() } });
  Object.assign(b, { x: 0, y: 0 });
  const hp = b.bicho.hp;
  G.preverMovimento(p, a, 0.05);
  assert.strictEqual(b.bicho.hp, hp); assert.strictEqual(p.ev.length, 0); assert.strictEqual(a.dash.hit.size, 0);
  a.dash = null; a.bicho.hp /= 2; a.canal = { t: 0.01, heal: 0.5 };
  const antes = a.bicho.hp;
  G.preverMovimento(p, a, 0.05);
  assert.strictEqual(a.bicho.hp, antes); assert.strictEqual(a.canal, null);
});

// voar, cavar e mergulhar: some, ninguém acerta, e cai em cima de quem estiver no ponto mirado
for (const [modo, atacante, golpe, jeito] of [["galeramon", "tatubala", 1, "cova"], ["galeramon", "capivarao", 1, "mergulho"], ["pokemon", "aerodactyl", 3, "voo"]]) {
  test(`ginásio: ${jeito} some sem levar dano e cai no ponto mirado`, () => {
    const D = modo === "pokemon" ? PokeDex : Galeramon, outros = D.IDS.filter((id) => id !== atacante);
    const p = G.criarPartida({ seed: "sumir-" + jeito, modo }, [[{ id: "a", team: [atacante, ...outros.slice(0, 2)] }], [{ id: "b", team: outros.slice(2, 5) }]]);
    const [a, b] = p.entidades;
    Object.assign(a, { x: -2, y: 0 }); Object.assign(b, { x: 1.5, y: 0 });
    G.passo(p, 1 / 60, { a: { golpe, alvo: { x: 1.5, y: 0 } } });
    assert.ok(a.oculto && a.oculto.jeito === jeito, "sumiu");
    assert.strictEqual(p.areas.length, 1, "o aviso no chão");
    const hp = a.bicho.hp, hpB = b.bicho.hp;
    let voltou = false;
    for (let i = 0; i < 90 && !voltou; i++) {
      b.bicho.cds = [0, 0, 0, 0];
      const ev = G.passo(p, 1 / 60, { b: { golpe: 0, alvo: { x: a.x, y: a.y }, mira: { x: a.x - b.x, y: a.y - b.y } } });
      if (a.oculto) assert.strictEqual(a.bicho.hp, hp, "ninguém acerta quem sumiu");
      voltou = ev.some((e) => e.tipo === "voltou" && e.id === "a");
    }
    assert.ok(voltou, "voltou");
    assert.ok(Math.hypot(a.x - 1.5, a.y) < 0.8, `caiu no ponto mirado (${a.x.toFixed(2)}, ${a.y.toFixed(2)})`);
    assert.ok(b.bicho.hp < hpB, "acertou quem estava lá");
  });
}

test("ginásio: a tela prevê o voo igual ao servidor", () => {
  const p = G.criarPartida({ seed: "prever-voo", modo: "pokemon" }, [[{ id: "a", team: ["aerodactyl", "charizard", "blastoise"] }], [{ id: "b" }]]);
  const [a] = p.entidades;
  G.passo(p, 1 / 60, { a: { golpe: 3, alvo: { x: 2, y: 1 } } });
  const e = { ...a, mira: { ...a.mira }, oculto: { ...a.oculto, de: { ...a.oculto.de }, para: { ...a.oculto.para } }, jogador: { id: "a", lado: 0 } };
  const mundo = { dex: PokeDex, entidades: [], ev: [] };
  for (let i = 0; i < 80; i++) { G.passo(p, 1 / 60, {}); G.preverMovimento(mundo, e, 1 / 60, {}); assert.ok(Math.abs(e.x - a.x) < 1e-9 && Math.abs(e.y - a.y) < 1e-9, `passo ${i}`); }
  assert.strictEqual(e.oculto, null);
});

test("ginásio: golpes de giro viram investida", () => {
  assert.strictEqual(G.habilidadeDeGolpe("rolamento", Galeramon.MOVES.rolamento).classe, "investida");
  assert.strictEqual(G.habilidadeDeGolpe("rolamento", Galeramon.MOVES.rolamento).giro, true);
  assert.strictEqual(G.habilidadeDeGolpe("dig", PokeDex.MOVES.dig).classe, "sumir");
});
