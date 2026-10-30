// Traçado fiel de Mônaco para a Corrida: parte da linha central real (em metros, x leste e y sul, a linha de chegada no primeiro ponto) e
// devolve os vértices [x, y, raio] de pistas.js. Diferente de ferramentas/circuitos-f1.js (que alisa a volta inteira, milhares de vezes,
// e arredonda as chicanes), aqui o traçado só se mexe onde precisa:
//   1. a spline passa por todos os pontos reais (Catmull-Rom centrípeta) e a linha só é alisada de leve;
//   2. onde dois trechos ficariam mais perto do que a pista larga do jogo permite (o grampo do Fairmont, a Piscine), os dois se afastam;
//   3. onde o raio ficaria menor que o muro (meia largura + muro), aquele pedaço, e só ele, abre;
//   4. os vértices são as INTERSEÇÕES DAS TANGENTES da linha (a cada ~30° de curva), com o raio medido: o arco de pistas.js reproduz a
//      curva real, em vez de passar vértices em cima dela, que encolhe o raio.
// Tudo no quadrado de 1600 do jogo, como os outros traçados.
"use strict";
const T = require("../public/corrida/pistas.js");

const PASSO = 3, WORLD = 1600, CABE = 1300;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function reamostrar(P, passo) {
  const out = [P[0]]; let falta = passo;
  for (let i = 0; i < P.length; i++) {
    let a = P[i]; const b = P[(i + 1) % P.length]; let seg = dist(a, b);
    while (seg >= falta) { const t = falta / seg; a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; out.push(a); seg -= falta; falta = passo; }
    falta -= seg;
  }
  if (dist(out[out.length - 1], out[0]) < passo * 0.5) out.pop();
  return out;
}
// Catmull-Rom centrípeta fechada: passa por todos os pontos reais e não faz laço
function spline(P, passo) {
  const n = P.length, fina = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    const t01 = Math.sqrt(dist(p0, p1)) || 1e-6, t12 = Math.sqrt(dist(p1, p2)) || 1e-6, t23 = Math.sqrt(dist(p2, p3)) || 1e-6;
    const m1 = [0, 1].map((k) => (p2[k] - p1[k] + t12 * ((p1[k] - p0[k]) / t01 - (p2[k] - p0[k]) / (t01 + t12)))), m2 = [0, 1].map((k) => (p2[k] - p1[k] + t12 * ((p3[k] - p2[k]) / t23 - (p3[k] - p1[k]) / (t12 + t23))));
    const m = Math.max(2, Math.ceil(dist(p1, p2) / 1));
    for (let s = 0; s < m; s++) {
      const t = s / m, t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      fina.push([0, 1].map((k) => h00 * p1[k] + h10 * m1[k] + h01 * p2[k] + h11 * m2[k]));
    }
  }
  return reamostrar(fina, passo);
}
function alisar(P, vezes, forca, so) {
  const n = P.length;
  for (let v = 0; v < vezes; v++) {
    const Q = P.map((p) => p.slice());
    for (let i = 0; i < n; i++) { if (so && !so[i]) continue; const a = P[(i - 1 + n) % n], b = P[(i + 1) % n]; Q[i] = [P[i][0] + forca * ((a[0] + b[0]) / 2 - P[i][0]), P[i][1] + forca * ((a[1] + b[1]) / 2 - P[i][1])]; }
    for (let i = 0; i < n; i++) P[i] = Q[i];
  }
}
function raios(P, d) {
  const n = P.length;
  return P.map((p, i) => { const a = P[(i - d + n) % n], b = P[(i + d) % n], cruz = (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]); return Math.abs(cruz) < 1e-9 ? Infinity : (dist(a, p) * dist(p, b) * dist(a, b)) / (2 * Math.abs(cruz)); });
}
function encostados(P, folga, gap) {
  const n = P.length, grade = new Map(), pares = [];
  P.forEach((p, i) => { const k = `${Math.floor(p[0] / folga)},${Math.floor(p[1] / folga)}`; if (!grade.has(k)) grade.set(k, []); grade.get(k).push(i); });
  P.forEach((p, i) => {
    const cx = Math.floor(p[0] / folga), cy = Math.floor(p[1] / folga);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grade.get(`${cx + dx},${cy + dy}`) || []) {
      if (j <= i) continue; const sep = Math.min(j - i, n - (j - i));
      if (sep > gap) { const d = dist(p, P[j]); if (d < folga) pares.push([i, j, d]); }
    }
  });
  return pares;
}

