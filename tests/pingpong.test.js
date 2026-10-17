// Tênis de mesa: a física (ar, giro e quique), o saque, o juiz, o placar, a raquetada e uma partida inteira de robô
// contra robô.
const test = require("node:test");
const assert = require("node:assert");
const P = require("../public/pingpong/regras.js");
const H = P.MESA.H;

// voa a bola até alguém poder rebater ou o juiz marcar o ponto
function ateDecidir(b, r, outro) {
  for (let i = 0; i < 600 && b.viva; i++) {
    for (const e of P.voar(b, 1 / 120)) { const j = P.julgar(r, e); if (j) return j; }
    if (P.podeRebater(r, outro)) return "rebate";
  }
  return null;
}
// a bola batida pelo lado 0, do fundo da mesa, com o gesto dado; devolve o primeiro quique (z e tempo) e a bola
function batida(frente, { lat = 0, y = 0.95, w = [0, 0, 0], v = [0, 0, 8] } = {}) {
  const b = { p: [0, y, 1.5], v: v.slice(), w: w.slice(), viva: true };
  P.bater(b, { frente, lat, off: 0 }, 0);
  const saiu = { v: b.v.slice(), w: b.w.slice(), nome: P.nomeEfeito(b), kmh: P.kmh(b) };
  let t = 0, quique = null, rede = false;
  for (let i = 0; i < 720 && b.viva && !quique; i++) {
    t += 1 / 240;
    for (const e of P.voar(b, 1 / 240)) { if (e.tipo === "quique") quique = { x: b.p[0], z: b.p[2], t, lado: e.lado, vz: b.v[2] }; if (e.tipo === "rede") rede = true; }
  }
  return { ...saiu, quique, rede, fim: b.p.slice() };
}

test("pingpong: o ar freia a bola e o giro faz a curva (Magnus)", () => {
  const voo = (w) => { const b = { p: [0, 1.2, 1.4], v: [0, 0, -12], w, viva: true }; P.voar(b, 0.2); return b; };
  const liso = voo([0, 0, 0]), top = voo([-500, 0, 0]), corte = voo([500, 0, 0]), lado = voo([0, 300, 0]);
  assert.ok(Math.abs(liso.v[2]) < 11.5, `o ar freou: ${liso.v[2].toFixed(2)}`);
  assert.ok(top.p[1] < liso.p[1] - 0.05, "o top spin mergulha");
  assert.ok(corte.p[1] > liso.p[1] + 0.05, "a cortada flutua");
  assert.ok(Math.abs(lado.p[0]) > 0.04, "o lateral faz a curva");
});

test("pingpong: no quique, o top spin acelera e a cortada freia (o atrito troca velocidade por giro)", () => {
  const quique = (w) => { const v = [0, -3, -3.5]; const b = { p: [0, H + 0.1, -0.3], v, w, viva: true }; let vz = null; for (let i = 0; i < 200 && vz == null; i++) for (const e of P.voar(b, 1 / 240)) if (e.tipo === "quique") vz = b.v[2]; return vz; };
  const liso = quique([0, 0, 0]), top = quique([-600, 0, 0]), corte = quique([600, 0, 0]);
  assert.ok(Math.abs(top) > Math.abs(liso), `top ${top.toFixed(2)} x liso ${liso.toFixed(2)}`);
  assert.ok(Math.abs(corte) < Math.abs(liso) * 0.92, `corte ${corte.toFixed(2)} x liso ${liso.toFixed(2)}`);
  // a bola que cai de 30 cm sobe uns 23 cm (a regra da ITTF)
  const b = { p: [0, H + 0.3 + P.R, 0.5], v: [0, 0, 0], w: [0, 0, 0], viva: true };
  let subiu = 0, quicou = false;
  for (let i = 0; i < 400; i++) { for (const e of P.voar(b, 1 / 240)) if (e.tipo === "quique") quicou = true; if (quicou) subiu = Math.max(subiu, b.p[1] - H - P.R); }
  assert.ok(subiu > 0.2 && subiu < 0.26, `subiu ${subiu.toFixed(3)} m`);
});

