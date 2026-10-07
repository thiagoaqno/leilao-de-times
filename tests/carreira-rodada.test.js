// Carreira em grupo: a rodada ao vivo para todos (carreira-rodada.js), com o relógio andando à mão.
const test = require("node:test");
const assert = require("node:assert");
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const G = require("../carreira.js").grupo;
const Rd = require("../carreira-rodada.js");
const Motor = require("../public/carreira/motor.js");

const OPC = { vel: 1, decisaoMs: 5000, espera: 0 };
// anda o relógio de 250 em 250 ms até a condição (ou o limite)
function andar(save, rod, t, ate, cond = () => false) {
  for (; t <= ate; t += 250) { Rd.tick(save, rod, t); if (cond(t)) return t; }
  return t;
}
const jogoDe = (rod, clube) => rod.jogos.find((j) => j.casa === clube || j.fora === clube);

test("rodada: o jogo de um humano pausa na decisão e o do outro continua", () => {
  // clubes de ligas diferentes: os dois jogam na primeira semana, cada um no seu jogo
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "A" }, { clube: "liverpool", nome: "B" }], { temporadas: 1 });
  save.humanos.flamengo.estado.modo = 2; save.humanos.liverpool.estado.modo = 1;
  const p = G.proximaRodadaGrupo(save);
  assert.strictEqual(p.jogos.length, 2, "cada humano no seu jogo");
  const rod = Rd.criarRodada(save, p, 0, OPC), a = jogoDe(rod, "flamengo"), b = jogoDe(rod, "liverpool");
  // A para no intervalo (modo 2); B joga só o resultado
  let t = andar(save, rod, 0, 120000, () => a.parado && a.parado.pendentes.length);
  assert.ok(a.parado, "o jogo de A parou");
  const va = Rd.visao(save, rod, "flamengo", t);
  assert.strictEqual(va.meu.parado.tipo, "tatica");
  assert.ok(va.meu.parado.ate > t, "com tempo para decidir");
  const minA = Rd.minutoDe(rod, a, t), minB = Rd.minutoDe(rod, b, t);
  t = andar(save, rod, t + 250, t + 3000);
  assert.ok(Math.abs(Rd.minutoDe(rod, a, t) - minA) < 1e-9, "o relógio de A ficou parado");
  assert.ok(Rd.minutoDe(rod, b, t) > minB + 2, "o de B continuou");
  // B vê o jogo de A na faixa
  const vb = Rd.visao(save, rod, "liverpool", t);
  assert.ok(vb.outros.some((x) => x.casa === a.casa && Array.isArray(x.gols)));
});

test("rodada: sem resposta, vence o tempo e vale a decisão padrão", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "A" }], { temporadas: 1 });
  save.humanos.flamengo.estado.modo = 2;
  const rod = Rd.criarRodada(save, G.proximaRodadaGrupo(save), 0, OPC), a = rod.jogos[0];
  let t = andar(save, rod, 0, 120000, () => a.parado && a.parado.pendentes.length);
  const id = a.parado.id;
  t = andar(save, rod, t, t + OPC.decisaoMs + 500, () => !a.parado || a.parado.id !== id);
  assert.ok(a.decisoes[id] !== undefined, "a decisão entrou");
  assert.deepStrictEqual(a.decisoes[id], {}, "a padrão da parada tática: manter tudo");
  // a rodada vai até o fim e fecha o jogo do clube
  andar(save, rod, t, 600000, () => rod.fechada);
  assert.ok(rod.fechada && a.fim);
  const e = G.estado(G.vistaDe(save, "flamengo"));
  assert.strictEqual(e.rodada, 1);
  assert.deepStrictEqual(e.ultimo.placar, a.placar);
});

