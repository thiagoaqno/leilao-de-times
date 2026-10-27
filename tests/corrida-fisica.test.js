// Corrida da Galera, a física nova do carro de F1 (public/corrida/dinamica.js e sim.js): massa e inércia, torque e marchas,
// arrasto, downforce, frenagem progressiva, aderência lateral (understeer e oversteer), rampa, passo fixo e reconciliação.
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../public/corrida/dinamica.js");
const S = require("../public/corrida/sim.js");
const T = require("../public/corrida/pistas.js");
const F1 = require("../public/corrida/f1-regras.js");
const Equipes = require("../public/corrida/f1-equipes.js");

const mclaren = Equipes.specDaEquipe("mclaren"), kmh = (u) => u * 0.75; // o velocímetro mostra 0,75 × u/s
const asfalto = { chao: true };

// anda `seg` segundos com a mesma entrada e devolve o carro; `ate(c, t)` pode parar antes
function andar(spec, c, ent, seg, amb = asfalto, ate) {
  const p = D.parametros(spec); let t = 0;
  for (let i = 0; i < Math.round(seg / D.PASSO); i++) { D.passo(c, ent, amb, p); t += D.PASSO; if (ate && ate(c, t)) break; }
  return t;
}
const tempoAte = (spec, c, ent, alvoKmh, max = 40, amb = asfalto) => { let t = null; andar(spec, c, ent, max, amb, (car, tt) => { if (kmh(car.v) >= alvoKmh) { t = tt; return true; } }); return t; };

test("motor: o carro tem inércia, e a arrancada leva tempo de F1 (0 a 100 e 0 a 200 km/h)", () => {
  const t100 = tempoAte(mclaren, D.novoCarro(), { gas: 1 }, 100), t200 = tempoAte(mclaren, D.novoCarro(), { gas: 1 }, 200);
  assert.ok(t100 > 1.5 && t100 < 3.2, `0 a 100 km/h em ${t100} s`);
  assert.ok(t200 > 4.0 && t200 < 8.0, `0 a 200 km/h em ${t200} s`);
  // não é instantâneo: meio segundo de acelerador cheio ainda está longe da velocidade final
  const c = D.novoCarro(); andar(mclaren, c, { gas: 1 }, 0.5);
  assert.ok(c.v > 20 && c.v < 0.4 * mclaren.vmax, `v aos 0,5 s = ${c.v}`);
  // a velocidade final é a do carro (o arrasto cresce com o quadrado da velocidade e equilibra o motor)
  for (const spec of [...Object.values(T.CARROS), Equipes.specDaEquipe("ferrari"), Equipes.specDaEquipe("haas")]) {
    const car = D.novoCarro(); andar(spec, car, { gas: 1 }, 45);
    assert.ok(Math.abs(car.v - spec.vmax) < spec.vmax * 0.015, `${spec.name}: ${car.v} contra ${spec.vmax}`);
    assert.ok(Math.abs(D.velocidadeFinal(spec) - spec.vmax) < spec.vmax * 0.01);
  }
  // soltar o acelerador em alta: o arrasto freia (não instantâneo, uns 0,6 a 1 g) e a velocidade cai aos poucos
  const solto = D.novoCarro(); solto.v = 280; solto.marcha = 8; andar(mclaren, solto, { gas: 0 }, 1);
  assert.ok(solto.v < 270 && solto.v > 225, `v soltando 1 s = ${solto.v}`);
});

