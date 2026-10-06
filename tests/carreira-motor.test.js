// Carreira de Treinador: o motor da partida (public/carreira/motor.js). Times de teste fictícios, sem a base real.
const test = require("node:test");
const assert = require("node:assert");
const M = require("../public/carreira/motor.js");

const POS = ["GOL", "GOL", "GOL", "ZAG", "ZAG", "ZAG", "ZAG", "LAT", "LAT", "LAT", "LAT", "VOL", "VOL", "MC", "MC", "MC", "MEI", "MEI", "PE", "PD", "ATA", "ATA", "ATA"];
// um elenco de 23 com a média perto de `nota` (titulares um pouco melhores que os reservas)
function time(id, nota) {
  const r = M.sorteDe("t" + id);
  return { id, nome: id, formacao: "4-3-3", jogadores: POS.map((pos, i) => ({ id: id + i, nome: id + i, pos, nota: Math.round(nota + (i % 11 < 8 ? 2 : -4) + (r() - 0.5) * 6) })) };
}
function rodar(n, notaA, notaB) {
  let gols = 0, vA = 0, emp = 0;
  for (let i = 0; i < n; i++) {
    const A = time("A" + (i % 50), notaA), B = time("B" + (i % 50), notaB), aEmCasa = notaA === notaB || i % 2 === 0;
    const r = M.simularPartida({ casa: aEmCasa ? A : B, fora: aEmCasa ? B : A, semente: "j" + i });
    const [ga, gb] = aEmCasa ? r.placar : [r.placar[1], r.placar[0]];
    gols += ga + gb; if (ga > gb) vA++; else if (ga === gb) emp++;
  }
  return { gols: gols / n, vitoria: vA / n, empate: emp / n };
}

test("motor: 10 mil jogos entre times iguais têm o placar de um campeonato de verdade", () => {
  const s = rodar(10000, 74, 74);
  assert.ok(s.gols >= 2.2 && s.gols <= 2.8, `gols por jogo ${s.gols.toFixed(2)}`);
  assert.ok(s.vitoria >= 0.42 && s.vitoria <= 0.5, `mandante vence ${(s.vitoria * 100).toFixed(1)}%`);
  assert.ok(s.empate >= 0.24 && s.empate <= 0.3, `empate ${(s.empate * 100).toFixed(1)}%`);
});

test("motor: o time 8 pontos melhor vence pelo menos 60% (metade em casa, metade fora)", () => {
  const s = rodar(10000, 78, 70);
  assert.ok(s.vitoria >= 0.6, `o mais forte vence ${(s.vitoria * 100).toFixed(1)}%`);
});

test("motor: a mesma semente com as mesmas decisões dá o mesmo jogo", () => {
  const cfg = { casa: time("C", 75), fora: time("D", 73), semente: "igual" };
  assert.deepStrictEqual(M.simularPartida(cfg), M.simularPartida(cfg));
  assert.notDeepStrictEqual(M.simularPartida(cfg).eventos, M.simularPartida({ ...cfg, semente: "outra" }).eventos);
});

test("motor: o modo 1 não para; o modo 2 para no intervalo e aos 70", () => {
  assert.strictEqual(M.simularPartida({ casa: time("E", 74), fora: time("F", 74), semente: "x", controla: 0 }).completo, true);
  const cfg = { casa: time("E", 74), fora: time("F", 74), semente: "x", modo: 2, controla: 1, decisoes: {} };
  const ids = [];
  let r = M.simularPartida(cfg);
  while (!r.completo) { assert.strictEqual(r.parado.tipo, "tatica"); ids.push(r.parado.id); cfg.decisoes[r.parado.id] = {}; r = M.simularPartida(cfg); }
  assert.ok(ids.includes("intervalo") && ids.includes("m70"), ids.join(","));
});

test("motor: decidir não muda o que já aconteceu, e o modo 3 tem de 3 a 6 lances decisivos por jogo", () => {
  let lances = 0;
  const jogos = 200;
  for (let k = 0; k < jogos; k++) {
    const cfg = { casa: time("G", 74), fora: time("H", 74), semente: "d" + k, modo: 3, controla: k % 2, decisoes: {} };
    let r = M.simularPartida(cfg), voltas = 0;
    while (!r.completo && voltas++ < 60) {
      const antes = r.eventos, p = r.parado;
      if (p.tipo === "lance") {
        lances++;
        assert.ok(p.opcoes.length >= 3 && p.opcoes.every((o) => o.chance > 0 && o.chance < 1 && o.nome), `opções de ${p.lance}`);
      }
      cfg.decisoes[p.id] = M.decisaoAutomatica(p);
      r = M.simularPartida(cfg);
      assert.deepStrictEqual(r.eventos.slice(0, antes.length), antes, `jogo ${k}: o que já tinha acontecido mudou`);
    }
    assert.ok(r.completo, `jogo ${k} terminou`);
  }
  const porJogo = lances / jogos;
  assert.ok(porJogo >= 3 && porJogo <= 6, `${porJogo.toFixed(2)} lances decisivos por jogo`);
});

test("motor: o pênalti decisivo usa os 6 cantos do Leilão e a substituição pedida entra", () => {
  let achou = false;
  for (let k = 0; k < 300 && !achou; k++) {
    const cfg = { casa: time("I", 74), fora: time("J", 74), semente: "p" + k, modo: 3, controla: 0, decisoes: {} };
    let r = M.simularPartida(cfg);
    while (!r.completo) {
      const p = r.parado;
      if (p.tipo === "lance" && p.lance.startsWith("penalti")) { achou = true; assert.deepStrictEqual(p.opcoes.map((o) => o.id), ["ea", "ma", "da", "eb", "mb", "db"]); }
      cfg.decisoes[p.id] = M.decisaoAutomatica(p); r = M.simularPartida(cfg);
    }
  }
  assert.ok(achou, "apareceu um pênalti decisivo");
  const cfg = { casa: time("K", 74), fora: time("L", 74), semente: "sub", modo: 2, controla: 0, decisoes: {} };
  let r = M.simularPartida(cfg);
  while (!r.completo) {
    const p = r.parado, atacante = p.titulares.find((t) => t.pos === "ATT"), reserva = p.banco.find((b) => b.pos === "ATT");
    cfg.decisoes[p.id] = p.id === "intervalo" ? { subs: [[atacante.id, reserva.id]], tatica: { mentalidade: 2 } } : {};
    r = M.simularPartida(cfg);
  }
  assert.ok(r.eventos.some((e) => e.tipo === "sub" && e.lado === 0 && e.min === 45), "a troca do intervalo entrou");
  assert.strictEqual(r.times[0].tatica.mentalidade, 2);
});
