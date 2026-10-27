// Corrida da Galera, regras de F1: o ritmo e a pilotagem dos robôs em todas as pistas (corrida-robos.js). O "possível" de cada
// ponto é o perfil de velocidade no limite do carro (Robos.possivel); o piloto ideal faz a volta em Robos.idealDe.
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/pistas.js");
const F1 = require("../public/corrida/f1-regras.js");
const Robos = require("../corrida-robos.js");
const Direcao = require("../corrida-f1-direcao.js");

const PISTAS = ["interlagos", "monaco", "monza", "barcelona", "silverstone", "melbourne", "xangai", "suzuka", "bahrein", "jeddah", "miami", "montreal", "redbullring",
  "spa", "hungaroring", "zandvoort", "madri", "baku", "singapura", "austin", "mexico", "lasvegas", "catar", "abudhabi"];

// uma corrida de robôs no tempo de mentira, medindo cada um
function corrida({ pista, nivel = "medio", robos = 10, voltas = 4, semente = 4321 }) {
  const agora = Date.now; let relogio = agora(); Date.now = () => relogio;
  try {
    Robos.usarFonte(() => []);
    const room = { config: { pista, regras: "f1", caixas: false, robos, nivel, voltas }, players: {}, order: [], phase: "race", startAt: relogio, semente, finishOrder: [] };
    Robos.preparar(room, ["#a", "#b", "#c"], () => "x");
    room.order.forEach((id, i) => Object.assign(room.players[id], { grid: i, laps: 0, sector: T.SECTORS - 1, started: false, finish: null }));
    Robos.largar(room); Direcao.iniciar(room);
    const st = {}; for (const id of room.order) st[id] = { voltas: [], limpa: [], boxNaVolta: false, baixo15: 0, curvaLarga: 0, curvaLargaV: 0 };
    const setor = (p, s) => {
      if (s !== (p.sector + 1) % T.SECTORS) return; p.sector = s; if (s !== 0) return;
      if (!p.started) { p.started = true; p.lapStart = relogio; return; }
      const q = st[p.id]; q.voltas.push((relogio - p.lapStart) / 1000); q.limpa.push(!q.boxNaVolta); q.boxNaVolta = false; p.lapStart = relogio; p.laps++;
      if (p.laps >= voltas) p.finish = (relogio - room.startAt) / 1000;
    };
    const emit = (e, d) => { if (e === "batida") Direcao.bater(room, room.players[d.id], d.forca, d.tipo, relogio, () => {}); if (e === "box") F1.registrarParada(room.players[d.id], { volta: d.volta, tempo: d.tempo, composto: d.composto }); };
    for (let t = 0; t < 900 && room.order.some((id) => room.players[id].finish == null); t += 0.05) {
      relogio += 50;
      for (const id of room.order) { const p = room.players[id]; if (p.pos) Direcao.registrar(room, p, p.pos, relogio, () => {}); }
      Direcao.passo(room, relogio, () => {});
      Robos.passo(room, 0.05, setor, emit);
      if (t < 15) continue;
      for (const id of room.order) {
        const p = room.players[id], s = st[id]; if (!p.ia || !p.ia.sim || p.finish != null || !p.started) continue;
        if (p.box) { s.boxNaVolta = true; continue; }
        const pf = Robos.perfil(pista, p.spec, p.ia.tracadoId), pos = Robos.possivel(pista, p.spec)[p.ia.sim.idx], v = p.ia.sim.v;
        if (v < pos * 0.15) s.baixo15 += 0.05;
        if (pf.kf[p.ia.sim.idx] < 1 / 600 && pos < Robos.possivel.topo(pista, p.spec) * 0.97) { s.curvaLarga++; s.curvaLargaV += Math.min(1.2, v / pos); }
      }
    }
    return { room, st };
  } finally { Date.now = agora; Robos.usarFonte(() => null); }
}
const razaoMedia = ({ room, st }, pista) => {
  const r = room.order.map((id) => { const s = st[id], v = s.voltas.filter((x, k) => k > 0 && s.limpa[k]); return v.length ? Math.min(...v) / Robos.idealDe(pista, room.players[id].spec) - 1 : null; }).filter((x) => x != null);
  return r.reduce((a, b) => a + b, 0) / r.length;
};

