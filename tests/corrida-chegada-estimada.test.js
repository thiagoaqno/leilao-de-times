const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/pistas.js");
const bd = require("../bd.js");

function salaDeMentira() {
  const estados = {}, nsp = { handlers: {}, on(e, f) { this.handlers[e] = f; }, to(c) { return { emit(e, d) { if (e === "state") estados[c] = JSON.parse(JSON.stringify(d)); }, volatile: { emit() {} } }; }, sockets: new Map() };
  const api = require("../corrida.js")({ of: () => nsp }); let n = 0;
  function socket() { const h = {}, s = { id: "s" + ++n, data: {}, h, on(e, f) { h[e] = f; }, emit() {}, join() {}, leave() {}, to() { return { emit() {}, volatile: { emit() {} } }; } }; nsp.handlers.connection(s); return s; }
  return { socket, chamar: (s, e, d) => new Promise((ok) => s.h[e](d, ok)), internos: api.internos };
}

test("último humano encerra GP com estimativa dos robôs e punições, sem terminar DSQ ou DNF", async () => {
  bd.fechar(); bd.abrir(":memory:");
  const { socket, chamar, internos } = salaDeMentira(), ana = socket(), bia = socket();
  try {
    const criou = await chamar(ana, "create", { name: "Ana", config: { pista: "monaco", voltas: 3, regras: "f1", classificacao: "pular", clima: "seco", robos: 4 } });
    await chamar(bia, "join", { code: criou.code, name: "Bia" });
    await chamar(ana, "act", { type: "start" });
    const room = internos.sala(criou.code), humanos = room.order.map(id => room.players[id]).filter(p => !p.bot), bots = room.order.map(id => room.players[id]).filter(p => p.bot);
    assert.equal(bots.length, 4);
    const n = T.pontos(T.PISTAS.monaco, 6).length, agora = room.startAt + 180000;
    for (const h of humanos) Object.assign(h, { started: true, sector: 11, laps: 2, lapStart: agora - 60000, compostos: ["medio", "duro"] });
    Object.assign(bots[0], { started: true, laps: 2, last: 60, compostos: ["medio", "duro"], pos: { prog: n * 2.5 }, acrescimo: 5, penal: 5 });
    Object.assign(bots[1], { dnf: true, dsq: true, pos: { prog: n * 2.7 } });
    Object.assign(bots[2], { dnf: true, pos: { prog: n * 2.8 } });
    Object.assign(bots[3], { started: true, laps: 2, last: 60, compostos: ["medio", "duro"], pos: { prog: n * 2.8 }, stopGo: { s: 8, ate: 4 } });
    internos.onSector(room, humanos[0], 0, agora);
    assert.equal(room.phase, "race", "aguarda a segunda pessoa");
    internos.onSector(room, humanos[1], 0, agora + 1000);
    assert.equal(room.phase, "results");
    const estimado = room.resultado.find(x => x.id === bots[0].id);
    assert.equal(estimado.estimado, true);
    assert.equal(estimado.tempo, 216); // 181 s decorridos + meia volta de 60 s + 5 s de punição
    const sg = room.resultado.find(x => x.id === bots[3].id);
    assert.equal(sg.estimado, true);
    assert.ok(Math.abs(sg.tempo - 213) < 0.001, "stop-and-go pendente vira +20 s");
    assert.equal(room.resultado.find(x => x.id === bots[1].id).dsq, true);
    assert.equal(room.resultado.find(x => x.id === bots[2].id).dnf, true);
    assert.ok(!room.finishOrder.includes(bots[1].id) && !room.finishOrder.includes(bots[2].id));
  } finally { bd.fechar(); }
});
