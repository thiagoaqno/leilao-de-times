// Corrida da Galera, regras de F1: freios de F1 (distância e g), linha de corrida dos robôs, trânsito (ultrapassar, defender e não
// bater), o susto da batida nos robôs e o robô que passa da bandeirada seguindo em frente (fantasma) em vez de parar na linha.
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/pistas.js");
const F1 = require("../public/corrida/f1-regras.js");
const Eq = require("../public/corrida/f1-equipes.js");
const D = require("../public/corrida/dinamica.js");
const Sim = require("../public/corrida/sim.js");
const Robos = require("../corrida-robos.js");
const Linha = require("../corrida-linha.js");
const Direcao = require("../corrida-f1-direcao.js");
const Contato = require("../corrida-contato.js");

const mclaren = Eq.specDaEquipe("mclaren"), p = D.parametros(mclaren), kmh = (u) => u * 0.75;
// freia a fundo em linha reta de v0 a v1 (km/h) com o pneu e a água dados: a distância (m), o tempo (s), o pico de g e a roda travada
function frear(v0, v1, pneu, agua = 0) {
  const c = D.novoCarro(); c.v = v0 / 0.75; c.marcha = D.marchaAuto(c.v, p.vmaxU, 1);
  const amb = { chao: true, pn: F1.aderencia(pneu, agua) };
  let t = 0, d = 0, g = 0, trav = 0;
  for (let i = 0; i < 120 * 12 && kmh(c.v) > v1; i++) {
    const a = c.v; D.passo(c, { brake: 1 }, amb, p); t += D.PASSO; d += ((a + c.v) / 2) * D.PASSO * D.ESC;
    g = Math.max(g, ((a - c.v) / D.PASSO) * D.ESC / D.G); trav = Math.max(trav, c.travada);
  }
  return { t, d, g, trav };
}
const novo = (composto, desgaste = 0, temp = 1) => ({ composto, desgaste, temp });

test("freio de F1: 300 a 100 km/h em 95 a 135 m, até uns 5 g com a carga aerodinâmica e sem travar no seco", () => {
  for (const [composto, de, ate] of [["macio", 90, 115], ["medio", 100, 125], ["duro", 105, 135]]) {
    const r = frear(300, 100, novo(composto));
    assert.ok(r.d > de && r.d < ate, `${composto}: 300 a 100 km/h em ${r.d.toFixed(0)} m`);
    assert.ok(r.t > 1.6 && r.t < 2.5, `${composto}: ${r.t.toFixed(2)} s`);
    assert.ok(r.g > 3.4 && r.g < 5.2, `${composto}: pico de ${r.g.toFixed(2)} g`);
    assert.equal(r.trav, 0, `${composto} novo não trava em linha reta`);
  }
  const lento = frear(200, 80, novo("macio"));
  assert.ok(lento.d > 45 && lento.d < 70, `200 a 80 km/h em ${lento.d.toFixed(0)} m`);
  // com menos carga aerodinâmica (menos velocidade) freia menos: o g de 100 km/h é bem menor que o de 300
  assert.ok(D.frenagemMaxima(mclaren, 400) > 1.6 * D.frenagemMaxima(mclaren, 133), "a 300 km/h freia bem mais que a 100 km/h");
});

test("freio de F1: o pneu gasto ou molhado trava a roda se o pedal vai a fundo (o novo e seco, não)", () => {
  assert.equal(frear(150, 40, novo("macio")).trav, 0);
  assert.ok(frear(150, 40, novo("macio", 0.95)).trav > 0.1, "macio acabado trava");
  assert.ok(frear(150, 40, novo("medio", 0.95)).trav > 0.2, "médio acabado trava");
  assert.ok(frear(150, 40, novo("medio"), 1).trav > 0.3, "médio na pista encharcada trava");
  // e freia pior: a análise dos robôs conta o limite do pneu (não só o pedal)
  const seco = D.frenagemMaxima(mclaren, 100, 0, { freio: 1.0, grip: 1.28 }), molhado = D.frenagemMaxima(mclaren, 100, 0, { freio: 0.76, grip: 0.89 });
  assert.ok(molhado < 0.85 * seco, `seco ${seco.toFixed(0)} u/s², molhado ${molhado.toFixed(0)} u/s²`);
});

