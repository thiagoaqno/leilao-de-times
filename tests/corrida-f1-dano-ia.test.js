// Corrida da Galera, regras de F1: o dano fixo das batidas (1% cada, sem punição de tempo, cada par só conta a cada 4 s), o box e a IA dos robôs.
const test = require("node:test");
const assert = require("node:assert/strict");
const F1 = require("../public/corrida/f1-regras.js");
const T = require("../public/corrida/pistas.js");
const Robos = require("../corrida-robos.js");
const Direcao = require("../corrida-f1-direcao.js");
const { subirServidor, conectar, pedir } = require("./ajuda.js");

process.env.CORRIDA_TV_MS = "0"; // sem a transmissão de TV antes das luzes: a largada vem logo
const semLog = () => {};
const salaDeTeste = () => {
  const room = { phase: "race", startAt: 1000, config: { pista: "interlagos", regras: "f1", voltas: 3, robos: 0 }, players: { a: { id: "a", name: "Ana", pos: {} } }, order: ["a"], semente: 7 };
  room.direcao = { pista: [] }; // (só o necessário: bater não usa a pista)
  Object.assign(room.players.a, { penal: 0, acrescimo: 0, dano: 0, dnf: false, batidas: 0, batidaAte: 0, finish: null, box: null });
  return room;
};

test("batida: toda força válida causa 1% de dano e nenhuma punição de tempo", () => {
  assert.equal(F1.batida(0), null);
  assert.equal(F1.batida(F1.BATIDA_MIN - 1), null);
  for (const forca of [F1.BATIDA_MIN, 60, F1.BATIDA_MEDIA, F1.BATIDA_FORTE, 5000])
    assert.deepEqual([F1.batida(forca).dano, F1.batida(forca).segundos], [1, 0]);
  assert.equal(F1.BATIDA_INTERVALO, 4000, "o mesmo contato só conta de novo depois de 4 s");
});

test("dano: cada 1% tira 1% de velocidade, aceleração, freio e aderência", () => {
  assert.deepEqual(F1.efeitoDoDano(0), { final: 1, grip: 1, tracao: 1, freio: 1 });
  assert.deepEqual(F1.efeitoDoDano(undefined), F1.efeitoDoDano(0));
  assert.deepEqual(F1.efeitoDoDano(1), { final: 0.99, grip: 0.99, tracao: 0.99, freio: 0.99 });
  assert.deepEqual(F1.efeitoDoDano(50), { final: 0.5, grip: 0.5, tracao: 0.5, freio: 0.5 });
});

test("direção de prova: batida não soma tempo, acumula 1% e anuncia no log", () => {
  const room = salaDeTeste(), p = room.players.a, log = [];
  const b = Direcao.bater(room, p, 150, "muro", 5000, (s) => log.push(s));
  assert.equal(b.nivel, "media");
  assert.equal(p.penal, 0); assert.equal(p.acrescimo, 0);
  assert.equal(p.dano, 1);
  assert.equal(p.ultimaBatida.segundos, undefined);
  assert.ok(log.some((s) => /Ana.*batida média no muro.*dano 1%/.test(s)), log.join("|"));
  // o mesmo toque (dentro do intervalo) não conta duas vezes; depois do intervalo, conta
  assert.equal(Direcao.bater(room, p, 150, "muro", 5000 + F1.BATIDA_INTERVALO - 1, semLog), null);
  assert.equal(p.dano, 1);
  Direcao.bater(room, p, 200, "carro", 5000 + F1.BATIDA_INTERVALO - 1, (s) => log.push(s), "carro:b"); // outro par (outro carro): conta na hora
  assert.equal(p.penal, 0); assert.equal(p.dano, 2); assert.equal(p.batidas, 2);
  assert.ok(log.some((s) => /batida forte com outro carro/.test(s)));
  Direcao.bater(room, p, 150, "muro", 5000 + F1.BATIDA_INTERVALO, semLog); // o muro já passou dos 4 s: conta de novo
  assert.equal(p.dano, 3);
  // um encostão, antes da largada, na pausa ou com o carro no box não vale
  assert.equal(Direcao.bater(room, p, F1.BATIDA_MIN - 1, "muro", 99999, semLog), null);
  room.startAt = 1e9; assert.equal(Direcao.bater(room, p, 150, "muro", 99999, semLog), null);
});

