#!/usr/bin/env node
// Conversor dos circuitos de F1 do repositório bacinger/f1-circuits (https://github.com/bacinger/f1-circuits, GeoJSON,
// licença MIT) para o formato de pista da Corrida (public/corrida/pistas.js). Roda uma vez por pista e imprime o bloco
// da pista para colar em PISTAS:
//
//   node ferramentas/circuitos-f1.js be-1925 --id spa --nome "Spa-Francorchamps"
//
// O que faz: baixa circuits/<id>.geojson (a linha central do circuito, começando na linha de chegada e no sentido da
// corrida), projeta as coordenadas em metros, escolhe o tamanho da volta no jogo pelo comprimento real (as nossas voltas
// têm uns 13 mil; as pistas maiores, um pouco mais), alisa a linha, afasta os trechos que ficariam encostados (a nossa
// pista é bem mais larga que a real, então duas retas a 40 m uma da outra se tocariam), põe tudo no quadrado de 1600 e
// simplifica a linha em vértices [x, y, raio]: reta = raio 0, curva = o raio que casa com a curva real. A linha de
// chegada fica no vértice 0 e `largada` aponta para ela. O relevo (`hills`) vem da altitude real de 100 pontos da volta
// (a API de elevação do Open-Meteo, dados Copernicus DEM); com --sem-relevo, sai plano.
//
// Opções: --volta 15500 (comprimento da volta no jogo) · --largura 120 · --rua (guard-rail colado: walls e muro)
// · --tol 1 (quanto os vértices podem se afastar da linha alisada, no quadrado de 1600) · --sem-relevo
// · --arquivo x.geojson (lê do disco em vez de baixar) · --svg x.svg (o desenho do traçado, para conferir)
// · --inverter (se o arquivo vier no sentido contrário ao da corrida) · --raio-min 90 (abre as curvas mais fechadas que isso:
// os caracóis e grampos longos, como o de Xangai, deixam a volta lenta demais na nossa pista larga)
"use strict";
const fs = require("fs");
const path = require("path");
const { sample } = require("../public/corrida/pistas.js");

