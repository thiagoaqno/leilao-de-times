// Corrida: o pit stop das regras de F1 (public/corrida/f1-regras.js): o corredor dos boxes, o tempo da parada, a regra
// dos dois compostos, a estratégia e a parada dos robôs, e a sala do servidor.
const test = require("node:test");
const assert = require("node:assert/strict");
const F1 = require("../public/corrida/f1-regras.js");
const T = require("../public/corrida/pistas.js");
const Robos = require("../corrida-robos.js");
const Itens = require("../corrida-itens.js");
const bd = require("../bd.js");

process.env.CORRIDA_TV_MS = "0"; // sem a transmissão de TV antes das luzes: a largada vem logo
const corredorDe = (id) => { const t = T.PISTAS[id]; return F1.corredor(t, T.pontos(t, 6).length, t.width); };

test("box: a saída aponta no sentido da volta e avança o índice nas cinco pistas de F1", () => {
  for (const id of ["monaco", "interlagos", "barcelona", "silverstone", "monza"]) {
    const pts = T.pontos(T.PISTAS[id], 6), cor = corredorDe(id);
    const saida = F1.saidaDoCorredor(cor, pts);
    assert.equal(saida.indice, (cor.i0 + cor.len) % pts.length, `${id}: índice da saída`);
    assert.ok(cor.len > 0 && (saida.indice - cor.i0 + pts.length) % pts.length === cor.len, `${id}: a saída avança pela volta`);
    const p = pts[saida.indice];
    assert.ok(Math.cos(saida.a) * p.tx + Math.sin(saida.a) * p.ty > 0.999, `${id}: rumo da volta`);
  }
});

test("box: uma parada em Interlagos custa entre 5 e 10 s (entrada + limitador + parada + saída)", () => {
  const c = corredorDe("interlagos"), vmax = T.CARROS.equilibrado.vmax;
  const curta = F1.tempoNoBox(c, vmax, F1.PARADA_BASE), longa = F1.tempoNoBox(c, vmax, F1.PARADA_BASE + F1.PARADA_ERRO);
  assert.ok(curta >= 5 && longa <= 10, `${curta.toFixed(1)} a ${longa.toFixed(1)} s`);
  // o corredor começa antes da linha de chegada, do lado de dentro; pista sem `boxes` não tem corredor
  assert.ok(c.i0 > T.pontos(T.PISTAS.interlagos, 6).length * 0.9 && c.lado === 1);
  assert.equal(F1.corredor(T.PISTAS.arcoiris, 2000, 88), null);
});

test("box: a entrada de Monza vem antes da chegada, para aceitar parada na penúltima volta", () => {
  const n = T.pontos(T.PISTAS.monza, 6).length, c = corredorDe("monza");
  assert.ok(c.i0 > n * 0.95, "a entrada fica antes da linha de chegada");
  assert.ok((c.i0 + c.len) % n < n * 0.05, "a saída fica depois da linha");
});

test("box: Barcelona tem o corredor em volta da linha de chegada, com as 10 garagens centradas nela e o prédio no mesmo passo", () => {
  const n = T.pontos(T.PISTAS.barcelona, 6).length, c = corredorDe("barcelona");
  assert.ok(c.i0 > n * 0.95, "a entrada fica antes da linha de chegada");
  assert.ok((c.i0 + c.len) % n < n * 0.05, "a saída fica depois da linha");
  const x = c.garagens.map((u) => { const i = Math.round(c.i0 + u) % n; return (i > n / 2 ? i - n : i) * 6; }); // a posição de cada garagem ao longo da reta (0 = a linha)
  assert.ok(x[0] < 0 && x[x.length - 1] > 0 && Math.abs(x[0] + x[x.length - 1]) <= 12, `garagens de ${x[0]} a ${x[x.length - 1]}: centradas na linha`);
  assert.ok(Math.abs(c.gap * 6 - 31.2) < 0.01, "o passo das garagens é o das portas do prédio (barcelona.js usa o mesmo número)");
});

