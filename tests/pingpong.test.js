// Pingue-Pongue: regras do saque, do juiz e do placar, e uma partida inteira de robô contra robô.
const test = require("node:test");
const assert = require("node:assert");
const P = require("../public/pingpong/regras.js");

// voa a bola até alguém poder rebater ou o juiz marcar o ponto
function ateDecidir(b, r, outro) {
  for (let i = 0; i < 600 && b.viva; i++) {
    for (const e of P.voar(b, 1 / 120)) { const j = P.julgar(r, e); if (j) return j; }
    if (P.podeRebater(r, outro)) return "rebate";
  }
  return null;
}

test("pingpong: o saque quica do lado de quem saca e depois do outro, em qualquer mira", () => {
  for (const lado of [0, 1]) for (const x of [-0.6, 0, 0.6]) for (const ax of [-1, 0, 1]) {
    const b = P.sacar(lado, x, ax), r = { quem: lado, saque: true, quiques: [] };
    assert.strictEqual(ateDecidir(b, r, 1 - lado), "rebate", `saque ${lado} ${x} ${ax}`);
    assert.deepStrictEqual(r.quiques, [lado, 1 - lado]);
  }
});

test("pingpong: o juiz (rede, fora, dois quiques, quicar do próprio lado)", () => {
  const r = () => ({ quem: 0, saque: false, quiques: [] });
  assert.deepStrictEqual(P.julgar(r(), { tipo: "rede" }).vence, 1);
  assert.deepStrictEqual(P.julgar(r(), { tipo: "chao" }).vence, 1); // saiu sem quicar: fora
  assert.deepStrictEqual(P.julgar(r(), { tipo: "quique", lado: 0 }).vence, 1); // quicou do lado de quem bateu
  const r2 = r(); assert.strictEqual(P.julgar(r2, { tipo: "quique", lado: 1 }), null);
  assert.strictEqual(P.julgar(r2, { tipo: "quique", lado: 1 }).vence, 0); // dois quiques do lado de quem recebe
  const r3 = r(); P.julgar(r3, { tipo: "quique", lado: 1 }); assert.strictEqual(P.julgar(r3, { tipo: "chao" }).vence, 0); // não devolveu
});

test("pingpong: placar até 11 com 2 de vantagem e o saque trocando a cada 2 (no 10 a 10, a cada 1)", () => {
  const pl = P.novoPlacar({ pontos: 11, games: 1 }, 0), saques = [];
  for (let i = 0; i < 20; i++) { saques.push(pl.sacador); P.marcar(pl, i % 2); }
  assert.strictEqual(saques.join(""), "00110011001100110011");
  assert.deepStrictEqual(pl.pts, [10, 10]);
  P.marcar(pl, 0); assert.strictEqual(pl.sacador, 1); assert.strictEqual(pl.vencedor, null); // 11 a 10: ainda não
  P.marcar(pl, 0); assert.strictEqual(pl.vencedor, 0);
  const m3 = P.novoPlacar({ pontos: 11, games: 3 }, 0);
  for (let i = 0; i < 11; i++) P.marcar(m3, 1);
  assert.deepStrictEqual(m3.games, [0, 1]); assert.deepStrictEqual(m3.pts, [0, 0]); assert.strictEqual(m3.vencedor, null); assert.strictEqual(m3.sacador, 1);
});

test("pingpong: robô contra robô joga uma partida inteira, com trocas de bola", () => {
  const pl = P.novoPlacar({ pontos: 11, games: 1 }, 0);
  const bots = [0, 1].map((lado) => ({ lado, x: 0, z: P.S(lado) * (P.MESA.L / 2 + 0.3), vx: 0, vz: 0, desvio: 0 }));
  let batidas = 0, pontos = 0, b = null, r = null, espera = 0.5;
  for (let passo = 0; passo < 60 * 60 * 20 && pl.vencedor == null; passo++) {
    const dt = 1 / 60;
    for (const bot of bots) P.robo(bot, b, r, dt, "medio");
    if (!r) { espera -= dt; if (espera <= 0) { const s = bots[pl.sacador]; b = P.sacar(s.lado, s.x, Math.random() * 2 - 1); r = { quem: s.lado, saque: true, quiques: [] }; batidas++; } continue; }
    const z0 = b.p[2];
    let fim = null;
    for (const e of P.voar(b, dt)) { const j = P.julgar(r, e); if (j) { fim = j; break; } }
    if (!fim) for (const bot of bots) {
      const s = P.S(bot.lado);
      if (P.podeRebater(r, bot.lado) && (z0 - bot.z) * s < 0.02 && (b.p[2] - bot.z) * s >= -0.02 && Math.abs(b.p[0] - bot.x) < 0.3) {
        P.rebater(b, P.batidaRobo(bot, b, "medio"), bot.lado); r = { quem: bot.lado, saque: false, quiques: [] }; batidas++;
      }
    }
    if (fim) { P.marcar(pl, fim.vence); pontos++; r = null; b = null; espera = 0.3; }
  }
  assert.notStrictEqual(pl.vencedor, null, "a partida terminou");
  assert.ok(batidas > pontos * 2, `teve troca de bola (${batidas} batidas em ${pontos} pontos)`);
});
