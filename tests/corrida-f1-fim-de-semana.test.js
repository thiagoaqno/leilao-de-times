// O fim de semana de GP (regras de F1): os pilotos de 2026, a classificação Q1/Q2/Q3, o grid, as luzes da largada e os pontos.
const test = require('node:test');
const assert = require('node:assert/strict');
const F1 = require('../public/corrida/f1-regras.js');
const Pilotos = require('../public/corrida/f1-pilotos-2026.js');
const T = require('../public/corrida/pistas.js');
const Robos = require('../corrida-robos.js');
const Direcao = require('../corrida-f1-direcao.js');
const Quali = require('../corrida-f1-classificacao.js');

// o relógio simulado do node só dispara os timers que já existiam no começo de um `tick`: avança aos poucos
const avanca = (t, ms) => { for (let i = 0; i < Math.ceil(ms / 250); i++) t.mock.timers.tick(Math.min(250, ms - i * 250)); };
const tabela = (tempos) => tempos.map((tempo, i) => ({ id: 'c' + i, tempo, quando: 1000 + i }));

test('os 22 pilotos de 2026 e as 11 equipes: cores, números e níveis', () => {
  assert.equal(Pilotos.PILOTOS.length, 22);
  assert.equal(Object.keys(Pilotos.EQUIPES).length, 11);
  assert.equal(new Set(Pilotos.PILOTOS.map((p) => p.numero)).size, 22, 'números repetidos');
  const porEquipe = {};
  for (const p of Pilotos.PILOTOS) {
    assert.ok(Pilotos.EQUIPES[p.equipe], p.id + ' sem equipe');
    porEquipe[p.equipe] = (porEquipe[p.equipe] || 0) + 1;
    for (const k of ['ritmo', 'constancia', 'largada']) assert.ok(p[k] >= 60 && p[k] <= 99, `${p.id} ${k}`);
  }
  assert.ok(Object.values(porEquipe).every((n) => n === 2));
  for (const e of Object.values(Pilotos.EQUIPES)) { assert.match(e.cor, /^#[0-9a-f]{6}$/); assert.ok(T.MODS.pintura[e.pintura], e.pintura + ' não existe em MODS.pintura'); }
  const nomes = Pilotos.PILOTOS.map((p) => p.nome);
  for (const n of ['Max Verstappen', 'Lando Norris', 'Lewis Hamilton', 'Sergio Pérez']) assert.ok(nomes.includes(n), n);
});

test('escolher(n) dá n pilotos diferentes, sempre os mesmos para a mesma semente', () => {
  const a = Pilotos.escolher(19, 'x'), b = Pilotos.escolher(19, 'x'), c = Pilotos.escolher(19, 'y');
  assert.equal(a.length, 19); assert.equal(new Set(a.map((p) => p.id)).size, 19);
  assert.deepEqual(a.map((p) => p.id), b.map((p) => p.id));
  assert.notDeepEqual(a.map((p) => p.id), c.map((p) => p.id));
  assert.equal(Pilotos.escolher(30, 1).length, 22); assert.equal(Pilotos.escolher(0, 1).length, 0);
});

test('o grid de 20 carros: robôs com os pilotos reais no lugar dos nomes inventados', () => {
  const room = { config: { pista: 'monaco', regras: 'f1', voltas: 3, robos: 19, nivel: 'medio' }, semente: 7,
    players: { h: { id: 'h', name: 'Thiago', sockets: new Set(), color: '#fff' } }, order: ['h'] };
  Robos.preparar(room, ['#e63946'], () => 'x');
  assert.equal(room.order.length, 20);
  const bots = room.order.filter((id) => room.players[id].bot).map((id) => room.players[id]);
  assert.equal(bots.length, 19);
  for (const b of bots) {
    assert.ok(b.piloto && b.equipe && b.numero, b.name);
    assert.ok(b.sockets instanceof Set && b.mods && b.laps === 0 && b.sector === T.SECTORS - 1, "o robô tem os campos de qualquer piloto");
    assert.equal(b.mods.pintura, Pilotos.EQUIPES[b.equipe].pintura);
    assert.equal(b.color, Pilotos.EQUIPES[b.equipe].cor);
    assert.ok(!['Faísca', 'Pistão', 'Graxa', 'Biela', 'Vácuo', 'Turbo', 'Chicane'].includes(b.name));
  }
  // com dois humanos, o grid continua em 20
  const room2 = { ...room, players: { h: room.players.h, g: { id: 'g', name: 'Gui', sockets: new Set() } }, order: ['h', 'g'], config: { ...room.config } };
  Robos.preparar(room2, ['#e63946'], () => 'x');
  assert.equal(room2.order.length, 20);
});

test('as sessões: 20 carros fazem Q1 (20), Q2 (15) e Q3 (10); com menos, menos sessões', () => {
  assert.deepEqual(F1.sessoesDeClassificacao(20), [20, 15, 10]);
  assert.deepEqual(F1.sessoesDeClassificacao(12), [12, 10]);
  assert.deepEqual(F1.sessoesDeClassificacao(8), [8]);
  assert.deepEqual(F1.sessoesDeClassificacao(16), [16, 15, 10]);
});

test('eliminação e ordem do grid: os mais lentos saem em cada sessão e o grid é a ordem dos tempos', () => {
  // 20 carros com tempos embaralhados; cada sessão melhora os que seguem (o grid só vale pelo último tempo de cada fase)
  const base = [88.4, 87.1, 90.2, 86.5, 91.7, 85.9, 92.3, 86.1, 89.0, 87.7, 93.1, 85.2, 90.8, 88.9, 91.1, 86.9, 94.0, 87.3, 89.6, 92.0];
  const q1 = F1.fecharSessao(tabela(base), 15);
  assert.equal(q1.passam.length, 15); assert.equal(q1.eliminados.length, 5);
  const maisRapidoDosEliminados = Math.min(...q1.eliminados.map((x) => x.tempo)), maisLentoDosQuePassam = Math.max(...q1.passam.map((x) => x.tempo));
  assert.ok(maisLentoDosQuePassam < maisRapidoDosEliminados, 'quem passa tem que ser mais rápido que quem sai');
  assert.deepEqual(q1.eliminados.map((x) => x.tempo), [91.7, 92.0, 92.3, 93.1, 94.0]);
  const q2 = F1.fecharSessao(q1.passam.map((x, i) => ({ id: x.id, tempo: x.tempo - 0.3 + i * 0.01, quando: 5000 + i })), 10);
  assert.equal(q2.eliminados.length, 5);
  const q3 = F1.fecharSessao(q2.passam.map((x, i) => ({ id: x.id, tempo: x.tempo - 0.2, quando: 9000 + i })), 10);
  const grid = F1.gridDaClassificacao([q1, q2, q3]);
  assert.equal(grid.length, 20); assert.equal(new Set(grid).size, 20);
  assert.deepEqual(grid.slice(0, 10), q3.ordem.map((x) => x.id), 'as 10 primeiras vêm do Q3');
  assert.deepEqual(grid.slice(10, 15), q2.eliminados.map((x) => x.id), 'de 11 a 15, os eliminados do Q2');
  assert.deepEqual(grid.slice(15), q1.eliminados.map((x) => x.id), 'de 16 a 20, os do Q1');
  assert.equal(grid[0], 'c11', 'a pole é quem fez 85,2 s');
});

test('empate no tempo: quem fez primeiro fica na frente; sem tempo vai para o fim', () => {
  const o = F1.ordenarClassificacao([{ id: 'a', tempo: 80, quando: 500 }, { id: 'b', tempo: 80, quando: 300 }, { id: 'c', tempo: null, quando: null }, { id: 'd', tempo: 79.9, quando: 900 }]);
  assert.deepEqual(o.map((x) => x.id), ['d', 'b', 'a', 'c']);
  const f = F1.fecharSessao([{ id: 'a', tempo: 80, quando: 500 }, { id: 'b', tempo: 80, quando: 300 }], 1);
  assert.deepEqual(f.passam.map((x) => x.id), ['b']); assert.deepEqual(f.eliminados.map((x) => x.id), ['a']);
});

test('pontos oficiais: 25, 18, 15, 12, 10, 8, 6, 4, 2, 1; do 11º para trás e NC, zero', () => {
  assert.deepEqual(F1.PONTOS, [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);
  const carros = Array.from({ length: 14 }, (_, i) => ({ id: 'p' + i, laps: 5, finish: 300 + i * 2, acrescimo: 0, prog: 0 }));
  carros.push({ id: 'dnf', laps: 2, finish: null, acrescimo: 0, prog: 900 }, { id: 'quase', laps: 5, finish: null, acrescimo: 0, prog: 1000 });
  const r = F1.classificacaoFinal(carros, 5);
  assert.deepEqual(r.slice(0, 10).map((x) => x.pontos), F1.PONTOS);
  assert.ok(r.slice(10, 14).every((x) => x.pontos === 0 && !x.nc));
  assert.equal(r.find((x) => x.id === 'dnf').nc, true); assert.equal(r.find((x) => x.id === 'dnf').pontos, 0);
  assert.equal(r.find((x) => x.id === 'quase').nc, false, '5 de 5 voltas passa dos 90%');
  assert.equal(r.reduce((s, x) => s + x.pontos, 0), 101);
  assert.deepEqual(r.map((x) => x.pos), r.map((_, i) => i + 1));
});

test('a penalidade muda a ordem e os pontos; quem fez 90% das voltas sem cruzar a chegada ainda pontua', () => {
  const r = F1.classificacaoFinal([
    { id: 'a', laps: 10, finish: 500, acrescimo: 10, prog: 0 }, { id: 'b', laps: 10, finish: 505, acrescimo: 0, prog: 0 },
    { id: 'c', laps: 9, finish: null, acrescimo: 0, prog: 1 }, { id: 'd', laps: 8, finish: null, acrescimo: 0, prog: 1 }], 10);
  assert.deepEqual(r.map((x) => x.id), ['b', 'a', 'c', 'd']);
  assert.deepEqual(r.map((x) => x.pontos), [25, 18, 15, 0]);
  assert.equal(r[3].nc, true);
});

test('queimar a largada dá 5 s (uma vez só), e sair com as luzes apagadas, não', () => {
  const pts = T.pontos(T.PISTAS.monaco, 6), logs = [], log = (s) => logs.push(s);
  const a = { id: 'a', name: 'Ana', finish: null }, b = { id: 'b', name: 'Beto', finish: null };
  const room = { config: { pista: 'monaco', voltas: 3 }, semente: 1, startAt: 20000, order: ['a', 'b'], players: { a, b } };
  Direcao.iniciar(room);
  const pos = (v) => ({ x: pts[0].x, y: pts[0].y, prog: -5, v });
  Direcao.registrar(room, a, pos(10), 18000, log); assert.equal(a.penal, 0, 'devagar não é queimar');
  Direcao.registrar(room, a, pos(80), 19000, log); assert.equal(a.penal, 5); assert.equal(a.acrescimo, 5);
  Direcao.registrar(room, a, pos(120), 19500, log); assert.equal(a.penal, 5, 'só uma penalidade');
  assert.ok(logs.some((s) => s.includes('queimou a largada')));
  Direcao.registrar(room, b, pos(80), 20200, log); assert.equal(b.penal, 0, 'depois das luzes apagarem, pode');
  Direcao.registrar(room, b, pos(80), 19900, log); assert.equal(b.penal, 0, 'dentro da folga de 150 ms do relógio');
});

// ---------- a classificação inteira no servidor, com o relógio simulado ----------
const salaDe = (humanos) => {
  const players = {}, order = [];
  for (const id of humanos) { players[id] = { id, name: id, color: '#fff', sockets: new Set(['s-' + id]) }; order.push(id); }
  const room = { config: { pista: 'monaco', regras: 'f1', voltas: 3, robos: 19, nivel: 'medio' }, semente: 99, phase: 'quali', players, order, finishOrder: [], log: [] };
  Robos.preparar(room, ['#e63946'], (n) => 'x'.repeat(n));
  return room;
};
const depsDe = (grids) => ({ log: () => {}, broadcast: () => {}, largar: (room, grid) => grids.push(grid) });
// uma volta lançada do humano `p`: abre a volta na linha, passa pelos 12 setores e fecha `segundos` depois
const voltaDe = (t, room, p, segundos) => {
  assert.equal(Quali.aoSetor(room, p, 0), true);
  for (let s = 1; s < T.SECTORS; s++) assert.equal(Quali.aoSetor(room, p, s), true);
  avanca(t, segundos * 1000);
  assert.equal(Quali.aoSetor(room, p, 0), true);
};

test('a classificação com um humano: três sessões, eliminações e o grid de 20 que vai para a largada', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 });
  const room = salaDe(['h']), grids = [], deps = depsDe(grids), h = room.players.h;
  Quali.iniciar(room, deps);
  const q = room.quali;
  assert.deepEqual(q.sessoes, [20, 15, 10]); assert.equal(q.ativos.length, 20);
  // antes de abrir o relógio, a volta não conta
  assert.equal(Quali.aoSetor(room, h, 0), false);
  avanca(t, Quali.CONTAGEM_MS + 200);
  // setor fora da ordem não vale; volta mais rápida que a mínima é atalho
  assert.equal(Quali.aoSetor(room, h, 5), false);
  assert.equal(Quali.aoSetor(room, h, 0), true);
  for (let s = 1; s < T.SECTORS; s++) Quali.aoSetor(room, h, s);
  avanca(t, 5000); assert.equal(Quali.aoSetor(room, h, 0), false, 'atalho: volta de 5 s');
  for (let s = 1; s < T.SECTORS; s++) Quali.aoSetor(room, h, s); // a corrente recomeça, mas a volta segue aberta desde a primeira passagem
  avanca(t, (T.PISTAS.monaco.minLap + 1) * 1000);
  assert.equal(Quali.aoSetor(room, h, 0), true);
  assert.ok(Math.abs(h.qMelhor - (T.PISTAS.monaco.minLap + 6)) < 0.5);
  const publico = Quali.publico(room);
  assert.ok(publico.tabela.some((x) => x.id === 'h'));
  Quali.pronto(room, h); Quali.verificarFim(room, deps);
  assert.equal(q.fechadas.length, 1); assert.ok(q.pausaAte);
  const q1 = q.fechadas[0];
  assert.equal(q1.eliminados.length, 5); assert.equal(q1.passam.length, 15);
  assert.ok(Math.max(...q1.passam.map((x) => x.tempo ?? Infinity).filter(Number.isFinite)) <= Math.min(...q1.eliminados.map((x) => x.tempo ?? Infinity)));
  // Q2 e Q3: só quem passou corre, e quem fica de fora vira o fim do grid
  for (const esperados of [15, 10]) {
    avanca(t, Quali.INTERVALO_MS + 10);
    assert.equal(q.ativos.length, esperados);
    if (q.ativos.includes('h')) { avanca(t, Quali.CONTAGEM_MS + 200); voltaDe(t, room, h, T.PISTAS.monaco.minLap + 1); Quali.pronto(room, h); Quali.verificarFim(room, deps); }
    else { avanca(t, 30000); } // o humano caiu: a sessão só mostra a tabela e fecha sozinha
  }
  assert.equal(q.fechadas.length, 3);
  assert.ok(q.grid && q.grid.length === 20 && new Set(q.grid).size === 20);
  assert.deepEqual(q.grid.slice(15), q.fechadas[0].eliminados.map((x) => x.id));
  assert.deepEqual(q.grid.slice(10, 15), q.fechadas[1].eliminados.map((x) => x.id));
  assert.equal(grids.length, 0, 'a corrida só larga depois do intervalo');
  avanca(t, Quali.INTERVALO_MS + 10);
  assert.equal(grids.length, 1); assert.deepEqual(grids[0], q.grid);
  Quali.cancelar(room);
});