test("freio: progressivo, com a carga aerodinâmica ajudando em alta, e 300 a 100 km/h leva uns 2 s", () => {
  const f = (spec, v0, alvoKmh) => { const c = D.novoCarro(); c.v = v0; c.marcha = D.marchaIdeal(v0, spec.vmax); let d = 0; const t = tempoAte(spec, c, { brake: 1 }, alvoKmh, 10, asfalto); return { t, travada: c.travada }; };
  // 300 -> 100 km/h = 400 -> 133 u/s
  const c = D.novoCarro(); c.v = 400; c.marcha = 8; let t = 0, dist = 0, trav = 0;
  const p = D.parametros(mclaren);
  while (kmh(c.v) > 100 && t < 10) { D.passo(c, { brake: 1 }, asfalto, p); t += D.PASSO; dist += c.v * D.PASSO; trav = Math.max(trav, c.travada); }
  assert.ok(t > 1.4 && t < 3.0, `300 a 100 km/h em ${t} s`);
  assert.ok(dist * D.ESC > 60 && dist * D.ESC < 170, `distância ${dist * D.ESC} m`);
  assert.equal(trav, 0, "em linha reta o pneu aguenta o freio");
  // progressivo: 0,1 s de pedal ainda não freia nem metade do máximo
  const solto = (seg) => { const c = D.novoCarro(); c.v = 300; c.marcha = 8; andar(mclaren, c, { brake: 0 }, seg); return 300 - c.v; };
  const freado = (seg) => { const c = D.novoCarro(); c.v = 300; c.marcha = 8; andar(mclaren, c, { brake: 1 }, seg); return 300 - c.v; };
  const efeito = (seg) => (freado(seg) - solto(seg)) / seg; // o que o freio acrescenta ao arrasto, em u/s²
  assert.ok(efeito(0.1) < 0.5 * efeito(1), "o pedal sobe com o tempo: 0,1 s de freio ainda é menos da metade da frenagem de 1 s");
  // com mais carga aerodinâmica (mais rápido), a frenagem máxima é maior: a 300 u/s freia bem mais que a 60 u/s
  assert.ok(D.frenagemMaxima(mclaren, 300) > 1.5 * D.frenagemMaxima(mclaren, 60));
  assert.ok(D.frenagemMaxima(mclaren, 60) / D.G_U > 1.4, "freio a baixa velocidade ~2 g");
  // O freio pode travar por instantes, mas ainda deixa força lateral para entrar na curva.
  const livre = D.novoCarro(); livre.v = 200; livre.marcha = 6; andar(mclaren, livre, { steer: 0.7 }, 1.2);
  const trava = D.novoCarro(); trava.v = 200; trava.marcha = 6; let maxTrav = 0;
  andar(mclaren, trava, { brake: 1, steer: 0.7 }, 1.2, asfalto, (car) => { maxTrav = Math.max(maxTrav, car.travada); });
  assert.ok(maxTrav > 0.5, `travada ${maxTrav}`);
  assert.ok(Math.abs(trava.a) > 0.6 * Math.abs(livre.a) && trava.v < livre.v,
    "freando forte o carro desacelera e ainda vira");
});

test("pneu e aerodinâmica: a aderência lateral cresce com a velocidade (downforce) e a curva rápida aguenta velocidade", () => {
  const a60 = D.aceleracaoLateral(mclaren, 60), a300 = D.aceleracaoLateral(mclaren, 300);
  assert.ok(a60 / D.G_U > 2.6 && a60 / D.G_U < 3.1, `a 60 u/s: ${a60 / D.G_U} g`);
  assert.ok(a300 > 1.5 * a60 && a300 / D.G_U < 6, `a 300 u/s: ${a300 / D.G_U} g`);
  const top = D.velocidadeFinal(mclaren);
  const grampo = D.velocidadeDeCurva(mclaren, 80), media = D.velocidadeDeCurva(mclaren, 165), rapida = D.velocidadeDeCurva(mclaren, 600);
  assert.ok(grampo < 0.38 * top, `grampo (raio 80): ${grampo} contra ${top}`);
  assert.ok(media < 0.55 * top, `curva média (raio 165): ${media}`);
  assert.ok(rapida > 0.97 * top, `curva rápida (raio 600) é de acelerador cheio: ${rapida}`);
  assert.ok(D.velocidadeDeCurva(mclaren, 165) > D.velocidadeDeCurva(mclaren, 80) && D.velocidadeDeCurva(mclaren, 300) > D.velocidadeDeCurva(mclaren, 165));
  // a pista inteira: o limite de cada ponto, com a frenagem e a arrancada entre eles (Interlagos e Mônaco)
  for (const id of ["interlagos", "monaco", "barcelona"]) {
    const pts = T.pontos(T.PISTAS[id], 6), v = D.perfilIdeal(pts, mclaren), fim = D.velocidadeFinal(mclaren);
    const minimo = Math.min(...v), cheio = v.filter((x) => x > 0.97 * fim).length / v.length;
    assert.ok(minimo < 0.4 * fim, `${id}: a mais lenta é ${minimo} (${fim})`);
    assert.ok(cheio > 0.01 && cheio < 0.5, `${id}: ${Math.round(cheio * 100)}% da volta a toda velocidade`);
    // cada curva fechada (raio < 130) é feita bem abaixo da velocidade final
    pts.forEach((q, i) => { if (q.k > 1 / 130) assert.ok(v[i] < 0.5 * fim, `${id} ponto ${i} (raio ${Math.round(1 / q.k)}): ${v[i]}`); });
  }
});