// afasta os trechos que se tocariam e abre só os pedaços fechados demais
function refinar(P, { folga, gap, raioMin, passadas }) {
  const n = P.length; let voltas = 0;
  for (; voltas < passadas; voltas++) {
    const pares = encostados(P, folga, gap), rr = raios(P, 4), fechada = rr.map((r) => r < raioMin);
    if (!pares.length && !fechada.some(Boolean)) break;
    const mov = P.map(() => [0, 0]);
    for (const [i, j, d] of pares) { const ux = (P[j][0] - P[i][0]) / (d || 1), uy = (P[j][1] - P[i][1]) / (d || 1), f = (folga * 1.04 - d) * 0.25; mov[i][0] -= ux * f; mov[i][1] -= uy * f; mov[j][0] += ux * f; mov[j][1] += uy * f; }
    const larg = 10, esp = P.map(() => [0, 0]), tocou = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (mov[i][0] || mov[i][1]) for (let k = -larg; k <= larg; k++) { const w = 1 - Math.abs(k) / (larg + 1), q = (i + k + n) % n; esp[q][0] += mov[i][0] * w; esp[q][1] += mov[i][1] * w; tocou[q] = 1; }
    for (let i = 0; i < n; i++) { const m = Math.hypot(esp[i][0], esp[i][1]), s = m > 3 ? 3 / m : 1; P[i] = [P[i][0] + esp[i][0] * s, P[i][1] + esp[i][1] * s]; }
    const so = new Uint8Array(n); for (let i = 0; i < n; i++) if (fechada[i]) for (let k = -4; k <= 4; k++) so[(i + k + n) % n] = 1;
    for (let i = 0; i < n; i++) if (tocou[i]) so[i] = 1;
    alisar(P, 1, 0.5, so);
  }
  return voltas;
}

// os vértices [x, y, raio] (no quadrado de 1600) pelas tangentes: a linha inteira é cortada em peças de no máximo ~17° de giro ou 150 unidades;
// cada peça vira um vértice na interseção das tangentes das duas pontas (a aresta passa pelo ponto de quebra, na direção da pista) com o raio medido
function vertices(P, scale, raioMin, retaPerto) {
  const n = P.length, w = 6;
  const ang = P.map((p, i) => { const a = P[(i - w + n) % n], b = P[(i + w) % n]; return Math.atan2(b[1] - a[1], b[0] - a[0]); });
  const giro = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  const cruza = (p, ap, q, aq) => { const dx = Math.cos(ap), dy = Math.sin(ap), ex = Math.cos(aq), ey = Math.sin(aq), den = dx * ey - dy * ex; if (Math.abs(den) < 1e-6) return null; const t = ((q[0] - p[0]) * ey - (q[1] - p[1]) * ex) / den; return [p[0] + dx * t, p[1] + dy * t]; };
  // as quebras: um ponto a cada 0,3 rad de giro ou 150 unidades (o anel começa no ponto 0)
  const quebras = [0]; let acc = 0, comp = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; acc += giro(ang[i], ang[j]); comp += PASSO; if ((Math.abs(acc) >= 0.3 || comp >= 150) && i + 1 < n - 6) { quebras.push(i + 1); acc = 0; comp = 0; } }
  quebras.push(n);
  let pecas = []; for (let q = 0; q + 1 < quebras.length; q++) pecas.push([quebras[q] % n, quebras[q + 1] % n]);
  const faz = ([ia, ib]) => {
    const pa = P[ia], pb = P[ib], d = giro(ang[ia], ang[ib]); if (Math.abs(d) < 0.012) return null;
    const corda = dist(pa, pb); let V = cruza(pa, ang[ia], pb, ang[ib]);
    // a interseção só vale se as duas pernas são curtas (o rumo suavizado pode errar numa curva rápida): senão, o meio da corda
    let ok = true; if (!V || dist(V, pa) > 0.8 * corda || dist(V, pb) > 0.8 * corda) { V = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2]; ok = false; }
    const r0 = ok ? ((dist(V, pa) + dist(V, pb)) / 2) / Math.tan(Math.abs(d) / 2) : corda / (2 * Math.sin(Math.abs(d) / 2)), r = Math.max(r0, raioMin);
    return { p: V, r, t: r * Math.tan(Math.abs(d) / 2), pos: ia, ia, ib };
  };
  // duas curvas seguidas cujas tangentes não cabem na aresta entre os vértices encolheriam o raio (pistas.js limita a tangente a 49% da aresta): viram uma peça só
  let verts = [];
  for (let passada = 0; passada < 12; passada++) {
    verts = pecas.map(faz).filter(Boolean);
    let mudou = false; const novas = [], usados = new Set();
    for (let j = 0; j < verts.length; j++) {
      const a1 = verts[j], b1 = verts[(j + 1) % verts.length]; if (usados.has(j) || (j + 1 === verts.length)) continue;
      const junto = Math.abs(giro(ang[a1.ia], ang[b1.ib])), corda = dist(P[a1.ia], P[b1.ib]);
      if (a1.t + b1.t > dist(a1.p, b1.p) * 0.98 && a1.r < 400 && b1.r < 400 && junto < 1.25 && corda < 200) { usados.add(j); usados.add(j + 1); novas.push([a1.ia, b1.ib]); mudou = true; }
    }
    if (!mudou) break;
    // refaz a lista de peças: as peças cobertas pelas fusões somem e entra a peça maior
    const fundidas = novas.map(([ia, ib]) => [pecas.findIndex((p) => p[0] === ia), pecas.findIndex((p) => p[1] === ib)]);
    const sai = new Set(); for (const [i0, i1] of fundidas) for (let k = i0; k <= i1; k++) sai.add(k);
    const outras = []; pecas.forEach((p, k) => { if (!sai.has(k)) outras.push([k, p]); }); for (const [i0, i1] of fundidas) outras.push([i0, [pecas[i0][0], pecas[i1][1]]]);
    pecas = outras.sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  }
  return verts.map(({ p, r, pos }) => { let rr = Math.max(r, raioMin); if (rr > 1400 || retaPerto(pos)) rr = 0; return { x: p[0] / scale, y: p[1] / scale, r: rr / scale, pos }; });
}

