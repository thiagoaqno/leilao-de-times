// Corrida da Galera, regras de F1: a punição e o dano das batidas (a perda total), o box com três tempos e a IA dos robôs.
const test = require("node:test");
const assert = require("node:assert/strict");
const F1 = require("../public/corrida/f1-regras.js");
const T = require("../public/corrida/pistas.js");
const Robos = require("../corrida-robos.js");
const Direcao = require("../corrida-f1-direcao.js");
const { subirServidor, conectar, pedir } = require("./ajuda.js");

const semLog = () => {};
const salaDeTeste = () => {
  const room = { phase: "race", startAt: 1000, config: { pista: "interlagos", regras: "f1", voltas: 3, robos: 0 }, players: { a: { id: "a", name: "Ana", pos: {} } }, order: ["a"], semente: 7 };
  room.direcao = { pista: [] }; // (só o necessário: bater não usa a pista)
  Object.assign(room.players.a, { penal: 0, acrescimo: 0, dano: 0, dnf: false, batidas: 0, batidaAte: 0, finish: null, box: null });
  return room;
};

test("batida: a força decide a punição (1, 2 ou 5 s) e o dano proporcional; encostão não conta", () => {
  assert.equal(F1.batida(0), null);
  assert.equal(F1.batida(F1.BATIDA_MIN - 1), null);
  assert.deepEqual([F1.batida(60).nivel, F1.batida(60).segundos], ["leve", 1]);
  assert.deepEqual([F1.batida(F1.BATIDA_MEDIA).nivel, F1.batida(F1.BATIDA_MEDIA).segundos], ["media", 2]);
  assert.deepEqual([F1.batida(150).nivel, F1.batida(150).segundos], ["media", 2]);
  assert.deepEqual([F1.batida(F1.BATIDA_FORTE).nivel, F1.batida(F1.BATIDA_FORTE).segundos], ["forte", 5]);
  assert.deepEqual([F1.batida(300).nivel, F1.batida(300).segundos], ["forte", 5]);
  let antes = 0;
  for (let f = F1.BATIDA_MIN; f <= F1.BATIDA_MAX; f += 10) { const d = F1.batida(f).dano; assert.ok(d >= antes, "o dano cresce com a força"); antes = d; }
  assert.equal(F1.batida(5000).dano, F1.batida(F1.BATIDA_MAX).dano, "o dano tem teto");
  assert.ok(F1.batida(100).dano > 0 && F1.batida(100).dano < 100);
});

test("dano: o carro batido anda pior (velocidade final e aderência), e sem dano nada muda", () => {
  assert.deepEqual(F1.efeitoDoDano(0), { final: 1, grip: 1 });
  assert.deepEqual(F1.efeitoDoDano(undefined), { final: 1, grip: 1 });
  const metade = F1.efeitoDoDano(50), cheio = F1.efeitoDoDano(100);
  assert.ok(metade.final < 1 && metade.grip < 1 && cheio.final < metade.final && cheio.grip < metade.grip);
  assert.ok(cheio.final > 0.8 && cheio.grip > 0.7, "um pouco menos, não um carro parado");
});

test("direção de prova: a batida soma a punição ao tempo final, acumula dano e anuncia no log", () => {
  const room = salaDeTeste(), p = room.players.a, log = [];
  const b = Direcao.bater(room, p, 150, "muro", 5000, (s) => log.push(s));
  assert.equal(b.nivel, "media");
  assert.equal(p.penal, 2); assert.equal(p.acrescimo, 2);
  assert.equal(p.dano, F1.batida(150).dano);
  assert.equal(p.ultimaBatida.segundos, 2);
  assert.ok(log.some((s) => /Ana.*batida média no muro.*\+2 s/.test(s)), log.join("|"));
  // o mesmo toque (dentro do intervalo) não conta duas vezes; depois do intervalo, conta
  assert.equal(Direcao.bater(room, p, 150, "muro", 5000 + F1.BATIDA_INTERVALO - 1, semLog), null);
  assert.equal(p.penal, 2);
  Direcao.bater(room, p, 200, "carro", 5000 + F1.BATIDA_INTERVALO, (s) => log.push(s));
  assert.equal(p.penal, 7); assert.equal(p.batidas, 2);
  assert.ok(log.some((s) => /batida forte com outro carro/.test(s)));
  // um encostão, antes da largada, na pausa ou com o carro no box não vale
  assert.equal(Direcao.bater(room, p, 20, "muro", 99999, semLog), null);
  room.startAt = 1e9; assert.equal(Direcao.bater(room, p, 150, "muro", 99999, semLog), null);
});