test("box: toda pista do calendário tem corredor, com as 10 garagens entre a rampa de entrada e a de saída", () => {
  for (const id of ["interlagos", "barcelona", "monaco", "deserto", "tokyo", "rio", "nurburgring", "laguna", "losangeles", "serra", "luigi", "sorvete", "monza", "silverstone",
    "melbourne", "xangai", "suzuka", "bahrein", "jeddah", "miami", "montreal", "redbullring", "spa", "hungaroring", "zandvoort", "madri", "baku", "singapura", "austin", "mexico", "lasvegas", "catar", "abudhabi"]) {
    const c = corredorDe(id), W = T.PISTAS[id].width;
    assert.ok(c, id);
    assert.equal(c.garagens.length, F1.GARAGENS);
    assert.ok(c.garagens[0] > F1.RAMPA && c.garagens[c.garagens.length - 1] < c.len - F1.RAMPA, `${id}: garagens ${c.garagens[0]}..${c.garagens[9]} de ${c.len}`);
    assert.ok(Math.abs(c.lat(c.len / 2)) > W / 2 + 10, `${id}: o corredor fica ao lado da pista`);
    const tempo = F1.tempoNoBox(c, T.CARROS.equilibrado.vmax, F1.PARADA_BASE);
    assert.ok(tempo >= 5 && tempo <= 10, `${id}: ${tempo.toFixed(1)} s de box`);
    assert.ok(Math.abs(c.lat(c.len)) < W / 2, `${id}: a saída volta para a pista`);
  }
});

test("box: a faixa rápida passa ao lado do carro parado na garagem", () => {
  for (const id of ["monaco", "interlagos"]) {
    const c = corredorDe(id), garagem = c.garagens[4];
    assert.equal(c.larguraCorredor, 54);
    assert.ok(Math.abs(c.latParada(garagem, garagem) - c.lat(garagem)) >= 27, `${id}: duas faixas independentes`);
    assert.ok(Math.abs(c.latParada(garagem - 7, garagem) - c.lat(garagem - 7)) < 0.01, `${id}: entra pela faixa rápida`);
    assert.ok(Math.abs(c.latParada(garagem + 7, garagem) - c.lat(garagem + 7)) < 0.01, `${id}: volta à faixa rápida`);
  }
});

test("box: o mesmo GP com a mesma semente dá os mesmos erros de mecânico", () => {
  const erros = (semente) => ["ana", "beto", "caio"].flatMap((q) => [1, 2].map((n) => F1.tempoDeParada(semente, q, n)));
  assert.deepEqual(erros(4242), erros(4242));
  assert.notDeepEqual(erros(4242), erros(4243));
  for (const t of erros(7)) assert.ok(t >= F1.PARADA_BASE && t <= F1.PARADA_BASE + F1.PARADA_ERRO, String(t));
  assert.ok(new Set(Array.from({ length: 30 }, (_, n) => F1.tempoDeParada(7, "ana", n + 1))).size > 1); // cada parada tem o seu sorteio
});

test("robôs: a estratégia sempre usa dois compostos e nunca para na última volta", () => {
  for (const voltas of [2, 3, 5, 8]) for (const nivel of ["facil", "medio", "dificil"]) for (let semente = 1; semente <= 80; semente++) {
    const e = F1.estrategia(voltas, nivel, semente), compostos = [e.largada, ...e.paradas.map((q) => q.composto)];
    assert.ok(e.paradas.length >= 1 && e.paradas.length <= 2, `${voltas}/${nivel}/${semente}`);
    assert.ok(new Set(compostos).size >= 2, compostos.join());
    compostos.forEach((c, k) => { assert.ok(F1.PNEUS[c]); if (k) assert.notEqual(c, compostos[k - 1]); });
    e.paradas.forEach((q, k) => { assert.ok(q.volta >= 1 && q.volta <= voltas - 1, `${voltas}: parada na volta ${q.volta}`); if (k) assert.ok(q.volta > e.paradas[k - 1].volta); });
  }
  assert.deepEqual(F1.estrategia(5, "medio", 9), F1.estrategia(5, "medio", 9)); // mesma semente, mesma estratégia
  assert.deepEqual(F1.estrategia(1, "medio", 9).paradas, []); // uma volta só: não tem onde parar
  const volta = new Set(); for (let s = 1; s <= 80; s++) volta.add(F1.estrategia(5, "medio", s).paradas[0].volta);
  assert.ok(volta.size >= 2, "os robôs não param todos na mesma volta");
});

