// Carreira de Treinador: a disputa de pênaltis do mata-mata é jogada (o humano escolhe canto e pulo), não sorteada.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Motor = require("../public/carreira/motor.js");
const Ritmo = require("../public/leilao/ritmo.js");
const Temporada = require("../public/carreira/temporada.js");
const { novaCarreira, proximoJogoMundo, simularMinha, fecharRodada, estado, sementeDoJogo, timeDe } = require("../carreira.js").paraTestes;

test("pênaltis da Carreira têm seis zonas na ordem certa e 5% de chance de ir para fora", () => {
  assert.deepStrictEqual(Ritmo.ZONAS, ["ea", "ma", "da", "eb", "mb", "db"]);
  assert.strictEqual(Ritmo.DUELO.FORA, 0.05);
});

// dois times iguais, o jogo costuma terminar em poucos gols: procura uma semente que empata
function time(id) {
  const jogadores = [];
  const pos = ["GOL", "ZAG", "ZAG", "LD", "LE", "VOL", "MEI", "MEI", "PE", "PD", "CA", "ZAG", "MEI", "CA"];
  pos.forEach((p, i) => jogadores.push({ id: `${id}${i}`, nome: `${id} ${i}`, pos: p, nota: 70 + (i % 5), atr: { fin: 60 + i, pas: 65, dri: 65, def: 62, fis: 65, rit: 65, gol: 70 } }));
  return { id, nome: id, jogadores };
}
const casa = time("a"), fora = time("b");
function empate(cfg) {
  for (let k = 0; k < 400; k++) { const r = Motor.simularPartida({ casa, fora, semente: `emp${k}`, ...cfg }); if (r.completo && r.placar[0] === r.placar[1]) return `emp${k}`; if (!r.completo) { /* parado: tenta a próxima */ } }
  throw new Error("sem empate");
}

test("sem a flag de desempate o jogo empatado termina empatado; com ela, vai para os pênaltis (modo 1, automático)", () => {
  const s = empate({});
  const sem = Motor.simularPartida({ casa, fora, semente: s });
  assert.strictEqual(sem.penaltis, undefined);
  const com = Motor.simularPartida({ casa, fora, semente: s, desempate: { agregado: [0, 0] } });
  assert.ok(com.completo && Array.isArray(com.penaltis) && com.penaltis[0] !== com.penaltis[1]);
  const cobr = com.eventos.filter((e) => e.tipo === "disputa");
  assert.strictEqual(cobr.filter((e) => e.entrou).length, com.penaltis[0] + com.penaltis[1], "os gols da disputa batem com o placar");
  assert.ok(cobr.length >= 6 && cobr.every((e) => e.chute && e.pulo && (e.lado === 0 || e.lado === 1)));
  assert.deepStrictEqual(Motor.simularPartida({ casa, fora, semente: s, desempate: { agregado: [0, 0] } }).penaltis, com.penaltis, "sempre igual");
  // agregado desigual: não tem disputa mesmo com o jogo empatado
  assert.strictEqual(Motor.simularPartida({ casa, fora, semente: s, desempate: { agregado: [1, 0] } }).penaltis, undefined);
});

test("com humano (modo 3) a disputa pede o canto ou o pulo de cada cobrança, e a escolha vale", () => {
  const cfg = { modo: 3, controla: 0, desempate: { agregado: [0, 0] } };
  // joga a partida inteira escolhendo as decisões com `escolher` (as táticas ficam no automático)
  const jogar = (semente, escolher) => {
    const decisoes = {};
    for (let v = 0; v < 300; v++) {
      const r = Motor.simularPartida({ casa, fora, semente, ...cfg, decisoes });
      if (r.completo) return r;
      const p = r.parado; assert.ok(!p.disputa || ["penalti_favor", "penalti_contra"].includes(p.lance) && p.opcoes.length === 6, "cada cobrança pede o canto/pulo");
      decisoes[p.id] = p.disputa ? escolher(p) : Motor.decisaoAutomatica(p);
    }
    throw new Error("não terminou");
  };
  const melhor = (p) => Motor.decisaoAutomatica(p), pior = (p) => [...p.opcoes].sort((x, y) => x.chance - y.chance)[0].id;
  const gols = (r) => r.eventos.filter((e) => e.tipo === "disputa" && e.lado === 0 && e.entrou).length;
  const tiros = (r) => r.eventos.filter((e) => e.tipo === "disputa" && e.lado === 0).length;
  let achadas = 0, golsMelhor = 0, golsPior = 0, tirosMelhor = 0, tirosPior = 0;
  for (let k = 0; k < 600 && achadas < 40; k++) {
    const m = jogar(`m3-${k}`, melhor);
    if (!m.penaltis) continue;
    const p = jogar(`m3-${k}`, pior);
    achadas++; golsMelhor += gols(m); tirosMelhor += tiros(m); golsPior += gols(p); tirosPior += tiros(p);
  }
  assert.ok(achadas >= 20, "há jogos suficientes que chegam nos pênaltis");
  assert.ok(golsMelhor / tirosMelhor > golsPior / tirosPior, "escolher o canto de maior chance converte mais do que o de menor chance");
});

test("o resultado jogado da disputa entra no mundo: o chaveamento segue com quem ganhou nos pênaltis", () => {
  const save = novaCarreira("Teste", "flamengo", "x");
  // um jogo único de mata-mata (Copa do Brasil, fase preliminar): o técnico passa a ser o mandante e a semente é escolhida até empatar
  const prelim = save.competicoes.copadobrasil.jogos.find((j) => j.mataMata && j.fase === "preliminar");
  assert.ok(prelim);
  save.clube = prelim.casa;
  const meus = Temporada.jogosDoClube({ jogos: save.calendarioMundo }, save.clube);
  save.jogosJogados = meus.filter((j) => j.semana < prelim.semana).map((j) => j.id); save.rodada = save.jogosJogados.length;
  let r = null;
  for (let k = 0; k < 500; k++) {
    save.partida = { rodada: save.rodada, jogoId: prelim.id, competicao: prelim.competicao, fase: prelim.fase, mataMata: true, agregado: [0, 0], casa: prelim.casa, fora: prelim.fora, modo: 1, semente: `t${k}`, decisoes: {} };
    r = simularMinha(save);
    if (r.placar[0] === r.placar[1]) break;
  }
  assert.ok(r.completo && r.penaltis && r.penaltis[0] !== r.penaltis[1], "empate vira disputa jogada");
  const esperado = r.penaltis[0] > r.penaltis[1] ? prelim.casa : prelim.fora;
  fecharRodada(save, r);
  assert.deepStrictEqual(save.resultadosFixos[prelim.id].penaltis, r.penaltis);
  const dep = save.competicoes.copadobrasil.jogos.find((j) => j.id === prelim.id);
  assert.deepStrictEqual(dep.penaltis, r.penaltis, "o mundo recalculado usa a disputa jogada");
  const oitavas = save.competicoes.copadobrasil.jogos.filter((j) => j.fase === "oitavas").flatMap((j) => [j.casa, j.fora]);
  const perdedor = esperado === prelim.casa ? prelim.fora : prelim.casa;
  assert.ok(!oitavas.includes(perdedor) || oitavas.includes(esperado), "quem perdeu nos pênaltis não passa no lugar de quem ganhou");
  assert.strictEqual(estado(save).ultimo.penaltis[0], r.penaltis[0]);
});
