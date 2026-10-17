// Tênis de mesa: a física do Table Tennis Pro (gravidade baixa, sem ar, quique de 0,6, curva para o lado), o saque, o
// juiz, o placar, a raquetada e uma partida inteira de robô contra robô.
const test = require("node:test");
const assert = require("node:assert");
const P = require("../public/pingpong/regras.js");
const H = P.MESA.H;

// voa a bola até alguém poder rebater ou o juiz marcar o ponto
function ateDecidir(b, r, outro) {
  for (let i = 0; i < 800 && b.viva; i++) {
    for (const e of P.voar(b, 1 / 120)) { const j = P.julgar(r, e); if (j) return j; }
    if (P.podeRebater(r, outro)) return "rebate";
  }
  return null;
}
// a bola batida pelo lado 0, do fundo da mesa, com o movimento dado; devolve o primeiro quique (x, z e tempo)
function batida(frente, { lat = 0, y = 0.9 } = {}) {
  const b = { p: [0, y, 1.6], v: [0, 0, 3], w: [0, 0, 0], viva: true };
  P.bater(b, { frente, lat, off: 0 }, 0);
  const saiu = { v: b.v.slice(), w: b.w.slice(), nome: P.nomeEfeito(b), kmh: P.kmh(b) };
  let t = 0, quique = null, rede = false;
  for (let i = 0; i < 1000 && b.viva && !quique; i++) {
    t += 1 / 240;
    for (const e of P.voar(b, 1 / 240)) { if (e.tipo === "quique") quique = { x: b.p[0], z: b.p[2], t, lado: e.lado }; if (e.tipo === "rede") rede = true; }
  }
  return { ...saiu, quique, rede };
}

test("pingpong: a física do Table Tennis Pro — gravidade de ~3,9 m/s², sem ar e o quique de 0,6", () => {
  assert.ok(Math.abs(P.G - 3.924) < 0.01);
  const b = { p: [0, 1.2, 1.0], v: [0, 0, -3], w: [0, 0, 0], viva: true };
  P.voar(b, 0.3);
  assert.ok(Math.abs(b.v[2] + 3) < 1e-9, "sem ar, a bola não freia");
  assert.ok(Math.abs(b.p[1] - (1.2 - 0.5 * P.G * 0.09)) < 1e-6, "a queda é a da conta");
  // a bola solta de 30 cm volta a 0,6² disso (10,8 cm)
  const c = { p: [0, H + P.R + 0.3, 0.5], v: [0, 0, 0], w: [0, 0, 0], viva: true };
  let subiu = 0, quicou = false;
  for (let i = 0; i < 600; i++) { for (const e of P.voar(c, 1 / 240)) if (e.tipo === "quique") quicou = true; if (quicou) subiu = Math.max(subiu, c.p[1] - H - P.R); }
  assert.ok(Math.abs(subiu - 0.108) < 0.005, `subiu ${subiu.toFixed(3)} m`);
});

test("pingpong: o efeito é a curva para o lado, e o chute cai no alvo mesmo com a curva", () => {
  const b = { p: [0, 0.9, 1.6], v: [0, 0, 0], w: [0, 0, 0], viva: true };
  P.chutar(b, 0.4, -0.9, 0.15, 2.5);
  let quique = null, meio = null;
  for (let i = 0; i < 800 && !quique; i++) { const z0 = b.p[2]; for (const e of P.voar(b, 1 / 240)) if (e.tipo === "quique") quique = b.p.slice(); if (z0 > 0 && b.p[2] <= 0) meio = b.p.slice(); }
  assert.ok(Math.abs(quique[0] - 0.4) < 0.02 && Math.abs(quique[2] + 0.9) < 0.02, `caiu em ${quique[0].toFixed(2)}, ${quique[2].toFixed(2)}`);
  assert.ok(meio[0] < 0.4 * (1.6 / 2.5) - 0.02, "fez a curva: no meio do caminho estava mais para o lado de lá");
  assert.ok(meio[1] - H - P.MESA.REDE - P.R > 0.12, "passou a rede com a folga pedida");
});

test("pingpong: o saque quica do lado de quem saca e depois do outro, com qualquer movimento", () => {
  for (const lado of [0, 1]) for (const x of [-0.6, 0, 0.6]) for (const frente of [-3, 0, 2.5, 5, 7]) for (const lat of [-6, 0, 6]) {
    const b = P.sacar(lado, x, { frente, lat }), r = { quem: lado, saque: true, quiques: [] };
    assert.strictEqual(ateDecidir(b, r, 1 - lado), "rebate", `saque ${lado} ${x} ${frente} ${lat}`);
    assert.deepStrictEqual(r.quiques, [lado, 1 - lado]);
  }
  // a mira antiga (um número de −1 a 1) continua valendo
  const b = P.sacar(0, 0, 1), r = { quem: 0, saque: true, quiques: [] };
  assert.strictEqual(ateDecidir(b, r, 1), "rebate");
});