// os robôs numa corrida de `voltas` voltas, no tempo de mentira, até todos acabarem (ou 600 s)
function corridaDosRobos(voltas, semente, quantidade = 3) {
  const agora = Date.now; let relogio = agora();
  Date.now = () => relogio;
  try {
    const room = { config: { pista: "interlagos", caixas: false, robos: quantidade, nivel: "medio", voltas, regras: "f1" }, players: {}, order: [], phase: "race", startAt: relogio, semente };
    let k = 0; Robos.preparar(room, ["#a", "#b", "#c", "#d"], () => "x" + k++);
    room.order.forEach((id, i) => Object.assign(room.players[id], { grid: i, laps: 0, sector: T.SECTORS - 1, started: false, finish: null }));
    Itens.start(room); Robos.largar(room);
    const eventos = [], setor = (p, s) => { p.sector = s; if (s === 0) { if (!p.started) p.started = true; else if (++p.laps >= voltas) p.finish = (relogio - room.startAt) / 1000; } };
    const emit = (e, d) => { if (e === "box") { eventos.push(d); F1.registrarParada(room.players[d.id], { volta: d.volta, tempo: d.tempo, composto: d.composto }); } };
    for (let t = 0; t < 600 && room.order.some((id) => room.players[id].finish == null); t += 0.05) { relogio += 50; Robos.passo(room, 0.05, setor, emit); }
    return { room, eventos, robos: room.order.map((id) => room.players[id]) };
  } finally { Date.now = agora; }
}

test("robôs: cada um faz as paradas da estratégia pelo corredor, no limitador, e termina com dois compostos", { timeout: 60000 }, () => {
  const { eventos, robos } = corridaDosRobos(3, 1234), c = corredorDe("interlagos");
  for (const r of robos) {
    assert.notEqual(r.finish, null, `${r.name} não terminou`);
    assert.equal(r.paradas.length, r.ia.plano.paradas.length, `${r.name}: ${r.paradas.length} paradas`);
    assert.ok(F1.usouDoisCompostos(r), `${r.name}: ${r.compostos}`);
    assert.equal(F1.acrescimoDeFinal(r, 3), 0);
    assert.equal(r.box, null);
    const minimo = F1.tempoNoBox(c, T.CARROS[r.car].vmax, F1.PARADA_BASE);
    for (const q of r.paradas) {
      assert.ok(q.tempo >= minimo * 0.9 && q.tempo < minimo + 30, `${r.name}: ${q.tempo.toFixed(1)} s no corredor (mínimo ${minimo.toFixed(1)})`);
      assert.ok(q.volta >= 1 && q.volta <= 2);
    }
  }
  assert.equal(eventos.length, robos.reduce((a, r) => a + r.paradas.length, 0));
});

test("robôs: oito pilotos fazem cinco voltas, param em momentos diferentes e a semente fixa as estratégias", { timeout: 60000 }, () => {
  const a = corridaDosRobos(5, 8327, 8), b = corridaDosRobos(5, 8327, 8);
  const planos = ({ robos }) => robos.map((r) => r.ia.plano);
  assert.deepEqual(planos(a), planos(b));
  assert.equal(a.robos.length, 8);
  assert.ok(a.robos.every((r) => r.finish != null && r.paradas.length >= 1 && F1.usouDoisCompostos(r)));
  assert.ok(new Set(a.robos.map((r) => r.paradas[0].volta)).size >= 2, "paradas em voltas diferentes");
});

test("robôs: sem as regras de F1 não existe box", () => {
  const room = { config: { pista: "interlagos", caixas: false, robos: 2, nivel: "medio", voltas: 1, regras: "galera" }, players: {}, order: [], phase: "race", startAt: Date.now() };
  let k = 0; Robos.preparar(room, ["#a", "#b"], () => "y" + k++);
  room.order.forEach((id, i) => Object.assign(room.players[id], { grid: i, laps: 0, sector: T.SECTORS - 1, started: false, finish: null }));
  Itens.start(room); Robos.largar(room);
  for (const id of room.order) { assert.equal(room.players[id].ia.plano, null); assert.equal(room.players[id].ia.pneu, null); }
});

