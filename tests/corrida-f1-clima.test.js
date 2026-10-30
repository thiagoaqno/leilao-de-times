// O clima da Corrida (regras de F1): a previsão por GP, a chuva que cai dentro dela, a duração mínima, as rampas de entrada e saída
// e a água na pista como conta pura do tempo (igual em qualquer chamada, na ordem que for).
const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../public/corrida/f1-regras.js");

const CORRIDA = 435; // ~5 voltas
const sementes = (n) => Array.from({ length: n }, (_, i) => `gp${i}:2026:${i % 8}`);

test("a previsão é fixa pela semente, de 5 em 5%, e a média de chuva fica perto de 20%", () => {
  const lista = sementes(4000), prev = lista.map((s) => F.previsaoDoGP(s));
  assert.deepEqual(F.previsaoDoGP(lista[7]), F.previsaoDoGP(lista[7]));
  for (const p of prev) {
    assert.ok(p.p >= 0 && p.p <= 0.95);
    assert.ok(Math.abs(p.p * 20 - Math.round(p.p * 20)) < 1e-9);
    assert.ok(["largada", "inicio", "meio", "fim"].includes(p.quando));
    assert.ok(["garoa", "forte", "vira"].includes(p.forca));
  }
  const media = prev.reduce((s, p) => s + p.p, 0) / prev.length;
  assert.ok(media > 0.17 && media < 0.25, `média ${media}`);
  const baixa = prev.filter((p) => p.p <= 0.1).length / prev.length, alta = prev.filter((p) => p.p >= 0.8).length / prev.length;
  assert.ok(baixa > 0.5, "a maioria dos GPs fica de 0 a 10%");
  assert.ok(alta > 0.01 && alta < 0.08, "os de 80% para cima são raros");
  const choveu = lista.filter((s) => F.sortearClima(s, { corrida: CORRIDA, quali: 300 }).chuva).length / lista.length;
  assert.ok(choveu > 0.17 && choveu < 0.25, `chove em ${choveu}`);
});

test("a chuva cai dentro da janela prevista e a previsão e o sorteio batem", () => {
  let comChuva = 0;
  for (const s of sementes(1500)) {
    const c = F.sortearClima(s, { corrida: CORRIDA, quali: 300 }), prev = F.previsaoDoGP(s);
    assert.deepEqual(c.previsao, prev);
    if (!c.chuva) { assert.equal(c.corrida.chove, false); assert.deepEqual(c.corrida.trechos, []); continue; }
    comChuva++;
    const ini = c.corrida.trechos[0][0] / CORRIDA;
    if (prev.quando === "largada") { assert.equal(c.corrida.trechos[0][0], 0); assert.ok(c.corrida.agua0 > 0, "largada molhada"); }
    else { assert.equal(c.corrida.agua0, 0); assert.ok(ini >= prev.janela[0] - 0.005 && ini <= prev.janela[1] + 0.005, `${prev.quando}: começa em ${ini}`); }
  }
  assert.ok(comChuva > 100);
});

test("a chuva dura pelo menos 2 minutos (ou até o fim) e pode começar e parar no meio de uma corrida de 5 voltas", () => {
  let comecaNoMeio = 0, paraNoMeio = 0, ambas = 0;
  for (const dur of [100, 200, CORRIDA, 1800]) for (const s of sementes(800)) {
    const c = F.sortearClima(s, { corrida: dur, quali: dur });
    for (const r of [c.corrida, c.quali]) {
      if (!r.chove) continue;
      const ini = r.trechos[0][0], fim = Math.min(r.trechos[r.trechos.length - 1][1], dur);
      assert.ok(fim - ini >= Math.min(F.CHUVA_MIN_S, dur - ini) - 1, `dur ${dur}: chuva de ${fim - ini} s`);
      for (let i = 1; i < r.trechos.length; i++) assert.equal(r.trechos[i][0], r.trechos[i - 1][1], "os trechos se emendam");
      if (dur === CORRIDA && r === c.corrida) {
        const a = ini > 0, b = r.trechos[r.trechos.length - 1][1] < dur;
        if (a) comecaNoMeio++; if (b) paraNoMeio++; if (a && b) ambas++;
      }
    }
  }
  assert.ok(comecaNoMeio > 20, "começa a chover no meio de uma corrida de 5 voltas");
  assert.ok(paraNoMeio > 10, "a chuva para no meio de uma corrida de 5 voltas");
  assert.ok(ambas > 3, "começa e para na mesma corrida");
});

