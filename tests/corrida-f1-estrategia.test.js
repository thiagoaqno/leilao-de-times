// Corrida: os pneus na estratégia (public/corrida/f1-regras.js, f1-pneus-ritmo.js e a tabela f1-pneus-tabela.js). O simulador de stint
// (ferramentas/pneus-fisica.js) dá a volta com a física do carro e o piloto ideal, com cada composto em cada estado de desgaste:
// a vida em voltas, o ganho do macio, o penhasco, a parada e a corrida inteira de cada estratégia. Se este arquivo falha depois de
// mexer nos pneus ou na física, rode `node ferramentas/pneus-tabela.js` para medir a tabela de novo.
const test = require("node:test");
const assert = require("node:assert/strict");
const F1 = require("../public/corrida/f1-regras.js");
const Ritmo = require("../public/corrida/f1-pneus-ritmo.js");
const P = require("../ferramentas/pneus-fisica.js");
const Robos = require("../corrida-robos.js");
const Itens = require("../corrida-itens.js");
const T = require("../public/corrida/pistas.js");

const L = { macio: "S", medio: "M", duro: "H" };
const sig = (p) => [p.largada, ...p.paradas.map((q) => q.composto)].map((c) => L[c]).join("");
const volta = (pista, composto, desgaste = 0) => P.voltaFixa(pista, { composto, desgaste, temp: 1 });
const melhor = (tab, voltas, filtro) => Ritmo.planos(tab, voltas).find(filtro);

test("estratégia (física): o piloto ideal gasta o pneu na vida de cada composto, em voltas", () => {
  for (const pista of ["interlagos", "monaco", "monza"]) {
    const vida = (c) => F1.PENHASCO / volta(pista, c).desgaste;
    assert.ok(vida("macio") > 1.35 && vida("macio") < 1.7, `${pista} macio ${vida("macio")}`);
    assert.ok(vida("medio") > 3.2 && vida("medio") < 4.2, `${pista} médio ${vida("medio")}`);
    assert.ok(vida("duro") > 6.2 && vida("duro") < 8.5, `${pista} duro ${vida("duro")}`);
  }
});

test("estratégia (física): a ordem é macio < médio < duro, e cada degrau custa perto de 1% da volta (sem degrau grande)", () => {
  for (const pista of ["interlagos", "monaco", "barcelona", "monza", "suzuka"]) {
    const m = volta(pista, "medio").tempo, s = volta(pista, "macio").tempo, d = volta(pista, "duro").tempo;
    assert.ok(s < m && m < d, `${pista}: macio ${s.toFixed(2)}, médio ${m.toFixed(2)}, duro ${d.toFixed(2)}`);
    assert.ok((m - s) / s > 0.005 && (m - s) / s < 0.017, `${pista}: o médio perde ${((m - s) / s * 100).toFixed(2)}% para o macio`);
    assert.ok((d - m) / m > 0.004 && (d - m) / m < 0.017, `${pista}: o duro perde ${((d - m) / m * 100).toFixed(2)}% para o médio`);
  }
});

test("estratégia (física): passou da vida, o carro fica muito ruim e cada volta a mais custa muitos segundos", () => {
  for (const pista of ["interlagos", "monaco"]) for (const c of ["macio", "medio", "duro"]) {
    const novo = volta(pista, c).tempo, noFim = volta(pista, c, F1.PENHASCO).tempo, meio = volta(pista, c, 0.9).tempo, acabado = volta(pista, c, 1).tempo;
    assert.ok(noFim - novo < 2.5, `${pista} ${c}: até o penhasco perde pouco (${(noFim - novo).toFixed(1)} s)`);
    assert.ok(meio - noFim > 3 && acabado - novo >= 11, `${pista} ${c}: acabado perde ${(acabado - novo).toFixed(1)} s por volta`);
  }
  for (const c of ["macio", "medio", "duro"]) { const f = P.medirFrio("interlagos", c); assert.ok(f > 0.15 && f < 2, `${c} frio ${f}`); }
});

test("estratégia (física): a parada custa de verdade uns 6 s (entrada + limitador + parada + saída)", () => {
  for (const pista of ["interlagos", "monaco", "monza"]) { const p = P.medirParada(pista); assert.ok(p.perda > 4.5 && p.perda < 8.5, `${pista}: ${p.perda.toFixed(2)} s`); }
});