test("direção de prova: com 100% de dano é perda total (DNF): o piloto fica fora e não pontua", () => {
  const room = salaDeTeste(), p = room.players.a, log = [];
  let t = 5000, n = 0;
  while (!p.dnf && n++ < 20) { Direcao.bater(room, p, 300, "muro", t, (s) => log.push(s)); t += F1.BATIDA_INTERVALO; }
  assert.ok(p.dnf, "chegou a 100%");
  assert.equal(p.dano, 100);
  assert.ok(n <= 4, "poucas batidas fortes bastam: " + n);
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

test("servidor: o navegador manda a batida e a força, o servidor confere (teto de força, velocidade, vizinhos) e aplica", { timeout: 45000 }, async () => {
  const srv = await subirServidor(), s = await conectar(srv.url, "/corrida");
  try {
    const r = await pedir(s, "create", { name: "Ana", config: { regras: "f1", robos: 0, classificacao: "pular", voltas: 3, pista: "interlagos" } });
    await pedir(s, "act", { type: "start" });
    const eu = () => s.ultimo.players.find((p) => p.id === r.id);
    const espera = (cond, ms = 20000) => new Promise((ok, erro) => { const t0 = Date.now(), k = setInterval(() => { if (cond()) { clearInterval(k); ok(); } else if (Date.now() - t0 > ms) { clearInterval(k); erro(new Error("tempo esgotado")); } }, 50); });
    await espera(() => s.ultimo && s.ultimo.phase === "race" && s.ultimo.startAt);
    const w = T.PISTAS.interlagos.world / 2, pos = (v) => { s.emit("pos", { x: w, y: w, a: 0, v, prog: 10 }); return new Promise((ok) => setTimeout(ok, 120)); };
    const bate = async (forca, tipo) => { await pos(200); return new Promise((ok) => s.emit("act", { type: "batida", forca, tipo }, ok)); };
    await new Promise((ok) => setTimeout(ok, Math.max(0, s.ultimo.startAt - Date.now()) + 300)); // as luzes apagam
    // batida com o carro ao lado de ninguém: não vale
    assert.equal((await bate(150, "carro")).ignored, true);
    assert.equal(eu().dano, 0);
    // no muro: a punição e o dano da força
    await bate(150, "muro"); await espera(() => eu().dano > 0);
    assert.equal(eu().penal, 2); assert.equal(eu().dano, F1.batida(150).dano);
    assert.equal(eu().ultimaBatida.nivel, "media");
    // dentro do intervalo: ignorada
    assert.equal((await bate(300, "muro")).ignored, true);
    await new Promise((ok) => setTimeout(ok, F1.BATIDA_INTERVALO));
    // uma força absurda vira o teto da velocidade do carro (nunca passa dos limites)
    await bate(1e6, "muro"); await espera(() => eu().penal >= 7);
    assert.ok(eu().dano <= F1.batida(F1.BATIDA_MAX).dano + F1.batida(150).dano + 0.01, "teto de dano: " + eu().dano);
    assert.equal(eu().penal, 7);
    // até a perda total
    for (let k = 0; k < 4 && !eu().dnf; k++) { await new Promise((ok) => setTimeout(ok, F1.BATIDA_INTERVALO)); await bate(300, "muro"); }
    await espera(() => eu().dnf);
    assert.equal(eu().dano, 100);
    assert.ok(s.ultimo.log.some((l) => /perda total/.test(l.text)));
  } finally { s.close(); await srv.parar(); }
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
const mediana = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

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
  const melhor = (nivel) => { const r = corridaDeRobos({ nivel, voltas: 2, robos: 6 }); return mediana(r.room.order.map((id) => Math.min(...r.voltasDe[id].slice(1)))); };
  const f = melhor("facil"), m = melhor("medio"), d = melhor("dificil");
  assert.ok(f > m && m > d, `facil ${f.toFixed(1)} medio ${m.toFixed(1)} dificil ${d.toFixed(1)}`);
  const pf = Robos.perfil("interlagos", "equilibrado", 0), maximo = Robos.tempoDaVolta(pf, 1.6);
  assert.ok(d > maximo * 0.92, `o difícil (${d.toFixed(1)} s) não pode ser mais rápido que o carro (${maximo.toFixed(1)} s)`);
  assert.ok(m < maximo * 1.6, `o médio não pode ser lento demais (${m.toFixed(1)} s)`);
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
    bot.ia.reacao = 0; bot.ia.v = 250; bot.ia.erroLivre = 1e15; // sem erro neste teste
    // um humano parado na mesma faixa, uns 150 u à frente: o robô tem que parar atrás dele sem encostar
    const pf = Robos.perfil("interlagos", bot.car, bot.ia.tracadoId), i0 = Math.floor(bot.ia.s), alvo = pf.pts[(i0 + 25) % pf.n];
    room.players.h = { id: "h", name: "Humano", pos: { x: alvo.x - alvo.ty * bot.ia.lat, y: alvo.y + alvo.tx * bot.ia.lat, z: alvo.h, a: Math.atan2(alvo.ty, alvo.tx), v: 0, prog: 25, at: relogio }, finish: null, bot: false };
    room.order.push("h");
    const contatos = [];
    for (let t = 0; t < 12; t += 0.05) {
      relogio += 50; room.players.h.pos.at = relogio;
      Robos.passo(room, 0.05, () => {}, (e, d) => { if (e === "batida") contatos.push(d); });
      assert.ok(Robos.forcaDoContato(bot.pos, room.players.h.pos) < F1.BATIDA_MIN, `bateu em t=${t.toFixed(2)} a ${bot.ia.v.toFixed(0)} u/s`);
    }
    assert.equal(contatos.filter((c) => c.forca >= F1.BATIDA_MIN).length, 0);
    // e ao lado: um carro encostado do lado de dentro da curva não é fechado
    const p = pf.pts[Math.floor(bot.ia.s) % pf.n], lat0 = bot.ia.lat;
    room.players.h.pos = { x: bot.pos.x - p.ty * 30, y: bot.pos.y + p.tx * 30, z: bot.pos.z, a: bot.pos.a, v: bot.ia.v, prog: bot.pos.prog, at: relogio };
    bot.ia.desvio = 0;
    for (let t = 0; t < 0.6; t += 0.05) { relogio += 50; room.players.h.pos.at = relogio; Robos.passo(room, 0.05, () => {}, () => {}); assert.ok(bot.ia.lat <= lat0 + 1, "foi para cima de quem estava ao lado"); }
  } finally { Date.now = agora; }
});
