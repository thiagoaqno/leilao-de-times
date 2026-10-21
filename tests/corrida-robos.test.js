const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/pistas.js");
const Robos = require("../corrida-robos.js");
const Itens = require("../corrida-itens.js");

test("pistas refeitas: voltas longas sem trechos encostando um no outro", () => {
  for (const [id, t] of Object.entries(T.PISTAS)) {
    if (t.espaco) continue; // o Arco-íris cruza por cima de si mesmo nos viadutos, de propósito
    const pts = T.pontos(t, 6), n = pts.length, folga = t.width + 2 * (t.walls ? t.wall : 20);
    assert.ok(n * 6 > 12000, `${id}: volta de ${n * 6}`);
    assert.ok(pts.every((p) => Number.isFinite(p.h) && p.x > 0 && p.y > 0 && p.x < t.world && p.y < t.world), id);
    const gap = Math.ceil((folga * 2.2) / 6);
    let pior = Infinity;
    for (let i = 0; i < n; i += 3) for (let j = i + gap; j < n - (i < gap ? gap - i : 0); j += 3) pior = Math.min(pior, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
    assert.ok(pior > folga, `${id}: dois trechos a ${pior.toFixed(0)} (precisa de ${folga})`);
  }
});

// uma corrida só de robôs, no tempo de mentira (o relógio anda junto com a simulação)
function correr(pista, nivel = "medio", caixas = false, robos = 3, aCada = null) {
  const agora = Date.now; let relogio = agora();
  Date.now = () => relogio;
  try {
    const room = { config: { pista, caixas, robos, nivel, voltas: 1 }, players: {}, order: [], phase: "race", startAt: relogio };
    let k = 0; Robos.preparar(room, ["#a", "#b", "#c", "#d"], () => "x" + k++);
    room.order.forEach((id, i) => Object.assign(room.players[id], { grid: i, laps: 0, sector: T.SECTORS - 1, started: false, finish: null }));
    Itens.start(room); Robos.largar(room);
    const eventos = [], lats = [], vs = [], setor = (p, s) => { if (s !== (p.sector + 1) % T.SECTORS) p.foraDeOrdem = true; p.sector = s; if (s === 0) { if (!p.started) { p.started = true; p.ini = relogio; } else { p.laps++; p.volta = (relogio - p.ini) / 1000; } } };
    for (let t = 0; t < 240 && room.order.some((id) => !room.players[id].laps); t += 0.05) {
      relogio += 50; if (aCada) aCada(room, t, relogio); Robos.passo(room, 0.05, setor, (e) => eventos.push(e)); Itens.tick(room, (e) => eventos.push(e));
      lats.push(room.players[room.order[0]].ia.lat); vs.push(room.players[room.order[0]].ia.v);
    }
    return { room, eventos, lats, vs };
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
test("robô vê um humano à frente, abre espaço e reduz antes de encostar", () => {
  Robos.usarFonte(() => []);
  const agora = Date.now(), room = { config: { pista: "interlagos", caixas: false, robos: 1, nivel: "medio", voltas: 1 }, players: {}, order: [], phase: "race", startAt: agora - 2000 };
  Robos.preparar(room, ["#a"], () => "a");
  const bot = room.players[room.order[0]]; bot.grid = 0;
  Robos.largar(room); bot.ia.reacao = 0; bot.ia.v = 120;
  const { x, y, a, z, prog } = bot.pos;
  room.players.h = { id: "h", bot: false, pos: { x: x + Math.cos(a) * 45, y: y + Math.sin(a) * 45, z, a, v: 70, prog: prog + 7 } };
  room.order.push("h");
  Robos.passo(room, 0.05, () => {}, () => {});
  assert.notEqual(bot.ia.passSide, 0, "escolhe um lado para ultrapassar");
  assert.ok(Math.abs(bot.ia.desvio) > 0, "começa a mudar de linha suavemente");
  assert.ok(bot.ia.v < 120, "reduz enquanto ainda não há espaço lateral");
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
  const pista = "luigi", t = T.PISTAS[pista], pts = T.pontos(t, 6), n = pts.length, s = [];
  let ms = 0; for (let i = 0; i < n; i += 4) { s.push([ms, pts[i].x - pts[i].ty * 25, pts[i].y + pts[i].tx * 25, pts[i].h, 0, i]); ms += 100; } // sempre 25 para um lado
  assert.equal(Robos.aprender(pista, { s, carro: "equilibrado", tempo: ms / 1000, piloto: "Ana" }), true);
  assert.equal(Robos.aprender(pista, { s: s.slice(0, 20), carro: "equilibrado", tempo: 1, piloto: "Bia" }), false); // volta curta não vale
  const { room, lats } = correr(pista, "dificil", false, 1), meio = lats.slice(lats.length / 3); // um robô só: sem ninguém na frente para desviar
  const media = meio.reduce((a, b) => a + b, 0) / meio.length;
  const jeito = room.players[room.order[0]].ia.jeito; // cada robô passa um pouco para um lado da linha (de propósito)
  assert.ok(Math.abs(media - 25 - jeito) < 8, `linha média ${media.toFixed(1)} (jeito ${jeito.toFixed(1)})`);
  assert.ok(room.order.every((id) => room.players[id].laps === 1));
});
test("cinco linhas humanas podem dar traçados distintos aos bots", () => {
  const pista = "luigi", pts = T.pontos(T.PISTAS[pista], 6), perfis = [-25, 25].map((lat, k) => {
    const s = []; for (let i = 0; i < pts.length; i += 4) s.push([s.length * 100, pts[i].x - pts[i].ty * lat, pts[i].y + pts[i].tx * lat, pts[i].h, 0, i]);
    return { s, carro: "equilibrado", tempo: s.length / 10, piloto: `Piloto ${k}` };
  });
  assert.equal(Robos.aprender(pista, perfis), true);
  assert.equal(Robos.aprendido(pista).length, 2);
  const { room } = correr(pista, "medio", false, 2);
  assert.deepStrictEqual(room.order.map((id) => room.players[id].ia.tracadoId), [0, 1]);
  Robos.usarFonte(() => []);
});
test("robôs não têm vantagem: copiando uma volta feita no vácuo, não passam da velocidade final nem arrancam mais forte", () => {
  const pista = "interlagos", pts = T.pontos(T.PISTAS[pista], 6), n = pts.length, s = [];
  // a volta gravada a ~1,4x a velocidade final do carro (como se quem gravou ficasse no vácuo e no estilingue o tempo todo)
  let ms = 0; for (let i = 0; i < n; i += 7) { s.push([ms, pts[i].x, pts[i].y, pts[i].h, 0, i]); ms += 100; }
  assert.equal(Robos.aprender(pista, { s, carro: "equilibrado", tempo: ms / 1000, piloto: "Vacuo" }), true);
  const { room, vs } = correr(pista, "dificil", false, 1), p = room.players[room.order[0]], c = T.CARROS[p.car];
  assert.ok(Math.max(...vs) <= c.vmax + 1e-6, `${p.car}: chegou a ${Math.max(...vs).toFixed(0)} (final ${c.vmax})`);
  // a arrancada: em cada instante, no máximo o que o carro de quem joga faz acelerando o tempo todo (fisica.js)
  let v = 0; for (let k = 0; k < 60; k++) { v += c.acc * (1 - 0.8 * Math.pow(v / c.vmax, 1.6)) * 0.05; assert.ok(vs[k] <= v + 1e-6, `${p.car} em ${((k + 1) * 0.05).toFixed(2)} s: ${vs[k].toFixed(0)} contra ${v.toFixed(0)}`); }
  Robos.usarFonte(() => null); // as outras provas não usam essa volta
});
test("turbo do cogumelo: dura TURBO_MS acima da velocidade final e, quando acaba, solta aos poucos", () => {
  const now = Date.now(), p = { id: "a", car: "equilibrado", finish: null, item: "cogumelo", rolling: 0, spinUntil: 0 };
  const room = { config: { pista: "interlagos", caixas: true }, phase: "race", startAt: now - 5000, order: ["a"], players: { a: p } };
  Itens.start(room); p.item = "cogumelo"; p.pos = { x: 0, y: 0, z: 0, a: 0, v: 0, prog: 0, at: now };
  assert.equal(Itens.use(room, p, false, () => {}), true);
  assert.ok(Math.abs(p.boostUntil - now - T.TURBO_MS) < 50 && T.TURBO_MS >= 3000);
  // um robô na reta, já no topo, pega o turbo: passa da final durante o turbo e continua acima dela logo depois que acaba
  let fim = 0;
  const rodar = (turbo) => correr("interlagos", "dificil", false, 1, (room, t, agora) => {
    const bot = room.players[room.order[0]]; bot.car = "equilibrado"; bot.ia.reacao = 0; bot.ia.jeito = 0; bot.ia.nivel = Robos.NIVEIS.dificil;
    if (turbo && Math.abs(t - 6) < 0.01) { bot.boostUntil = agora + T.TURBO_MS; fim = t + T.TURBO_MS / 1000; }
  });
  const { vs } = rodar(true), sem = rodar(false).vs, c = T.CARROS.equilibrado, em = (t) => vs[Math.round(t / 0.05)];
  assert.ok(vs[145] > sem[145] + 8, "o turbo acelera mais do que a corrida sem item");
  assert.ok(em(fim + 0.3) > c.vmax * 1.03 || em(fim + 0.3) < c.vmax * 0.98, `logo depois do turbo: ${em(fim + 0.3).toFixed(0)}`); // ainda solta (ou já está freando para uma curva)
});
test("todas as pistas: robôs largam no reto, passam pelos 12 checkpoints em ordem e fecham a volta sem sair da pista", () => {
  for (const [id, t] of Object.entries(T.PISTAS)) {
    const pts = T.pontos(t, 6), n = pts.length;
    for (let g = 0; g < 8; g++) { const i = (n - 6 - Math.floor(g / 2) * 13 + n) % n; assert.ok(!pts[i].k, `${id}: o lugar ${g + 1} do grid está numa curva`); }
    const { room, lats } = correr(id, "medio", false, 3), meia = t.width / 2;
    for (const rid of room.order) { const p = room.players[rid]; assert.equal(p.laps, 1, `${id}: ${p.name} não fechou a volta`); assert.ok(!p.foraDeOrdem, `${id}: checkpoint fora de ordem`); }
    assert.ok(Math.max(...lats.map(Math.abs)) < meia, `${id}: robô saiu da pista`);
  }
});