test("a linha de corrida dos robôs sai da otimização: curvatura mínima, usa a largura e fica dentro dela", () => {
  const t = T.PISTAS.interlagos, pts = T.pontos(t, 6), max = t.width / 2 - 18;
  const lat = Linha.otimizar(pts, max), zero = new Float64Array(pts.length);
  const J = (l) => { const n = pts.length; let s = 0; const X = pts.map((q, i) => [q.x - q.ty * l[i], q.y + q.tx * l[i]]); for (let i = 0; i < n; i++) { const a = X[(i - 1 + n) % n], b = X[i], c = X[(i + 1) % n]; s += (a[0] - 2 * b[0] + c[0]) ** 2 + (a[1] - 2 * b[1] + c[1]) ** 2; } return s; };
  assert.ok(J(lat) < 0.7 * J(zero), `curvatura ${J(lat).toFixed(0)} contra ${J(zero).toFixed(0)} no eixo`);
  assert.ok(Math.max(...lat.map(Math.abs)) <= max + 1e-6, "dentro do limite");
  assert.ok(Math.max(...lat.map(Math.abs)) > 0.7 * max, "usa a largura nas curvas");
  const rms = Math.sqrt(lat.reduce((s, x) => s + x * x, 0) / lat.length);
  assert.ok(rms > 12, `não fica no eixo da pista (rms ${rms.toFixed(1)} u)`);
  // fora-dentro-fora: numa curva de verdade o robô passa pelo lado de dentro no ápice e pelo de fora antes e depois
  const pf = Robos.perfil("interlagos", mclaren, 0), n = pf.n;
  let ok = 0, tot = 0;
  for (let i = 0; i < n; i++) if (pf.kf[i] > 1 / 150 && pf.kf[i] >= pf.kf[(i - 10 + n) % n] && pf.kf[i] >= pf.kf[(i + 10) % n]) { tot++; if (pf.lat[(i + 2) % n] * pf.linha.sinal[i] > 0) ok++; }
  assert.ok(tot > 3 && ok / tot > 0.7, `no ápice a linha fica por dentro (${ok} de ${tot})`);
});

// uma corrida de robôs no tempo de mentira, contando os contatos
function corrida({ pista = "interlagos", nivel = "medio", robos = 8, voltas = 2, semente = 4321, extra = null, depois = 0 }) {
  const agora = Date.now, aleatorio = Math.random; let relogio = agora(); Date.now = () => relogio; Math.random = F1.sorteio(`trafego:${pista}:${semente}`);
  try {
    Robos.usarFonte(() => []);
    const room = { config: { pista, regras: "f1", caixas: false, robos, nivel, voltas }, players: {}, order: [], phase: "race", startAt: relogio, semente, finishOrder: [] };
    Robos.preparar(room, ["#a", "#b", "#c"], () => "x");
    room.order.forEach((id, i) => Object.assign(room.players[id], { grid: i, laps: 0, sector: T.SECTORS - 1, started: false, finish: null }));
    Robos.largar(room); Direcao.iniciar(room);
    const contatos = [];
    const setor = (q, s) => { if (s !== (q.sector + 1) % T.SECTORS) return; q.sector = s; if (s !== 0) return; if (!q.started) { q.started = true; return; } q.laps++; if (q.laps >= voltas) q.finish = (relogio - room.startAt) / 1000; };
    const emit = (e, d) => { if (e === "batida") { if (d.tipo === "carro") contatos.push(d); Direcao.bater(room, room.players[d.id], d.forca, d.tipo, relogio, () => {}); } if (e === "box") F1.registrarParada(room.players[d.id], { volta: d.volta, tempo: d.tempo, composto: d.composto }); };
    const passo = () => { relogio += 50; for (const id of room.order) { const q = room.players[id]; if (q.pos) Direcao.registrar(room, q, q.pos, relogio, () => {}); } Direcao.passo(room, relogio, () => {}); Robos.passo(room, 0.05, setor, emit); };
    for (let t = 0; t < 900 && room.order.some((id) => room.players[id].finish == null); t += 0.05) passo();
    const antes = {}; for (const id of room.order) antes[id] = { x: room.players[id].pos.x, y: room.players[id].pos.y };
    for (let k = 0; k < depois * 20; k++) passo();
    return { room, contatos, andou: room.order.map((id) => Math.hypot(room.players[id].pos.x - antes[id].x, room.players[id].pos.y - antes[id].y)) };
  } finally { Date.now = agora; Math.random = aleatorio; Robos.usarFonte(() => null); }
}