const LICENCA = `Traçado convertido de bacinger/f1-circuits (https://github.com/bacinger/f1-circuits) por ferramentas/circuitos-f1.js.
MIT License. Copyright (c) 2019-2025 Tomislav Bacinger
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and
this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

const WORLD = 1600, CABE = 1300; // o traçado ocupa até 1300 do quadrado de 1600 (sobra margem para o cenário)
const PASSO = 3; // a linha fina, de 3 em 3 unidades do mundo
const RAIO_MIN = 62; // o menor raio de curva (unidades do mundo): menor que isso, a borda de dentro dobra sobre si (--raio-min muda)

function opcoes(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { o._.push(a); continue; }
    const k = a.slice(2), v = argv[i + 1];
    if (["rua", "sem-relevo", "inverter"].includes(k)) o[k] = true;
    else { o[k] = v; i++; }
  }
  return o;
}

async function lerGeojson(id, arquivo) {
  if (arquivo) return JSON.parse(fs.readFileSync(arquivo, "utf8"));
  const url = `https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits/${id}.geojson`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`não achei ${url} (${r.status})`);
  return r.json();
}

// a linha do circuito em [lon, lat] (a mais comprida, se o arquivo tiver várias), sem repetir o ponto final
function linhaDo(geo) {
  const feats = geo.type === "FeatureCollection" ? geo.features : [geo];
  let melhor = null, props = {};
  for (const f of feats) {
    const g = f.geometry || f, linhas = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : g.type === "Polygon" ? [g.coordinates[0]] : [];
    for (const l of linhas) if (!melhor || l.length > melhor.length) { melhor = l; props = f.properties || {}; }
  }
  if (!melhor) throw new Error("o arquivo não tem nenhuma linha");
  const c = melhor.map(([lon, lat]) => [lon, lat]);
  const [a, b] = [c[0], c[c.length - 1]];
  if (Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7) c.pop();
  return { coords: c, props };
}

// projeção local em metros (equiretangular no centro do circuito): x para o leste, y para o sul (o norte fica em cima)
function projetar(coords) {
  const R = 6371008.8, lat0 = coords.reduce((s, c) => s + c[1], 0) / coords.length, lon0 = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const kx = (Math.PI / 180) * R * Math.cos((lat0 * Math.PI) / 180), ky = (Math.PI / 180) * R;
  return coords.map(([lon, lat]) => [(lon - lon0) * kx, -(lat - lat0) * ky]);
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const perimetro = (P) => P.reduce((s, p, i) => s + dist(p, P[(i + 1) % P.length]), 0);

// Catmull-Rom centrípeta fechada pelos pontos reais (passa por todos eles e não faz laço), e reamostra de `passo` em `passo`
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

// a linha fechada com pontos a cada `passo` (o primeiro fica no lugar)
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

function alisar(P, vezes, forca = 0.5, so = null) {
  const n = P.length;
  for (let v = 0; v < vezes; v++) {
    const Q = P.map((p) => p.slice());
    for (let i = 0; i < n; i++) {
      if (so && !so[i]) continue;
      const a = P[(i - 1 + n) % n], b = P[(i + 1) % n];
      Q[i] = [P[i][0] + forca * ((a[0] + b[0]) / 2 - P[i][0]), P[i][1] + forca * ((a[1] + b[1]) / 2 - P[i][1])];
    }
    for (let i = 0; i < n; i++) P[i] = Q[i];
  }
  return P;
}

// raio da linha em cada ponto (pelo círculo que passa no ponto e nos vizinhos a `d` pontos de distância)
function raios(P, d) {
  const n = P.length;
  return P.map((p, i) => {
    const a = P[(i - d + n) % n], b = P[(i + d) % n];
    const cruz = (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]);
    return Math.abs(cruz) < 1e-9 ? Infinity : (dist(a, p) * dist(p, b) * dist(a, b)) / (2 * Math.abs(cruz));
  });
}

// trechos que ficariam encostados: pares de pontos longe na volta (mais de `gap` pontos) e a menos de `folga`
function encostados(P, folga, gap, cruza = []) {
  const n = P.length, cel = folga, grade = new Map(), pares = [], zona = Math.ceil((folga * 2) / PASSO);
  const perto = (a, b) => Math.min(Math.abs(a - b), n - Math.abs(a - b)) < zona;
  const perdoa = (i, j) => cruza.some(([a, b]) => (perto(i, a) && perto(j, b)) || (perto(i, b) && perto(j, a)));
  P.forEach((p, i) => { const k = `${Math.floor(p[0] / cel)},${Math.floor(p[1] / cel)}`; if (!grade.has(k)) grade.set(k, []); grade.get(k).push(i); });
  P.forEach((p, i) => {
    const cx = Math.floor(p[0] / cel), cy = Math.floor(p[1] / cel);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grade.get(`${cx + dx},${cy + dy}`) || []) {
      if (j <= i) continue;
      const sep = Math.min(j - i, n - (j - i));
      if (sep > gap && !perdoa(i, j)) { const d = dist(p, P[j]); if (d < folga) pares.push([i, j, d]); }
    }
  });
  return pares;
}

// onde a linha passa por cima de si mesma (Suzuka, o oito): [i, j] = os índices dos dois trechos que se cruzam
function cruzamentos(P) {
  const n = P.length, out = [];
  const corta = (a, b, c, d) => { const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]); if (!den) return false; const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den, u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den; return t >= 0 && t < 1 && u >= 0 && u < 1; };
  for (let i = 0; i < n; i++) for (let j = i + 3; j < n - (i < 3 ? 3 - i : 0); j++) if (corta(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n])) out.push([i, j]);
  return out;
}

// afasta os trechos encostados, aos poucos, alisando a linha junto para ela não entortar; e abre as curvas fechadas
// demais (raio menor que `raioMin`)
function afastar(P, folga, gap, cruza, raioMin = RAIO_MIN) {
  let pares = encostados(P, folga, gap, cruza), volta = 0;
  for (; volta < 400; volta++) {
    const rr = raios(P, 4), fechadas = rr.map((r) => r < raioMin);
    if (!pares.length && !fechadas.some(Boolean)) break;
    const mov = P.map(() => [0, 0]);
    for (const [i, j, d] of pares) {
      const ux = (P[j][0] - P[i][0]) / (d || 1), uy = (P[j][1] - P[i][1]) / (d || 1), f = (folga * 1.04 - d) * 0.25;
      mov[i][0] -= ux * f; mov[i][1] -= uy * f; mov[j][0] += ux * f; mov[j][1] += uy * f;
    }
    // espalha o empurrão pelos vizinhos (move o trecho inteiro, não um ponto só)
    const n = P.length, larg = 12, esp = P.map(() => [0, 0]);
    for (let i = 0; i < n; i++) if (mov[i][0] || mov[i][1]) for (let k = -larg; k <= larg; k++) { const w = 1 - Math.abs(k) / (larg + 1), q = esp[(i + k + n) % n]; q[0] += mov[i][0] * w; q[1] += mov[i][1] * w; }
    for (let i = 0; i < n; i++) { const m = Math.hypot(esp[i][0], esp[i][1]), lim = 6; const s = m > lim ? lim / m : 1; P[i] = [P[i][0] + esp[i][0] * s, P[i][1] + esp[i][1] * s]; }
    const abrir = fechadas.map((f, i) => f || fechadas[(i + 1) % n] || fechadas[(i - 1 + n) % n] || fechadas[(i + 2) % n] || fechadas[(i - 2 + n) % n]);
    alisar(P, 2, 0.5, abrir);
    alisar(P, 1, 0.15);
    pares = encostados(P, folga, gap, cruza);
  }
  return { voltas: volta, sobra: pares.length };
}

// Douglas-Peucker na linha fechada: os índices dos vértices (o 0 sempre entra: é a linha de chegada)
function simplificar(P, tol) {
  const n = P.length, fica = new Uint8Array(n);
  let longe = 0, dl = 0; for (let i = 1; i < n; i++) { const d = dist(P[0], P[i]); if (d > dl) { dl = d; longe = i; } }
  fica[0] = fica[longe] = 1;
  const dp = (a, b) => { // de a até b (b pode passar de n: dá a volta)
    const A = P[a % n], B = P[b % n], L = dist(A, B) || 1e-9; let pior = -1, k = -1;
    for (let i = a + 1; i < b; i++) { const p = P[i % n], d = Math.abs((B[0] - A[0]) * (A[1] - p[1]) - (A[0] - p[0]) * (B[1] - A[1])) / L; if (d > pior) { pior = d; k = i; } }
    if (pior > tol) { fica[k % n] = 1; dp(a, k); dp(k, b); }
  };
  dp(0, longe); dp(longe, n);
  // nenhum lado comprido demais (a curva leve no meio de uma reta comprida sumiria)
  const idx = []; for (let i = 0; i < n; i++) if (fica[i]) idx.push(i);
  return idx;
}

// a altitude real de pontos espalhados pela volta (Open-Meteo, Copernicus DEM), em metros
async function altitudes(lonlat) {
  const out = [];
  for (let i = 0; i < lonlat.length; i += 100) {
    const parte = lonlat.slice(i, i + 100);
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${parte.map((c) => c[1].toFixed(6)).join(",")}&longitude=${parte.map((c) => c[0].toFixed(6)).join(",")}`;
    let erro = null;
    for (let tent = 0; tent < 4; tent++) { // a API às vezes falha: tenta de novo
      try { const r = await fetch(url); if (!r.ok) throw new Error(`elevação: ${r.status}`); out.push(...(await r.json()).elevation); erro = null; break; }
      catch (e) { erro = e; await new Promise((ok) => setTimeout(ok, 1500 * (tent + 1))); }
    }
    if (erro) throw erro;
  }
  return out;
}

