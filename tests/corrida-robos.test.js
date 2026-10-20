const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/pistas.js");
const Robos = require("../corrida-robos.js");
const Itens = require("../corrida-itens.js");

test("pistas refeitas: voltas longas sem trechos encostando um no outro", () => {
  for (const [id, t] of Object.entries(T.PISTAS)) {
    if (t.espaco) continue; // o Arco-íris cruza por cima de si mesmo nos viadutos, de propósito
    const pts = T.elevate(T.sample(t.points, 6), t.hills), n = pts.length, folga = t.width + 2 * (t.walls ? t.wall : 20);
    assert.ok(n * 6 > 12000, `${id}: volta de ${n * 6}`);
    assert.ok(pts.every((p) => Number.isFinite(p.h) && p.x > 0 && p.y > 0 && p.x < t.world && p.y < t.world), id);
    const gap = Math.ceil((folga * 2.2) / 6);
    let pior = Infinity;
    for (let i = 0; i < n; i += 3) for (let j = i + gap; j < n - (i < gap ? gap - i : 0); j += 3) pior = Math.min(pior, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
    assert.ok(pior > folga, `${id}: dois trechos a ${pior.toFixed(0)} (precisa de ${folga})`);
  }
});

// uma corrida só de robôs, no tempo de mentira (o relógio anda junto com a simulação)
function correr(pista, nivel = "medio", caixas = false, robos = 3) {
  const agora = Date.now; let relogio = agora();
  Date.now = () => relogio;
  try {
    const room = { config: { pista, caixas, robos, nivel, voltas: 1 }, players: {}, order: [], phase: "race", startAt: relogio };
    let k = 0; Robos.preparar(room, ["#a", "#b", "#c", "#d"], () => "x" + k++);
    room.order.forEach((id, i) => Object.assign(room.players[id], { grid: i, laps: 0, sector: T.SECTORS - 1, started: false, finish: null }));
    Itens.start(room); Robos.largar(room);
    const eventos = [], lats = [], setor = (p, s) => { p.sector = s; if (s === 0) { if (!p.started) { p.started = true; p.ini = relogio; } else { p.laps++; p.volta = (relogio - p.ini) / 1000; } } };
    for (let t = 0; t < 240 && room.order.some((id) => !room.players[id].laps); t += 0.05) {
      relogio += 50; Robos.passo(room, 0.05, setor, (e) => eventos.push(e)); Itens.tick(room, (e) => eventos.push(e));
      lats.push(room.players[room.order[0]].ia.lat);
    }
    return { room, eventos, lats };
  } finally { Date.now = agora; }
}
test("robôs seguem o traçado de corrida: usam a pista toda, sem sair dela, e fecham a volta", () => {
  for (const pista of ["interlagos", "monaco", "tokyo"]) {
    const { room, lats } = correr(pista), meia = T.PISTAS[pista].width / 2;
    for (const id of room.order) {
      const p = room.players[id];
      assert.equal(p.laps, 1, `${pista}: ${p.name} não fechou a volta`);
      assert.ok(p.volta > T.PISTAS[pista].minLap && p.volta < 140, `${pista}: volta de ${p.volta}s`);
    }
    assert.ok(Math.max(...lats.map(Math.abs)) < meia, `${pista}: saiu da pista`);
    assert.ok(Math.max(...lats) > meia * 0.5 && Math.min(...lats) < -meia * 0.5, `${pista}: não abriu nem cortou as curvas`);
  }
});
test("robôs pegam caixas e usam os itens", () => {
  const { eventos } = correr("interlagos", "medio", true);
  assert.ok(eventos.includes("item:box"));
  assert.ok(eventos.includes("item:use"));
});
test("casco persegue a 1,7× a velocidade máxima do alvo", () => {
  const now = Date.now(), p = { id: "a", car: "formiga", finish: null, item: "vermelho", rolling: 0, spinUntil: 0, pos: { x: 1000, y: 1000, z: 0, a: 0, v: 200, prog: 5, at: now } };
  const q = { id: "b", car: "foguete", finish: null, pos: { x: 1400, y: 1000, z: 0, a: 0, v: 300, prog: 6, at: now } };
  const room = { config: { pista: "interlagos", caixas: true }, phase: "race", startAt: now - 5000, order: ["a", "b"], players: { a: p, b: q } };
  Itens.start(room); // a largada zera as posições: elas voltam depois
  p.pos = { x: 1000, y: 1000, z: 0, a: 0, v: 200, prog: 5, at: now }; q.pos = { x: 1400, y: 1000, z: 0, a: 0, v: 300, prog: 6, at: now }; p.item = "vermelho";
  assert.equal(Itens.use(room, p, false, () => {}), true);
  const casco = room.hazards[0];
  assert.equal(casco.target, "b");
  assert.ok(Math.abs(Math.hypot(casco.vx, casco.vy) - T.CARROS.foguete.vmax * 1.7) < 1);
});
test("robôs aprendem a volta gravada: passam pelo lado e na velocidade de quem gravou", () => {
  const pista = "luigi", t = T.PISTAS[pista], pts = T.elevate(T.sample(t.points, 6), t.hills), n = pts.length, s = [];
  let ms = 0; for (let i = 0; i < n; i += 4) { s.push([ms, pts[i].x - pts[i].ty * 25, pts[i].y + pts[i].tx * 25, pts[i].h, 0, i]); ms += 100; } // sempre 25 para um lado
  assert.equal(Robos.aprender(pista, { s, carro: "equilibrado", tempo: ms / 1000, piloto: "Ana" }), true);
  assert.equal(Robos.aprender(pista, { s: s.slice(0, 20), carro: "equilibrado", tempo: 1, piloto: "Bia" }), false); // volta curta não vale
  const { room, lats } = correr(pista, "dificil", false, 1), meio = lats.slice(lats.length / 3); // um robô só: sem ninguém na frente para desviar
  const media = meio.reduce((a, b) => a + b, 0) / meio.length;
  assert.ok(Math.abs(media - 25) < 8, `linha média ${media.toFixed(1)}`);
  assert.ok(room.order.every((id) => room.players[id].laps === 1));
});