test("understeer e oversteer: passou do limite, o carro sai de frente; acelerando forte saindo de curva, sai de traseira", () => {
  const p = D.parametros(mclaren);
  // volante todo a 250 u/s: o carro não passa do que o pneu segura (com folga pequena) e o eixo da frente escorrega mais que o de trás
  const c = D.novoCarro(); c.v = 250; c.marcha = 7; andar(mclaren, c, { gas: 1, steer: 1 }, 3);
  const ay = Math.abs(c.r) * Math.hypot(c.v, c.vl);
  assert.ok(ay < 1.1 * D.aceleracaoLateral(mclaren, c.v), `a lateral ${ay} passou do limite ${D.aceleracaoLateral(mclaren, c.v)}`);
  assert.ok(Math.abs(c.alF) > Math.abs(c.alR), "understeer: a frente escorrega mais que a traseira");
  // o raio de uma curva a 250 u/s não é o do volante todo: o carro sai da curva (raio de curva > o de um grampo)
  assert.ok(Math.hypot(c.v, c.vl) / Math.abs(c.r) > 250, `raio ${Math.hypot(c.v, c.vl) / Math.abs(c.r)}`);
  // sair de curva lenta com o acelerador cheio e volante demais: a traseira passa a escorregar mais que a frente
  const s = D.novoCarro(); s.v = 90; s.marcha = 3;
  andar(mclaren, s, { gas: 0, steer: 0.8 }, 1.2);
  s.v = 90; s.marcha = 3; s.vl = 0; s.r = 0; s.a = 0; s.vx = 90; s.vy = 0;
  andar(mclaren, s, { gas: 0, steer: 0.65 }, 1.2);
  let oversteer = false;
  andar(mclaren, s, { gas: 1, steer: 0.65 }, 2.5, asfalto, (car) => { if (Math.abs(car.alR) > 1.1 * Math.abs(car.alF) && car.patina > 0.3) { oversteer = true; return true; } });
  assert.ok(oversteer, "acelerando forte saindo de curva a traseira escorrega");
  // e não gira o carro sozinho: tirar o pé em linha reta com o volante meio virado não faz pião
  for (const v0 of [100, 200, 280]) for (const st of [-0.5, 0.5]) {
    const q = D.novoCarro(); q.v = v0; q.marcha = D.marchaIdeal(v0, mclaren.vmax); andar(mclaren, q, { gas: 0, steer: st }, 3);
    let d = Math.atan2(q.vy, q.vx) - q.a; d = Math.atan2(Math.sin(d), Math.cos(d));
    assert.ok(Math.abs(d) < 1.2 && q.v > -10, `v${v0} volante ${st}: girou (${d})`);
  }
  assert.ok(p.massa > 700 && p.massa < 1000 && p.Iz > 800, "massa e inércia de guinada de um F1");
});

