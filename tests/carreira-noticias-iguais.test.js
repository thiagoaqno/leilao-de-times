// Carreira em grupo: a notícia de uma transferência é a mesma no feed de todos os técnicos.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const G = require("../carreira.js").grupo;

const CLUBES = ["flamengo", "palmeiras", "corinthians"];
const ingles = require("../public/carreira/base/inglaterra-2026.js").clubes.flatMap((c) => c.jogadores.map((j) => ({ ...j, clube: c.id })));
const feedDe = (save, c) => save.humanos[c].estado.feed;
const novas = (feed, antes) => feed.slice(0, feed.length - antes).filter((p) => p.tipo === "contratacao");

test("a compra de um técnico vira o mesmo post no feed de todos os técnicos da sala", () => {
  const save = G.novaCarreiraGrupo(CLUBES.map((c, i) => ({ clube: c, nome: `T${i}` })), { temporadas: 2, aporte: 0 });
  const antes = Object.fromEntries(CLUBES.map((c) => [c, feedDe(save, c).length]));
  const j = ingles.find((x) => x.nota >= 70 && x.nota <= 80);
  G.concluirLeilao(save, { jogador: j.id, dono: j.clube, comprador: "flamengo", valor: 1e6 });
  const posts = CLUBES.map((c) => feedDe(save, c).filter((p) => p.tipo === "contratacao" && p.arte && p.arte.jogador === j.id));
  assert.ok(posts.every((l) => l.length === 1), "cada técnico recebe a notícia uma vez");
  const [a, b, c] = posts.map((l) => l[0]);
  for (const x of [b, c]) { assert.strictEqual(x.texto, a.texto); assert.strictEqual(x.perfil, a.perfil); assert.deepStrictEqual(x.arte, a.arte); assert.strictEqual(x.tipo, a.tipo); }
  assert.ok(a.texto.includes("CHEGOU!") && a.texto.includes(j.nome));
  assert.strictEqual(a.perfil, "flamengo");
  assert.ok(CLUBES.every((cl) => novas(feedDe(save, cl), antes[cl]).length === 1));
});
