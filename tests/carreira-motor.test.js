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

// ---------- os atributos contam no jogo (o ritmo, o drible, a marcação e o físico, além da finalização) ----------
const POS_ATR = ["GOL", "ZAG", "ZAG", "LAT", "LAT", "VOL", "MC", "MC", "PE", "PD", "ATA", "GOL", "ZAG", "LAT", "VOL", "MC", "MEI", "PE", "ATA", "ATA", "ZAG", "MC", "PD"];
// elenco de nota 76 e atributos 76; `mexe(pos, atr)` muda os atributos de todos (a escalação automática trocaria os piores), com a nota da base fixa
function timeAtr(id, mexe) {
  return { id, nome: id, formacao: "4-3-3", jogadores: POS_ATR.map((pos, i) => {
    const atr = { rit: 76, fin: 76, pas: 76, dri: 76, def: 76, fis: 76, gol: 76 };
    if (mexe) mexe(pos, atr);
    return { id: id + i, nome: id + i, pos, nota: 76, base: 76, atr };
  }) };
}
function saldoAtr(mexeA, mexeB, n = 2500) {
  let s = 0;
  for (let i = 0; i < n; i++) {
    const casa = i % 2 === 0, A = timeAtr("A", mexeA), B = timeAtr("B", mexeB), r = M.simularPartida({ casa: casa ? A : B, fora: casa ? B : A, semente: "at" + i });
    s += casa ? r.placar[0] - r.placar[1] : r.placar[1] - r.placar[0];
  }
  return s / n;
}
const doAtaque = (pos) => ["PE", "PD", "ATA"].includes(pos), ponta = (pos) => pos === "PE" || pos === "PD";

test("atributos: ritmo, marcação e goleiro mexem no resultado, não só a finalização (nota igual)", () => {
  assert.ok(saldoAtr((p, a) => { if (doAtaque(p)) a.rit = 91; }) > 0.05, "atacantes mais rápidos");
  assert.ok(saldoAtr((p, a) => { if (doAtaque(p)) a.rit = 61; }) < -0.03, "atacantes mais lentos");
  assert.ok(saldoAtr((p, a) => { if (p === "ZAG" || p === "LAT") a.def = 91; }) > 0.05, "defensores que marcam mais");
  assert.ok(saldoAtr((p, a) => { if (doAtaque(p)) a.dri = 91; }) > 0.03, "atacantes que driblam mais");
  assert.ok(saldoAtr((p, a) => { if (p === "GOL") a.gol = 91; }) > 0.1, "goleiro melhor");
});

test("atributos: dois pontas de mesma nota, um de ritmo e outro de finalização e físico, rendem quase igual", () => {
  const ritmo = (p, a) => { if (ponta(p)) Object.assign(a, { rit: 90, fin: 64, dri: 78, fis: 68 }); };
  const finalizador = (p, a) => { if (ponta(p)) Object.assign(a, { rit: 66, fin: 88, dri: 76, fis: 86 }); };
  const s = saldoAtr(ritmo, finalizador);
  assert.ok(Math.abs(s) < 0.15, `saldo de gols por jogo entre os dois perfis ${s.toFixed(3)} (antes da correção: -0,42)`);
});

test("atributos: a finalização sozinha não vale mais que a nota inteira", () => {
  // 15 pontos a mais de finalização nos atacantes valem menos que 8 pontos de nota neles
  assert.ok(saldoAtr((p, a) => { if (doAtaque(p)) a.fin = 91; }) < 0.35, "finalização +15");
});

test("lances decisivos: a chance mostrada é a chance de verdade (cada opção, em 2 mil jogos)", () => {
  const acc = {};
  for (let k = 0; k < 2000; k++) {
    const cfg = { casa: timeAtr("A", (p, a) => { if (ponta(p)) { a.dri = 92; a.fin = 70; } }), fora: timeAtr("B"), semente: "ch" + k, modo: 3, controla: 0, decisoes: {} };
    let r = M.simularPartida(cfg), v = 0;
    while (!r.completo && v++ < 60) {
      const p = r.parado;
      if (p.tipo === "lance" && p.opcoes && p.lance === "ataque_favor") {
        const o = p.opcoes[(k + v) % p.opcoes.length];
        cfg.decisoes[p.id] = o.id;
        r = M.simularPartida(cfg);
        const e = r.eventos.find((x) => x.decisivo === p.id && x.tipo === "lance");
        const a = (acc[o.id] = acc[o.id] || { n: 0, disp: 0, gol: 0 });
        a.n++; a.disp += o.chance; if (e && e.certo) a.gol++;
        continue;
      }
      cfg.decisoes[p.id] = p.tipo === "tatica" ? {} : M.decisaoAutomatica(p);
      r = M.simularPartida(cfg);
    }
  }
  for (const [id, a] of Object.entries(acc)) assert.ok(a.n > 100 && Math.abs(a.gol / a.n - a.disp / a.n) < 0.04, `${id}: mostrado ${(a.disp / a.n * 100).toFixed(1)}%, real ${(a.gol / a.n * 100).toFixed(1)}%`);
});