// ---------- a sala do servidor, sem rede: o canal e os sockets de mentira ----------
function salaDeMentira() {
  const estados = {};
  const nsp = { handlers: {}, on(e, f) { this.handlers[e] = f; }, to(codigo) { return { emit(ev, d) { if (ev === "state") estados[codigo] = JSON.parse(JSON.stringify(d)); }, volatile: { emit() {} } }; }, sockets: new Map() };
  const api = require("../corrida.js")({ of: () => nsp });
  let n = 0;
  const socket = () => {
    const h = {}, s = { id: "s" + ++n, data: {}, h, on(e, f) { h[e] = f; }, emit() {}, join() {}, leave() {}, to() { return { emit() {}, volatile: { emit() {} } }; } };
    nsp.handlers.connection(s); return s;
  };
  const chamar = (s, ev, dados) => new Promise((ok) => s.h[ev](dados, ok));
  return { socket, chamar, estado: (codigo) => estados[codigo], internos: api.internos };
}

test("sala: quem corre com um composto só leva +10 s e perde a vitória para quem parou; passar do limitador custa 5 s", () => {
  // (o servidor é a autoridade: o checkpoint e a parada nos boxes saem da física de cada carro, em sim.js; aqui as regras da sala
  // recebem esses eventos pelos mesmos caminhos que a física usa)
  bd.fechar(); bd.abrir(":memory:");
  const agora = Date.now; let relogio = agora(); Date.now = () => relogio;
  return (async () => {
    const { socket, chamar, estado, internos } = salaDeMentira(), ana = socket(), beto = socket(), caio = socket();
    const criou = await chamar(ana, "create", { name: "Ana", config: { pista: "interlagos", voltas: 2, regras: "f1", classificacao: "pular" } });
    await chamar(beto, "join", { code: criou.code, name: "Beto" }); await chamar(caio, "join", { code: criou.code, name: "Caio" });
    const act = (s, dados) => chamar(s, "act", dados);
    // o navegador não manda mais checkpoint, box nem batida: o servidor ignora (a física dele é que conta)
    assert.equal((await act(beto, { type: "box", fase: "entra" })).ignored, true);
    assert.equal((await act(ana, { type: "start" })).ok, true);
    assert.equal((await act(ana, { type: "sector", s: 0 })).ignored, true);
    assert.equal((await act(ana, { type: "batida", forca: 200, tipo: "muro" })).ignored, true);
    assert.ok(estado(criou.code).semente > 0, "o GP tem semente");
    relogio += 11000; // as cinco luzes: a largada vem até 10,3 s depois do start
    const room = internos.sala(criou.code), jogador = (nome) => Object.values(room.players).find((p) => p.name === nome);
    const volta = (nome) => { const p = jogador(nome); for (let k = 1; k < 12; k++) internos.onSector(room, p, k, relogio); internos.onSector(room, p, 0, relogio); };
    for (const nome of ["Ana", "Beto", "Caio"]) internos.onSector(room, jogador(nome), 0, relogio); // a largada
    // o Beto e o Caio param nos boxes na volta 1 (o tempo no corredor é o da física: aqui, o do Caio é rápido demais)
    internos.concluirParada(room, jogador("Caio"), { composto: "duro", tempo: 4, volta: 1 }); // 4 s: rápido demais
    internos.concluirParada(room, jogador("Beto"), { composto: "chuva", tempo: 23, volta: 1 }); // composto que não existe: não vale
    assert.equal((jogador("Beto").paradas || []).length, 0);
    internos.concluirParada(room, jogador("Beto"), { composto: "duro", tempo: 23, volta: 1 }); // 23 s: certo
    relogio += 26000;
    volta("Ana"); volta("Beto"); volta("Caio");
    relogio += 31000;
    volta("Ana"); // a Ana termina primeiro, com um composto só
    relogio += 1000;
    volta("Beto"); // o Beto termina um segundo depois, com dois compostos
    relogio += 1000;
    volta("Caio");
    const st = estado(criou.code), por = (nome) => st.players.find((p) => p.name === nome);
    assert.equal(st.phase, "results");
    assert.equal(por("Ana").acrescimo, 10, "um composto só: +10 s");
    assert.equal(por("Beto").acrescimo, 0);
    assert.equal(por("Beto").paradas, 1);
    assert.equal(por("Beto").pneuAtual, "duro");
    assert.equal(por("Caio").acrescimo, 5, "passou do limitador: +5 s");
    assert.equal(st.finishOrder[0], por("Beto").id, "o Beto ganha: parou direito");
    assert.equal(st.finishOrder[st.finishOrder.length - 1], por("Ana").id, "a Ana, com +10 s, fica por último");
  })().finally(() => { Date.now = agora; bd.fechar(); });
});

