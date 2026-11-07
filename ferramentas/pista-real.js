// Relevo e barreiras reais de uma pista que já existe em public/corrida/pistas.js, sem mudar o traçado nem o tamanho:
//
//   node ferramentas/pista-real.js be-1925 spa --cache <pasta para guardar os downloads>
//
// Imprime `hills` e `muros` para colar na pista, mais um resumo para conferir. O que faz:
// - baixa a linha central real (bacinger/f1-circuits, MIT), a altitude de 400 pontos da volta (opentopodata.org: EU-DEM de 25 m na Europa, SRTM de 30 m fora) e as
//   barreiras mapeadas perto dela (OpenStreetMap, © colaboradores do OpenStreetMap, licença ODbL);
// - encaixa a linha real na do jogo (rotação, escala e espelho) e descobre qual fração da volta real é cada ponto do jogo;
// - relevo: a altitude em metros × as unidades por metro do próprio traçado, então a ladeira do jogo tem a inclinação da real;
// - barreiras: em cada 1% da volta e de cada lado, a barreira mapeada mais perto. A folga real (distância menos a meia largura
//   real) vira recuo na escala da física (1 u = 0,208 m), a mesma do tamanho do carro. Sem barreira por perto, recuo 0.
//
// Opções: --dem eudem25m ou srtm30m (a base de altitude; o Copernicus de 90 m conta a copa das árvores, em Spa dava 39 m de salto em Blanchimont)
// · --meia 7 (meia largura real, em metros) · --ancoras 100 (pontos de relevo) · --raio 2 (suavização, em pontos de 400)
"use strict";
const fs = require("fs");
const path = require("path");
const P = require("../public/corrida/pistas.js");

const R = 6371000, N = 400, U_POR_METRO_FISICA = 3.6 / 0.75;
const r3 = (v) => Math.round(v * 1000) / 1000;

function lerOpcoes(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) o[argv[i].slice(2)] = argv[++i]; else o._.push(argv[i]); }
  return o;
}