test("rodada: humano contra humano espera os dois técnicos (ou o tempo)", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "A" }, { clube: "palmeiras", nome: "B" }], { temporadas: 1 });
  let p;
  while ((p = G.proximaRodadaGrupo(save)) && !p.jogos.some((j) => save.humanos[j.casa] && save.humanos[j.fora])) {
    G.comecarRodadaGrupo(save); for (const j of p.jogos) G.jogarNaHora(save, j); G.fecharRodadaGrupo(save);
  }
  assert.ok(p, "achou o clássico");
  save.humanos.flamengo.estado.modo = 2; save.humanos.palmeiras.estado.modo = 2;
  const rod = Rd.criarRodada(save, p, 0, OPC), jg = rod.jogos[0];
  let t = andar(save, rod, 0, 200000, () => jg.parado && jg.parado.pendentes.length === 2);
  assert.ok(jg.parado, "parou para os dois");
  const pa = Rd.visao(save, rod, "flamengo", t).meu.parado, pb = Rd.visao(save, rod, "palmeiras", t).meu.parado;
  assert.strictEqual(pa.tipo, "tatica"); assert.strictEqual(pb.tipo, "tatica");
  assert.notStrictEqual(pa.lado, pb.lado, "cada um decide o seu lado");
  assert.strictEqual(Rd.decidir(save, rod, "flamengo", pa.id, { tatica: { mentalidade: 1, pressao: 1, linha: 1 } }, t), null);
  assert.match(Rd.decidir(save, rod, "flamengo", pa.id, {}, t), /já decidiu/);
  t = andar(save, rod, t + 250, t + 2000);
  assert.ok(jg.parado && jg.parado.id === pa.id, "ainda espera o outro");
  assert.ok(Rd.visao(save, rod, "flamengo", t).meu.parado.esperando, "quem decidiu vê que está esperando");
  assert.strictEqual(Rd.decidir(save, rod, "palmeiras", pb.id, {}, t), null);
  assert.ok(!jg.parado || jg.parado.id !== pa.id, "com os dois, o jogo segue");
  assert.strictEqual(jg.decisoes[pa.id][pa.lado].tatica.mentalidade, 1, "a decisão de cada um vale no lado dele");
  // a próxima parada: só um decide; o outro deixa o tempo correr
  t = andar(save, rod, t, 400000, () => jg.parado && jg.parado.pendentes.length && jg.parado.id !== pa.id);
  if (jg.parado && jg.parado.pendentes.length === 2) {
    const id = jg.parado.id, q = Rd.visao(save, rod, "flamengo", t).meu.parado;
    Rd.decidir(save, rod, "flamengo", id, Motor.decisaoAutomatica(q), t);
    t = andar(save, rod, t, t + OPC.decisaoMs + 500, () => !jg.parado || jg.parado.id !== id);
    assert.ok(jg.decisoes[id], "o tempo do outro venceu e o jogo seguiu");
  }
  andar(save, rod, t, 900000, () => rod.fechada);
  assert.ok(rod.fechada);
  const ea = G.estado(G.vistaDe(save, "flamengo")), eb = G.estado(G.vistaDe(save, "palmeiras"));
  assert.deepStrictEqual(ea.ultimo.placar, eb.ultimo.placar, "o mesmo jogo para os dois");
  assert.strictEqual(ea.artilharia.reduce((s, a) => s + a.gols, 0) >= 0, true);
});

test("motor: no humano contra humano, o pênalti é o duelo (quem bate escolhe o canto, o goleiro o pulo)", () => {
  const b = require("../public/carreira/base/brasileirao-2026.js");
  let achou = null;
  for (let i = 0; i < 400 && !achou; i++) {
    const dec = {};
    for (let k = 0; k < 40; k++) {
      const r = Motor.simularPartida({ casa: b.clubes[0], fora: b.clubes[1], semente: `duelo${i}`, modo: 3, controla: 2, decisoes: dec });
      if (!r.parado) break;
      if (r.parado.tipo === "lance" && Object.values(r.parado.pedidos).some((p) => p.lance === "penalti_favor")) { achou = { r, dec, i }; break; }
      dec[r.parado.id] = Motor.decisaoAutomatica(r.parado);
    }
  }
  assert.ok(achou, "achou um pênalti");
  const { r, dec, i } = achou, pedidos = r.parado.pedidos, lados = Object.keys(pedidos);
  assert.strictEqual(lados.length, 2, "os dois decidem");
  const bate = lados.find((l) => pedidos[l].lance === "penalti_favor"), pula = lados.find((l) => pedidos[l].lance === "penalti_contra");
  const igual = Motor.simularPartida({ casa: b.clubes[0], fora: b.clubes[1], semente: `duelo${i}`, modo: 3, controla: 2, decisoes: { ...dec, [r.parado.id]: { [bate]: "ea", [pula]: "ea" } } });
  const e = igual.eventos.find((x) => x.decisivo === r.parado.id && x.tipo === "penalti");
  assert.strictEqual(e.chute, "ea"); assert.strictEqual(e.pulo, "ea");
  assert.ok(!igual.eventos.some((x) => x.tipo === "gol" && x.min === e.min && x.como === "penalti"), "pulou no canto certo: não entra");
});