test("pneu macio vira perto do arcade; frear e virar juntos continua possível", () => {
  const p = D.parametros(mclaren);
  const guinada = (v, composto) => {
    const c = D.novoCarro(); c.v = v; c.marcha = D.marchaIdeal(v, mclaren.vmax);
    const pn = F1.aderencia({ composto, desgaste: 0, temp: 1 });
    for (let i = 0; i < 120; i++) {
      c.v = v; // mantém a mesma velocidade para comparar só a capacidade de virar
      D.passo(c, { steer: 1 }, { chao: true, pn }, p);
    }
    return c.r;
  };
  for (const v of [80, 160, 200]) {
    const arcade = mclaren.turn * Math.min(1, v / 90);
    const macio = guinada(v, "macio"), duro = guinada(v, "duro");
    assert.ok(macio > arcade * 0.72 && macio <= arcade * 1.05,
      `${v} u/s: macio ${macio} rad/s, arcade ${arcade}`);
    if (v >= 160) assert.ok(macio > duro * 1.5, `${v} u/s: macio ${macio}, duro ${duro}`);
  }
  const curva = (brake) => {
    const c = D.novoCarro(); c.v = 200; c.marcha = 6;
    andar(mclaren, c, { steer: 0.7, brake }, 1.2,
      { chao: true, pn: F1.aderencia({ composto: "macio", desgaste: 0, temp: 1 }) });
    return c;
  };
  const solto = curva(0), freando = curva(1);
  assert.ok(freando.v < solto.v - 40 && freando.v >= -1, `velocidade freando ${freando.v}`);
  assert.ok(freando.a > solto.a * 0.65, `rumo freando ${freando.a}, sem freio ${solto.a}`);
});

test("subidas e descidas: a gravidade na rampa tira ou dá velocidade", () => {
  const v = (subida) => { const c = D.novoCarro(); andar(mclaren, c, { gas: 1 }, 10, { chao: true, subida }); return c.v; };
  const sobe = v(0.08), plano = v(0), desce = v(-0.08);
  assert.ok(sobe < plano - 5 && plano < desce - 5, `subida ${sobe}, plano ${plano}, descida ${desce}`);
  // soltando o pé numa subida o carro desacelera bem mais do que no plano, e na descida nem desacelera tanto
  const solta = (subida) => { const c = D.novoCarro(); c.v = 200; c.marcha = 6; andar(mclaren, c, { gas: 0 }, 2, { chao: true, subida }); return c.v; };
  assert.ok(solta(0.1) < solta(0) - 6 && solta(-0.1) > solta(0) + 6);
  assert.ok(D.aceleracaoMaxima(mclaren, 150, 0.1) < D.aceleracaoMaxima(mclaren, 150, 0) && D.aceleracaoMaxima(mclaren, 150, -0.1) > D.aceleracaoMaxima(mclaren, 150, 0));
  // na pista de verdade (sim.js): o carro lê a inclinação do chão no rumo. Uma rampa sintética na reta mais longa de Monza.
  const tr = S.criarPista(T.PISTAS.monza, "monza"), n = tr.n;
  const reta = (sub) => {
    const pts = tr.pts.map((q) => ({ ...q, h: sub * q.d })), trr = { ...tr, pts, pneus: tr.pneus };
    let ini = 0, melhor = 0, run = 0, runIni = 0;
    for (let k = 0; k < 2 * n; k++) { if (!tr.pts[k % n].k) { if (!run) runIni = k; run++; if (run > melhor && run < n) { melhor = run; ini = runIni; } } else run = 0; }
    const c = S.novo(trr, { grid: 0, f1: true }); const q = tr.pts[(ini + 2) % n];
    Object.assign(c, { x: q.x, y: q.y, a: Math.atan2(q.ty, q.tx), idx: (ini + 2) % n, v: 120, marcha: 3, z: pts[(ini + 2) % n].h });
    const amb = { spec: mclaren, voltas: 3, laps: 0, f1: true, outros: [] };
    for (let i = 0; i < 120 * 3; i++) S.passo(c, { gas: 1 }, amb, trr, null);
    return c.v;
  };
  const a = reta(0.08), b = reta(0), cc = reta(-0.08);
  assert.ok(a < b - 3 && b < cc - 3, `Sim: subida ${a}, plano ${b}, descida ${cc}`);
});