// o ponto da linha real (lon/lat) a uma fração da volta
function pontoNaVolta(coords, M, f) {
  const n = M.length, L = perimetro(M); let alvo = f * L;
  for (let i = 0; i < n; i++) { const s = dist(M[i], M[(i + 1) % n]); if (alvo <= s) { const t = alvo / (s || 1), a = coords[i], b = coords[(i + 1) % n]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; } alvo -= s; }
  return coords[0];
}

const r0 = (x) => Math.round(x);
const r3 = (x) => Math.round(x * 1000) / 1000;

async function converter(o) {
  const id = o._[0];
  if (!id && !o.arquivo) throw new Error("uso: node ferramentas/circuitos-f1.js <id do circuito, ex.: be-1925> [--id spa] [--nome Spa]");
  const { coords: c0, props } = linhaDo(await lerGeojson(id, o.arquivo));
  const coords = o.inverter ? [c0[0], ...c0.slice(1).reverse()] : c0;
  const M = projetar(coords), L = perimetro(M);
  const rua = !!o.rua, largura = +(o.largura || (rua ? 104 : 120)), muro = rua ? 14 : 20;
  const volta = +(o.volta || Math.round(Math.max(12800, 13000 + (L - 4300)) / 100) * 100);
  const k = volta / L; // unidades do mundo por metro
  // a linha no mundo do jogo: passa pelos pontos reais, alisada de leve
  let P = spline(M.map(([x, y]) => [x * k, y * k]), PASSO);
  alisar(P, 6, 0.5);
  const folga = largura + 2 * muro + 8, gap = Math.ceil((folga * 2.2) / PASSO) + 4;
  const raioMin = +(o["raio-min"] || RAIO_MIN), cruza = cruzamentos(P), af = afastar(P, folga, gap, cruza, raioMin);
  // no quadrado de 1600
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const scale = Math.ceil((Math.max(x1 - x0, y1 - y0) / CABE) * 100) / 100, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const Q = P.map(([x, y]) => [WORLD / 2 + (x - cx) / scale, WORLD / 2 + (y - cy) / scale]);
  // os vértices e o raio de cada um
  const tol = +(o.tol || 1), idx = simplificar(Q, tol), nv = idx.length, nq = Q.length, rmin = raioMin / scale;
  const vert = idx.map((di, v) => {
    const a = Q[idx[(v - 1 + nv) % nv]], p = Q[di], b = Q[idx[(v + 1) % nv]];
    const d1 = [p[0] - a[0], p[1] - a[1]], d2 = [b[0] - p[0], b[1] - p[1]];
    const th = Math.abs(Math.atan2(d1[0] * d2[1] - d1[1] * d2[0], d1[0] * d2[0] + d1[1] * d2[1]));
    const antes = (di - idx[(v - 1 + nv) % nv] + nq) % nq, depois = (idx[(v + 1) % nv] - di + nq) % nq;
    const arco = ((antes + depois) / 2) * (PASSO / scale); // o pedaço da linha real que essa curva representa
    let r = th < 0.012 ? 0 : arco / th;
    if (r && r < rmin) r = rmin;
    if (r > 1400) r = 0; // quase reta: um ponto de passagem
    return [p[0], p[1], r];
  });
  // a linha de chegada fica numa reta, e o grid de F1 (20 carros, uns 470 de reta para trás) também: as curvas levíssimas
  // da reta da largada viram pontos de passagem
  vert[0][2] = 0;
  for (const [sentido, ate] of [[-1, 560], [1, 160]]) {
    let andou = 0;
    for (let v = sentido; Math.abs(v) < nv / 2; v += sentido) {
      const i = (v + nv) % nv, j = (v - sentido + nv) % nv;
      andou += Math.hypot(vert[i][0] - vert[j][0], vert[i][1] - vert[j][1]) * scale;
      if (andou > ate) break;
      const a = vert[(i - 1 + nv) % nv], p = vert[i], b = vert[(i + 1) % nv];
      const th = Math.abs(Math.atan2((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]), (p[0] - a[0]) * (b[0] - p[0]) + (p[1] - a[1]) * (b[1] - p[1])));
      if (th < 0.2) vert[i][2] = 0;
    }
  }
  // a reta da largada tem que ser a mais comprida (pontos() põe a largada na reta mais comprida): nas retas maiores que
  // ela, um vértice com uma curva levíssima no meio (como a Hangar Straight de Silverstone)
  const amostra = () => sample(vert.map(([x, y, r]) => [x * scale, y * scale, r * scale]), 6);
  const corridas = (pts) => { // as retas: [início, tamanho], dando a volta
    const n = pts.length, out = []; let ini = -1;
    for (let kk = 0; kk < 2 * n; kk++) { const reto = !pts[kk % n].k; if (reto && ini < 0) ini = kk; if ((!reto || kk === 2 * n - 1) && ini >= 0) { if (kk - ini < n) out.push([ini, kk - ini]); ini = -1; } }
    return out;
  };
  for (let tent = 0; tent < 40; tent++) {
    const pts = amostra(), n = pts.length, cs = corridas(pts);
    const daLargada = cs.find(([a, len]) => a <= n && a + len > n);
    const maior = cs.filter(([a]) => a < n).sort((p, q) => q[1] - p[1])[0];
    if (!daLargada || !maior || maior[1] <= daLargada[1] || (maior[0] % n) === (daLargada[0] % n)) break;
    // acha os dois vértices da reta maior e põe um entre eles
    const meio = pts[(maior[0] + Math.floor(maior[1] / 2)) % n], mx = meio.x / scale, my = meio.y / scale;
    let v = 0, melhor = Infinity;
    for (let i = 0; i < nv; i++) { const a = vert[i], b = vert[(i + 1) % vert.length], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((mx - a[0]) * dx + (my - a[1]) * dy) / (dx * dx + dy * dy || 1))), d = Math.hypot(a[0] + dx * t - mx, a[1] + dy * t - my); if (d < melhor) { melhor = d; v = i; } }
    const a = vert[v], b = vert[(v + 1) % vert.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]), desvio = l * 0.008;
    if (l < 20) break;
    vert.splice(v + 1, 0, [(a[0] + b[0]) / 2 - ((b[1] - a[1]) / l) * desvio, (a[1] + b[1]) / 2 + ((b[0] - a[0]) / l) * desvio, 900 / scale]);
  }
  // largada: pontos() põe a largada numa fração da reta mais comprida. Ela fica na linha de chegada real (o vértice 0), ou
  // um pouco para a frente se a linha real estiver perto demais do começo da reta (o grid de F1 precisa de uns 86 pontos
  // de reta atrás dela) ou fora da reta mais comprida (aí, no começo dela). A nova linha vira o vértice 0, e `adiante`
  // (fração da volta) diz quanto ela andou, para o relevo acompanhar.
  const retaMaior = () => {
    const pts = amostra(), n = pts.length; let best = 0, bestIni = 0, run = 0, runIni = 0;
    for (let kk = 0; kk < 2 * n; kk++) { if (!pts[kk % n].k) { if (!run) runIni = kk; run++; if (run > best && run < n) { best = run; bestIni = runIni; } } else run = 0; }
    return { pts, n, best, bestIni, desl: ((n - bestIni) % n + n) % n };
  };
  const GRID = 86, avisos = [];
  let adiante = 0;
  {
    const { pts, n, best, bestIni, desl } = retaMaior();
    let alvo = null;
    if (desl < best) { if (desl < GRID) alvo = bestIni + Math.min(GRID, Math.floor(best * 0.9)); }
    else { alvo = bestIni + Math.min(GRID, Math.floor(best * 0.9)); avisos.push(`a linha de chegada real não fica na reta mais comprida: a largada foi para ${(((alvo % n) + n) % n) * 6} unidades depois dela`); }
    if (alvo != null) {
      const i = ((alvo % n) + n) % n, q = pts[i], qx = q.x / scale, qy = q.y / scale;
      adiante = i > n / 2 ? (i - n) / n : i / n;
      if (desl < best) avisos.push(`a largada andou ${(GRID - desl) * 6} para a frente da linha real (para caber o grid)`);
      let v = 0, melhor = Infinity;
      for (let k = 0; k < vert.length; k++) { const a = vert[k], b = vert[(k + 1) % vert.length], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((qx - a[0]) * dx + (qy - a[1]) * dy) / (dx * dx + dy * dy || 1))), d = Math.hypot(a[0] + dx * t - qx, a[1] + dy * t - qy); if (d < melhor) { melhor = d; v = k; } }
      vert.splice(v + 1, 0, [qx, qy, 0]);
      vert.push(...vert.splice(0, v + 1)); // a nova linha de chegada vira o vértice 0
    }
  }
  const { pts, n, best, bestIni, desl } = retaMaior();
  const largada = best && desl < best ? Math.min(0.995, (desl + 0.5) / best) : 0.6;
  if (!(desl < best)) avisos.push("a linha de chegada não ficou na reta mais comprida: confira `largada`");
  const ini = (bestIni + Math.floor(best * largada)) % n;
  for (let g = 0; g < 20; g++) { const i = (ini - 6 - Math.floor(g / 2) * 8 + 2 * n) % n; if (pts[i].k) { avisos.push(`o lugar ${g + 1} do grid de F1 fica numa curva (a reta da largada é curta)`); break; } }
  // conferência: trechos encostados e a curva mais fechada, como no teste de robôs
  // (onde a pista passa por cima de si mesma não conta: `cruza` diz as frações da volta dos dois trechos, a ponte e o de baixo)
  const xs6 = pts.map((p) => [p.x, p.y]), cr = cruzamentos(xs6).filter(([i, j], q, a) => !q || i - a[q - 1][0] > 20);
  const cruzaF = cr.map(([i, j]) => [r3(((i - ini + n) % n) / n), r3(((j - ini + n) % n) / n)]), zona6 = Math.ceil((folga * 2) / 6);
  const longe6 = (i, j) => !cr.some(([a, b]) => { const pe = (u, v) => Math.min(Math.abs(u - v), n - Math.abs(u - v)) < zona6; return (pe(i, a) && pe(j, b)) || (pe(i, b) && pe(j, a)); });
  const passos = (folga * 2.2) / 6; let pior = Infinity;
  for (let i = 0; i < n; i += 2) for (let j = i + Math.ceil(passos); j < n - (i < passos ? Math.ceil(passos) - i : 0); j += 2) if (longe6(i, j)) pior = Math.min(pior, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
  if (cruzaF.length) avisos.push(`a pista passa por cima de si mesma em ${cruzaF.map(([a, b]) => `${a} e ${b}`).join(", ")} (cruza): o trecho de cima precisa de uma ponte (hills)`);
  if (pior <= largura + 2 * muro) avisos.push(`dois trechos a ${r0(pior)} um do outro (precisa de mais de ${largura + 2 * muro}): aumente --volta`);
  const kmax = Math.max(...pts.map((p) => p.k));
  // relevo
  let hills = [[0, 4], [1, 4]];
  if (!o["sem-relevo"]) {
    try {
      const N = 100, alt = await altitudes(Array.from({ length: N }, (_, i) => pontoNaVolta(coords, M, (((i / N + adiante) % 1) + 1) % 1)));
      const lisa = alt.map((_, i) => (alt[(i - 1 + N) % N] + 2 * alt[i] + alt[(i + 1) % N]) / 4);
      const mn = Math.min(...lisa), mx = Math.max(...lisa), f = Math.min(2.2, 180 / Math.max(1, mx - mn));
      hills = [];
      for (let i = 0; i < N; i += 4) hills.push([r3(i / N), r0(4 + (lisa[i] - mn) * f)]);
      hills.push([1, hills[0][1]]);
      avisos.push(`relevo: ${r0(mn)} a ${r0(mx)} m (${r0(mx - mn)} m de diferença, ${f.toFixed(2)} unidades por metro)`);
    } catch (e) { avisos.push(`sem relevo (${e.message}): hills plano`); }
  }
  const nome = o.nome || props.Name || id, idPista = o.id || (id || "pista").replace(/[^a-z0-9]/gi, "");
  const linhas = [];
  linhas.push(`  ${idPista}: {`);
  linhas.push(`    name: ${JSON.stringify(nome)}, sub: ${JSON.stringify(`${props.Name || nome}${props.Location ? ", " + props.Location : ""}`)},`);
  linhas.push(`    // ${props.Name || nome}: ${r0(L)} m. Traçado de bacinger/f1-circuits (${id || path.basename(o.arquivo)}, licença MIT: ver o cabeçalho dos traçados convertidos)`);
  linhas.push(`    // convertido por ferramentas/circuitos-f1.js: a linha central real em ${vert.length} vértices, a linha de chegada no primeiro`);
  linhas.push(`    scale: ${scale}, width: ${largura}, minLap: ${Math.round(volta / 420)}, walls: ${rua}, ${rua ? `muro: true, wall: ${muro}, flat: 20, fall: 120` : "flat: 40, fall: 220"}, largada: ${r3(largada)},`);
  if (cruzaF.length) linhas.push(`    cruza: ${JSON.stringify(cruzaF)}, // as frações da volta onde ela passa por cima de si mesma (a ponte)`);
  linhas.push(`    hills: ${JSON.stringify(hills).replace(/\],\[/g, "], [")},`);
  linhas.push(`    points: [`);
  for (let i = 0; i < vert.length; i += 8) linhas.push("      " + vert.slice(i, i + 8).map(([x, y, r]) => `[${r0(x)}, ${r0(y)}, ${r0(r)}]`).join(", ") + ",");
  linhas.push(`    ],`);
  linhas.push(`  },`);
  const relatorio = [
    `${props.Name || nome} (${id || o.arquivo}): ${r0(L)} m reais, volta de ${n * 6} no jogo (alvo ${volta}), scale ${scale}, ${vert.length} vértices`,
    `afastamento: ${af.voltas} passadas, ${af.sobra ? af.sobra + " pares ainda encostados" : "nenhum trecho encostado"}; trechos mais perto: ${r0(pior)} (folga ${largura + 2 * muro}); curva mais fechada: raio ${r0(1 / kmax)}`,
    ...avisos,
  ];
  if (o.svg) fs.writeFileSync(o.svg, desenho(pts, largura, scale, ini));
  return { bloco: linhas.join("\n"), relatorio, pts, scale };
}

// o desenho do traçado em SVG (a pista com a largura, a largada em vermelho e as curvas mais escuras)
function desenho(pts, largura, scale, ini) {
  const W = WORLD * scale, d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("") + "Z", s = pts[ini];
  const curvas = pts.filter((p) => p.k > 1 / 300).map((p) => `<circle cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="${largura * 0.18}" fill="#c33" opacity="0.5"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="800" height="800"><rect width="${W}" height="${W}" fill="#5a8a46"/>
<path d="${d}" fill="none" stroke="#444" stroke-width="${largura}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff" stroke-width="3"/>${curvas}
<circle cx="${s.x}" cy="${s.y}" r="${largura * 0.6}" fill="#e10600"/><circle cx="${pts[(ini + 40) % pts.length].x}" cy="${pts[(ini + 40) % pts.length].y}" r="${largura * 0.4}" fill="#ffd100"/></svg>`;
}

if (require.main === module) {
  converter(opcoes(process.argv.slice(2))).then(({ bloco, relatorio }) => {
    console.log(`// ${relatorio.join("\n// ")}\n`);
    console.log(bloco);
  }).catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { converter, LICENCA };