test("a força da chuva e a água na pista nunca dão degrau", () => {
  let vistos = 0;
  for (const s of sementes(600)) {
    const c = F.sortearClima(s, { corrida: CORRIDA, quali: 300 });
    if (!c.chuva) continue;
    vistos++;
    let ant = F.chuvaEm(c.corrida, 0), antA = F.aguaEm(c.corrida, 0);
    for (let t = 0.1; t <= CORRIDA + 60; t += 0.1) {
      const x = F.chuvaEm(c.corrida, t), a = F.aguaEm(c.corrida, t);
      assert.ok(Math.abs(x - ant) <= 0.008, `${s}: a chuva saltou ${ant} -> ${x} em ${t}`);
      assert.ok(Math.abs(a - antA) <= 0.006, `${s}: a água saltou ${antA} -> ${a} em ${t}`);
      assert.ok(x >= 0 && x <= 1 && a >= 0 && a <= 1);
      ant = x; antA = a;
    }
  }
  assert.ok(vistos > 40);
});

test("seco → garoa → chuva forte passa por todas as forças, e cada rampa dura RAMPA_S", () => {
  const c = { chove: true, t0: 0, dur: 600, agua0: 0, trechos: [[100, 200, F.GAROA], [200, 400, F.CHUVA_FORTE]] };
  assert.equal(F.chuvaEm(c, 99), 0);
  assert.equal(F.chuvaEm(c, 100), 0);
  assert.ok(Math.abs(F.chuvaEm(c, 100 + F.RAMPA_S / 2) - F.GAROA / 2) < 1e-9, "meio da rampa de entrada");
  assert.ok(Math.abs(F.chuvaEm(c, 100 + F.RAMPA_S) - F.GAROA) < 1e-9);
  assert.ok(Math.abs(F.chuvaEm(c, 199) - F.GAROA) < 1e-9);
  assert.ok(F.chuvaEm(c, 210) > F.GAROA && F.chuvaEm(c, 210) < 1, "a garoa vira chuva forte aos poucos");
  assert.ok(Math.abs(F.chuvaEm(c, 200 + F.RAMPA_S) - 1) < 1e-9);
  assert.ok(F.chuvaEm(c, 405) < 1 && F.chuvaEm(c, 405) > 0, "a saída também é uma rampa");
  assert.equal(F.chuvaEm(c, 400 + F.RAMPA_S), 0);
  assert.equal(F.chuvaEm(null, 50), 0);
});

test("a água sobe com a chuva, seca devagar e é a mesma conta em qualquer ordem de consulta", () => {
  const c = { chove: true, t0: 0, dur: 600, agua0: 0, trechos: [[60, 260, F.CHUVA_FORTE]] };
  const tarde = F.aguaEm(c, 360), cedo = F.aguaEm(c, 70), meio = F.aguaEm(c, 260);
  const outra = JSON.parse(JSON.stringify(c));
  assert.equal(F.aguaEm(outra, 70), cedo);
  assert.equal(F.aguaEm(outra, 260), meio);
  assert.equal(F.aguaEm(outra, 360), tarde);
  assert.equal(F.aguaEm(c, 30), 0);
  assert.ok(cedo > 0 && cedo < 0.2, "começou a molhar");
  assert.ok(meio > 0.9, "encharcada depois de 200 s de chuva forte");
  assert.ok(tarde < meio && tarde > 0.4, "secando devagar");
  assert.ok(Math.abs(F.aguaEm({ chove: true, t0: 0, dur: 300, agua0: 0.6, trechos: [] }, 100) - (0.6 - 100 / F.AGUA_SECA_S)) < 1e-9, "a pista molhada seca sem chuva");
  const clima = F.climaEm({ ...c, t0: 1000 }, 1000 + 200 * 1000);
  assert.equal(clima.chuva, 1);
  assert.ok(clima.molhada && clima.encharcada && !clima.garoa && clima.chove);
  assert.equal(F.climaEm(null, 5000).agua, 0);
});