test("câmbio de 8 marchas: espaçadas para chegar perto do corte (12 mil rpm) antes de trocar", async () => {
  assert.equal(D.NUM, 8);
  assert.ok(D.FRACAO.every((f, i) => i === 0 || f > D.FRACAO[i - 1]) && D.FRACAO[7] === 1);
  const p = D.parametros(mclaren), c = D.novoCarro(), trocas = [];
  let marchaAnt = 1, rpmMax = 0;
  for (let i = 0; i < 120 * 40; i++) {
    D.passo(c, { gas: 1 }, asfalto, p);
    rpmMax = Math.max(rpmMax, c.rpm);
    if (c.marcha !== marchaAnt) { trocas.push({ de: marchaAnt, para: c.marcha, rpmAntes: D.rotacao(c.v, mclaren.vmax, marchaAnt), rpmDepois: D.rotacao(c.v, mclaren.vmax, c.marcha) }); marchaAnt = c.marcha; }
  }
  assert.deepEqual(trocas.map((t) => t.para), [2, 3, 4, 5, 6, 7, 8], "sobe uma de cada vez até a 8ª, sem voltar");
  for (const t of trocas) {
    assert.ok(t.rpmAntes >= 0.97 && t.rpmAntes < 1.03, `troca ${t.de}->${t.para} a ${Math.round(t.rpmAntes * 12000)} rpm`);
    assert.ok(t.rpmDepois > 0.7, `cai para ${Math.round(t.rpmDepois * 12000)} rpm`);
  }
  assert.ok(rpmMax <= 1.001, `o motor nunca passa do corte (${rpmMax})`);
  assert.equal(c.marcha, 8);
  // a troca corta a força por um instante
  const q = D.novoCarro(); q.v = D.vCorte(mclaren.vmax, 1) / D.ESC * 0.99; q.marcha = 1;
  D.passo(q, { gas: 1 }, asfalto, p); D.passo(q, { gas: 1 }, asfalto, p);
  assert.ok(q.marcha === 2 && q.trocaT > 0, "trocou de marcha e está sem força");
  // freando, o automático desce as marchas
  const f = D.novoCarro(); f.v = 300; f.marcha = 8; andar(mclaren, f, { brake: 1 }, 2.5);
  assert.ok(f.marcha < 5, `marcha ${f.marcha}`);
  // manual: a marcha fica onde o piloto deixou e, no corte, o carro não passa do topo dela
  const m = D.novoCarro(); andar(mclaren, m, { gas: 1, marcha: 3 }, 8, { chao: true, manual: true, marchaManual: 3 });
  assert.equal(m.marcha, 3);
  assert.ok(m.v <= D.vCorte(mclaren.vmax, 3) / D.ESC * 1.002, `manual na 3ª: ${m.v}`);
  assert.ok(m.rpm <= 1.001);
  // cambio.js (o do navegador) usa as mesmas contas
  globalThis.Dinamica = D;
  const C = await import("../public/corrida/cambio.js");
  assert.equal(C.NUM, 8);
  assert.equal(C.marchaAuto(0, 300, 1), 1);
  assert.equal(C.marchaAuto(299, 300, 1), 8);
  assert.ok(Math.abs(C.rotacao(C.topo(4, 300), 300, 4) - 1) < 1e-9);
});

