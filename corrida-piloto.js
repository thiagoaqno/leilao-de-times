// Corrida F1 — o piloto dos robôs, feito do zero em cima da física real (dinamica.js). Três peças, sem depender de volta gravada:
//  1) a LINHA: procura direto o menor tempo de volta entre os limites de CADA lado da pista (linhaDeCorrida);
//  2) o RITMO: a velocidade de cada ponto com os limites que o carro tem de verdade: no macio (arcade) o pneu segura `gripU` u/s² e o
//     bico gira até `turn` rad/s; nos outros compostos, a conta com carga aerodinâmica (perfilDoCarro);
//  3) os COMANDOS: o volante mira um ponto adiante na linha, e o pedal é parcial: o gás e o freio saem da aceleração que falta
//     para chegar à velocidade de um pouco adiante, não de um liga/desliga (comandos).
"use strict";
const T = require("./public/corrida/pistas.js");
const D = require("./public/corrida/dinamica.js");
const Linha = require("./corrida-linha.js");
const F1 = require("./public/corrida/f1-regras.js");

const STEP = 6;
const MARGEM_MURO = 4; // quantos u antes do ponto em que o centro do carro encosta na barreira (ou da beira do asfalto, sem barreira) a linha pode ir

// Até onde o centro do carro pode ir para cada lado em cada ponto: a mesma conta da física (sim.js: largura/2 + recuo - muroFolga), lado por
// lado. O limite simétrico de antes deixava o muro de um lado encolher o outro, e a linha ficava no meio.
function limitesDaPista(t, pts, margem = MARGEM_MURO) {
  const n = pts.length, lo = new Float64Array(n), hi = new Float64Array(n), W = t.width, beira = W / 2 - margem;
  const m = t.muros || t.escapeLivre ? T.murosDoEscape(pts, W, null, t) : null, folga = t.muroFolga ?? 8;
  for (let i = 0; i < n; i++) {
    const noLado = (lado) => (m && m[lado][i] ? Math.min(beira, W / 2 + m[lado][i] - folga - margem) : beira);
    hi[i] = Math.max(2, noLado(1)); lo[i] = -Math.max(2, noLado(-1));
  }
  // A boca do box: colado na borda e indo para fora, a física entende que o carro quer entrar (sim.js, passoBox). A linha passa antes dessa faixa.
  const cor = F1.corredor(t, n, W);
  if (cor) for (let d = -6; d < F1.RAMPA + 6; d++) {
    const i = (cor.i0 + d + n) % n, teto = W / 2 - 8 - 5;
    if (cor.lado > 0) hi[i] = Math.min(hi[i], teto); else lo[i] = Math.max(lo[i], -teto);
  }
  return { lo, hi };
}

// O que o carro consegue, em tabelas por velocidade: a conta do tempo de volta roda milhares de vezes.
function capacidade(spec, op = {}) {
  const p = D.parametros(spec), rel = op.rel ?? 0.72, top = D.velocidadeFinal(spec);
  const passoV = 4, tam = Math.ceil(top * 1.3 / passoV) + 2, freio = new Float64Array(tam), acel = new Float64Array(tam);
  const ext = op.ext || { freio: op.freio ?? 1, grip: op.grip ?? 1 };
  for (let i = 0; i < tam; i++) { freio[i] = D.frenagemMaxima(spec, i * passoV, 0, ext); acel[i] = Math.max(0, D.aceleracaoMaxima(spec, i * passoV, 0, ext)); }
  return { aLat: p.gripU * rel, turn: p.turn, top, freio, acel, passoV, arcade: op.arcade !== false };
}
const naTabela = (tab, passoV, v) => { const x = Math.max(0, v) / passoV, i = Math.min(tab.length - 2, Math.floor(x)), f = x - i; return tab[i] + (tab[i + 1] - tab[i]) * Math.min(1, f); };