test("direção de prova: com 100% de dano é perda total (DNF): o piloto fica fora e não pontua", () => {
  const room = salaDeTeste(), p = room.players.a, log = [];
  let t = 5000, n = 0;
  while (!p.dnf && n++ < 120) { Direcao.bater(room, p, 300, "muro", t, (s) => log.push(s)); t += F1.BATIDA_INTERVALO; }
  assert.ok(p.dnf, "chegou a 100%");
  assert.equal(p.dano, 100);
  assert.equal(n, 100, "perda total só após 100 batidas válidas (1% cada)");
  assert.ok(log.some((s) => /perda total/.test(s)));
  assert.equal(Direcao.bater(room, p, 300, "muro", t + 5000, semLog), null, "quem já abandonou não bate de novo");
  const r = F1.classificacaoFinal([
    { id: "a", laps: 1, finish: null, dnf: true, acrescimo: 20, prog: 100 },
    { id: "b", laps: 3, finish: 200, acrescimo: 0 },
    { id: "c", laps: 3, finish: 210, acrescimo: 0 }], 3);
  assert.deepEqual(r.map((x) => x.id), ["b", "c", "a"]);
  assert.equal(r[2].dnf, true); assert.equal(r[2].pontos, 0); assert.equal(r[2].tempo, null);
  assert.equal(r[0].pontos, 25);
});

test("box: três tempos (2,0 s perfeito, 2,7 s normal, 3,3 s ruim), sorteados pela semente do GP", () => {
  const tempos = new Set([2.0, 2.7, 3.3]);
  assert.deepEqual(F1.PARADAS.map((q) => q.tempo), [2.0, 2.7, 3.3]);
  const sorteio = (semente) => Array.from({ length: 300 }, (_, k) => F1.tempoDeParada(semente, "robo-" + (k % 20), 1 + Math.floor(k / 20)));
  assert.deepEqual(sorteio(11), sorteio(11), "a mesma semente dá o mesmo resultado");
  assert.notDeepEqual(sorteio(11), sorteio(12));
  const todos = sorteio(1).concat(sorteio(2), sorteio(3), sorteio(4), sorteio(5), sorteio(6), sorteio(7), sorteio(8), sorteio(9), sorteio(10));
  assert.ok(todos.every((t) => tempos.has(t)), "só os três tempos");
  const parte = (t) => todos.filter((x) => x === t).length / todos.length;
  assert.ok(parte(2.7) > parte(2.0) && parte(2.7) > parte(3.3), "normal é o mais comum");
  assert.ok(parte(2.0) > 0.18 && parte(2.0) < 0.32, "perfeito " + parte(2.0));
  assert.ok(parte(2.7) > 0.47 && parte(2.7) < 0.63, "normal " + parte(2.7));
  assert.ok(parte(3.3) > 0.13 && parte(3.3) < 0.27, "ruim " + parte(3.3));
  assert.equal(F1.classeDaParada(2.0), "perfeito"); assert.equal(F1.classeDaParada(2.7), "normal"); assert.equal(F1.classeDaParada(3.3), "ruim");
  assert.equal(F1.textoDaParada(2.0), "Box perfeito · 2,0 s");
  assert.equal(F1.textoDaParada(3.3), "Box ruim · 3,3 s");
});

