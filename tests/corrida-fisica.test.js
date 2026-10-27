// Corrida da Galera, a física do carro de F1 (public/corrida/dinamica.js e sim.js). Para a frente é a física nova: massa, torque e
// marchas, arrasto, downforce, frenagem progressiva, rampa. Para o lado é a dirigibilidade de antes (o carro vira pelo `grip` e pelo `kin`
// do spec e escorrega quando passa do limite), com o composto, o desgaste e a temperatura do pneu mandando nela. Passo fixo e reconciliação.
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

// ---------- a curva de verdade ----------
// A curva mais longa e fechada de uma pista (k >= kMin) e a maior velocidade constante com que o piloto automático a faz sem sair
// do asfalto e sem perder a velocidade (o carro mantém `alvo` com o acelerador e o freio, e vem de 40 pontos antes).
const CURVAS = new Map();
function curvaDe(id, kMin) {
  const tr = S.criarPista(T.PISTAS[id], id), chave = id + kMin;
  if (!CURVAS.has(chave)) {
    let melhor = null, ini = null;
    for (let i = 0; i < tr.n * 2; i++) {
      const k = tr.pts[i % tr.n].k || 0;
      if (k >= kMin) { if (ini === null) ini = i; } else { if (ini !== null && (!melhor || i - ini > melhor.len)) melhor = { ini: ini % tr.n, len: i - ini }; ini = null; }
    }
    CURVAS.set(chave, { tr, ...melhor, raio: 1 / tr.pts[(melhor.ini + (melhor.len >> 1)) % tr.n].k });
  }
  return CURVAS.get(chave);
}
function passarPelaCurva(cv, alvo, pneu, spec = mclaren) {
  const { tr } = cv, c = S.novo(tr, { grid: 0, f1: true, pneu: { ...pneu } }), i0 = (cv.ini - 40 + tr.n) % tr.n, q = tr.pts[i0];
  Object.assign(c, { x: q.x, y: q.y, a: Math.atan2(q.ty, q.tx), idx: i0, v: alvo, marcha: D.marchaIdeal(alvo, spec.vmax), z: q.h });
  const amb = { spec, voltas: 3, laps: 0, f1: true, outros: [] }, ent = {};
  let maxLat = 0, slip = 0;
  for (let t = 0; t < 120 * 20; t++) {
    S.pilotoAutomatico(c, tr, spec, alvo, 0, ent);
    ent.gas = c.v < alvo ? 1 : 0; ent.brake = c.v > alvo * 1.02 ? 1 : 0; if (ent.brake) ent.gas = 0;
    S.passo(c, ent, amb, tr, null);
    const rel = (c.idx - cv.ini + tr.n) % tr.n;
    if (rel < cv.len + 10) { maxLat = Math.max(maxLat, Math.abs(S.quadro(tr, c.x, c.y, c.idx).lat)); slip = Math.max(slip, c.slip); }
    if (rel > cv.len + 12 && rel < tr.n / 2) break;
  }
  return { maxLat, slip, vFim: c.v, saiu: maxLat > T.PISTAS[tr.id].width / 2 - 4 || c.v < alvo * 0.9 };
}
const velocidadeNaCurva = (id, kMin, pneu) => {
  const cv = curvaDe(id, kMin); let lo = 60, hi = 330;
  for (let k = 0; k < 12; k++) { const m = (lo + hi) / 2; if (passarPelaCurva(cv, m, pneu).saiu) hi = m; else lo = m; }
  return lo;
};
// o mesmo comando num carro solto: o volante `steer` a `v0` (u/s) por `seg` segundos (com o acelerador, a velocidade livre; sem ele,
// presa em `v0`); devolve o maior escorregão, a guinada média e o carro
function girarComPneu(pn, { v0 = 170, steer = 0.8, gas = 0, dano = null, seg = 2 } = {}) {
  const c = D.novoCarro(), p = D.parametros(mclaren); c.v = v0; c.marcha = D.marchaIdeal(v0, mclaren.vmax);
  let slip = 0, soma = 0;
  for (let i = 0; i < 120 * seg; i++) { if (!gas) c.v = v0; D.passo(c, { gas, steer }, { chao: true, pn, dano }, p); slip = Math.max(slip, c.slip); soma += Math.abs(c.r); }
  return { slip, guinada: soma / (120 * seg), v: c.v, c };
}
const estado = (composto, desgaste = 0, temp = 1) => ({ composto, desgaste, temp }); // um pneu quente (temp 1) e novo (desgaste 0)
const quente = (composto, desgaste = 0, temp = 1) => F1.aderencia(estado(composto, desgaste, temp));

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
  // Frear e virar dividem o pneu: com o volante todo (a curva pede tudo do pneu) a roda trava; com meio volante dá para frear forte
  // e ainda virar.
  const livre = D.novoCarro(); livre.v = 200; livre.marcha = 6; andar(mclaren, livre, { steer: 0.7 }, 1.2);
  const meio = D.novoCarro(); meio.v = 200; meio.marcha = 6;
  andar(mclaren, meio, { brake: 1, steer: 0.7 }, 1.2);
  assert.ok(Math.abs(meio.a) > 0.6 * Math.abs(livre.a) && meio.v < livre.v - 60, "freando forte o carro desacelera e ainda vira");
  const cheio = D.novoCarro(); cheio.v = 200; cheio.marcha = 6; let maxTrav = 0;
  andar(mclaren, cheio, { brake: 1, steer: 1 }, 1.2, asfalto, (car) => { maxTrav = Math.max(maxTrav, car.travada); });
  assert.ok(maxTrav > 0.5, `travada ${maxTrav}`);
});