async function comCache(pasta, nome, baixar) {
  const f = pasta && path.join(pasta, nome);
  if (f && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const dado = await baixar();
  if (f) { fs.mkdirSync(pasta, { recursive: true }); fs.writeFileSync(f, JSON.stringify(dado)); }
  return dado;
}

async function baixarLinha(id) {
  const r = await fetch(`https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits/${id}.geojson`);
  if (!r.ok) throw new Error(`linha ${id}: ${r.status}`);
  const geo = await r.json(), feats = geo.type === "FeatureCollection" ? geo.features : [geo];
  const linha = feats.map((f) => f.geometry.coordinates).sort((a, b) => b.length - a.length)[0];
  return Array.isArray(linha[0][0]) ? linha[0] : linha;
}

async function baixarAltitudes(pontos, dem) {
  const alt = [];
  for (let i = 0; i < pontos.length; i += 100) {
    const locations = pontos.slice(i, i + 100).map((c) => `${c[1].toFixed(6)},${c[0].toFixed(6)}`).join("|");
    const r = await fetch(`https://api.opentopodata.org/v1/${dem}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locations, interpolation: "bilinear" }) });
    if (!r.ok) throw new Error(`altitude: ${r.status}`);
    alt.push(...(await r.json()).results.map((x) => x.elevation));
    await new Promise((v) => setTimeout(v, 1300)); // a API pública aceita uma consulta por segundo
  }
  if (alt.some((x) => x === null)) throw new Error(`${dem} não cobre este circuito: tente --dem srtm30m`);
  return alt;
}

async function baixarBarreiras(linha) {
  const lats = linha.map((c) => c[1]), lons = linha.map((c) => c[0]), f = 0.002;
  const bbox = [Math.min(...lats) - f, Math.min(...lons) - f, Math.max(...lats) + f, Math.max(...lons) + f].map((v) => v.toFixed(5)).join(",");
  const q = `[out:json][timeout:60];way["barrier"~"^(wall|guard_rail|retaining_wall|fence|jersey_barrier)$"](${bbox});out tags geom;`;
  const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { "User-Agent": "corrida-galera-ferramenta/1.0", "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
  if (!r.ok) throw new Error(`barreiras: ${r.status}`);
  return (await r.json()).elements.filter((e) => e.geometry).map((e) => ({ tipo: e.tags.barrier, geo: e.geometry.map((p) => [p.lon, p.lat]) }));
}

// N pontos igualmente espaçados na linha real
function reamostrar(linha) {
  const lat0 = (linha[0][1] * Math.PI) / 180, proj = ([lo, la]) => [(lo * Math.PI / 180) * R * Math.cos(lat0), (la * Math.PI / 180) * R];
  const fechada = linha.concat([linha[0]]), M = fechada.map(proj), acum = [0];
  for (let i = 1; i < M.length; i++) acum.push(acum[i - 1] + Math.hypot(M[i][0] - M[i - 1][0], M[i][1] - M[i - 1][1]));
  const L = acum[acum.length - 1], pontos = [];
  for (let i = 0; i < N; i++) {
    const s = (i / N) * L; let k = 0;
    while (k < acum.length - 2 && acum[k + 1] <= s) k++;
    const u = (s - acum[k]) / (acum[k + 1] - acum[k] || 1);
    pontos.push([fechada[k][0] + (fechada[k + 1][0] - fechada[k][0]) * u, fechada[k][1] + (fechada[k + 1][1] - fechada[k][1]) * u]);
  }
  return { pontos, L, proj };
}

// a rotação, a escala, o espelho e o deslocamento na volta que põem a linha real em cima da do jogo
function encaixar(G, pts) {
  const n = pts.length;
  const tentar = (desl, espelho) => {
    const A = [], B = [];
    for (let i = 0; i < 200; i++) {
      const f = i / 200, g = G[Math.floor((((f + desl) % 1 + 1) % 1) * N)], q = pts[Math.floor(f * n)];
      A.push([g[0], espelho ? -g[1] : g[1]]); B.push([q.x, q.y]);
    }
    const media = (V) => V.reduce((s, v) => [s[0] + v[0] / V.length, s[1] + v[1] / V.length], [0, 0]), ma = media(A), mb = media(B);
    let a = 0, b = 0, sa = 0;
    for (let i = 0; i < 200; i++) {
      const x = A[i][0] - ma[0], y = A[i][1] - ma[1], u = B[i][0] - mb[0], v = B[i][1] - mb[1];
      a += x * u + y * v; b += x * v - y * u; sa += x * x + y * y;
    }
    const h = Math.hypot(a, b), s = h / sa, c = a / h, d = b / h;
    const aplicar = ([x0, y0]) => { const x = x0 - ma[0], y = (espelho ? -y0 : y0) - ma[1]; return [mb[0] + s * (c * x - d * y), mb[1] + s * (d * x + c * y)]; };
    let erro = 0;
    for (let i = 0; i < 200; i++) { const g = aplicar(A[i][0] === undefined ? [0, 0] : [A[i][0], espelho ? -A[i][1] : A[i][1]]); erro += Math.hypot(g[0] - B[i][0], g[1] - B[i][1]); }
    return { erro: erro / 200, s, aplicar, desl };
  };
  let melhor = null;
  for (const espelho of [false, true]) for (let k = 0; k < N; k += 2) { const e = tentar(k / N, espelho); if (!melhor || e.erro < melhor.erro) melhor = e; }
  return melhor;
}

// para cada ponto do jogo, a posição contínua (0 a N) na linha real, sempre avançando
function mapear(GJ, pts, desl) {
  const n = pts.length, mapa = new Float64Array(n);
  let at = Math.round((((desl % 1) + 1) % 1) * N), pior = 0;
  for (let i = 0; i < n; i++) {
    let best = at, bk = 0, bd = Infinity;
    for (let k = 0; k <= 8; k++) {
      const j = (at + k) % N, a = GJ[j], b = GJ[(j + 1) % N], dx = b[0] - a[0], dy = b[1] - a[1], u = Math.max(0, Math.min(1, ((pts[i].x - a[0]) * dx + (pts[i].y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(a[0] + dx * u - pts[i].x, a[1] + dy * u - pts[i].y);
      if (d < bd) { bd = d; best = j; bk = u; }
    }
    at = best; mapa[i] = best + bk; pior = Math.max(pior, bd);
  }
  return { mapa, pior };
}

const suavizar = (A, r) => A.map((_, i) => { let s = 0, w = 0; for (let k = -2 * r; k <= 2 * r; k++) { const g = Math.exp(-(k * k) / (2 * r * r)); s += A[(i + k + A.length) % A.length] * g; w += g; } return s / w; });

async function principal() {
  const o = lerOpcoes(process.argv.slice(2)), [idLinha, idPista] = o._;
  if (!idLinha || !idPista) throw new Error("uso: node ferramentas/pista-real.js <id do circuito> <id da pista> [--cache pasta]");
  const t = P.PISTAS[idPista]; if (!t) throw new Error(`não achei a pista ${idPista}`);
  const linha = await comCache(o.cache, `${idLinha}-linha.json`, () => baixarLinha(idLinha));
  const { pontos, L, proj } = reamostrar(linha);
  const dem = o.dem || "eudem25m", alt = await comCache(o.cache, `${idLinha}-${dem}.json`, () => baixarAltitudes(pontos, dem));
  const muros = await comCache(o.cache, `${idLinha}-barreiras.json`, () => baixarBarreiras(linha));
  const pts = P.pontos(t, 6), n = pts.length, G = pontos.map(proj), enc = encaixar(G, pts), GJ = G.map(enc.aplicar), { mapa, pior } = mapear(GJ, pts, enc.desl);

  // --- relevo: as âncoras contam a partir do vértice 0 do traçado, antes de `pontos` girar a volta para a linha de chegada ---
  const lisa = suavizar(alt, Number(o.raio || 2)), altura = (i) => { const m = mapa[i], a = Math.floor(m) % N, u = m - Math.floor(m); return lisa[a] * (1 - u) + lisa[(a + 1) % N] * u; };
  const cru = P.sample(t.points, 6); let ini = 0, bd = Infinity;
  cru.forEach((p, i) => { const d = (p.x - pts[0].x) ** 2 + (p.y - pts[0].y) ** 2; if (d < bd) { bd = d; ini = i; } });
  const metros = Array.from({ length: n }, (_, i) => altura(i)), mn = Math.min(...metros), mx = Math.max(...metros), A = Number(o.ancoras || 100), hills = [];
  for (let k = 0; k < A; k++) hills.push([r3(k / A), Math.round(4 + (metros[((Math.round((k / A) * n) - ini) % n + n) % n] - mn) * enc.s)]);
  hills.push([1, hills[0][1]]);
  const passo = 48 / enc.s; let dmax = 0, fmax = 0;
  for (let i = 0; i < n; i++) { const g = Math.abs(metros[(i + 8) % n] - metros[i]) / passo; if (g > dmax) { dmax = g; fmax = i / n; } }

  // --- barreiras: a mais perto de cada lado, em cada 1% da volta, em unidades do jogo ---
  const segs = [], meia = Number(o.meia || 7), minimo = (meia + 1) * enc.s; // (mais perto que a borda real é erro de alinhamento, ou o muro do corredor dos boxes)
  for (const m of muros) { const g = m.geo.map((c) => enc.aplicar(proj(c))); for (let i = 0; i + 1 < g.length; i++) segs.push([g[i], g[i + 1]]); }
  const B = 100, mapaLado = { 1: new Array(B).fill(null), [-1]: new Array(B).fill(null) };
  for (let b = 0; b < B; b++) for (const lado of [1, -1]) {
    const amostras = [];
    for (let v = 0; v < 5; v++) {
      const p = pts[Math.floor(((b + (v + 0.5) / 5) / B) * n)], nx = -p.ty, ny = p.tx; let d0 = Infinity; // (a mesma normal de murosDoEscape)
      for (const [a, c] of segs) {
        const dx = c[0] - a[0], dy = c[1] - a[1], u = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / (dx * dx + dy * dy || 1))), qx = a[0] + dx * u - p.x, qy = a[1] + dy * u - p.y, d = Math.hypot(qx, qy);
        if (d < minimo || d > 70 * enc.s || (qx * nx + qy * ny) * lado < 0) continue;
        if (Math.abs(qx * nx + qy * ny) < d * 0.8) continue; // só o que está mesmo ao lado, não o que vem à frente ou atrás
        if (d < d0) d0 = d;
      }
      amostras.push(d0);
    }
    amostras.sort((x, y) => x - y);
    const d = amostras[2]; if (d < Infinity) mapaLado[lado][b] = Math.max(16, Math.min(220, (d / enc.s - meia) * U_POR_METRO_FISICA));
  }
  const saida = [];
  for (const lado of [1, -1]) {
    const v = mapaLado[lado].slice();
    for (let b = 0; b < B; b++) if (v[b] === null && v[(b + B - 1) % B] !== null && v[(b + 1) % B] !== null) v[b] = (v[(b + B - 1) % B] + v[(b + 1) % B]) / 2; // tapa o furo de 1%
    const liso = v.map((x, b) => { if (x === null) return null; const viz = [v[(b + B - 1) % B], x, v[(b + 1) % B]].filter((y) => y !== null).sort((p, q) => p - q); return viz[viz.length >> 1]; });
    let b = 0;
    while (b < B) {
      let e = b + 1;
      const q = (x) => (x === null ? 0 : Math.round(x / 20) * 20 || 20), r = q(liso[b]);
      while (e < B && q(liso[e]) === r) e++;
      if (r) saida.push([r3(b / B), r3(e / B), lado, r, 30]);
      b = e;
    }
  }

  console.log(`// encaixe: erro médio ${enc.erro.toFixed(0)} u, pior ${pior.toFixed(0)} u, ${enc.s.toFixed(2)} u/m, volta real ${Math.round(L)} m, vértice 0 no ponto ${ini}`);
  console.log(`// relevo: ${Math.round(mn)} a ${Math.round(mx)} m, ${Math.round(4 + (mx - mn) * enc.s)} u; inclinação máxima ${(dmax * 100).toFixed(1)}% em ${fmax.toFixed(3)}`);
  console.log(`// barreiras: ${segs.length} segmentos; ${saida.length} trechos; lado 1 sem barreira em ${mapaLado[1].filter((x) => x === null).length}%, lado -1 em ${mapaLado[-1].filter((x) => x === null).length}%`);
  console.log(`hills: ${JSON.stringify(hills)},`);
  console.log(`muros: ${JSON.stringify(saida)},`);
}

principal().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