test("sala: sem as regras de F1 o box é ignorado e a sala corre como antes", () => {
  bd.fechar(); bd.abrir(":memory:");
  return (async () => {
    const { socket, chamar, estado } = salaDeMentira(), ana = socket();
    const criou = await chamar(ana, "create", { name: "Ana", config: { pista: "interlagos", voltas: 2 } });
    assert.equal((await chamar(ana, "act", { type: "start" })).ok, true);
    assert.equal((await chamar(ana, "act", { type: "box", fase: "entra" })).ignored, true);
    const st = estado(criou.code);
    assert.equal(st.semente, undefined); assert.equal(st.players[0].noBox, false);
    await chamar(ana, "act", { type: "end" });
  })().finally(() => bd.fechar());
});

// ---------- o box do piloto humano: a física (sim.js) leva o carro pelo corredor ----------
test("box (humano): o pedido do piloto leva o carro sozinho ao corredor, para na garagem, troca o pneu e volta à pista", () => {
  const S = require("../public/corrida/sim.js"), D = require("../public/corrida/dinamica.js"), Equipes = require("../public/corrida/f1-equipes.js");
  const spec = Equipes.specDaEquipe("mclaren");
  const corrida = (laps, quali = false) => {
    const tr = S.criarPista(T.PISTAS.interlagos, "interlagos"), c = S.novo(tr, { grid: 0, f1: true, pneu: Object.assign(F1.pneuNovo("macio"), { desgaste: 0.6, temp: 0.9 }), box: true });
    const cor = tr.corredor, ini = (cor.i0 - 40 + tr.n) % tr.n, q = tr.pts[ini];
    Object.assign(c, { x: q.x, y: q.y, z: q.h, a: Math.atan2(q.ty, q.tx), idx: ini, v: 150, marcha: 5 });
    const amb = { spec, voltas: 3, laps, paradas: 0, semente: 99, id: "ana", grid: 3, f1: true, outros: [], quali }, ev = [], eventos = [];
    for (let i = 0; i < 120 * 40; i++) {
      const alvo = c.box.fase ? 9999 : 150; // (antes de entrar, anda a 150 u/s como quem se prepara para a parada)
      ev.length = 0; S.passo(c, { gas: c.v < alvo ? 1 : 0, brake: 0, steer: 0, pedido: "duro" }, amb, tr, ev);
      for (const e of ev) eventos.push({ ...e, tempoDeJogo: (i + 1) * D.PASSO, lat: S.quadro(tr, c.x, c.y, c.idx).lat, tempPneu: c.pneu.temp });
    }
    return { c, eventos, tr };
  };
  const r = corrida(0);
  const tipos = r.eventos.filter((e) => e.t.startsWith("box")).map((e) => e.t + (e.fase ? ":" + e.fase : ""));
  assert.deepEqual(tipos, ["box:entra", "boxParou", "boxTrocou", "box:sai"], "entra, para, troca e sai, nessa ordem");
  const sai = r.eventos.find((e) => e.t === "box" && e.fase === "sai"), entra = r.eventos.find((e) => e.t === "box" && e.fase === "entra");
  assert.equal(sai.composto, "duro"); assert.equal(entra.volta, 1);
  assert.ok(sai.tempo > 5 && sai.tempo < 12, `a parada inteira levou ${sai.tempo} s (o corredor no limitador mais 2,0 a 3,3 s parado)`);
  assert.ok(Math.abs(sai.tempo - (r.eventos.find((e) => e.t === "box" && e.fase === "sai").tempoDeJogo - entra.tempoDeJogo)) < 0.1, "o tempo é o dos passos da física");
  assert.equal(r.c.pneu.composto, "duro"); assert.ok(r.c.pneu.desgaste < 0.1, `pneu novo (${r.c.pneu.desgaste} depois de andar um pouco)`);
  assert.ok(r.eventos.find((e) => e.t === "boxTrocou").tempPneu <= 0.75, "o pneu novo sai frio do box");
  assert.equal(r.c.box.fase, null);
  assert.ok(Math.abs(sai.lat) < r.tr.W, "voltou para a pista");
  // na última volta o corredor passa pela chegada: sem box; na classificação também não
  assert.ok(!corrida(2).eventos.some((e) => e.t === "box"), "última volta: sem box");
  assert.ok(!corrida(0, true).eventos.some((e) => e.t === "box"), "classificação: sem box");
});