test("aderência lateral (a de antes): o pneu segura `grip` a qualquer velocidade, e uma curva de raio R pede sqrt(grip·R)", () => {
  assert.equal(D.aceleracaoLateral(mclaren, 60), mclaren.grip);
  assert.equal(D.aceleracaoLateral(mclaren, 300), mclaren.grip, "sem downforce na lateral: é a dirigibilidade de antes");
  assert.equal(D.aceleracaoLateral(mclaren, 100, { grip: 1.2 }), mclaren.grip * 1.2);
  const top = D.velocidadeFinal(mclaren);
  const grampo = D.velocidadeDeCurva(mclaren, 80), media = D.velocidadeDeCurva(mclaren, 165), rapida = D.velocidadeDeCurva(mclaren, 600);
  assert.ok(Math.abs(grampo - Math.sqrt(mclaren.grip * 80)) < 1, `grampo (raio 80): ${grampo}`);
  assert.ok(grampo < 0.7 * top, `grampo contra a velocidade final: ${grampo} contra ${top}`);
  assert.ok(media < 0.95 * top && media > grampo, `curva média (raio 165): ${media}`);
  assert.ok(rapida > 0.97 * top, `curva rápida (raio 600) é de acelerador cheio: ${rapida}`);
  assert.ok(D.velocidadeDeCurva(mclaren, 300) > D.velocidadeDeCurva(mclaren, 165));
  // mais grip (pneu macio) faz a mesma curva mais depressa, na raiz da aderência; uma quina da linha não para o carro
  assert.ok(Math.abs(D.velocidadeDeCurva(mclaren, 120, { grip: 1.21 }) / D.velocidadeDeCurva(mclaren, 120) - 1.1) < 0.01);
  assert.ok(D.velocidadeDeCurva(mclaren, 0.5) > 60, "uma quina da linha (raio quase zero) é feita no raio mínimo, e não parada");
  // a pista inteira: o limite de cada ponto, com a frenagem e a arrancada entre eles (Interlagos, Mônaco e Barcelona)
  for (const id of ["interlagos", "monaco", "barcelona"]) {
    const pts = T.pontos(T.PISTAS[id], 6), v = D.perfilIdeal(pts, mclaren), fim = D.velocidadeFinal(mclaren);
    const minimo = Math.min(...v), cheio = v.filter((x) => x > 0.97 * fim).length / v.length;
    assert.ok(minimo < 0.7 * fim && minimo > 60, `${id}: a mais lenta é ${minimo} (${fim})`);
    assert.ok(cheio > 0.01 && cheio < 0.6, `${id}: ${Math.round(cheio * 100)}% da volta a toda velocidade`);
    // cada curva fechada (raio < 130) é feita abaixo da velocidade final
    pts.forEach((q, i) => { if (q.k > 1 / 130) assert.ok(v[i] < 0.8 * fim, `${id} ponto ${i} (raio ${Math.round(1 / q.k)}): ${v[i]}`); });
  }
});