test("as opções da sala: seco nunca chove; chuva larga molhado e não para; variável larga seco e chove no meio", () => {
  for (const s of sementes(200)) {
    const seco = F.sortearClima(s, { corrida: CORRIDA, quali: 300 }, "seco");
    assert.equal(seco.chuva, false);
    assert.equal(seco.previsao.p, 0);
    const chuva = F.sortearClima(s, { corrida: CORRIDA, quali: 300 }, "chuva");
    assert.equal(chuva.chuva, true);
    assert.equal(chuva.previsao.p, 1);
    assert.ok(chuva.corrida.trechos[chuva.corrida.trechos.length - 1][1] >= CORRIDA, "não para");
    assert.ok(chuva.corrida.agua0 > 0 && chuva.corrida.trechos[0][0] === 0);
    const vari = F.sortearClima(s, { corrida: CORRIDA, quali: 300 }, "variavel");
    assert.equal(vari.chuva, true);
    assert.equal(vari.corrida.agua0, 0);
    const ini = vari.corrida.trechos[0][0] / CORRIDA;
    assert.ok(ini >= 0.24 && ini <= 0.36, `variável começa em ${ini}`);
  }
  assert.deepEqual(F.OPCOES_DE_CLIMA, ["aleatorio", "seco", "chuva", "variavel"]);
  assert.equal(F.previsaoDoGP("x", "lixo").opcao, "aleatorio");
});

test("o rádio sabe o próximo degrau da chuva", () => {
  const c = { chove: true, t0: 0, dur: 600, agua0: 0, trechos: [[100, 300, F.CHUVA_FORTE]] };
  assert.deepEqual(F.proximaMudanca(c, 10), { tipo: "comeca", quando: 100, em: 90 });
  assert.deepEqual(F.proximaMudanca(c, 150), { tipo: "para", quando: 300, em: 150 });
  assert.equal(F.proximaMudanca(c, 400), null);
  assert.equal(F.proximaMudanca(null, 0), null);
  const v = { chove: true, t0: 0, dur: 600, agua0: 0, trechos: [[50, 150, F.GAROA], [150, 400, F.CHUVA_FORTE]] };
  assert.equal(F.proximaMudanca(v, 100).tipo, "aumenta");
});

test("o texto da previsão: seco, chance baixa, provável e as voltas em que a chuva pode vir", () => {
  const seco = F.descreverPrevisao({ p: 0, quando: "meio", forca: "garoa", janela: [0.3, 0.7], opcao: "seco" }, 5);
  assert.equal(seco.seco, true);
  assert.equal(seco.pct, 0);
  assert.equal(seco.quando, "");
  const meio = F.descreverPrevisao({ p: 0.35, quando: "meio", forca: "forte", janela: [0.3, 0.7], opcao: "aleatorio" }, 5);
  assert.equal(meio.pct, 35);
  assert.match(meio.titulo, /Possibilidade/);
  assert.match(meio.quando, /1\/4 da corrida/);
  assert.deepEqual(meio.voltas, [2, 4]);
  assert.equal(meio.forca, "chuva forte");
  const larga = F.descreverPrevisao({ p: 0.9, quando: "largada", forca: "garoa", janela: [0, 0.1], opcao: "aleatorio" }, 5);
  assert.match(larga.quando, /largar molhado/);
  assert.equal(larga.nivel, 3);
  assert.match(larga.titulo, /muito provável/);
  assert.match(F.descreverPrevisao({ p: 1, quando: "largada", forca: "garoa", janela: [0, 0.1], opcao: "chuva" }, 3).quando, /corrida inteira/);
  assert.equal(F.descreverPrevisao(null).seco, true);
});