test("pneu, dano, DRS, ERS e vácuo continuam valendo dentro da física nova", () => {
  const fin = (amb, spec = mclaren) => { const c = D.novoCarro(); andar(spec, c, { gas: 1 }, 45, { chao: true, ...amb }); return c.v; };
  const base = fin({});
  assert.ok(fin({ drs: true }) > base * 1.03 && fin({ drs: true }) < base * 1.08, "DRS");
  assert.ok(fin({ ers: true }) > base * 1.01, "ERS");
  const vac = F1.vacuoF1(1, false);
  assert.ok(fin({ vacuo: vac }) > base * 1.015, "vácuo");
  assert.ok(Math.abs(fin({ dano: F1.efeitoDoDano(10) }) / base - 0.9) < 0.02, "10% de dano tira ~10% da velocidade final");
  assert.ok(fin({ pn: F1.aderencia({ composto: "macio", desgaste: 1, temp: 1 }) }) < base, "pneu acabado");
  // aderência: pneu gasto e dano tiram da lateral, pneu novo e quente segura mais
  const novo = F1.aderencia({ composto: "macio", desgaste: 0, temp: 1 }), gasto = F1.aderencia({ composto: "macio", desgaste: 0.95, temp: 1 });
  const limite = (pn, dano) => {
    const c = D.novoCarro(); c.v = 150; c.marcha = 5;
    const p = D.parametros(mclaren);
    for (let i = 0; i < 120; i++) { c.v = 150; D.passo(c, { steer: 1 }, { chao: true, pn, dano }, p); }
    return Math.abs(c.r);
  };
  assert.ok(limite(novo) > limite(gasto) * 1.05, "pneu novo vira mais");
  assert.ok(limite(null, F1.efeitoDoDano(30)) < limite(null, F1.efeitoDoDano(0)) * 0.85, "dano tira aderência");
  // grama: a velocidade cai muito e o carro derrapa mais
  const grama = D.novoCarro(); andar(mclaren, grama, { gas: 1 }, 15, { chao: false });
  assert.ok(grama.v < 0.5 * mclaren.vmax, `na grama: ${grama.v}`);
});

test("os robôs podem usar as contas: velocidade de curva, frenagem e aceleração por marcha", () => {
  const top = D.velocidadeFinal(mclaren);
  assert.ok(D.aceleracaoMaxima(mclaren, 20) > D.aceleracaoMaxima(mclaren, 200) && D.aceleracaoMaxima(mclaren, 200) > D.aceleracaoMaxima(mclaren, top * 0.99));
  assert.ok(D.aceleracaoMaxima(mclaren, top) < 1 && D.aceleracaoMaxima(mclaren, top * 0.5) > 20);
  const f = D.distanciaDeFrenagem(mclaren, 300, 100), g = D.distanciaDeFrenagem(mclaren, 300, 100, -0.1), h = D.distanciaDeFrenagem(mclaren, 300, 100, 0.1);
  assert.ok(g.distancia > f.distancia && h.distancia < f.distancia, "descida alonga a frenagem, subida encurta");
  const a = D.tempoParaAcelerar(mclaren, 0, 267);
  assert.ok(a.tempo > 4 && a.tempo < 8 && a.distancia > 0);
  assert.equal(D.tempoParaAcelerar(Equipes.specDaEquipe("haas"), 0, 1000).tempo, Infinity);
  assert.equal(D.marchaIdeal(10, top), 1);
  assert.equal(D.marchaIdeal(top * 0.95, top), 8);
  // as relações pedem o spec de qualquer carro: os cinco carros e as onze equipes
  for (const spec of [...Object.values(T.CARROS), ...Object.keys(Equipes.EQUIPES).map((e) => Equipes.specDaEquipe(e))]) {
    const v = D.velocidadeDeCurva(spec, 100);
    assert.ok(v > 60 && v < 0.5 * D.velocidadeFinal(spec) + 20, `${spec.name}: ${v}`);
  }
});