test('a classificação só de robôs fecha sozinha, com o tempo fixo pela semente', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 2_000_000 });
  const gridDe = () => {
    const room = salaDe(['h']); room.players.h.sockets.clear(); // ninguém online
    const grids = []; Quali.iniciar(room, depsDe(grids));
    avanca(t, 3 * (Quali.CONTAGEM_MS + 8000 + Quali.INTERVALO_MS) + 1000);
    assert.equal(grids.length, 1); assert.equal(new Set(grids[0]).size, 20);
    return grids[0];
  };
  const um = gridDe(), dois = gridDe();
  assert.deepEqual(um, dois, 'a mesma semente dá o mesmo grid');
  assert.equal(um[um.length - 1], 'h', 'quem não fez volta largará por último');
});

test('o tempo dos robôs na classificação sai do piloto: o de ritmo alto é mais rápido na média, e o da constância baixa varia mais', () => {
  const room = salaDe(['h']); Robos.ritmoDosRobos(room);
  const bots = room.order.filter((id) => room.players[id].bot), tempos = {};
  bots.forEach((id, k) => { tempos[id] = []; for (let s = 0; s < 12; s++) { room.semente = 1000 + s; tempos[id].push(Robos.voltaLancada(room, room.players[id], s, k, bots.length).tempo); } });
  const media = (id) => tempos[id].reduce((a, b) => a + b, 0) / tempos[id].length, desvio = (id) => Math.sqrt(tempos[id].reduce((a, b) => a + (b - media(id)) ** 2, 0) / tempos[id].length);
  const por = (campo, dir) => bots.slice().sort((a, b) => dir * (room.players[a].piloto[campo] - room.players[b].piloto[campo]));
  const rapido = por('ritmo', -1)[0], lento = por('ritmo', 1)[0];
  assert.ok(media(rapido) < media(lento), `${room.players[rapido].name} deveria ser mais rápido que ${room.players[lento].name}`);
  const regular = por('constancia', -1)[0], irregular = por('constancia', 1)[0];
  assert.ok(desvio(irregular) > desvio(regular));
});