test("escorregão: o volante todo em alta passa do que o pneu segura, escorrega e come velocidade; em baixa o pneu segura tudo", () => {
  // devagar o pneu segura o que o volante pede
  const lento = D.novoCarro(); lento.v = 80; lento.marcha = 3; let maxLento = 0;
  andar(mclaren, lento, { gas: 0, steer: 1 }, 1.5, asfalto, (car) => { maxLento = Math.max(maxLento, car.slip); });
  assert.equal(maxLento, 0, "a 80 u/s com o volante todo o pneu segura");
  // rápido: o volante todo pede mais grip, o resto escorrega para fora da curva e come a velocidade (`scrub`); passou de 30 u/s o pneu satura (`kin`)
  const c = D.novoCarro(); c.v = 250; c.marcha = 7; let maxSlip = 0; const v0 = c.v;
  andar(mclaren, c, { gas: 1, steer: 1 }, 1.5, asfalto, (car) => { maxSlip = Math.max(maxSlip, car.slip); });
  assert.ok(maxSlip > 30, `escorregão ${maxSlip}`);
  assert.ok(c.v < v0 - 40, `escorregar come velocidade (${v0} -> ${c.v})`);
  // o escorregão é velocidade de lado: o carro anda para fora do rumo do bico
  const d = D.novoCarro(); d.v = 250; d.marcha = 7; andar(mclaren, d, { gas: 1, steer: 1 }, 0.5);
  assert.ok(Math.abs(d.vl) > 20, `velocidade de lado ${d.vl}`);
  // a curva sai de acordo com o `grip` do spec: um carro com menos grip escorrega mais com o mesmo comando
  const escorrega = (spec) => { const q = D.novoCarro(), pp = D.parametros(spec); q.v = 170; q.marcha = 5; let m = 0; for (let i = 0; i < 240; i++) { q.v = 170; D.passo(q, { steer: 0.8 }, asfalto, pp); m = Math.max(m, q.slip); } return m; };
  assert.ok(escorrega({ ...mclaren, grip: 300 }) > escorrega(mclaren) + 20, "menos grip, mais escorregão");
  // e não gira o carro sozinho: tirar o pé em linha reta com o volante meio virado não faz pião
  for (const v0 of [100, 200, 280]) for (const st of [-0.5, 0.5]) {
    const q = D.novoCarro(); q.v = v0; q.marcha = D.marchaIdeal(v0, mclaren.vmax); andar(mclaren, q, { gas: 0, steer: st }, 3);
    let dd = Math.atan2(q.vy, q.vx) - q.a; dd = Math.atan2(Math.sin(dd), Math.cos(dd));
    assert.ok(Math.abs(dd) < 1.2 && q.v > -10, `v${v0} volante ${st}: girou (${dd})`);
  }
  const m = D.parametros(mclaren).massa;
  assert.ok(m > 700 && m < 1000, "massa de um F1");
});