// ---------- a IA ----------
// Uma corrida de robôs no servidor, no tempo de mentira (o relógio anda junto com a simulação), com a direção de prova, os
// boxes e as batidas como em corrida.js. Devolve os robôs, as batidas e as voltas de cada um.
function corridaDeRobos({ pista = "interlagos", nivel = "medio", robos = 10, voltas = 2, semente = 4321 } = {}) {
  const agora = Date.now; let relogio = agora();
  Date.now = () => relogio;
  try {
    Robos.usarFonte(() => []);
    const room = { config: { pista, regras: "f1", caixas: false, robos, nivel, voltas }, players: {}, order: [], phase: "race", startAt: relogio, semente, finishOrder: [] };
    Robos.preparar(room, ["#a", "#b", "#c"], () => "x");
    room.order.forEach((id, i) => Object.assign(room.players[id], { grid: i, laps: 0, sector: T.SECTORS - 1, started: false, finish: null }));
    Robos.largar(room); Direcao.iniciar(room);
    const batidas = [], voltasDe = {}, log = [];
    const setor = (p, s) => {
      if (s !== (p.sector + 1) % T.SECTORS) return; p.sector = s; if (s !== 0) return;
      if (!p.started) { p.started = true; p.lapStart = relogio; return; }
      const volta = (relogio - p.lapStart) / 1000; p.lapStart = relogio; p.laps++; (voltasDe[p.id] = voltasDe[p.id] || []).push(volta);
      if (p.laps >= voltas) p.finish = (relogio - room.startAt) / 1000;
    };
    const emit = (e, d) => {
      if (e === "batida") { batidas.push(d); Direcao.bater(room, room.players[d.id], d.forca, d.tipo, relogio, (s) => log.push(s)); }
      if (e === "box") { const p = room.players[d.id]; F1.registrarParada(p, { volta: d.volta, tempo: d.tempo, composto: d.composto }); }
    };
    for (let t = 0; t < 600 && room.order.some((id) => room.players[id].finish == null); t += 0.05) {
      relogio += 50;
      for (const id of room.order) { const p = room.players[id]; if (p.pos) Direcao.registrar(room, p, p.pos, relogio, (s) => log.push(s)); }
      Direcao.passo(room, relogio, (s) => log.push(s));
      Robos.passo(room, 0.05, setor, emit);
    }
    return { room, batidas, voltasDe, log };
  } finally { Date.now = agora; }
}
test("IA: 10 robôs numa corrida de F1 terminam, com poucas batidas entre eles e sem ninguém destruído", () => {
  const { room, batidas, log } = corridaDeRobos({ voltas: 2 });
  for (const id of room.order) assert.ok(room.players[id].finish != null, `${room.players[id].name} não terminou`);
  const valem = room.order.reduce((q, id) => q + (room.players[id].batidas || 0), 0) / 2; // as batidas que valeram (cada contato pune os dois)
  const noMuro = batidas.filter((b) => b.tipo === "muro").length;
  assert.ok(valem <= 4, `batidas entre robôs: ${valem} ${log.filter((l) => /batida/.test(l)).join(" | ")}`);
  assert.ok(noMuro <= 2, `batidas no muro: ${noMuro}`);
  assert.ok(room.order.every((id) => !room.players[id].dnf), "nenhum robô destruído");
  assert.ok(room.order.every((id) => (room.players[id].dano || 0) < 60));
});

test("IA: o ritmo continua o do nível (fácil mais lento que o médio, que é mais lento que o difícil) e nunca passa do carro", () => {
  let ideal = 0;
  const melhor = (nivel) => { const r = corridaDeRobos({ nivel, voltas: 2, robos: 1 }); ideal = Robos.idealDe("interlagos", r.room.players[r.room.order[0]].spec); return Math.min(...r.voltasDe[r.room.order[0]].slice(1)); };
  const f = melhor("facil"), m = melhor("medio"), d = melhor("dificil");
  assert.ok(f > m && m > d, `facil ${f.toFixed(1)} medio ${m.toFixed(1)} dificil ${d.toFixed(1)}`);
  // Com a mesma dinâmica dos humanos, a volta já inclui frenagens e curvas reais.
  assert.ok(d > ideal * 0.99, `o difícil (${d.toFixed(1)} s) não pode superar a volta ideal do carro (${ideal.toFixed(1)} s)`);
  assert.ok(m < 135, `o médio não pode ser lento demais, mesmo no composto duro (${m.toFixed(1)} s)`);
});

test("IA: sem volta humana, o grid completo fecha Mônaco e classifica perto de uma volta competitiva", () => {
  const { room } = corridaDeRobos({ pista: "monaco", robos: 19, voltas: 2 });
  assert.equal(room.order.length, 19);
  assert.ok(room.order.every((id) => room.players[id].finish != null), "todos cruzam a chegada");
  const tempos = room.order.map((id, i) => Robos.voltaLancada(room, room.players[id], 0, i, 19).tempo).sort((a, b) => a - b);
  // (a linha de menor curvatura tirou ~10 s da volta em Mônaco: a pole fica em ~55 s)
  assert.ok(tempos[0] > 50 && tempos[0] < 80, `pole ${tempos[0]}`); // (macio novo e quente: mais rápido que o pneu neutro do ritmo da corrida)
  assert.ok(tempos.at(-1) - tempos[0] < 5, `grid disperso: ${tempos[0]} a ${tempos.at(-1)}`);
});

