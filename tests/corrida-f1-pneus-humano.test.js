// Corrida, regras de F1: a pilotagem de um "humano" nos três compostos. Um piloto de teclado de mentira (esterço em degraus de 0,25,
// atraso de 100 ms, sem a ajuda dos robôs: nada de contra-esterço pela deriva da traseira) dá a volta lançada com macio, médio e duro.
// O comando é o mesmo nos três; o que muda é só o pneu. A RESPOSTA da direção tem de ser igual (o composto muda o limite de
// aderência, o desgaste e a temperatura, não "o carro não obedece"), e a ordem de tempo tem de ser sempre macio < médio < duro, com os
// degraus perto do real (médio ~1% mais lento que o macio, duro ~1% mais lento que o médio).
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../public/corrida/dinamica.js");
const S = require("../public/corrida/sim.js");
const T = require("../public/corrida/pistas.js");
const F1 = require("../public/corrida/f1-regras.js");
const Equipes = require("../public/corrida/f1-equipes.js");

const SPEC = Equipes.specDaEquipe("mclaren");
const limite = (v, a, b) => (v < a ? a : v > b ? b : v);

// O perfil de velocidade que o humano tem na cabeça para um pneu: o limite de curva do pneu (o que ele sente pelo carro: no arcade, a raiz
// de aderência × raio; fora dele, a conta da física intermediária), vezes uma margem de coragem, freando e acelerando ao redor.
function perfilDoHumano(tr, pneu, margem) {
  const a = F1.aderencia(pneu), pts = tr.pts, n = tr.n, passo = 6;
  const ext = { grip: a.grip, freio: a.freio, tracao: a.tracao, potencia: a.final ** 3 };
  const topo = D.velocidadeFinal(SPEC, ext), v = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const k = pts[i].k;
    if (!(k > 1e-6)) { v[i] = topo; continue; }
    const vc = a.arcade ? Math.sqrt(SPEC.grip * a.rel / k) : D.velocidadeDeCurva(SPEC, 1 / k, ext);
    v[i] = Math.min(topo, vc * margem);
  }
  const incl = (i) => (pts[(i + 1) % n].h - pts[i].h) / passo;
  for (let volta = 0; volta < 3; volta++) {
    for (let k = n * 2 - 1; k >= 0; k--) { const i = k % n, j = (i + 1) % n; v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * D.frenagemMaxima(SPEC, v[j], incl(i), ext) * 0.8 * passo)); }
    for (let k = 0; k < n * 2; k++) { const i = k % n, j = (i + 1) % n; v[j] = Math.min(v[j], Math.sqrt(v[i] * v[i] + 2 * Math.max(0, D.aceleracaoMaxima(SPEC, v[i], incl(i), ext)) * passo)); }
  }
  return v;
}