test("pingpong: o juiz (rede, fora, dois quiques, quicar do próprio lado)", () => {
  const r = () => ({ quem: 0, saque: false, quiques: [] });
  assert.deepStrictEqual(P.julgar(r(), { tipo: "rede" }).vence, 1);
  assert.deepStrictEqual(P.julgar(r(), { tipo: "chao" }).vence, 1); // saiu sem quicar: fora
  assert.deepStrictEqual(P.julgar(r(), { tipo: "quique", lado: 0 }).vence, 1); // quicou do lado de quem bateu
  const r2 = r(); assert.strictEqual(P.julgar(r2, { tipo: "quique", lado: 1 }), null);
  assert.strictEqual(P.julgar(r2, { tipo: "quique", lado: 1 }).vence, 0); // dois quiques do lado de quem recebe
  const r3 = r(); P.julgar(r3, { tipo: "quique", lado: 1 }); assert.strictEqual(P.julgar(r3, { tipo: "chao" }).vence, 0); // não devolveu
  const r4 = r(); P.julgar(r4, { tipo: "quique", lado: 1 }); assert.strictEqual(P.julgar(r4, { tipo: "rede" }).vence, 0); // a bola voltou sozinha
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

test("pingpong: o movimento da raquete decide o golpe — parada devolve alto e devagar, rápida vai fundo, demais sai", () => {
  const parada = batida(0), media = batida(2.5), forte = batida(5), smash = batida(5, { y: 1.3 }), longo = batida(8.5), cortada = batida(-3);
  for (const g of [parada, media, forte, smash, cortada]) assert.ok(g.quique && g.quique.lado === 1 && !g.rede, "caiu do outro lado");
  assert.ok(parada.quique.t > 0.9, `a raquete parada devolve devagar: ${parada.quique.t.toFixed(2)} s`);
  assert.ok(parada.quique.t > media.quique.t && media.quique.t > forte.quique.t && forte.quique.t > smash.quique.t, "quanto mais rápido, mais rápida a bola");
  assert.ok(forte.quique.z < media.quique.z && media.quique.z < parada.quique.z, "quanto mais rápido, mais fundo");
  assert.strictEqual(smash.nome, "Smash");
  assert.ok(!longo.quique || longo.quique.lado !== 1, "rápido demais: saiu longo");
  const mira = batida(2, { lat: 3 }); assert.ok(mira.quique.x > 0.2 && mira.nome === "Efeito", "para o lado mira e faz a curva");
  const fora = batida(2, { lat: 8 }); assert.ok(!fora.quique || fora.quique.lado !== 1, "de lado demais: saiu pela lateral");
});

test("pingpong: a bola sempre chega baixa para quem recebe", () => {
  for (const y0 of [0.8, 0.95, 1.2, 1.45]) for (const frente of [-3, 0, 2.5, 5]) for (const lat of [-3, 0, 3]) {
    const b = { p: [0, y0, 1.6], v: [0, 0, 3], w: [0, 0, 0], viva: true }; P.bater(b, { frente, lat, off: 0 }, 0);
    let quicou = false, altura = null;
    for (let i = 0; i < 1500 && b.viva && altura == null; i++) {
      for (const e of P.voar(b, 1 / 240)) if (e.tipo === "quique" && b.p[2] < 0) quicou = true;
      if (quicou && b.p[2] < -(P.MESA.L / 2 + 0.3)) altura = b.p[1];
    }
    if (altura != null) assert.ok(altura - H < 0.6, `de ${y0} m com ${frente}/${lat}: chegou a ${(altura - H).toFixed(2)} m acima da mesa`);
  }
});

test("pingpong: robô contra robô joga uma partida inteira, com trocas de bola", () => {
  const pl = P.novoPlacar({ pontos: 11, games: 1 }, 0);
  const bots = [0, 1].map((lado) => ({ lado, x: 0, z: P.S(lado) * (P.MESA.L / 2 + 0.5), y: H + 0.2, vx: 0, vz: 0 }));
  let batidas = 0, pontos = 0, b = null, r = null, espera = 0.5;
  for (let passo = 0; passo < 60 * 60 * 30 && pl.vencedor == null; passo++) {
    const dt = 1 / 60;
    for (const bot of bots) P.robo(bot, b, r, dt, "medio");
    if (!r) { espera -= dt; if (espera <= 0) { const s = bots[pl.sacador]; b = P.sacar(s.lado, s.x, { frente: Math.random() * 6 - 2, lat: Math.random() * 6 - 3 }); r = { quem: s.lado, saque: true, quiques: [] }; batidas++; } continue; }
    const z0 = b.p[2], rz = bots.map((x) => x.z);
    let fim = null;
    for (const e of P.voar(b, dt)) { const j = P.julgar(r, e); if (j) { fim = j; break; } }
    if (!fim) for (const bot of bots) {
      const s = P.S(bot.lado);
      if (P.podeRebater(r, bot.lado) && (z0 - rz[bot.lado]) * s < 0.03 && (b.p[2] - bot.z) * s >= -0.03 && Math.abs(b.p[0] - bot.x) < 0.15 && Math.abs(b.p[1] - bot.y) < 0.25) {
        P.rebater(b, P.batidaRobo(bot, b, "medio"), bot.lado); r = { quem: bot.lado, saque: false, quiques: [] }; batidas++;
      }
    }
    if (fim) { P.marcar(pl, fim.vence); pontos++; r = null; b = null; espera = 0.3; }
  }
  assert.notStrictEqual(pl.vencedor, null, "a partida terminou");
  assert.ok(batidas > pontos * 2, `teve troca de bola (${batidas} batidas em ${pontos} pontos)`);
});