test("robôs de nível médio, em todas as pistas de F1: terminam, não ficam parados, andam no ritmo e fazem as curvas largas", { timeout: 600000 }, () => {
  const resumo = [];
  for (const pista of PISTAS) {
    const c = corrida({ pista }), { room, st } = c;
    for (const id of room.order) {
      const p = room.players[id], s = st[id];
      assert.ok(p.finish != null, `${pista}: ${p.name} não terminou`);
      assert.ok(s.baixo15 <= 5, `${pista}: ${p.name} ficou ${s.baixo15.toFixed(1)} s abaixo de 15% da velocidade possível`);
      if (s.curvaLarga > 200) assert.ok(s.curvaLargaV / s.curvaLarga >= 0.8, `${pista}: ${p.name} fez as curvas largas a ${(100 * s.curvaLargaV / s.curvaLarga).toFixed(0)}% do possível`);
    }
    const r = razaoMedia(c, pista); resumo.push(`${pista} ${(r * 100).toFixed(1)}%`);
    assert.ok((r > -0.01 && r < 0.12), `${pista}: volta média a ${(r * 100).toFixed(1)}% do ideal (nível médio: de -1% a 12%)`);
  }
  if (process.env.RESUMO) console.log(resumo.join(" | "));
});

test("os níveis ficam em ordem: fácil mais lento que o médio, que é mais lento que o difícil (média de três pistas)", { timeout: 200000 }, () => {
  const r = {}; for (const nivel of ["facil", "medio", "dificil"]) r[nivel] = ["interlagos", "monza", "spa"].reduce((a, pista) => a + razaoMedia(corrida({ pista, nivel }), pista), 0) / 3;
  assert.ok(r.facil > r.medio + 0.015 && r.medio > r.dificil + 0.003, JSON.stringify(r));
  assert.ok(r.facil < 0.13 && r.dificil > -0.04, JSON.stringify(r));
});

test("robô preso (parado no muro, rodado) se recupera sozinho em poucos segundos", () => {
  const agora = Date.now; let relogio = agora(); Date.now = () => relogio;
  try {
    Robos.usarFonte(() => []);
    const room = { config: { pista: "interlagos", regras: "f1", caixas: false, robos: 1, nivel: "medio", voltas: 3 }, players: {}, order: [], phase: "race", startAt: relogio - 5000, semente: 5, finishOrder: [] };
    Robos.preparar(room, ["#a"], () => "a");
    const bot = room.players[room.order[0]]; bot.grid = 0; Robos.largar(room); Direcao.iniciar(room); bot.ia.reacao = 0;
    const car = bot.ia.sim; car.idx = 800; const q = Sim().criarPista(T.PISTAS.interlagos, "interlagos").pts[800];
    Object.assign(car, { x: q.x + q.nx * 150, y: q.y + q.ny * 150, a: q.tx ? Math.atan2(q.tx, -q.ty) : 0, v: 0, vl: 0, prog: 800, sector: car.sector });
    bot.ia.v = 0;
    for (let t = 0; t < 8; t += 0.05) {
      relogio += 50; Robos.passo(room, 0.05, () => {}, () => {});
      if (t < 3.5) { car.v = car.vl = car.vx = car.vy = 0; bot.ia.v = 0; } // preso: algo segura o carro parado
    }
    assert.ok(bot.ia.recuperacoes >= 1 && car.v > 30, `recuperações ${bot.ia.recuperacoes}, v ${car.v.toFixed(0)}`);
  } finally { Date.now = agora; Robos.usarFonte(() => null); }
});
function Sim() { return require("../public/corrida/sim.js"); }

test("o perfil de velocidade não despenca com uma quina de raio quase zero no traçado", () => {
  for (const pista of PISTAS) {
    const pf = Robos.perfil(pista, require("../public/corrida/f1-equipes.js").specDaEquipe("mclaren"), 0), p = Robos.possivel(pista);
    assert.ok(Math.min(...p) > 25, `${pista}: velocidade mínima do perfil ${Math.min(...p).toFixed(0)}`);
    assert.ok(Math.max(...pf.kf) <= 1 / 22 + 1e-9);
  }
});

test("o ideal do robô (Cadillac, médio novo) fica no limite do carro de verdade: Interlagos e Melbourne, volta lançada (±3%)", () => {
  const cadillac = require("../public/corrida/f1-equipes.js").specDaEquipe("cadillac");
  // antes da calibração: Interlagos 68,2 s e Melbourne 68,6 s (margem 0,95 e 80% da frenagem); a física do carro com o piloto
  // automático dá volta a 64,5 s e 68,2 s sem tocar no muro com a margem 1,08 e a frenagem inteira
  // depois da linha de menor curvatura e do volante novo (PR robos-curvas): 63,4 -> 51,4 s em Interlagos (o jogador fez 49,7 s) e 64,7 -> 54,5 s em Melbourne
  const ref = { interlagos: 51.4, melbourne: 54.5 };
  for (const [pista, alvo] of Object.entries(ref)) {
    const t = Robos.idealDe(pista, cadillac);
    assert.ok(Math.abs(t / alvo - 1) < 0.03, `${pista}: ideal ${t.toFixed(2)} s, esperado ${alvo} s ±3%`);
  }
});