test("a direção é a de antes: o volante dá a guinada do spec (turn, plena a partir de 90 u/s) e o carro segue o rumo do bico", () => {
  const p = D.parametros(mclaren);
  for (const v of [30, 90, 150]) {
    const c = D.novoCarro(); c.v = v; c.marcha = D.marchaIdeal(v, mclaren.vmax);
    for (let i = 0; i < 120; i++) { c.v = v; D.passo(c, { steer: 0.4 }, asfalto, p); }
    const esperado = 0.4 * mclaren.turn * Math.min(1, v / 90);
    assert.ok(Math.abs(c.r - esperado) < 0.02, `${v} u/s: guinada ${c.r}, esperado ${esperado}`);
  }
  assert.equal(D.guinadaDoVolante(p, 200, 1), mclaren.turn);
  assert.equal(D.guinadaDoVolante(p, 45, -1), -mclaren.turn / 2);
  assert.ok(Math.abs(D.volanteParaGuinada(p, 45, mclaren.turn / 4) - 0.5) < 1e-9);
  // o volante é suavizado em ~0,1 s, como antes
  const q = D.novoCarro(); q.v = 100; for (let i = 0; i < 12; i++) D.passo(q, { steer: 1 }, asfalto, p);
  assert.ok(q.steer > 0.55 && q.steer < 0.75, `volante depois de 0,1 s: ${q.steer}`);
  // virando devagar o rumo do bico e o da velocidade ficam juntos (o pneu puxa o carro de volta)
  const s = D.novoCarro(); s.v = 100; s.marcha = 3; andar(mclaren, s, { steer: 0.5 }, 2);
  let dd = Math.atan2(s.vy, s.vx) - s.a; dd = Math.atan2(Math.sin(dd), Math.cos(dd));
  assert.ok(Math.abs(dd) < 0.05, `deslizamento ${dd}`);
});

test("pneus: o macio vira mais depressa que o médio e o duro na mesma curva sem sair, e o duro perde nas curvas lentas", () => {
  // a ordem do grip (aderência lateral de cada composto novo e quente) e da agilidade do volante
  const g = (c) => quente(c).grip, ag = (c) => quente(c).agil;
  assert.ok(g("macio") > g("medio") * 1.1 && g("medio") > g("duro") * 1.1, `grip ${g("macio")} ${g("medio")} ${g("duro")}`);
  assert.ok(ag("macio") > ag("medio") && ag("medio") > ag("duro"));
  // a mesma guinada pedida: o macio gira mais "na mão"
  const guinada = (c) => girarComPneu(quente(c), { v0: 100, steer: 1, seg: 1 }).guinada;
  assert.ok(guinada("macio") > guinada("medio") * 1.03 && guinada("medio") > guinada("duro") * 1.03, `guinada ${guinada("macio")} ${guinada("medio")} ${guinada("duro")}`);
  // na pista: a maior velocidade constante com que o piloto automático faz uma curva rápida (Interlagos) e um grampo (Mônaco) sem sair
  for (const [id, kMin] of [["interlagos", 0.0075], ["monaco", 0.0075]]) {
    const v = (composto) => velocidadeNaCurva(id, kMin, estado(composto)), macio = v("macio"), medio = v("medio"), duro = v("duro");
    assert.ok(macio > medio * 1.04 && medio > duro * 1.04, `${id}: macio ${macio.toFixed(0)}, médio ${medio.toFixed(0)}, duro ${duro.toFixed(0)}`);
    assert.ok(macio > duro * 1.12, `${id}: o macio faz a curva ${(macio / duro).toFixed(2)} vezes mais rápido que o duro`);
  }
});