// A velocidade de cada ponto de um caminho com curvatura `k` (com sinal ou não), trechos `ds`, e o tempo da volta.
// A curva divide o pneu com o freio e a tração (o `uso` da física). `freioK`: a fração da frenagem máxima usada.
function perfilNoCaminho(k, ds, cap, op = {}) {
  const n = k.length, v = op.saida || new Float64Array(n), latK = op.latK ?? 1, freioK = op.freioK ?? 1, aLat = cap.aLat * latK;
  for (let i = 0; i < n; i++) { const a = Math.abs(k[i]); v[i] = a > 1e-6 ? Math.min(cap.top, Math.sqrt(aLat / a), cap.turn / a) : cap.top; }
  const piso = (x) => Math.sqrt(Math.max(0.04, 1 - x * x));
  for (let volta = 0; volta < 2; volta++) {
    for (let q = 2 * n - 1; q >= 0; q--) { // para trás: de onde ainda dá para frear
      const i = q % n, j = (i + 1) % n, vj = v[j], uso = (vj * vj * Math.abs(k[j])) / aLat;
      const a = naTabela(cap.freio, cap.passoV, vj) * freioK * piso(uso), lim = Math.sqrt(vj * vj + 2 * a * ds[i]);
      if (lim < v[i]) v[i] = lim;
    }
    if (!op.soFreio) for (let q = 0; q < 2 * n; q++) { // para a frente: até onde dá para acelerar (só para comparar linhas: o carro real acelera o que o motor der)
      const i = q % n, j = (i + 1) % n, vi = v[i], uso = (vi * vi * Math.abs(k[i])) / aLat;
      const lim = Math.sqrt(vi * vi + 2 * naTabela(cap.acel, cap.passoV, vi) * piso(0.6 * uso) * ds[i]);
      if (lim < v[j]) v[j] = lim;
    }
  }
  let t = 0; for (let i = 0; i < n; i++) t += (2 * ds[i]) / Math.max(1, v[i] + v[(i + 1) % n]);
  return { v, t };
}

// A curvatura com sinal (1/u) e o comprimento de cada trecho do caminho `lat` sobre os pontos da pista.
function geometria(pts, lat, m = 3, k = new Float64Array(pts.length), ds = new Float64Array(pts.length)) {
  const n = pts.length, X = new Float64Array(n), Y = new Float64Array(n);
  for (let i = 0; i < n; i++) { X[i] = pts[i].x - pts[i].ty * lat[i]; Y[i] = pts[i].y + pts[i].tx * lat[i]; }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n; ds[i] = Math.hypot(X[j] - X[i], Y[j] - Y[i]);
    const a = (i - m + n) % n, b = (i + m) % n, ax = X[i] - X[a], ay = Y[i] - Y[a], bx = X[b] - X[i], by = Y[b] - Y[i], cx = X[b] - X[a], cy = Y[b] - Y[a];
    const den = Math.hypot(ax, ay) * Math.hypot(bx, by) * Math.hypot(cx, cy);
    k[i] = den > 1e-9 ? (2 * (ax * by - ay * bx)) / den : 0;
  }
  return { k, ds };
}

// De nós a cada `passo` pontos para a linha inteira (Catmull-Rom cíclica: curvatura contínua, sem quina).
function interpolar(nos, passo, n, lo, hi, saida = new Float64Array(n)) {
  const m = nos.length;
  for (let i = 0; i < n; i++) {
    const x = i / passo, a = Math.floor(x) % m, u = x - Math.floor(x), p0 = nos[(a - 1 + m) % m], p1 = nos[a], p2 = nos[(a + 1) % m], p3 = nos[(a + 2) % m];
    const v = 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
    saida[i] = Math.max(lo[i], Math.min(hi[i], v));
  }
  return saida;
}

const LISURA = 4;
// A linha de corrida: desce direto o tempo de volta, do grosso para o fino. Em cada nó experimenta mover para cada lado e fica com o que deu
// volta mais rápida. Começa em `inicio` (ou no meio) e mede o tempo com o mesmo modelo do ritmo.
function linhaDeCorrida(pts, lo, hi, cap, op = {}) {
  const n = pts.length, lat = new Float64Array(n), k = new Float64Array(n), ds = new Float64Array(n), sv = new Float64Array(n);
  // o tempo mais um custo pela curvatura: a linha lisa pede menos do volante e deixa o carro fluir, sem zigue-zague para ganhar milésimos
  const tempo = (l) => { geometria(pts, l, op.janela || 8, k, ds); let liso = 0; for (let i = 0; i < n; i++) liso += k[i] * k[i] * ds[i]; return perfilNoCaminho(k, ds, cap, { saida: sv }).t + (op.lisura ?? LISURA) * liso; };
  if (op.inicio) lat.set(op.inicio);
  let melhor = tempo(lat), passes = 0;
  for (const [passo, deltaIni] of op.etapas || [[32, 12], [16, 8], [8, 4]]) {
    const m = Math.floor(n / passo), nos = new Float64Array(m), tenta = new Float64Array(n);
    for (let a = 0; a < m; a++) nos[a] = lat[a * passo];
    interpolar(nos, n / m, n, lo, hi, tenta); melhor = tempo(tenta);
    for (let delta = deltaIni; delta >= 1; delta /= 2) {
      for (let volta = 0; volta < (op.voltas || 3); volta++) {
        let mudou = false;
        for (let a = 0; a < m; a++) for (const s of [1, -1]) {
          const antes = nos[a], i = Math.round((a * n) / m) % n, v = Math.max(lo[i], Math.min(hi[i], antes + s * delta));
          if (v === antes) continue;
          nos[a] = v; interpolar(nos, n / m, n, lo, hi, tenta); const t = tempo(tenta); passes++;
          if (t < melhor - 1e-5) { melhor = t; mudou = true; break; }
          nos[a] = antes;
        }
        if (!mudou) break;
      }
    }
    interpolar(nos, n / m, n, lo, hi, lat);
  }
  return { lat, tempo: melhor, passes };
}

