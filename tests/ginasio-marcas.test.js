// Ginásio: as marcas no chão (public/ginasio/marcas.js). O arquivo é do navegador, então roda aqui numa "página" de
// mentira só com o que ele usa: o relógio, o último pacote do servidor, os golpes e as famílias de tipo.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Ginasio = require("../public/ginasio/regras.js");
const PokeDex = require("../public/galeramon/pokemon.js");

function pagina() {
  const ctx = {
    Math, Date, Ginasio, relogio: { agora: () => ctx.__agora }, __agora: 1000,
    N: { snap: { tempo: 20, t: 1000 } }, S: { phase: "play", match: { duracao: 90 } },
    dexAtual: () => PokeDex, fixo: (i) => (Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1,
  };
  vm.createContext(ctx);
  for (const f of ["golpes.js", "marcas.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/ginasio", f), "utf8"), ctx, { filename: f });
  const roda = (codigo) => vm.runInContext(codigo, ctx);
  return { ctx, roda, marcas: () => JSON.parse(roda("JSON.stringify(marcas)")) };
}
const explosao = (golpe, id = 1) => ({ tipo: "explosao", id, x: 1, y: 2, r: 1.5, golpe, elemento: PokeDex.MOVES[golpe].t });

test("marcas: esmaecem de 1 até 0 justo no fim da partida", () => {
  const { roda } = pagina();
  assert.strictEqual(roda("alfaDaMarca(20, 20, 90)"), 1);
  assert.strictEqual(roda("alfaDaMarca(20, 55, 90)"), 0.5);
  assert.strictEqual(roda("alfaDaMarca(20, 90, 90)"), 0);
  assert.strictEqual(roda("alfaDaMarca(20, 120, 90)"), 0, "depois do fim continua em 0");
});

test("marcas: a que nasce nos últimos segundos ainda dura o mínimo para dar tempo de ver", () => {
  const { roda } = pagina();
  assert.strictEqual(roda("alfaDaMarca(88, 88, 90)"), 1);
  assert.ok(roda("alfaDaMarca(88, 90, 90)") > 0.6, "no fim da partida ainda está bem visível");
  assert.strictEqual(roda("alfaDaMarca(88, 94, 90)"), 0);
});

test("marcas: nasce com o tempo de jogo do momento (último pacote mais o que andou desde então)", () => {
  const { ctx, roda, marcas } = pagina();
  ctx.__agora = 3000; // 2 s depois do pacote que dizia 20 s de jogo
  roda("registrarMarca(" + JSON.stringify(explosao("fireblast")) + ")");
  assert.ok(Math.abs(marcas()[0].t0 - 22) < 1e-9);
});

test("marcas: cada golpe deixa a marca do seu jeito", () => {
  const { roda, marcas } = pagina();
  const esperado = { fireblast: "chamusco", hydropump: "poca", blizzard: "gelo", thunder: "raio", petaldance: "mato", psychoboost: "mancha",
    earthquake: "cratera", stoneedge: "cratera", dig: "buraco", fly: "cratera", shadowforce: "mancha" };
  Object.keys(esperado).forEach((g, i) => roda("registrarMarca(" + JSON.stringify(explosao(g, i + 1)) + ")"));
  const feito = Object.fromEntries(marcas().map((m, i) => [Object.keys(esperado)[i], m.jeito]));
  assert.deepStrictEqual(feito, esperado);
});

test("marcas: o Dig também deixa um buraquinho por onde o bicho entrou, e o mesmo evento não repete a marca", () => {
  const { roda, marcas } = pagina();
  const sumiu = { tipo: "sumiu", id: "a", jeito: "cova", elemento: "Terrestre", de: { x: -3, y: 1 }, para: { x: 2, y: 2 }, t: 5000 };
  roda("registrarMarca(" + JSON.stringify(sumiu) + ")"); roda("registrarMarca(" + JSON.stringify(sumiu) + ")");
  assert.strictEqual(marcas().length, 1);
  assert.strictEqual(marcas()[0].jeito, "buraco");
  roda("registrarMarca(" + JSON.stringify({ ...sumiu, jeito: "voo" }) + ")");
  assert.strictEqual(marcas().length, 1, "quem voa não faz buraco");
  roda("registrarMarca(" + JSON.stringify(explosao("dig", 7)) + ")"); roda("registrarMarca(" + JSON.stringify(explosao("dig", 7)) + ")");
  assert.strictEqual(marcas().length, 2);
});

test("marcas: guarda no máximo 48, e as mais velhas saem primeiro", () => {
  const { roda, marcas } = pagina();
  for (let i = 1; i <= 60; i++) roda("registrarMarca(" + JSON.stringify(explosao("earthquake", i)) + ")");
  assert.strictEqual(marcas().length, 48);
  assert.strictEqual(marcas()[0].chave, "a13");
  assert.strictEqual(marcas().at(-1).chave, "a60");
});