test("pingpong: o saque quica do lado de quem saca e depois do outro, com qualquer gesto", () => {
  for (const lado of [0, 1]) for (const x of [-0.6, 0, 0.6]) for (const frente of [-6, -2, 0, 3, 6]) for (const lat of [-6, 0, 6]) {
    const b = P.sacar(lado, x, { frente, lat }), r = { quem: lado, saque: true, quiques: [] };
    assert.strictEqual(ateDecidir(b, r, 1 - lado), "rebate", `saque ${lado} ${x} ${frente} ${lat}`);
    assert.deepStrictEqual(r.quiques, [lado, 1 - lado]);
    assert.ok(b.p[1] - H < 0.7, "saque baixo o bastante para devolver");
  }
  // o saque do Table Tennis Pro: a bola parada em cima da mesa, na frente da raquete
  for (const lado of [0, 1]) for (const x of [-0.6, 0, 0.6]) for (const frente of [-6, 0, 3, 6]) for (const lat of [-6, 0, 6]) {
    const b = P.sacar(lado, x, { frente, lat }, P.SAQUE_Z), r = { quem: lado, saque: true, quiques: [] };
    assert.strictEqual(ateDecidir(b, r, 1 - lado), "rebate", `saque de cima da mesa ${lado} ${x} ${frente} ${lat}`);
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
  const r4 = r(); P.julgar(r4, { tipo: "quique", lado: 1 }); assert.strictEqual(P.julgar(r4, { tipo: "rede" }).vence, 0); // a cortada voltou sozinha
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

test("pingpong: o gesto decide o golpe — top spin, bloqueio, cortada, smash e o forte demais que sai longo", () => {
  const top = batida(6), bloq = batida(0), corte = batida(-5), smash = batida(7, { y: 1.3 }), longo = batida(10.5);
  for (const g of [top, bloq, corte, smash]) assert.ok(g.quique && g.quique.lado === 1 && !g.rede, `caiu do outro lado: ${g.nome}`);
  assert.ok(P.topDe(top.w, top.v) > 300 && top.nome.startsWith("Top spin"));
  assert.ok(P.topDe(corte.w, corte.v) < -150 && ["Cortada", "Chop"].includes(corte.nome));
  assert.strictEqual(smash.nome, "Smash");
  assert.ok(smash.kmh > top.kmh && top.kmh > bloq.kmh && bloq.kmh > corte.kmh, `velocidades ${smash.kmh} ${top.kmh} ${bloq.kmh} ${corte.kmh}`);
  assert.ok(smash.quique.t < top.quique.t && top.quique.t < corte.quique.t, "o gesto controla o tempo da bola");
  assert.ok(bloq.quique.t > 0.25 && bloq.quique.t < 0.7, `o bloqueio tem tempo de leitura: ${bloq.quique.t.toFixed(2)} s`);
  assert.ok(!longo.quique || longo.quique.lado !== 1, "forte demais: saiu longo");
  const fora = batida(3, { lat: 8 }); assert.ok(!fora.quique || fora.quique.lado !== 1, "de lado demais: saiu pela lateral");
  const mira = batida(3, { lat: 3 }); assert.ok(mira.quique.lado === 1 && mira.quique.x > 0.2, "o gesto para o lado mira");
});

test("pingpong: como no Table Tennis Pro, o giro que veio não atrapalha a devolução", () => {
  for (const w of [[-450, 0, 0], [500, 0, 0], [0, 300, 0]]) for (const frente of [-4, 0, 1, 4]) {
    const g = batida(frente, { w });
    assert.ok(g.quique && g.quique.lado === 1 && !g.rede, `giro ${w} com ${frente}: caiu do outro lado`);
  }
});

test("pingpong: a bola nunca sobe fora do alcance de quem recebe", () => {
  for (const y0 of [0.8, 0.95, 1.2, 1.45]) for (const frente of [-6, -2, 0, 3, 7]) for (const lat of [-3, 0, 3]) {
    const b = { p: [0, y0, 1.6], v: [0, 0, 6], w: [0, 0, 0], viva: true }; P.bater(b, { frente, lat, off: 0 }, 0);
    let quicou = false, altura = null;
    for (let i = 0; i < 1200 && b.viva && altura == null; i++) {
      for (const e of P.voar(b, 1 / 240)) if (e.tipo === "quique" && b.p[2] < 0) quicou = true;
      if (quicou && b.p[2] < -(P.MESA.L / 2 + 0.3)) altura = b.p[1];
    }
    if (altura != null) assert.ok(altura - H < 0.85, `de ${y0} m com ${frente}/${lat}: chegou a ${(altura - H).toFixed(2)} m acima da mesa`);
  }
});

test("pingpong: robô contra robô joga uma partida inteira, com trocas de bola", () => {
  const pl = P.novoPlacar({ pontos: 11, games: 1 }, 0);
  const bots = [0, 1].map((lado) => ({ lado, x: 0, z: P.S(lado) * (P.MESA.L / 2 + 0.5), y: H + 0.2, vx: 0, vz: 0 }));
  let batidas = 0, pontos = 0, b = null, r = null, espera = 0.5;
  for (let passo = 0; passo < 60 * 60 * 20 && pl.vencedor == null; passo++) {
    const dt = 1 / 60;
    for (const bot of bots) P.robo(bot, b, r, dt, "medio");
    if (!r) { espera -= dt; if (espera <= 0) { const s = bots[pl.sacador]; b = P.sacar(s.lado, s.x, { frente: Math.random() * 8 - 4, lat: Math.random() * 6 - 3 }); r = { quem: s.lado, saque: true, quiques: [] }; batidas++; } continue; }
    const z0 = b.p[2], rz = bots.map((x) => x.z);
    let fim = null;
    for (const e of P.voar(b, dt)) { const j = P.julgar(r, e); if (j) { fim = j; break; } }
    if (!fim) for (const bot of bots) {
      const s = P.S(bot.lado);
      if (P.podeRebater(r, bot.lado) && (z0 - rz[bot.lado]) * s < 0.03 && (b.p[2] - bot.z) * s >= -0.03 && Math.abs(b.p[0] - bot.x) < 0.24 && Math.abs(b.p[1] - bot.y) < 0.32) {
        P.rebater(b, P.batidaRobo(bot, b, "medio"), bot.lado); r = { quem: bot.lado, saque: false, quiques: [] }; batidas++;
      }
    }
    if (fim) { P.marcar(pl, fim.vence); pontos++; r = null; b = null; espera = 0.3; }
  }
  assert.notStrictEqual(pl.vencedor, null, "a partida terminou");
  assert.ok(batidas > pontos * 2, `teve troca de bola (${batidas} batidas em ${pontos} pontos)`);
});
