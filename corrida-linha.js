// Corrida da Galera — a linha de corrida dos robôs, calculada por otimização sobre os pontos da pista.
// O caminho de cada pista é o de CURVATURA MÍNIMA entre as beiras (menos a folga do carro): minimiza a soma dos quadrados da segunda
// diferença do caminho (a curvatura vezes o passo ao quadrado). Isso dá a linha de corrida de verdade: abre no lado de fora antes
// da curva, encosta na zebra de dentro no ápice e sai abrindo até o lado de fora mais distante; curvas em sequência (chicanes, esses)
// saem resolvidas juntas, porque o problema é um só para a volta inteira. Com a pista de sempre (pontos de 6 em 6 u) o problema é um
// QP convexo na posição lateral de cada ponto: resolvido por gradiente conjugado nos pontos livres, prendendo nas beiras os que
// passam do limite (conjunto ativo), uma vez por pista (o resultado fica em cache).
"use strict";
const CACHE = new Map();
// pts: [{ x, y, tx, ty }] da pista (cíclica); max: o maior deslocamento lateral do centro do carro (u). Devolve Float64Array(lat).
function otimizar(pts, max) {
  const n = pts.length, nx = new Float64Array(n), ny = new Float64Array(n), cx = new Float64Array(n), cy = new Float64Array(n);
  for (let i = 0; i < n; i++) { nx[i] = -pts[i].ty; ny[i] = pts[i].tx; cx[i] = pts[i].x; cy[i] = pts[i].y; }
  const dx = new Float64Array(n), dy = new Float64Array(n);
  // o gradiente de J(l) = soma |d_i|^2, d_i = X[i-1] - 2 X[i] + X[i+1], X = centro + normal * l
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
  const l = new Float64Array(n), prisao = new Int8Array(n); // prisao: 0 livre, +1/-1 preso na beira
  const g = new Float64Array(n), g0 = new Float64Array(n), r = new Float64Array(n), p = new Float64Array(n), Ap = new Float64Array(n), tmp = new Float64Array(n);
  grad(l, g0); // g(l) = A l + g0 (a função é quadrática)
  const A = (v, out) => { grad(v, tmp); for (let i = 0; i < n; i++) out[i] = tmp[i] - g0[i]; };
  for (let externa = 0; externa < 40; externa++) {
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
      for (let i = 0; i < n; i++) if (!prisao[i] && p[i] !== 0) { const alvo = p[i] > 0 ? max : -max, t = (alvo - l[i]) / p[i]; if (t < tmax) { tmax = t; qual = i; } }
      for (let i = 0; i < n; i++) if (!prisao[i]) { l[i] += tmax * p[i]; r[i] -= tmax * Ap[i]; }
      if (qual >= 0) { prisao[qual] = p[qual] > 0 ? 1 : -1; l[qual] = prisao[qual] * max; break; }
      for (let i = 0; i < n; i++) rr2 += r[i] * r[i];
      const beta = rr2 / rr; rr = rr2;
      for (let i = 0; i < n; i++) p[i] = prisao[i] ? 0 : r[i] + beta * p[i];
    }
    // prende os que passaram, solta os presos cujo gradiente puxa para dentro
    let mudou = false;
    for (let i = 0; i < n; i++) if (!prisao[i] && Math.abs(l[i]) > max) { l[i] = Math.sign(l[i]) * max; prisao[i] = Math.sign(l[i]); mudou = true; }
    grad(l, g);
    for (let i = 0; i < n; i++) if (prisao[i] && g[i] * prisao[i] > 0) { prisao[i] = 0; mudou = true; } // o gradiente de J cresce para fora: volta para dentro
    if (!mudou && externa > 0) break;
  }
  return l;
}
function linhaDaPista(pista, pts, W, folga = 18) {
  const k = pista + "|" + folga; if (CACHE.has(k)) return CACHE.get(k);
  const lat = otimizar(pts, Math.max(4, W / 2 - folga)); CACHE.set(k, lat); return lat;
}
module.exports = { otimizar, linhaDaPista };