// ---------- os comandos (120 Hz) ----------
// O volante mira a linha 0,5 a 0,6 s adiante: é o que deixa a direção fluida (mais perto, o carro oscila e bate) e rende volta mais rápida. Os pedais: a aceleração
// que falta para chegar, `antecipa` segundos adiante, à velocidade pedida ali; o gás e o freio são a fração disso sobre o que o carro dá.
const LARGURA_ESTREITA = 90; // (rua de muro colado: mirar mais perto, sem cortar a curva em cima da barreira)
const PILOTO = { olhar: 0.60, olharEstreita: 0.50, olharMin: 24, macio: 0.25, derrapa: 25, antecipa: 0.28, gasMin: 0.04, freioGanho: 1.3 };
// O jeito de um piloto, pelo perfil (corrida-estilos.js): diferenças pequenas, de décimos por volta. O ritmo base já é o limite do pneu: passar dele
// bate e perde tempo. Por isso o perfil só tira: o valor máximo chega no limite, e os outros ficam um pouco abaixo dele.
const jeitoDe = (perfil) => ({ antecipa: PILOTO.antecipa + (1 - perfil.frenagem) * 0.1, entradaK: 1 - (1 - perfil.entrada) * 0.02, rampaGas: 1.5 + perfil.retomada * 3, zebra: (perfil.zebra - 0.7) * 10, sigma: (1 - perfil.consistencia) * 0.012, erro: perfil.erro });
function comandos(c, tr, spec, latEm, vEm, saida, ctx, jeito) {
  const n = tr.n, i = c.idx, v = Math.max(c.v, 25), p = ctx.p;
  // Mira um ponto da linha adiante, como quem olha para onde vai: a guinada sai do arco até ele, sem correções a cada vértice da pista.
  const Ld = Math.max(PILOTO.olharMin, v * (tr.W <= LARGURA_ESTREITA ? PILOTO.olharEstreita : PILOTO.olhar)); let j = i, acc = 0; while (acc < Ld) { j = (j + 1) % n; acc += STEP; }
  const q = tr.pts[j], la = latEm(j), tx = q.x + q.nx * la, ty = q.y + q.ny * la, rumo = c.v > 20 ? Math.atan2(c.vy, c.vx) : c.a;
  let e = Math.atan2(ty - c.y, tx - c.x) - rumo; e = Math.atan2(Math.sin(e), Math.cos(e));
  const alvoR = (2 * Math.sin(e) / Ld) * v, ant = c.rPiloto ?? alvoR, r = ant + (alvoR - ant) * PILOTO.macio; c.rPiloto = r;
  if (c.amb && c.amb.pn && c.amb.pn.arcade) saida.steer = D.volanteParaGuinada(p, Math.max(0, c.v), r);
  else {
    const vm = Math.max(0, c.v) * D.ESC, delta = Math.atan((p.L * r) / Math.max(v * D.ESC, 1)), dm = D.volanteMaximo(p, vm);
    saida.steer = Math.max(-1, Math.min(1, delta / dm));
  }
  // os pedais
  const ds = Math.max(STEP, c.v * (jeito ? jeito.antecipa : PILOTO.antecipa)), jv = (i + Math.ceil(ds / STEP)) % n, vAlvo = Math.min(vEm(jv), ctx.teto ?? Infinity);
  const querA = (vAlvo * vAlvo - c.v * c.v) / (2 * ds);
  const maxG = Math.max(1, naTabela(ctx.cap.acel, ctx.cap.passoV, c.v)), maxF = Math.max(1, naTabela(ctx.cap.freio, ctx.cap.passoV, c.v));
  if (querA >= 0) { saida.gas = Math.min(1, querA / maxG + (c.v < vAlvo ? PILOTO.gasMin : 0)); saida.brake = 0; if (saida.gas < PILOTO.gasMin) saida.gas = 0; }
  else { const f = (-querA / maxF) * PILOTO.freioGanho; saida.gas = 0; saida.brake = f < 0.06 ? 0 : Math.min(1, f); }
  if (jeito) { saida.gas = Math.min(saida.gas, (c.gasPiloto || 0) + jeito.rampaGas * D.PASSO); c.gasPiloto = saida.gas; } // a retomada do acelerador é do jeito de cada um
  if (saida.gas && c.slip > PILOTO.derrapa) saida.gas *= Math.max(0.25, PILOTO.derrapa / c.slip); // escorregando: alivia até o pneu voltar a pegar
  saida.ers = 0; saida.respawn = 0; saida.pedido = null; saida.marcha = 0;
  return saida;
}