// Uma volta lançada (a segunda) com o pneu novo e quente parado nesse estado. O volante é do humano: P no erro de rumo até um ponto à frente,
// D na guinada, em degraus de 0,25 e com 100 ms de atraso. Devolve o tempo e quantas vezes bateu ou saiu da pista (volta "suja").
function voltaHumana(id, composto, margem) {
  const tr = S.preparar(S.criarPista(T.PISTAS[id], id)), pn = F1.pneuNovo(composto); pn.temp = 1;
  const c = S.novo(tr, { grid: 0, f1: true, pneu: { ...pn } }), amb = { spec: SPEC, voltas: 99, laps: 0, f1: true, outros: [] }, ev = [], ent = {};
  const perfil = perfilDoHumano(tr, pn, margem), atraso = [];
  let setores = 0, t = 0, t0 = 0, sujeira = 0;
  for (let i = 0; i < 120 * 300; i++) {
    c.pneu.composto = composto; c.pneu.desgaste = 0; c.pneu.temp = 1;
    let alvo = 1e9; const K = Math.ceil(Math.max(c.v, 30) * 0.3 / 6);
    for (let k = 0; k <= K; k++) alvo = Math.min(alvo, perfil[(c.idx + 1 + k) % tr.n]);
    const Ld = Math.max(22, Math.max(c.v, 30) * 0.5); let j = c.idx, acc = 0; while (acc < Ld) { j = (j + 1) % tr.n; acc += 6; }
    let e = Math.atan2(tr.pts[j].y - c.y, tr.pts[j].x - c.x) - c.a; e = Math.atan2(Math.sin(e), Math.cos(e));
    atraso.push(Math.round(limite(2.2 * e - 0.25 * (c.r || 0), -1, 1) * 4) / 4); if (atraso.length > 12) atraso.shift();
    ent.steer = atraso[0]; ent.gas = c.v < alvo ? 1 : 0; ent.brake = c.v > alvo * 1.03 ? 1 : 0; if (ent.brake) ent.gas = 0;
    ev.length = 0; S.passo(c, ent, amb, tr, ev); t += S.PASSO;
    if (setores >= 2 && c.offroad) sujeira += 1 / 30;
    for (const x of ev) {
      if (x.t === "muro" && setores >= 2 && x.forca > 20) sujeira += 1;
      if (x.t === "setor" && x.s === 0) { setores++; amb.laps++; if (setores === 2) t0 = t; else if (setores === 3) return { tempo: t - t0, sujeira }; }
    }
  }
  return { tempo: null, sujeira: Infinity };
}
// A melhor volta limpa do humano: ele sobe a coragem (a margem) até a volta sujar, como quem joga.
function melhorVolta(id, composto) {
  let melhor = Infinity;
  for (const margem of [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7]) { const r = voltaHumana(id, composto, margem); if (r.tempo && r.sujeira < 1) melhor = Math.min(melhor, r.tempo); }
  return melhor;
}

test("humano (esterço de teclado, sem ajuda dos robôs): macio < médio < duro, e cada degrau fica perto de 1% da volta", { timeout: 120000 }, () => {
  for (const pista of ["suzuka", "interlagos", "monza"]) {
    const s = melhorVolta(pista, "macio"), m = melhorVolta(pista, "medio"), d = melhorVolta(pista, "duro");
    const info = `${pista}: macio ${s.toFixed(2)} s, médio ${m.toFixed(2)} s, duro ${d.toFixed(2)} s`;
    assert.ok(isFinite(s) && isFinite(m) && isFinite(d), `${info}: não fechou volta limpa`);
    assert.ok(s < m && m < d, `${info}: fora de ordem`);
    assert.ok((m - s) / s >= 0.003 && (m - s) / s <= 0.016, `${info}: o médio perde ${((m - s) / s * 100).toFixed(2)}% (esperado ~0,6 a 1,2%)`);
    assert.ok((d - m) / m >= 0.003 && (d - m) / m <= 0.016, `${info}: o duro perde ${((d - m) / m * 100).toFixed(2)}% para o médio (esperado ~0,5 a 1%)`);
  }
});

test("a resposta da direção é a mesma nos três compostos a 100, 200 e 280 km/h (guinada depois de 0,1 e 0,3 s de volante cheio)", () => {
  const p = D.parametros(SPEC);
  const resposta = (composto, kmh) => {
    const pneu = F1.pneuNovo(composto); pneu.temp = 1;
    const pn = F1.aderencia(pneu), c = D.novoCarro(), amb = { chao: true, pn }, v0 = kmh / 0.75, saida = [];
    c.v = v0; c.marcha = D.marchaIdeal(v0, p.vmaxU);
    for (let i = 1; i <= 36; i++) {
      D.passo(c, { gas: c.v < v0 ? 1 : 0, brake: 0, steer: 1 }, amb, p);
      if (i === 12 || i === 36) saida.push(c.r); // (mais tempo com o volante cheio já é o limite de aderência: aí os compostos podem mudar)
    }
    return saida;
  };
  for (const kmh of [100, 200, 280]) {
    const macio = resposta("macio", kmh);
    for (const composto of ["medio", "duro"]) {
      const o = resposta(composto, kmh);
      macio.forEach((r, i) => assert.ok(Math.abs(o[i] / r - 1) < 0.05, `${kmh} km/h ${composto}: guinada ${o[i].toFixed(2)} contra ${r.toFixed(2)} do macio (${["0,1", "0,3"][i]} s)`));
    }
  }
});