test("estratégia: a tabela confere com a física (senão, rode ferramentas/pneus-tabela.js)", () => {
  const tab = Ritmo.tabelaDe("interlagos");
  for (const [c, d] of [["macio", 0.9], ["medio", 0.4], ["duro", 1]]) {
    const i = Ritmo.GRADE.indexOf(d);
    assert.ok(Math.abs(volta("interlagos", c, d).tempo - tab.compostos[c].tempos[i]) < 0.08, `${c} ${d}`);
  }
  assert.ok(Math.abs(P.medirParada("interlagos").perda - tab.parada) < 0.15);
  for (const id of Object.keys(Ritmo.TABELAS)) assert.ok(T.PISTAS[id].boxes && Ritmo.TABELAS[id].parada > 3, id);
});

test("estratégia: as boas estratégias terminam a poucos segundos e esticar o pneu é claramente pior", () => {
  for (const pista of ["interlagos", "monaco", "barcelona", "monza"]) {
    const tab = Ritmo.tabelaDe(pista), fraco = pista === "monza";
    for (const voltas of [3, 5, 10]) {
      const todos = Ritmo.planos(tab, voltas), m = todos[0].tempo, d = (p) => p.tempo - m;
      const um = (a, b) => melhor(tab, voltas, (p) => p.paradas.length === 1 && sig(p).includes(a) && sig(p).includes(b));
      for (const [a, b] of [["S", "M"], ["S", "H"], ["M", "H"]]) if (voltas < 10 || a !== "S" || b !== "M") assert.ok(d(um(a, b)) < (fraco ? 3.5 : 5.5), `${pista} ${voltas} ${a}${b}: +${d(um(a, b)).toFixed(1)}`);
      const duas = melhor(tab, voltas, (p) => p.paradas.length === 2 && p.largada === "macio" && p.paradas.some((q) => q.composto === "medio"));
      if (duas) assert.ok(d(duas) < (fraco ? 6 : 4.5), `${pista} ${voltas} duas paradas: +${d(duas).toFixed(1)}`);
      const semMacio = melhor(tab, voltas, (p) => !sig(p).includes("S")), comMacio = melhor(tab, voltas, (p) => sig(p).includes("S") && new Set(sig(p)).size >= 2);
      if (voltas <= 5 && !fraco) assert.ok(semMacio.tempo - comMacio.tempo >= 2.5, `${pista} ${voltas}: o macio paga a parada (${(semMacio.tempo - comMacio.tempo).toFixed(1)} s)`);
      if (voltas <= 5) assert.equal(sig(todos[0]).includes("S"), true, `${pista} ${voltas}: o melhor usa o macio`);
      assert.ok(d(comMacio) < (fraco ? 4.5 : voltas === 10 ? 4 : 1.5), `${pista} ${voltas}: a parada com macio continua valendo`);
    }
    // esticar: o macio por 3 voltas (vida 1,5) custa muitos segundos; o médio por 5 voltas (vida 3,8), também
    const bom = melhor(tab, 5, (p) => sig(p) === "SM" && p.trechos[0] === 2), esticado = melhor(tab, 5, (p) => sig(p) === "SM" && p.trechos[0] === 3);
    assert.ok(esticado.tempo - bom.tempo >= 8, `${pista}: esticar o macio custa ${(esticado.tempo - bom.tempo).toFixed(1)} s`);
    const parar = (v) => ({ largada: "medio", paradas: [{ volta: v + (tab.antes ? 0 : 1), composto: "duro" }] });
    assert.ok(Ritmo.simular(tab, 10, parar(5)).tempo - Ritmo.simular(tab, 10, parar(4)).tempo > (fraco ? 2 : 6), `${pista}: o médio por 5 voltas é pior que por 4`);
    // sem a regra dos dois compostos, o tudo-macio ficaria perto do melhor: é a regra (+10 s) que o tira
    if (pista === "interlagos" || pista === "monaco") { const sss = melhor(tab, 5, (p) => sig(p) === "SSS"); assert.ok(sss.tempo - Ritmo.UM_COMPOSTO - Ritmo.planos(tab, 5)[0].tempo < 2, pista); }
  }
});