// ---------- as linhas prontas ----------
// O cálculo leva dezenas de segundos por pista: `ferramentas/gerar-linhas-f1.js` faz uma vez e guarda os nós em corrida-linhas-f1.json.
const JANELA_RITMO = 16; // (o ritmo mede a curvatura em ±96 u: mirando adiante, o carro faz um arco mais suave que a linha)
const JANELA_K = 5; // a curvatura medida em ±30 u: o carro não segue cada vértice da linha central
let ARQUIVO = null;
function arquivoDeLinhas() { if (!ARQUIVO) { try { ARQUIVO = require("./corrida-linhas-f1.json"); } catch (e) { ARQUIVO = {}; } } return ARQUIVO; }
const CAP_LINHA = (spec, ref) => capacidade(spec, { rel: ref.rel, ext: { freio: ref.freio, grip: ref.grip, tracao: ref.tracao, potencia: 1.12 } });
function calcularLinha(t, pts, spec, ref, op = {}) {
  const { lo, hi } = limitesDaPista(t, pts), cap = CAP_LINHA(spec, ref);
  const inicio = Linha.otimizar(pts, { lo, hi }, op.externas ?? 500); // a curvatura mínima é a base: abre, encosta no ápice e sai abrindo
  return linhaDeCorrida(pts, lo, hi, cap, { janela: JANELA_K, inicio, etapas: [[8, 4]], ...op }).lat;
}
// A linha da pista (Float64Array por ponto): do arquivo, se está lá e bate com o traçado; senão, calcula uma versão rápida.
function linhaDaPista(pista, t, pts, spec, ref) {
  const salvo = arquivoDeLinhas()[pista], n = pts.length, { lo, hi } = limitesDaPista(t, pts);
  if (salvo && salvo.n === n) { const m = salvo.nos.length, nos = Float64Array.from(salvo.nos); return interpolar(nos, n / m, n, lo, hi); }
  return calcularLinha(t, pts, spec, ref, { etapas: [], externas: 40 });
}
const temLinhaPronta = (pista, n) => { const a = arquivoDeLinhas()[pista]; return !!a && a.n === n; };
// O ritmo de um nível `f` sobre o caminho `lat` (índice da pista): o `f` multiplica a velocidade de curva e a frenagem usada.
function perfilDoNivel(pts, lat, spec, ref, f) {
  const g = geometria(pts, lat, JANELA_RITMO), cap = CAP_LINHA(spec, ref);
  return perfilNoCaminho(g.k, g.ds, cap, { latK: f * f, freioK: Math.min(1, f), soFreio: true }).v;
}
// O que os comandos precisam de um perfil, calculado uma vez
function contexto(spec, ref) {
  return { p: D.parametros(spec), cap: CAP_LINHA(spec, ref), teto: Infinity };
}

module.exports = { MARGEM_MURO, PILOTO, JANELA_K, limitesDaPista, capacidade, perfilNoCaminho, geometria, linhaDeCorrida, calcularLinha, linhaDaPista, temLinhaPronta, perfilDoNivel, contexto, jeitoDe, comandos, naTabela };