test("pneus: o frio e o penhasco escorregam mais, e sem acelerador a frente abre enquanto no acelerador a traseira vem", () => {
  for (const composto of ["macio", "medio", "duro"]) {
    // a velocidade em que o volante todo pede 88% do que o pneu quente e novo segura
    const v0 = Math.round(0.88 * quente(composto).grip * mclaren.grip / mclaren.turn), cmd = (pn, gas) => girarComPneu(pn, { v0, steer: 1, gas, seg: 1.5 });
    // no acelerador (a traseira): o pneu quente e novo segura, o frio e o do penhasco escorregam e perdem a velocidade
    const bom = cmd(quente(composto), 1), frio = cmd(quente(composto, 0, 0.6), 1), gasto = cmd(quente(composto, 0.95), 1);
    assert.ok(bom.slip < 30, `${composto} quente e novo segura (${bom.slip})`);
    assert.ok(frio.slip > bom.slip + 30, `${composto} frio escorrega (${frio.slip} contra ${bom.slip})`);
    assert.ok(gasto.slip > bom.slip + 30, `${composto} no penhasco escorrega (${gasto.slip} contra ${bom.slip})`);
    assert.ok(frio.v < bom.v * 0.5 && gasto.v < bom.v * 0.5, `${composto}: escorregar come a velocidade`);
    // sem acelerador (a frente): o carro vira menos do que o volante pede
    const semGas = cmd(quente(composto), 0), semGasFrio = cmd(quente(composto, 0, 0.6), 0), semGasGasto = cmd(quente(composto, 0.95), 0), tudo = cmd(quente(composto, 0.95, 0.6), 0);
    assert.ok(semGasFrio.guinada < semGas.guinada * 0.95, `${composto}: a frente do pneu frio abre`);
    assert.ok(semGasGasto.guinada < semGas.guinada - 0.2, `${composto}: a frente do pneu no penhasco abre (${semGasGasto.guinada} contra ${semGas.guinada})`);
    assert.ok(tudo.guinada < semGas.guinada - 0.5, `${composto}: frio e gasto, a frente não vira (${tudo.guinada})`);
    assert.equal(quente(composto).solta, 0, "o pneu quente e inteiro não solta o carro");
    assert.ok(quente(composto, 0, 0.6).solta > 0.5 && quente(composto, 0.95).solta > 0.7);
  }
  // no acelerador, a traseira vem: o bico gira mais do que o pneu quente deixaria, mesmo com menos grip
  const pico = (pn) => { const c = D.novoCarro(), p = D.parametros(mclaren); c.v = 150; c.marcha = 5; let m = 0; for (let i = 0; i < 120; i++) { D.passo(c, { gas: 1, steer: 0.8 }, { chao: true, pn }, p); m = Math.max(m, Math.abs(c.r)); } return m; };
  const gastoMedio = quente("medio", 0.95, 0.6), emCasa = quente("medio");
  assert.ok(pico(gastoMedio) > 1.1 * mclaren.turn * 0.8 * gastoMedio.agil, `a traseira vem: o bico gira ${pico(gastoMedio)} contra o volante ${mclaren.turn * 0.8 * gastoMedio.agil}`);
  assert.ok(pico(emCasa) < 1.01 * mclaren.turn * 0.8 * emCasa.agil, "o pneu quente obedece o volante");
  // pneu frio aquece andando e deixa de soltar o carro
  const pn = F1.pneuNovo("medio"), antes = F1.aderencia(pn).solta;
  for (let i = 0; i < 60 * 40; i++) F1.gastarPneu(pn, { dist: 0, total: 1, slip: 0, v: 250, vmax: 295, dt: 1 / 60 });
  assert.ok(antes > 0.6 && F1.aderencia(pn).solta < 0.05, `esquentou: solta ${antes} -> ${F1.aderencia(pn).solta}`);
});

test("pneus na pista: pneu frio e pneu gasto fazem a mesma curva bem mais devagar, e o macio gasto cai abaixo do duro gasto", () => {
  const kMin = 0.0075;
  for (const id of ["interlagos", "monaco"]) {
    const v = (composto, desgaste = 0, temp = 1) => velocidadeNaCurva(id, kMin, estado(composto, desgaste, temp)), medio = v("medio");
    assert.ok(v("medio", 0, 0.6) < medio * 0.95, `${id}: pneu frio ${v("medio", 0, 0.6)} contra ${medio}`);
    assert.ok(v("medio", 0.95) < medio * 0.85, `${id}: pneu no penhasco ${v("medio", 0.95)} contra ${medio}`);
    assert.ok(v("macio", 0.95) < v("duro", 0.95), `${id}: o duro aguenta o desgaste que acaba com o macio (${v("macio", 0.95)} e ${v("duro", 0.95)})`);
  }
});

