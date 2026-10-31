const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../public/corrida/pistas.js');
const F1 = require('../public/corrida/f1-regras.js');
const Robos = require('../corrida-robos.js');
const Direcao = require('../corrida-f1-direcao.js');

test('Mônaco: a descida continua pelo grampo até Portier', () => {
  const pts = T.pontos(T.PISTAS.monaco, 6), n = pts.length;
  const h = f => pts[Math.round(f * n)].h;
  assert.ok(h(.27) > h(.3534) && h(.3534) > h(.3888) && h(.3888) > h(.4353));
  let maior = 0, variacao = 0;
  for (let i = Math.round(.27 * n); i < Math.round(.44 * n); i++) {
    assert.ok(pts[i + 1].h <= pts[i].h + 0.001, `subida inesperada em ${i / n}`);
    maior = Math.max(maior, Math.abs(pts[i + 1].h - pts[i].h));
    if (i > Math.round(.27 * n)) variacao = Math.max(variacao, Math.abs(pts[i + 1].h - 2 * pts[i].h + pts[i - 1].h));
  }
  assert.ok(maior < 1.2, `inclinação excessiva: ${maior}`);
  assert.ok(variacao < .06, `mudança abrupta da inclinação: ${variacao}`);
});

test('Mônaco molhado: pelotão passa pelo grampo sem sair da pista', { timeout: 120000 }, () => {
  const antigo = Date.now, aleatorio = Math.random; let agora = 1000000;
  Date.now = () => agora; Math.random = F1.sorteio('teste-chuva-monaco');
  try {
    Robos.usarFonte(() => []);
    const room = { config: { pista: 'monaco', regras: 'f1', caixas: false, robos: 20, nivel: 'dificil', voltas: 2 }, players: {}, order: [], phase: 'race', startAt: agora, semente: 4321, finishOrder: [], clima: { chove: true, t0: agora, agua0: 1, dur: 1000, trechos: [[0, 1000, 1]] } };
    Robos.preparar(room, ['#a', '#b'], () => 'x');
    room.order.forEach((id, i) => Object.assign(room.players[id], { grid: i, laps: 0, sector: T.SECTORS - 1, started: false, finish: null }));
    Robos.largar(room); Direcao.iniciar(room);
    for (const id of room.order) { const p = room.players[id]; p.ia.pneu = F1.pneuNovo('chuva'); p.ia.sim.pneu = p.ia.pneu; p.pneu = p.pneuAtual = 'chuva'; p.ia.plano = null; }
    const n = T.pontos(T.PISTAS.monaco, 6).length, passaram = new Set(); let maxLat = 0, batidas = 0;
    const setor = (p, s) => { if (s !== (p.sector + 1) % T.SECTORS) return; p.sector = s; if (s === 0) { if (!p.started) p.started = true; else if (++p.laps >= 2) p.finish = 1; } };
    const emitir = (e, d) => { if (e !== 'batida') return; batidas++; Direcao.bater(room, room.players[d.id], d.forca, d.tipo, agora, () => {}, d.chave); };
    for (let t = 0; t < 60; t += .05) {
      agora += 50;
      for (const id of room.order) { const p = room.players[id]; if (p.pos) Direcao.registrar(room, p, p.pos, agora, () => {}); }
      Robos.passo(room, .05, setor, emitir);
      for (const id of room.order) { const p = room.players[id], f = p.ia.sim.idx / n; if (f > .33 && f < .42) maxLat = Math.max(maxLat, Math.abs(p.ia.lat)); if (f >= .42 && f < .9) passaram.add(id); }
    }
    assert.equal(passaram.size, 20, 'todos passaram pelo grampo');
    assert.ok(maxLat <= T.PISTAS.monaco.width / 2, `saiu da pista: ${maxLat}`);
    assert.ok(batidas < 40, `excesso de contatos no pelotão: ${batidas}`);
  } finally { Date.now = antigo; Math.random = aleatorio; Robos.usarFonte(() => null); }
});