test("um grampo não se faz com o acelerador cheio, mas o piloto ideal (no limite de aderência) faz a volta", () => {
  // o piloto: segue o meio da pista (S.pilotoAutomatico) com a velocidade do perfil ideal, ou com o acelerador cheio
  const voltaDe = (id, ideal, equipe = "mclaren") => {
    const t = T.PISTAS[id], tr = S.criarPista(t, id), spec = Equipes.specDaEquipe(equipe), c = S.novo(tr, { grid: 0, f1: true, pneu: F1.pneuNovo("medio") });
    const perfil = D.perfilIdeal(tr.pts, spec, 6, 0.92), amb = { spec, voltas: 3, laps: 0, f1: true, outros: [] }, ent = {}, ev = [];
    let setores = 0, maxLat = 0, tempo = 0, batidas = 0, saiu = null;
    for (let i = 0; i < 120 * 200; i++) {
      let alvo = 9999;
      if (ideal) { const K = Math.ceil(Math.max(c.v, 30) * 0.3 / 6); alvo = 1e9; for (let k = 0; k <= K; k++) alvo = Math.min(alvo, perfil[(c.idx + 1 + k) % tr.n]); }
      S.pilotoAutomatico(c, tr, spec, alvo, 0, ent);
      if (ideal) { ent.gas = c.v < alvo ? 1 : 0; ent.brake = c.v > alvo * 1.03 ? 1 : 0; if (ent.brake) ent.gas = 0; } else { ent.gas = 1; ent.brake = 0; }
      ev.length = 0; S.passo(c, ent, amb, tr, ev); tempo += S.PASSO;
      for (const e of ev) { if (e.t === "setor") { setores++; if (e.s === 0 && setores > 1) return { tempo, maxLat, batidas, voltou: true }; } if (e.t === "muro") batidas++; }
      maxLat = Math.max(maxLat, Math.abs(S.quadro(tr, c.x, c.y, c.idx).lat));
      if (maxLat > t.width / 2 + 90 && saiu === null) saiu = { tempo, idx: c.idx };
      if (saiu) return { tempo, maxLat, batidas, saiu };
    }
    return { tempo, maxLat, batidas };
  };
  for (const id of ["interlagos", "monaco", "monza", "barcelona"]) {
    const bom = voltaDe(id, true), cheio = voltaDe(id, false);
    assert.ok(bom.voltou, `${id}: o piloto ideal fecha a volta (${JSON.stringify(bom)})`);
    assert.ok(bom.maxLat < T.PISTAS[id].width / 2 + 5, `${id}: o piloto ideal fica na pista (${bom.maxLat})`);
    // segurando o acelerador: sai da pista (ou, onde tem muro, apanha dele e perde muito tempo)
    const t = T.PISTAS[id];
    if (t.walls) assert.ok(cheio.batidas > 50, `${id}: segurar o acelerador bate no muro ${JSON.stringify(cheio)}`);
    else assert.ok(cheio.saiu || cheio.maxLat > t.width / 2 + 20, `${id}: segurar o acelerador sai da pista ${JSON.stringify(cheio)}`);
  }
});