test("aceleração, frenagem e câmbio de 8 marchas seguem os números da física nova (a dirigibilidade de antes não mexeu nelas)", () => {
  // os números de 0 a 200 km/h, de 300 a 100 km/h e as 8 marchas da calibragem da física nova
  const t200 = tempoAte(mclaren, D.novoCarro(), { gas: 1 }, 200), t100 = tempoAte(mclaren, D.novoCarro(), { gas: 1 }, 100);
  assert.ok(Math.abs(t200 - 5.4) < 0.3, `0 a 200 km/h em ${t200} s`);
  assert.ok(t100 > 1.5 && t100 < 3.2, `0 a 100 km/h em ${t100} s`);
  const c = D.novoCarro(); c.v = 400; c.marcha = 8; let dist = 0; const p = D.parametros(mclaren);
  while (kmh(c.v) > 100) { D.passo(c, { brake: 1 }, asfalto, p); dist += c.v * D.PASSO; }
  assert.ok(Math.abs(dist * D.ESC - 94) < 14, `300 a 100 km/h em ${dist * D.ESC} m`);
  assert.equal(D.NUM, 8); assert.equal(D.RPM_MAX, 12000); assert.equal(D.FRACAO[7], 1);
  // os pneus não mexem na aceleração em reta no auge, e nada do volante entra na conta de reta: virar um pouco não tira a velocidade final
  const reta = (steer) => { const q = D.novoCarro(); andar(mclaren, q, { gas: 1, steer }, 45); return q.v; };
  assert.ok(Math.abs(reta(0) - mclaren.vmax) < mclaren.vmax * 0.015);
  assert.ok(reta(0.02) > mclaren.vmax * 0.97, "um toque no volante não tira a velocidade final");
  // com pneu: o macio arranca mais forte que o duro (tração), sem mudar o jeito da curva de potência
  const arranca = (composto) => { const q = D.novoCarro(), pp = D.parametros(mclaren); for (let i = 0; i < 240; i++) D.passo(q, { gas: 1 }, { chao: true, pn: quente(composto) }, pp); return q.v; };
  assert.ok(arranca("macio") > arranca("duro"), "tração do composto");
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

test("pneu, dano, DRS, ERS e vácuo continuam valendo dentro da física", () => {
  const fin = (amb, spec = mclaren) => { const c = D.novoCarro(); andar(spec, c, { gas: 1 }, 45, { chao: true, ...amb }); return c.v; };
  const base = fin({});
  assert.ok(fin({ drs: true }) > base * 1.03 && fin({ drs: true }) < base * 1.08, "DRS");
  assert.ok(fin({ ers: true }) > base * 1.01, "ERS");
  const vac = F1.vacuoF1(1, false);
  assert.ok(fin({ vacuo: vac }) > base * 1.015, "vácuo");
  assert.ok(Math.abs(fin({ dano: F1.efeitoDoDano(10) }) / base - 0.9) < 0.02, "10% de dano tira ~10% da velocidade final");
  assert.ok(fin({ pn: F1.aderencia({ composto: "macio", desgaste: 1, temp: 1 }) }) < base, "pneu acabado");
  // aderência: pneu gasto e dano tiram da lateral (o mesmo comando escorrega mais), pneu novo e quente segura mais
  const escorrega = (pn, dano) => girarComPneu(pn, { v0: pn ? 179 : 150, steer: 1, gas: 1, dano, seg: 1.5 }).slip;
  assert.ok(escorrega(quente("macio", 0.95)) > escorrega(quente("macio")) + 30, "pneu gasto escorrega mais");
  assert.ok(escorrega(null, F1.efeitoDoDano(100)) > escorrega(null, F1.efeitoDoDano(0)) + 15, "dano tira aderência");
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
    assert.ok(v > 60 && v <= D.velocidadeFinal(spec) && Math.abs(v - Math.min(Math.sqrt(spec.grip * 100), 100 * spec.turn)) < 1, `${spec.name}: ${v}`);
  }
});

test("o acelerador cheio escorrega nas curvas, mas o piloto ideal (no limite de aderência) faz a volta sem escorregar", () => {
  // o piloto: segue o meio da pista (S.pilotoAutomatico) com a velocidade do perfil ideal, ou com o acelerador cheio
  const voltaDe = (id, ideal, equipe = "mclaren") => {
    const t = T.PISTAS[id], tr = S.criarPista(t, id), spec = Equipes.specDaEquipe(equipe), c = S.novo(tr, { grid: 0, f1: true, pneu: F1.pneuNovo("medio") });
    const perfil = D.perfilIdeal(tr.pts, spec, 6, 0.97), amb = { spec, voltas: 3, laps: 0, f1: true, outros: [] }, ent = {}, ev = [];
    let setores = 0, maxLat = 0, tempo = 0, batidas = 0, saiu = null, escorregao = 0;
    for (let i = 0; i < 120 * 200; i++) {
      let alvo = 9999;
      if (ideal) { const K = Math.ceil(Math.max(c.v, 30) * 0.3 / 6); alvo = 1e9; for (let k = 0; k <= K; k++) alvo = Math.min(alvo, perfil[(c.idx + 1 + k) % tr.n]); }
      S.pilotoAutomatico(c, tr, spec, alvo, 0, ent);
      if (ideal) { ent.gas = c.v < alvo ? 1 : 0; ent.brake = c.v > alvo * 1.03 ? 1 : 0; if (ent.brake) ent.gas = 0; } else { ent.gas = 1; ent.brake = 0; }
      ev.length = 0; S.passo(c, ent, amb, tr, ev); tempo += S.PASSO; escorregao = Math.max(escorregao, c.slip);
      for (const e of ev) { if (e.t === "setor") { setores++; if (e.s === 0 && setores > 1) return { tempo, maxLat, batidas, escorregao, voltou: true }; } if (e.t === "muro") batidas++; }
      maxLat = Math.max(maxLat, Math.abs(S.quadro(tr, c.x, c.y, c.idx).lat));
      if (maxLat > t.width / 2 + 90 && saiu === null) saiu = { tempo, idx: c.idx };
      if (saiu) return { tempo, maxLat, batidas, escorregao, saiu };
    }
    return { tempo, maxLat, batidas, escorregao };
  };
  for (const id of ["interlagos", "monaco", "monza", "barcelona"]) {
    const bom = voltaDe(id, true), cheio = voltaDe(id, false);
    assert.ok(bom.voltou, `${id}: o piloto ideal fecha a volta (${JSON.stringify(bom)})`);
    assert.ok(bom.maxLat < T.PISTAS[id].width / 2 + 5, `${id}: o piloto ideal fica na pista (${bom.maxLat})`);
    assert.ok(bom.escorregao < 30, `${id}: o piloto ideal não escorrega de verdade (${bom.escorregao})`);
    // segurando o acelerador: escorrega muito nas curvas, sai do meio da pista e apanha do muro onde tem (a dirigibilidade de antes
    // segura o carro no asfalto com o volante certo, mas o escorregão come velocidade e a trajetória abre)
    assert.ok(cheio.escorregao > 60, `${id}: segurar o acelerador escorrega ${JSON.stringify(cheio)}`);
    assert.ok(cheio.maxLat > bom.maxLat * 1.25, `${id}: segurar o acelerador abre a trajetória ${JSON.stringify(cheio)} contra ${JSON.stringify(bom)}`);
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