test("estratégia (física): a corrida inteira de 5 voltas bate com a tabela e as estratégias boas ficam a poucos segundos", { timeout: 120000 }, () => {
  for (const pista of ["interlagos", "monaco", "monza"]) {
    const tab = Ritmo.tabelaDe(pista), todos = Ritmo.planos(tab, 5), pega = (f) => todos.find(f), fraco = pista === "monza";
    const planos = [pega((p) => p.paradas.length === 1 && sig(p).includes("S") && sig(p).includes("M")), pega((p) => p.paradas.length === 1 && sig(p).includes("S") && sig(p).includes("H")),
      pega((p) => p.paradas.length === 1 && !sig(p).includes("S") && new Set(sig(p)).size === 2), pega((p) => p.paradas.length === 2 && p.largada === "macio" && sig(p).includes("M"))];
    const esticado = pega((p) => sig(p) === "SM" && p.trechos[0] === 3);
    const fis = planos.map((p) => P.corridaCompleta(pista, 5, p).tempo), tabela = planos.map((p) => Ritmo.simular(tab, 5, p).tempo), fe = P.corridaCompleta(pista, 5, esticado).tempo;
    const m = Math.min(...fis);
    fis.forEach((f, i) => {
      assert.ok(f - m < 6.5, `${pista} ${sig(planos[i])}: +${(f - m).toFixed(1)} s`);
      assert.ok(Math.abs((f - tabela[i]) - (fis[0] - tabela[0])) < 2.6, `${pista} ${sig(planos[i])}: física ${f.toFixed(1)} tabela ${tabela[i].toFixed(1)}`); // a arrancada da largada é a mesma
    });
    assert.ok(fe - m > 8, `${pista}: esticar o macio custa ${(fe - m).toFixed(1)} s`);
    assert.ok(m <= fis[2] - (fraco ? 0.5 : 2.5), `${pista}: o macio paga a parada`);
  }
});

test("robôs: a estratégia sai da conta do simulador, perto do melhor plano, com variação pela semente e pelo nível", () => {
  const tab = Ritmo.tabelaDe("interlagos"), melhores = new Map(), melhorTempo = (voltas) => { if (!melhores.has(voltas)) melhores.set(voltas, Ritmo.planos(tab, voltas, { janela: 0.01, max: 1 })[0].tempo); return melhores.get(voltas); };
  for (const voltas of [2, 3, 5, 10, 21]) for (const nivel of ["facil", "medio", "dificil"]) {
    const limite = { facil: 6, medio: 3.5, dificil: 2 }[nivel], visto = new Set();
    for (let semente = 1; semente <= 40; semente++) {
      const e = F1.estrategia(voltas, nivel, semente, "interlagos"), compostos = [e.largada, ...e.paradas.map((q) => q.composto)];
      assert.ok(new Set(compostos).size >= 2, compostos.join());
      e.paradas.forEach((q, k) => { assert.ok(q.volta >= 1 && q.volta <= voltas - 1); if (k) assert.ok(q.volta > e.paradas[k - 1].volta); });
      const t = Ritmo.simular(tab, voltas, e).tempo;
      assert.ok(t - melhorTempo(voltas) <= limite + 0.01, `${voltas}/${nivel}/${semente}: +${(t - melhorTempo(voltas)).toFixed(1)}`);
      visto.add(JSON.stringify(e));
    }
    if (voltas >= 5 && nivel !== "dificil") assert.ok(visto.size >= 3, `${voltas}/${nivel}: ${visto.size} estratégias`);
  }
  assert.deepEqual(F1.estrategia(5, "medio", 9, "monza"), F1.estrategia(5, "medio", 9, "monza"));
  const e = F1.estrategia(5, "medio", 9, "pista-que-nao-existe"); assert.ok(e.paradas.length >= 1); // sem tabela, usa a de Interlagos
});

test("robôs: o pneu que acaba antes do plano faz o robô parar antes, na volta certa", { timeout: 60000 }, () => {
  const agora = Date.now; let relogio = agora(); Date.now = () => relogio;
  try {
    const room = { config: { pista: "interlagos", caixas: false, robos: 1, nivel: "medio", voltas: 5, regras: "f1" }, players: {}, order: [], phase: "race", startAt: relogio, semente: 5 };
    Robos.preparar(room, ["#a"], () => "z");
    const p = room.players[room.order[0]]; Object.assign(p, { grid: 0, laps: 0, sector: T.SECTORS - 1, started: false, finish: null });
    Itens.start(room); Robos.largar(room);
    p.ia.plano = { largada: "macio", paradas: [{ volta: 4, composto: "medio" }] }; p.ia.pneu = F1.pneuNovo("macio"); p.pneu = p.pneuAtual = "macio"; p.compostos = ["macio"];
    let parou = null;
    const setor = (q, s) => { q.sector = s; if (s === 0) { if (!q.started) q.started = true; else q.laps++; } };
    const emit = (e, d) => { if (e === "box" && parou == null) parou = d.volta; };
    for (let t = 0; t < 400 && parou == null; t += 0.05) { relogio += 50; Robos.passo(room, 0.05, setor, emit); }
    assert.ok(parou != null && parou <= 2, `parou na volta ${parou}: o macio acabou na 2ª, não na 4ª do plano`);
  } finally { Date.now = agora; }
});
