// Ginásio: motor em tempo real, ainda sem servidor e sem tela.
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
