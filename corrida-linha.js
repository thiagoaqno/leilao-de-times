"use strict";
const CACHE = new Map();
// pts: [{ x, y, tx, ty }] da pista (cíclica); max: o maior deslocamento lateral do centro do carro (u), um número ou um Float64Array por ponto (Baku: a pista estreita
// entre as barreiras da Cidade Velha). Devolve Float64Array(lat).
function otimizar(pts, max0) {
  const M = typeof max0 === "number" ? () => max0 : (i) => max0[i];
  const n = pts.length, nx = new Float64Array(n), ny = new Float64Array(n), cx = new Float64Array(n), cy = new Float64Array(n);
  for (let i = 0; i < n; i++) { nx[i] = -pts[i].ty; ny[i] = pts[i].tx; cx[i] = pts[i].x; cy[i] = pts[i].y; }
  const dx = new Float64Array(n), dy = new Float64Array(n);
  const grad = (l, g) => {
    for (let i = 0; i < n; i++) {
      const a = (i - 1 + n) % n, b = (i + 1) % n;
      dx[i] = (cx[a] + nx[a] * l[a]) - 2 * (cx[i] + nx[i] * l[i]) + (cx[b] + nx[b] * l[b]);
      dy[i] = (cy[a] + ny[a] * l[a]) - 2 * (cy[i] + ny[i] * l[i]) + (cy[b] + ny[b] * l[b]);
    }
    for (let j = 0; j < n; j++) {
      const a = (j - 1 + n) % n, b = (j + 1) % n;
      g[j] = 2 * (nx[j] * (dx[a] + dx[b] - 2 * dx[j]) + ny[j] * (dy[a] + dy[b] - 2 * dy[j]));
    }
  };
  const l = new Float64Array(n), prisao = new Int8Array(n);
  const g = new Float64Array(n), g0 = new Float64Array(n), r = new Float64Array(n), p = new Float64Array(n), Ap = new Float64Array(n), tmp = new Float64Array(n);
  const lAntes = new Float64Array(n);
  grad(l, g0);
  const A = (v, out) => { grad(v, tmp); for (let i = 0; i < n; i++) out[i] = tmp[i] - g0[i]; };
  // ---------- item 3: a convergência do otimizador ----------
  // O diagnóstico da linha de corrida ("fica perto do meio") vem daqui. O algoritmo é de conjunto ativo:
  // a cada iteração externa, resolve o QP nos pontos livres (por gradiente conjugado) e prende na beira
  // os que ultrapassaram, ou solta os que o gradiente puxa para dentro. O limite de 40 iterações externas
  // era curto demais: em Mônaco, com pontos de 6 u e curvas fechadas, há 100-200 pontos que precisam ficar
  // presos na beira para a linha abrir de verdade. Com 40, só uns 40 pontos chegavam lá, e a linha ficava
  // perto do meio (o sintoma que o diagnóstico descreve).
  //
  // As mudanças são duas, ambas dentro do otimizador (a assinatura continua a mesma, então o worker e o
  // caminho síncrono seguem funcionando):
  //  1) o limite externo vai para `min(4 * n, 500)` (12,5x mais que antes; cabe nas ~200-300 iterações que
  //     Mônaco precisa, com folga para o resto);
  //  2) a convergência passa a exigir DUAS coisas: o conjunto ativo estável (nenhum ponto mudou de preso/livre)
  //     E a solução estável (a maior variação de `lat` entre iterações é < 1e-3 u). O `!mudou` sozinho
  //     poderia parar em ciclo de active set (prende, solta, prende, solta); o `maxDelta` sozinho poderia
  //     parar com a solução ainda se movendo dentro do mesmo conjunto ativo. Os dois juntos cobrem os dois.
  //
  // O CG de dentro continua com `4 * n` iterações máximas e a tolerância de antes: cada subproblema (os pontos
  // livres) já converge bem apertado; o que faltava era o conjunto ativo ter tempo de estabilizar.
  const MAX_EXTERNA = Math.min(4 * n, 500);
  for (let externa = 0; externa < MAX_EXTERNA; externa++) {
    let mudou = false;
    lAntes.set(l);
    // gradiente conjugado nos pontos livres: min 1/2 d·A d + g·d com d só nos livres
    grad(l, g);
    for (let i = 0; i < n; i++) { r[i] = prisao[i] ? 0 : -g[i]; p[i] = r[i]; }
    let rr = 0; for (let i = 0; i < n; i++) rr += r[i] * r[i];
    const rr0 = rr;
    for (let it = 0; it < 4 * n && rr > 1e-14 * Math.max(1, rr0); it++) {
      A(p, Ap); for (let i = 0; i < n; i++) if (prisao[i]) Ap[i] = 0;
      let pAp = 0; for (let i = 0; i < n; i++) pAp += p[i] * Ap[i];
      if (!(pAp > 1e-30)) break;
      const alfa = rr / pAp; let rr2 = 0;
      // passo até a beira mais próxima (se algum ponto passa do limite, para ali e prende)
      let tmax = alfa, qual = -1;
      for (let i = 0; i < n; i++) if (!prisao[i] && p[i] !== 0) { const alvo = p[i] > 0 ? M(i) : -M(i), t = (alvo - l[i]) / p[i]; if (t < tmax) { tmax = t; qual = i; } }
      for (let i = 0; i < n; i++) if (!prisao[i]) { l[i] += tmax * p[i]; r[i] -= tmax * Ap[i]; }
      if (qual >= 0) { prisao[qual] = p[qual] > 0 ? 1 : -1; l[qual] = prisao[qual] * M(qual); mudou = true; break; }
      for (let i = 0; i < n; i++) rr2 += r[i] * r[i];
      const beta = rr2 / rr; rr = rr2;
      for (let i = 0; i < n; i++) p[i] = prisao[i] ? 0 : r[i] + beta * p[i];
    }
    // prende os que passaram, solta os presos cujo gradiente puxa para dentro
    for (let i = 0; i < n; i++) if (!prisao[i] && Math.abs(l[i]) > M(i)) { l[i] = Math.sign(l[i]) * M(i); prisao[i] = Math.sign(l[i]); mudou = true; }
    grad(l, g);
    for (let i = 0; i < n; i++) if (prisao[i] && g[i] * prisao[i] > 0) { prisao[i] = 0; mudou = true; } // o gradiente de J cresce para fora: volta para dentro
    // convergência: o conjunto ativo não mudou E a solução não se moveu o bastante para valer a pena continuar
    if (!mudou) {
      let maxDelta = 0;
      for (let i = 0; i < n; i++) { const d = Math.abs(l[i] - lAntes[i]); if (d > maxDelta) maxDelta = d; }
      if (maxDelta < 1e-3) break;
    }
  }
  return l;
}
function linhaDaPista(pista, pts, W, folga = 18) {
  const k = pista + "|" + folga; if (CACHE.has(k)) return CACHE.get(k);
  const lat = otimizar(pts, Math.max(4, W / 2 - folga)); CACHE.set(k, lat); return lat;
}
module.exports = { otimizar, linhaDaPista };