test("IA: grid completo termina em todas as pistas de GP sem volta gravada", () => {
  for (const pista of Object.keys(T.PISTAS).filter((id) => T.PISTAS[id].f1 || ["monaco", "interlagos", "barcelona", "silverstone", "monza"].includes(id))) {
    const { room } = corridaDeRobos({ pista, robos: 19, voltas: 2 });
    assert.equal(room.order.length, 19, pista);
    const semChegada = room.order.map((id) => room.players[id]).filter((p) => p.finish == null);
    assert.equal(semChegada.length, 0, `${pista}: ${semChegada.length} robôs sem chegada; ${semChegada.slice(0, 3).map((p) => `${p.name} volta ${p.laps} posição ${p.ia.s.toFixed(0)}`).join(", ")}`);
  }
});

test("IA: recorde humano limita a pole; volta boa em Cadillac não vira P2 automaticamente", () => {
  Robos.usarFonte(() => [], () => ({ tempo: 95 }), () => ({ tempo: 66 }));
  const room = { config: { pista: "monaco", regras: "f1", nivel: "medio", robos: 19 }, players: { h: { id: "h", name: "Thiago", bot: false, equipe: "cadillac" } }, order: ["h"], semente: 4321 };
  Robos.preparar(room, ["#a"], () => "x");
  Robos.ritmoDosRobos(room);
  const bots = room.order.map((id) => room.players[id]).filter((p) => p.bot);
  const tempos = bots.map((p, i) => Robos.voltaLancada(room, p, 0, i, bots.length).tempo).sort((a, b) => a - b);
  // O macio novo desta tabela de pneus (aderência ~1,51, mais baixa que a antiga) dá ~70,2 s ao piloto ideal em Mônaco; a pole de um
  // robô médio fica a ~3% disso (~72,4 s). O teto antigo (72) era de quando o macio era mais aderente.
  // (depois da linha de menor curvatura o ideal em Mônaco caiu de ~70 s para ~57 s: a pole fica em ~55 s)
  assert.ok(tempos[0] > 50 && tempos[0] < 62, `pole ${tempos[0]}`);
  assert.ok(tempos.at(-1) < 85, `fundo do grid ${tempos.at(-1)}`);
  Robos.usarFonte(() => [], () => ({ tempo: 95 }), () => ({ tempo: 95 }));
  Robos.ritmoDosRobos(room);
  const poleSemRecordeRapido = Math.min(...bots.map((p, i) => Robos.voltaLancada(room, p, 0, i, bots.length).tempo));
  assert.ok(poleSemRecordeRapido >= tempos[0] * 0.95 && poleSemRecordeRapido < 85,
    `uma única volta lenta não deve limitar o grid: ${poleSemRecordeRapido}`);
  Robos.usarFonte(() => []);
});

test("IA: depois da primeira chegada, todos têm 1 minuto para terminar (F1 e clássico)", () => {
  const room = { config: { pista: "monaco", regras: "f1", voltas: 5 }, order: ["b"], players: { b: { id: "b", bot: true, laps: 3, started: true, finish: null, pos: { prog: 0 } } }, ritmoRobos: 45 };
  assert.equal(Robos.prazoDeChegada(room), 60000);
  assert.equal(Robos.prazoDeChegada({ ...room, config: { ...room.config, regras: "arcade" } }), 60000);
});

test("IA: carro com perda total é retirado do tráfego, mesmo numa curva", () => {
  Robos.usarFonte(() => []);
  const agora = Date.now; let relogio = agora(); Date.now = () => relogio;
  try {
    const room = { config: { pista: "interlagos", regras: "f1", caixas: false, robos: 1, nivel: "medio", voltas: 2 }, players: {}, order: [], phase: "race", startAt: relogio, semente: 7, finishOrder: [] };
    Robos.preparar(room, ["#a"], () => "a");
    const bot = room.players[room.order[0]]; bot.grid = 0; Robos.largar(room);
    const pf = Robos.perfil("interlagos", bot.spec), idx = Math.floor((bot.ia.s + 25) % pf.n), pt = pf.pts[idx];
    room.players.wreck = { id: "wreck", bot: false, name: "Retirado", dnf: true, finish: null, pos: { x: pt.x, y: pt.y, z: pt.h, a: Math.atan2(pt.ty, pt.tx), v: 0, prog: idx } };
    room.order.push("wreck");
    const inicio = bot.ia.s;
    for (let i = 0; i < 180; i++) { relogio += 50; Robos.passo(room, 0.05, () => {}, () => {}); }
    assert.ok((bot.ia.s - inicio + pf.n) % pf.n > 100, `bot preso atrás do carro retirado: ${bot.ia.s - inicio}`);
  } finally { Date.now = agora; }
});