test("trânsito: oito robôs em duas voltas quase não se tocam (nenhuma batida forte) em nenhum nível", { timeout: 300000 }, () => {
  for (const nivel of ["facil", "medio", "dificil"]) {
    const r = corrida({ nivel });
    assert.ok(r.room.order.every((id) => r.room.players[id].finish != null), `${nivel}: todos terminam`);
    const fortes = r.contatos.filter((c) => c.forca >= F1.BATIDA_MEDIA);
    assert.ok(fortes.length <= 2 && r.contatos.length <= 14, `${nivel}: ${r.contatos.length} contatos, ${fortes.length} fortes`);
  }
});

test("robô que passa da bandeirada segue rodando como fantasma (antes parava na linha de chegada)", { timeout: 120000 }, () => {
  const r = corrida({ robos: 3, voltas: 1, depois: 8 });
  for (const id of r.room.order) {
    const q = r.room.players[id], c = q.ia.sim;
    assert.ok(q.finish != null && c.fant, `${id} é fantasma depois de terminar`);
  }
  assert.ok(r.andou.every((d) => d > 100), `andaram ${r.andou.map((d) => d.toFixed(0))} u em 8 s depois da bandeirada`);
});

test("batida: o robô fica instável e perde ritmo como o humano (susto), e recupera sozinho", { timeout: 60000 }, () => {
  const agora = Date.now, aleatorio = Math.random; let relogio = agora(); Date.now = () => relogio; Math.random = F1.sorteio("batida-robo");
  try {
    Robos.usarFonte(() => []);
    const room = { config: { pista: "interlagos", regras: "f1", caixas: false, robos: 1, nivel: "medio", voltas: 5 }, players: {}, order: [], phase: "race", startAt: relogio - 6000, semente: 5, finishOrder: [] };
    Robos.preparar(room, ["#a"], () => "a");
    const bot = room.players[room.order[0]]; Object.assign(bot, { grid: 0, started: true }); Robos.largar(room); bot.ia.reacao = 0; Direcao.iniciar(room);
    const c = bot.ia.sim, tr = Sim.criarPista(T.PISTAS.interlagos, "interlagos");
    for (let t = 0; t < 12; t += 0.05) { relogio += 50; Robos.passo(room, 0.05, () => {}, () => {}); }
    const vAntes = c.v;
    // um golpe de lado e por trás, de um carro dado pelo teste (o mesmo impulso que o servidor deixa na fila do outro carro)
    Sim.impulsoExterno(c, { dvx: Math.cos(c.a + Math.PI / 2) * 45, dvy: Math.sin(c.a + Math.PI / 2) * 45, dr: 1.2 }, 120);
    assert.ok(c.inst > 0.3, `instabilidade ${c.inst}`);
    let susto = 0, menor = Infinity;
    for (let t = 0; t < 4; t += 0.05) { relogio += 50; Robos.passo(room, 0.05, () => {}, () => {}); susto = Math.max(susto, bot.ia.susto || 0); menor = Math.min(menor, c.v); }
    assert.ok(susto > 0.3, `susto ${susto}`);
    assert.ok(menor < vAntes * 0.97, `perdeu velocidade (${vAntes.toFixed(0)} → ${menor.toFixed(0)})`);
    for (let t = 0; t < 8; t += 0.05) { relogio += 50; Robos.passo(room, 0.05, () => {}, () => {}); }
    assert.ok((c.inst || 0) < 0.01 && (bot.ia.susto || 0) < 0.05 && Math.abs(Sim.quadro(tr, c.x, c.y, c.idx).lat) < tr.W / 2, "recuperou e está na pista");
  } finally { Date.now = agora; Math.random = aleatorio; Robos.usarFonte(() => null); }
});

test("box fantasma: o humano com o pedido feito vira fantasma 2 s antes da entrada do corredor", () => {
  assert.equal(Contato.BOX_FANTASMA_MS, 2000);
  const q = { box: null, boxFant: 0 };
  assert.equal(Contato.fantasmaDoBox(q, 1000), false);
  q.boxFant = 1250; assert.equal(Contato.fantasmaDoBox(q, 1000), true);
  assert.equal(Contato.fantasmaDoBox(q, 1300), false);
});