test("passo fixo: 30 ou 144 quadros por segundo dão a mesma corrida", () => {
  const tr = S.criarPista(T.PISTAS.interlagos, "interlagos");
  const corrida = (fps, jitter, seg = 6) => {
    const c = S.novo(tr, { grid: 0, f1: true, pneu: F1.pneuNovo("medio") }), amb = { spec: mclaren, voltas: 3, laps: 0, f1: true, outros: [] };
    let acc = 0, t = 0, passos = 0, k = 0, dado = 0;
    while (t < seg) {
      const dt = (1 / fps) * (1 + jitter * Math.sin(k++ * 2.399)); t += dt;
      const g = S.gastarTempo(acc, dt); acc = g.acc; dado += g.passos;
      for (let i = 0; i < g.passos && passos < seg * 120; i++) { S.passo(c, { gas: 1, steer: Math.sin(passos * D.PASSO * 0.7) * 0.1 }, amb, tr, null); passos++; } // (para nos mesmos 720 passos)
    }
    return { c, passos, dado, t };
  };
  const ref = corrida(120, 0);
  for (const [fps, jit] of [[30, 0], [60, 0], [144, 0], [240, 0.2], [45, 0.3], [144, 0.5]]) {
    const r = corrida(fps, jit);
    assert.ok(r.dado <= r.t * 120 + 1e-6 && r.dado >= r.t * 120 - 1.5, `${fps} fps: ${r.dado} passos em ${r.t} s`); // 120 passos por segundo, qualquer que seja o quadro
    assert.equal(r.passos, 720);
    assert.equal(r.c.x, ref.c.x); assert.equal(r.c.y, ref.c.y); assert.equal(r.c.v, ref.c.v); // os mesmos passos dão a mesma posição, bit a bit
  }
  // quem trava num quadro (aba escondida) não acumula tempo: no máximo 0,25 s por quadro
  assert.ok(S.gastarTempo(0, 5).passos <= 31);
  // e o mesmo passo, com o mesmo estado e a mesma entrada, dá sempre o mesmo resultado
  const a = corrida(120, 0), b = corrida(120, 0);
  assert.equal(a.c.x, b.c.x); assert.equal(a.c.v, b.c.v);
});

test("entrada empacotada: ida e volta sem perda (o servidor vê o que o navegador mandou)", () => {
  for (const e of [{ gas: 1, brake: 0, steer: -1, ers: 1, respawn: 0, pedido: "duro", marcha: 5 }, { gas: 0, brake: 1, steer: 0.4, ers: 0, respawn: 1, pedido: null, marcha: 0 }, { gas: 1, steer: 0 }]) {
    const n = S.desempacotar(S.empacotar(e));
    assert.equal(n.gas, e.gas ? 1 : 0); assert.equal(n.brake, e.brake ? 1 : 0); assert.equal(n.ers, e.ers ? 1 : 0); assert.equal(n.respawn, e.respawn ? 1 : 0);
    assert.equal(n.pedido, e.pedido || null); assert.equal(n.marcha, e.marcha || 0);
    assert.ok(Math.abs(n.steer - (e.steer || 0)) < 1 / 255 + 1e-9);
  }
  assert.ok(S.empacotar({ gas: 1, brake: 1, ers: 1, respawn: 1, pedido: "duro", marcha: 15, steer: 1 }) < 2 ** 31);
});

test("estado do carro: serializar e aplicar volta ao mesmo estado (o que o servidor manda no ack)", () => {
  const tr = S.criarPista(T.PISTAS.interlagos, "interlagos"), amb = { spec: mclaren, voltas: 3, laps: 0, f1: true, outros: [] };
  const a = S.novo(tr, { grid: 2, f1: true, pneu: F1.pneuNovo("macio"), box: true });
  for (let i = 0; i < 600; i++) S.passo(a, { gas: 1, steer: i > 200 ? 0.2 : 0 }, amb, tr, null);
  const b = S.novo(tr, { grid: 0, f1: true, pneu: F1.pneuNovo("duro"), box: true });
  S.aplicar(b, JSON.parse(JSON.stringify(S.serializar(a))), tr);
  for (let i = 0; i < 240; i++) { S.passo(a, { gas: 1, steer: -0.1 }, amb, tr, null); S.passo(b, { gas: 1, steer: -0.1 }, amb, tr, null); }
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.5, `divergiram ${Math.hypot(a.x - b.x, a.y - b.y)}`);
  assert.ok(Math.abs(a.v - b.v) < 0.5 && a.tick === b.tick && a.marcha === b.marcha);
  assert.ok(Math.abs(a.pneu.desgaste - b.pneu.desgaste) < 1e-3 && b.pneu.composto === "macio");
});
