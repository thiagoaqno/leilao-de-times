// Corrida da Galera, regras de F1: o carro parado na pista (acidente numa curva) vira fantasma, é recolocado e não engaveta o pelotão.
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/pistas.js");
const F1 = require("../public/corrida/f1-regras.js");
const Robos = require("../corrida-robos.js");
const Direcao = require("../corrida-f1-direcao.js");
const Contato = require("../corrida-contato.js");
const Parados = require("../corrida-parados.js");

// uma corrida de robôs no tempo de mentira com um carro "batido" parado (segurado em v = 0, como um acidente) e a fila passando
function corrida(usar) {
  const agora = Date.now, aleatorio = Math.random; let relogio = agora(); Date.now = () => relogio; Math.random = F1.sorteio("parados:interlagos");
  try {
    Robos.usarFonte(() => []);
    const room = { code: "x", phase: "race", config: { pista: "interlagos", regras: "f1", caixas: false, robos: 12, nivel: "medio", voltas: 5 }, players: {}, order: [], startAt: relogio + 100, semente: 99, finishOrder: [] };
    Robos.preparar(room, ["#a", "#b", "#c"], () => "x");
    room.order.forEach((id, i) => Object.assign(room.players[id], { grid: i, laps: 0, sector: T.SECTORS - 1, started: false, finish: null }));
    Robos.largar(room); Direcao.iniciar(room);
    let acidente = null, prog = 0, maior = 0; const parou = {}, passaram = new Set();
    for (let t = 0; t < 60; t += 0.05) {
      relogio += 50; Robos.passo(room, 0.05, () => {}, () => {});
      const dt = (relogio - room.startAt) / 1000;
      if (dt > 12 && !acidente) { acidente = room.order[0]; prog = room.players[acidente].ia.sim.prog; }
      if (acidente) { const w = room.players[acidente], c = w.ia.sim; if (!(w.fantAte > relogio)) { c.v = c.vx = c.vy = 0; w.ia.v = 0; } }
      if (usar) Parados.passo(room, relogio);
      for (const id of room.order) {
        const c = room.players[id].ia.sim; if (id === acidente || dt < 8) continue;
        parou[id] = Math.abs(c.v) < 12 ? (parou[id] || 0) + 0.05 : 0; maior = Math.max(maior, parou[id]);
        if (c.prog > prog + 20) passaram.add(id);
      }
    }
    return { maior, passaram: passaram.size, recolocado: room.players[acidente].recolocacoes || 0, fantasma: Contato.fantasmaDoBox({ fantAte: relogio + 1 }, relogio) };
  } finally { Date.now = agora; Math.random = aleatorio; Robos.usarFonte(() => null); }
}

test("carro parado vira fantasma, é recolocado e nenhum robô fica parado mais de ~3 s", () => {
  const sem = corrida(false), com = corrida(true);
  assert.ok(sem.maior > 4, `sem a regra a fila fica parada atrás do acidente (${sem.maior.toFixed(1)} s)`);
  assert.ok(com.maior < 3, `com a regra ninguém passa de 3 s parado (${com.maior.toFixed(1)} s)`);
  assert.ok(com.recolocado >= 1 && com.passaram === 12, `o carro foi recolocado e a fila passou (${com.passaram}/12)`);
  assert.equal(com.fantasma, true, "fantAte conta como fantasma na colisão");
});
