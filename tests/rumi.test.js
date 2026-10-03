// Regras do Rumi (public/rumi/regras.js): combinações com e sem coringa, a jogada inteira, a primeira descida e o robô.
const test = require("node:test");
const assert = require("node:assert");
const R = require("../public/rumi/regras.js");

const P = {}; let id = 1000;
const t = (n, c) => { const p = { id: id++, n, c }; P[p.id] = p; return p; };
const J = () => t(0, "j");
const ids = (l) => l.map((p) => p.id);

test("avaliar: sequências, grupos e o coringa no lugar certo", () => {
  assert.strictEqual(R.avaliar([t(3, "v"), t(4, "v"), t(5, "v")]).valor, 12);
  assert.strictEqual(R.avaliar([t(7, "v"), t(7, "a"), t(7, "p")]).tipo, "grupo");
  assert.strictEqual(R.avaliar([t(7, "v"), t(7, "v"), t(7, "p")]).ok, false); // cor repetida no grupo
  assert.strictEqual(R.avaliar([t(7, "v"), t(7, "a"), t(7, "p"), t(7, "m"), J()]).ok, false); // grupo de 5
  assert.strictEqual(R.avaliar([t(3, "v"), t(4, "a"), t(5, "v")]).ok, false); // cores misturadas
  assert.strictEqual(R.avaliar([t(12, "v"), t(13, "v"), t(1, "v")]).ok, false); // não dá a volta
  const c = R.avaliar([t(3, "a"), J(), t(5, "a")]); // o coringa vira o 4
  assert.ok(c.ok); assert.strictEqual(c.valor, 12); assert.strictEqual(c.ordem[1].n, 0);
  assert.strictEqual(R.avaliar([t(12, "a"), t(13, "a"), J()]).valor, 36); // sem lugar acima do 13: o coringa vira o 11
  assert.strictEqual(R.avaliar([t(9, "p"), J(), J()]).ok, true);
  assert.strictEqual(R.avaliar([t(5, "v"), t(5, "a")]).ok, false); // só 2
});

test("conferir: peça da mesa não volta para a mão, peça de outro não entra e tudo tem que valer", () => {
  const a = [t(1, "v"), t(2, "v"), t(3, "v")], mao = [t(4, "v"), t(9, "p"), t(9, "a"), t(9, "m")];
  const mesa = [ids(a)];
  assert.ok(R.conferir(mesa, ids(mao), [[...ids(a), mao[0].id]], true, P).ok); // encaixa o 4
  assert.strictEqual(R.conferir(mesa, ids(mao), [ids(a).slice(0, 2)], true, P).ok, false); // tirou peça da mesa
  assert.strictEqual(R.conferir(mesa, ids(mao), [ids(a)], true, P).ok, false); // não baixou nada
  assert.strictEqual(R.conferir(mesa, ids(mao), [ids(a), [t(5, "p").id, mao[1].id, mao[2].id]], true, P).ok, false); // peça de outro
  assert.strictEqual(R.conferir(mesa, ids(mao), [[...ids(a), mao[1].id]], true, P).ok, false); // combinação que não vale
  // mexer na mesa: o 3 vermelho vai para um grupo novo de 3 e a sequência fica 1-2 + 4? não vale; 1-2-3-4 e grupo de 9 vale
  assert.ok(R.conferir(mesa, ids(mao), [[...ids(a), mao[0].id], ids(mao.slice(1))], true, P).ok);
});

test("primeira descida: só peças da mão, sem mexer na mesa, somando 30", () => {
  const a = [t(1, "a"), t(2, "a"), t(3, "a")], mesa = [ids(a)];
  const pouco = [t(2, "v"), t(3, "v"), t(4, "v")], muito = [t(10, "v"), t(10, "a"), t(10, "p")], extra = t(4, "a");
  const mao = ids([...pouco, ...muito, extra]);
  assert.strictEqual(R.conferir(mesa, mao, [ids(a), ids(pouco)], false, P).ok, false); // 9 pontos
  assert.ok(R.conferir(mesa, mao, [ids(a), ids(muito)], false, P).ok); // 30
  assert.strictEqual(R.conferir(mesa, mao, [[...ids(a), extra.id], ids(muito)], false, P).ok, false); // encostou na mesa
});

test("robô: abre com 30 quando dá, encaixa peças depois e compra quando não tem jogada", () => {
  const mao = [t(11, "v"), t(12, "v"), t(13, "v"), t(2, "a"), t(5, "p")];
  const j = R.jogadaRobo([], ids(mao), false, P);
  assert.ok(j && j.length === 1 && j[0].length === 3); // 11-12-13 = 36
  assert.strictEqual(R.jogadaRobo([], ids([t(1, "v"), t(2, "v"), t(3, "v")]), false, P), null); // 6 pontos: não abre
  const mesa = [ids([t(6, "m"), t(7, "m"), t(8, "m")])], solta = t(9, "m");
  const k = R.jogadaRobo(mesa, [solta.id, t(1, "p").id], true, P);
  assert.ok(k && k[0].includes(solta.id)); // encaixou o 9 amarelo
  assert.strictEqual(R.jogadaRobo(mesa, [t(1, "p").id], true, P), null);
});

test("o jogo tem 106 peças e os pontos da mão contam o coringa como 30", () => {
  const p = R.novoJogo(), Q = Object.fromEntries(p.map((x) => [x.id, x]));
  assert.strictEqual(p.length, 106); assert.strictEqual(p.filter(R.coringa).length, 2);
  assert.strictEqual(R.somaMao([104, 0], Q), 31);
});