// a conversão inteira. M: pontos reais em metros (x leste, y sul), o primeiro é a linha de chegada. volta: o comprimento da volta no jogo.
exports.ajustarTracado = function ({ M, volta, largura = 104, muro = 14, raioMin, passadas = 3000 }) {
  const per = M.reduce((s, p, i) => s + dist(p, M[(i + 1) % M.length]), 0), k = volta / per;
  const P = spline(M.map(([x, y]) => [x * k, y * k]), PASSO);
  alisar(P, 3, 0.4);
  const folga = largura + 2 * muro + 8, gap = Math.ceil((folga * 2.2) / PASSO) + 4, rmin = raioMin ?? largura / 2 + muro - 6;
  const voltas = refinar(P, { folga, gap, raioMin: rmin, passadas });
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const scale = Math.ceil((Math.max(x1 - x0, y1 - y0) / CABE) * 100) / 100, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const Q = P.map(([x, y]) => [WORLD / 2 * scale + (x - cx), WORLD / 2 * scale + (y - cy)]); // em unidades do mundo
  const n = Q.length, retaPerto = (i) => Math.min(i, n - i) * PASSO < 520; // a linha de chegada está no ponto 0
  const verts = vertices(Q, scale, rmin, retaPerto);
  // o primeiro vértice é a linha de chegada (ponto 0 da linha); os outros seguem na ordem da volta
  verts.sort((a, b) => a.pos - b.pos);
  const vert = [[Q[0][0] / scale, Q[0][1] / scale, 0], ...verts.map((v) => [v.x, v.y, v.r])];
  return { vert, scale, k, cx, cy, voltas, linha: Q };
};

// onde a largada cai na reta mais comprida: `largada` de pistas.js (a linha de chegada é o vértice 0) e quantas unidades de reta há atrás e à frente dela
exports.largadaDe = function (vert, scale) {
  const pts = T.sample(vert.map(([x, y, r]) => [x * scale, y * scale, r * scale]), 6), n = pts.length;
  let best = 0, bestIni = 0, run = 0, runIni = 0;
  for (let k = 0; k < 2 * n; k++) { if (!pts[k % n].k) { if (!run) runIni = k; run++; if (run > best && run < n) { best = run; bestIni = runIni; } } else run = 0; }
  const desl = ((n - bestIni) % n + n) % n;
  return { largada: best && desl < best ? Math.min(0.995, (desl + 0.5) / best) : null, atras: desl * 6, adiante: (best - desl) * 6, volta: n * 6 };
};