test("IA: cada robô tem o seu jeito (traçado, frenagem, erros), sorteado pela semente do GP", () => {
  const a = corridaDeRobos({ voltas: 1, robos: 8, semente: 99 }), b = corridaDeRobos({ voltas: 1, robos: 8, semente: 99 });
  const estilos = (r) => r.room.order.map((id) => { const e = r.room.players[id].ia.estilo; return [e.dentro, e.lado, e.look, e.erroK].map((x) => +x.toFixed(4)).join(","); });
  assert.deepEqual(estilos(a), estilos(b), "mesma semente, mesmos jeitos");
  assert.equal(new Set(estilos(a)).size, 8, "cada um com o seu");
  assert.ok(new Set(a.room.order.map((id) => a.room.players[id].ia.estilo.look)).size >= 3, "uns freiam antes, outros depois");
  assert.ok(a.room.order.some((id) => a.room.players[id].ia.estilo.dentro > 0.3) && a.room.order.some((id) => a.room.players[id].ia.estilo.dentro < -0.3), "uns por dentro, outros por fora");
});

test("IA: o robô para a tempo atrás de um carro lento e não fecha a porta de quem está ao lado", () => {
  Robos.usarFonte(() => []);
  const agora = Date.now; let relogio = agora(); Date.now = () => relogio;
  try {
    const room = { config: { pista: "interlagos", regras: "f1", caixas: false, robos: 1, nivel: "medio", voltas: 3 }, players: {}, order: [], phase: "race", startAt: relogio - 5000, semente: 5, finishOrder: [] };
    Robos.preparar(room, ["#a"], () => "a");
    const bot = room.players[room.order[0]]; bot.grid = 0; Robos.largar(room); Direcao.iniciar(room);
    bot.ia.reacao = 0; bot.ia.v = 160; bot.ia.erroLivre = 1e15; // sem erro neste teste; dá espaço para o freio progressivo
    // um humano parado na mesma faixa, cerca de 270 u à frente: o robô tem que parar atrás dele sem encostar
    const pf = Robos.perfil("interlagos", bot.car, bot.ia.tracadoId), i0 = Math.floor(bot.ia.s), alvo = pf.pts[(i0 + 45) % pf.n];
    room.players.h = { id: "h", name: "Humano", pos: { x: alvo.x - alvo.ty * bot.ia.lat, y: alvo.y + alvo.tx * bot.ia.lat, z: alvo.h, a: Math.atan2(alvo.ty, alvo.tx), v: 0, prog: 45, at: relogio }, finish: null, bot: false };
    room.order.push("h");
    const contatos = []; let oportunidade = false, ersNaPassagem = false;
    for (let t = 0; t < 12; t += 0.05) {
      relogio += 50; room.players.h.pos.at = relogio;
      Robos.passo(room, 0.05, () => {}, (e, d) => { if (e === "batida") contatos.push(d); });
      oportunidade ||= !!bot.ia.ult;
      ersNaPassagem ||= !!bot.ia.sim.ersAtivo;
      assert.ok(Robos.forcaDoContato(bot.pos, room.players.h.pos) < F1.BATIDA_MIN, `bateu em t=${t.toFixed(2)} a ${bot.ia.v.toFixed(0)} u/s`);
    }
    assert.equal(contatos.filter((c) => c.forca >= F1.BATIDA_MIN).length, 0);
    assert.ok(oportunidade && ersNaPassagem, "usa ERS quando há espaço para ultrapassar o carro lento");
    // e ao lado: um carro encostado do lado de dentro da curva não é fechado
    const p = pf.pts[Math.floor(bot.ia.s) % pf.n], lat0 = bot.ia.lat;
    room.players.h.pos = { x: bot.pos.x - p.ty * 30, y: bot.pos.y + p.tx * 30, z: bot.pos.z, a: bot.pos.a, v: bot.ia.v, prog: bot.pos.prog, at: relogio };
    bot.ia.desvio = 0;
    for (let t = 0; t < 0.6; t += 0.05) { relogio += 50; room.players.h.pos.at = relogio; Robos.passo(room, 0.05, () => {}, () => {}); assert.ok(bot.ia.lat <= lat0 + 1, "foi para cima de quem estava ao lado"); }
  } finally { Date.now = agora; }
});
