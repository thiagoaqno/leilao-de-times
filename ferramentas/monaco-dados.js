#!/usr/bin/env node
// Gerador dos dados REAIS de Mônaco para a Corrida: o traçado, o relevo e o que fica em volta. Roda uma vez (precisa de internet) e
// escreve dois arquivos em --saida (padrão: o diretório de cache):
//
//   monaco-pista.txt         o bloco `monaco: { ... }` de public/corrida/pistas.js (vértices, relevo, largada)
//   dados.js                 vai para public/corrida/kit/monaco/dados.js: prédios, relevo do entorno, mar, parques, píeres e árvores
//
//   node ferramentas/monaco-dados.js --saida C:/temp/monaco
//
// Fontes (dados abertos, citados no PR e no cabeçalho de dados.js):
//   · traçado: linha central do circuito em bacinger/f1-circuits (mc-1929.geojson, MIT), girada para começar na linha de chegada e
//     convertida por ferramentas/circuitos-f1.js (a mesma conversão das outras pistas: afasta os trechos que se tocariam, abre as
//     curvas fechadas demais para a pista larga do jogo e põe o raio em cada vértice);
//   · prédios, píeres, parques, costa, árvores: © OpenStreetMap contributors (ODbL), pela Overpass API;
//   · relevo: EU-DEM 25 m e SRTM 30 m, pela API pública do opentopodata.org (a média dos dois, que se conferem em ±7 m).
//
// Tudo no mesmo mundo do jogo: x para o leste e z para o sul (o norte fica em cima, como o mapa), uma unidade do mundo = 1/K metro
// (K = `proj.k`, em volta de 4,2). O relevo vale `VK` unidades por metro de altitude (a mesma do traçado: `hills`).
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { ajustarTracado, largadaDe } = require("./monaco-tracado.js");
const T = require("../public/corrida/pistas.js");

const URL_LINHA = "https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits/mc-1929.geojson";
const T1 = [7.421475, 43.73694]; // o ápice da Sainte Dévote (curva 1)
const LINHA_ANTES_DA_T1 = 230; // a linha de chegada fica 230 m antes dela, na Boulevard Albert 1er
const VK = 3.0; // unidades de altura por metro de altitude (a pista e o morro em volta)
const AREA = { sul: 43.7300, oeste: 7.4150, norte: 43.7440, leste: 7.4350 }; // a caixa dos prédios e do mar
const PASSO_RELEVO = 40; // metros entre as amostras do relevo do entorno
const RAIO_RELEVO = 1000; // até 1 km do centro

// os lugares que ganham peça própria (monaco/marcos.js): o prédio que contém o ponto vira `esp` e não é extrudado como os outros
const MARCOS = {
  1: ["casino", 43.739160, 7.428023], 2: ["hotelDeParis", 43.739009, 7.427468], 3: ["cafeDeParis", 43.739587, 7.427860],
  4: ["opera", 43.738959, 7.428371], 5: ["fairmont", 43.739990, 7.429942], 6: ["metropole", 43.740935, 7.427918],
  7: ["hermitage", 43.738460, 7.425958], 8: ["sainteDevote", 43.736967, 7.420843], 9: ["catedral", 43.731345, 7.420088],
  10: ["palacio", 43.731880, 7.419770], 11: ["oceanografico", 43.730770, 7.425650], 12: ["grimaldi", 43.738990, 7.431780],
  13: ["portPalace", 43.737152, 7.424119], 14: ["yachtClub", 43.737448, 7.427230], 15: ["praca", 43.739929, 7.427512], 16: ["rascasse", 43.73256, 7.42319],
};

const arg = (nome, padrao) => { const i = process.argv.indexOf("--" + nome); return i >= 0 ? process.argv[i + 1] : padrao; };
const CACHE = arg("cache", path.join(os.tmpdir(), "monaco-dados")), SAIDA = arg("saida", CACHE);
fs.mkdirSync(CACHE, { recursive: true }); fs.mkdirSync(SAIDA, { recursive: true });
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const r1 = (x) => Math.round(x * 10) / 10, r0 = Math.round;

// ---------- rede (com cache em disco: rodar de novo não baixa nada) ----------
async function cacheado(nome, buscar) {
  const f = path.join(CACHE, nome);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const v = await buscar(); fs.writeFileSync(f, JSON.stringify(v)); return v;
}
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
async function overpass(consulta) {
  for (let t = 0; t < 6; t++) for (const ep of OVERPASS) {
    try {
      const r = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(consulta), headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "corrida-da-galera-monaco/1.0" } });
      if (r.ok) return await r.json();
    } catch (e) { /* tenta o próximo */ }
    await espera(2000 * (t + 1));
  }
  throw new Error("a Overpass API não respondeu");
}
async function elevacoes(conjunto, locais) { // locais: [[lat, lon]]; devolve metros (null = sem dado, o mar no EU-DEM)
  const out = [];
  for (let i = 0; i < locais.length; i += 100) {
    const loc = locais.slice(i, i + 100).map(([la, lo]) => `${la.toFixed(6)},${lo.toFixed(6)}`).join("|");
    for (let t = 0; ; t++) {
      try {
        const r = await fetch(`https://api.opentopodata.org/v1/${conjunto}?locations=${loc}&interpolation=bilinear`), j = await r.json();
        if (j.status !== "OK") throw new Error(j.error || j.status);
        out.push(...j.results.map((q) => q.elevation)); break;
      } catch (e) { if (t > 5) throw e; await espera(2500 * (t + 1)); }
    }
    await espera(1100); // a API pública pede no máximo 1 pedido por segundo
  }
  return out;
}

// ---------- geometria ----------
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function dp(P, tol, fechado) { // Douglas-Peucker (fechado: o anel de um polígono)
  if (P.length < 4) return P;
  const lado = (p, a, b) => { const L = dist(a, b) || 1e-9; return Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / L; };
  const fica = new Uint8Array(P.length); fica[0] = fica[P.length - 1] = 1;
  let ini = 0, fim = P.length - 1;
  if (fechado) { let m = 0, k = 0; for (let i = 1; i < P.length; i++) { const d = dist(P[0], P[i]); if (d > m) { m = d; k = i; } } fica[k] = 1; const rec = (a, b) => { let pior = -1, q = -1; for (let i = a + 1; i < b; i++) { const d = lado(P[i], P[a], P[b]); if (d > pior) { pior = d; q = i; } } if (pior > tol) { fica[q] = 1; rec(a, q); rec(q, b); } }; rec(0, k); rec(k, P.length - 1); }
  else { const rec = (a, b) => { let pior = -1, q = -1; for (let i = a + 1; i < b; i++) { const d = lado(P[i], P[a], P[b]); if (d > pior) { pior = d; q = i; } } if (pior > tol) { fica[q] = 1; rec(a, q); rec(q, b); } }; rec(ini, fim); }
  return P.filter((_, i) => fica[i]);
}
const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const dentro = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

// ---------- 1. o traçado ----------
async function tracado() {
  const geo = await cacheado("mc-1929.geojson", async () => (await fetch(URL_LINHA)).then(async (r) => JSON.parse(await r.text())));
  let c = geo.features[0].geometry.coordinates.slice(); if (c[0][0] === c.at(-1)[0] && c[0][1] === c.at(-1)[1]) c.pop(); // o arquivo repete o primeiro ponto no fim
  const lat0 = 43.7367, lon0 = 7.4258, kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110574, M = c.map(([lo, la]) => [(lo - lon0) * kx, (la - lat0) * ky]);
  const cum = [0]; for (let i = 1; i < M.length; i++) cum.push(cum[i - 1] + dist(M[i], M[i - 1]));
  let apice = 0, melhor = 1e9; M.forEach((p, i) => { const d = dist(p, [(T1[0] - lon0) * kx, (T1[1] - lat0) * ky]); if (d < melhor) { melhor = d; apice = i; } });
  const L = cum.at(-1) + dist(M[0], M.at(-1)); let alvo = cum[apice] - LINHA_ANTES_DA_T1; if (alvo < 0) alvo += L;
  let i = 1; while (i < M.length && cum[i] < alvo) i++;
  const t = (alvo - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), ponto = [c[i - 1][0] + (c[i][0] - c[i - 1][0]) * t, c[i - 1][1] + (c[i][1] - c[i - 1][1]) * t];
  c = [ponto, ...c.slice(i), ...c.slice(0, i)];
  geo.features[0].geometry.coordinates = c;
  const arq = path.join(CACHE, "mc-girado.geojson"); fs.writeFileSync(arq, JSON.stringify(geo));
  const par = { volta: arg("volta", "15200"), raio: arg("raio", "70"), passadas: arg("passadas", "3000") };
  return cacheado(`tracado2-${Object.values(par).join("-")}.json`, async () => {
    const R = 6371008.8, lat1 = c.reduce((q, p) => q + p[1], 0) / c.length, lon1 = c.reduce((q, p) => q + p[0], 0) / c.length, kx1 = ((Math.PI / 180) * R * Math.cos((lat1 * Math.PI) / 180)), ky1 = (Math.PI / 180) * R;
    const Mm = c.map(([lo, la]) => [(lo - lon1) * kx1, -(la - lat1) * ky1]);
    const r = ajustarTracado({ M: Mm, volta: +par.volta, raioMin: +par.raio, passadas: +par.passadas });
    const lg = largadaDe(r.vert, r.scale);
    return { vert: r.vert, scale: r.scale, largada: lg.largada, proj: { lon0: lon1, lat0: lat1, kx: kx1, ky: ky1, k: r.k, scale: r.scale, cx: r.cx, cy: r.cy }, relatorio: [`linha central real: ${Math.round(r.linha.length * 3 / r.k)} m, volta de ${lg.volta} no jogo, scale ${r.scale}, ${r.vert.length} vértices`, `afastamento: ${r.voltas} passadas`, `reta: ${lg.atras} atrás da linha e ${lg.adiante} à frente`] };
  });
}

// ---------- 2. o relevo: ao longo da volta e do entorno ----------
const media = (a, b) => (a == null ? b : b == null ? a : (a + b) / 2);
async function relevoNaVolta(pista, mundoParaGeo) {
  const pts = T.sample(pista.vert.map(([x, y, r]) => [x * pista.scale, y * pista.scale, r * pista.scale]), 6), n = pts.length, passo = 12; // sem girar: `hills` é por fração a partir do vértice 0 (a largada cai nele)
  const idx = []; for (let i = 0; i < n; i += passo) idx.push(i);
  const locais = idx.map((i) => mundoParaGeo(pts[i].x, pts[i].y).reverse());
  const eu = await cacheado("alt-volta-eudem.json", () => elevacoes("eudem25m", locais)), sr = await cacheado("alt-volta-srtm.json", () => elevacoes("srtm30m", locais));
  let alt = idx.map((_, k) => media(eu[k], sr[k])); alt = alt.map((a) => Math.max(2, a == null ? 2 : a)); // o cais fica uns 2 m acima do mar (o MDE devolve 0 na água)
  const m = alt.length, lisa = alt.map((_, i) => { let s = 0, w = 0; for (let d = -3; d <= 3; d++) { const q = 4 - Math.abs(d); s += alt[(i + d + m * 4) % m] * q; w += q; } return s / w; });
  const mn = Math.min(...lisa), mx = Math.max(...lisa);
  const hills = lisa.map((a, k) => [Math.round((idx[k] / n) * 1000) / 1000, r0(a * VK)]); hills.push([1, hills[0][1]]);
  return { hills, alt: lisa, mn, mx, pts, idx };
}
async function relevoDoEntorno(geoParaMundo) {
  const lat0 = 43.7367, lon0 = 7.4258, kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110574, n = (2 * RAIO_RELEVO) / PASSO_RELEVO + 1, locais = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) locais.push([lat0 + (RAIO_RELEVO - r * PASSO_RELEVO) / ky, lon0 + (-RAIO_RELEVO + c * PASSO_RELEVO) / kx]); // do norte para o sul, do oeste para o leste
  const eu = await cacheado("alt-grade-eudem.json", () => elevacoes("eudem25m", locais)), sr = await cacheado("alt-grade-srtm.json", () => elevacoes("srtm30m", locais));
  const z = locais.map((_, k) => Math.max(0, Math.round(media(eu[k], sr[k]) * 10) || 0)); // decímetros
  const [x0, z0] = geoParaMundo(locais[0][1], locais[0][0]);
  return { n, x0: r0(x0), z0: r0(z0), passo: PASSO_RELEVO, z };
}

// ---------- 3. o entorno: prédios, mar, parques, píeres, árvores (OpenStreetMap) ----------
function anel(g, f) { return g.map((p) => f(p.lon, p.lat)); }
function alturaDe(t, areaM2, tipo, h) {
  const num = (v) => { const x = parseFloat(String(v).replace(",", ".")); return Number.isFinite(x) ? x : null; };
  if (num(t.height)) return num(t.height);
  if (num(t["building:levels"])) return num(t["building:levels"]) * 3.1 + 1.5;
  const base = { house: 2, residential: 4, apartments: 7, commercial: 5, retail: 3, office: 7, hotel: 9, school: 3, college: 3, hospital: 5, civic: 3, public: 3, church: 3, chapel: 2, cathedral: 4, government: 4, service: 2, roof: 1, kiosk: 1, toilets: 1, terrace: 1 }[tipo] ?? 6;
  const lv = Math.max(1, Math.round(base * (0.7 + h * 0.9) * (areaM2 > 2500 ? 0.75 : 1)));
  return lv * 3.1 + 1.5;
}
const COMPRIMIDO = (a) => a.map((v) => (Number.isInteger(v) ? v : r1(v)));

async function entorno(geoParaMundo, pistaPts) {
  const bb = `(${AREA.sul},${AREA.oeste},${AREA.norte},${AREA.leste})`;
  const predios = await cacheado("osm-predios.json", () => overpass(`[out:json][timeout:120];(way["building"]${bb};relation["building"]${bb};);out tags geom;`));
  const resto = await cacheado("osm-entorno.json", () => overpass(`[out:json][timeout:120];(way["natural"~"coastline|water|wood|scrub|bare_rock|cliff|grassland"]${bb};way["man_made"~"pier|breakwater|quay"]${bb};way["leisure"~"swimming_pool|park|garden|marina"]${bb};way["landuse"~"grass|flowerbed|forest|orchard|meadow"]${bb};node["natural"="tree"](43.7330,7.4190,43.7430,7.4330););out tags geom;`));
  const f = (lon, lat) => geoParaMundo(lon, lat);
  // --- o mar: a costa em cadeia, fechada pelo lado do mar ---
  const costas = resto.elements.filter((e) => e.type === "way" && e.tags?.natural === "coastline").map((e) => anel(e.geometry, f));
  const perto = (a, b) => dist(a, b) < 3; let cadeias = [], pool = costas.slice();
  while (pool.length) {
    let c = pool.shift().slice(), cresceu = true;
    while (cresceu) { cresceu = false; for (let i = 0; i < pool.length; i++) { const w = pool[i]; if (perto(c.at(-1), w[0])) { c = c.concat(w.slice(1)); pool.splice(i, 1); cresceu = true; break; } if (perto(c[0], w.at(-1))) { c = w.slice(0, -1).concat(c); pool.splice(i, 1); cresceu = true; break; } } }
    cadeias.push(c);
  }
  cadeias = cadeias.filter((c) => c.length > 40).sort((a, b) => b.length - a.length);
  const costa = cadeias[0]; // a de Mônaco inteira: do Rochedo e Fontvieille até o Larvotto, com a Digue e o porto
  const mundoCanto = (lon, lat) => f(lon, lat), mar = dp(costa, 2, false);
  const [ex, ez] = mundoCanto(AREA.leste + 0.05, AREA.sul - 0.05);
  const fechamento = [[ex, mar.at(-1)[1]], [ex, ez], [mar[0][0], ez]]; // o mar fica à direita da costa: dá a volta pelo sudeste
  const marPoligono = mar.concat(fechamento);
  // --- parques, píeres, árvores ---
  const verde = [], piers = [], piscinas = [], arvores = [];
  for (const e of resto.elements) {
    const t = e.tags || {};
    if (e.type === "node" && t.natural === "tree") { const [x, z] = f(e.lon, e.lat); arvores.push([r0(x), r0(z)]); continue; }
    if (e.type !== "way" || !e.geometry) continue;
    const P = anel(e.geometry, f);
    if (t.man_made === "pier" || t.man_made === "breakwater") { const fechado = dist(P[0], P.at(-1)) < 0.5, Q = fechado ? P.slice(0, -1) : P; piers.push(dp(Q, 1.2, fechado).map(([x, z]) => [r0(x), r0(z)])); } // píer = contorno fechado (a planta do deck)
    else if (t.leisure === "swimming_pool" && area(P) !== 0 && Math.abs(area(P)) > 3000) piscinas.push(dp(P, 1.5, true).map(([x, z]) => [r0(x), r0(z)]));
    else if (t.leisure === "park" || t.leisure === "garden" || t.landuse === "grass" || t.landuse === "flowerbed" || t.landuse === "meadow" || t.landuse === "orchard") verde.push([1, ...dp(P, 3, true).flatMap(([x, z]) => [r0(x), r0(z)])]);
    else if (t.natural === "wood" || t.natural === "scrub" || t.landuse === "forest") verde.push([2, ...dp(P, 3, true).flatMap(([x, z]) => [r0(x), r0(z)])]);
    else if (t.natural === "bare_rock") verde.push([3, ...dp(P, 3, true).flatMap(([x, z]) => [r0(x), r0(z)])]);
  }
  // --- prédios ---
  const marcosMundo = Object.entries(MARCOS).map(([id, [nome, lat, lon]]) => [+id, nome, ...f(lon, lat)]);
  const lista = [];
  const metroPorUnidade = 1 / pistaPts.k;
  for (const e of predios.elements) {
    const t = e.tags || {};
    let anelGeo = null;
    if (e.type === "way" && e.geometry) anelGeo = e.geometry; else if (e.type === "relation") { const ext = (e.members || []).find((m) => m.role === "outer" && m.geometry); anelGeo = ext && ext.geometry; }
    if (!anelGeo || anelGeo.length < 4) continue;
    let P = anel(anelGeo, f); if (dist(P[0], P.at(-1)) < 0.01) P.pop();
    const A = Math.abs(area(P)) * metroPorUnidade * metroPorUnidade;
    if (A < 22) continue; // barracas e cabines
    if (t.building === "roof" && A < 60) continue;
    P = dp(P, 3, true); if (P.length < 3) continue;
    if (area(P) > 0) P.reverse(); // sentido fixo (o código extruda sempre pelo mesmo lado)
    const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cz = P.reduce((s, p) => s + p[1], 0) / P.length;
    if (dentro(marPoligono, cx, cz) && !(t.building && t.building !== "yes")) continue; // sobre a água (píer): fora
    const h = hash(e.id), alt = alturaDe(t, A, t.building, h);
    let esp = 0; for (const [id, , mx, mz] of marcosMundo) if (dentro(P, mx, mz)) { esp = id; break; }
    const cor = Math.floor(hash(e.id + "c") * 8) % 8;
    lista.push({ id: e.id, P, alt, esp, cor, A, cx, cz });
  }
  // o ponto de um marco pode cair na calçada ao lado do prédio: o que não achou dono fica com o maior prédio num raio de 18 m
  const achados = new Set(lista.map((b) => b.esp));
  for (const [id, nome, mx, mz] of marcosMundo) {
    if (achados.has(id)) continue;
    let melhor = null; for (const b of lista) { if (b.esp) continue; const d = dist([b.cx, b.cz], [mx, mz]); if (d < 18 * pistaPts.k && (!melhor || b.A > melhor.A)) melhor = b; }
    if (melhor) melhor.esp = id; else console.log(`   (o marco ${nome} não achou prédio; a peça entra no ponto dele`+")");
  }
  return { marPoligono, mar, verde, piers, piscinas, arvores, lista, marcosMundo };
}

// ---------- as frações da volta de cada curva e lugar (para gps/monaco.js e o DRS) ----------
// índices da linha original de bacinger (a lista começa no Casino) e distâncias ao longo dela, em metros
const CURVAS = { sainteDevote: 129, beauRivage: 139, massenet: 149, casino: 156, mirabeauHaute: 9, hairpin: 22, mirabeauBas: 29, portier: 38, nouvelleChicane: 55, tabac: 66, piscine1: 76, piscine2: 86, rascasse: 100, anthonyNoghes: 107 };
const TRECHOS_S = { // [de, até] em metros ao longo da linha original (de 0 no Casino a ~3316); a volta inteira passa de 3316 para 0
  tunel: [745, 1020], // sob o Fairmont: 276 m
  nouvelleChicane: [1190, 1235], piscine: [1625, 1850], retaDosBoxes: [2150, 2600], cais: [1235, 1560], avenidaDOstende: [2640, 3100],
};
const FAIXAS_S = [2700, 2830, 2960, 3200, 120, 560, 1100, 1330, 1440, 1580, 2250, 2420]; // faixas de pedestre
const TRACEJADO_S = [[2650, 3000], [3000, 3316], [130, 430], [1250, 1560], [1860, 2150], [2200, 2540]]; // a linha do meio (o resto fica sem tinta)
async function frações(pista, geoParaMundo, amostra) {
  const geo = await cacheado("mc-1929.geojson", async () => null), orig = geo.features[0].geometry.coordinates.slice(); if (orig[0][0] === orig.at(-1)[0] && orig[0][1] === orig.at(-1)[1]) orig.pop();
  const lat0 = 43.7367, lon0 = 7.4258, kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110574, M = orig.map(([lo, la]) => [(lo - lon0) * kx, (la - lat0) * ky]);
  const cum = [0]; for (let i = 1; i < M.length; i++) cum.push(cum[i - 1] + dist(M[i], M[i - 1])); const L = cum.at(-1) + dist(M[0], M.at(-1));
  const noS = (s) => { s = ((s % L) + L) % L; let i = 1; while (i < M.length && cum[i] < s) i++; const t = (s - cum[i - 1]) / ((((i < M.length ? cum[i] : L) - cum[i - 1])) || 1), a = orig[i - 1], b = orig[i % orig.length]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  let apice = 0, melhor = 1e9; M.forEach((p, i) => { const d = dist(p, [(T1[0] - lon0) * kx, (T1[1] - lat0) * ky]); if (d < melhor) { melhor = d; apice = i; } });
  const s0 = cum[apice] - LINHA_ANTES_DA_T1, n = amostra.length;
  // a fração da volta (a partir da linha de chegada) do ponto da linha a `s` metros: o ponto mais perto da pista do jogo, mas só perto da fração esperada
  // (os grampos deixam trechos vizinhos a poucos metros um do outro: sem a janela, a Mirabeau Bas cairia na perna errada do grampo)
  const frac = (s) => {
    const [lon, lat] = noS(s), [x, z] = geoParaMundo(lon, lat), esperada = ((((s - s0) / L) % 1) + 1) % 1; let m = 1e12, k = 0;
    for (let i = 0; i < n; i++) { const f = i / n, df = Math.min(Math.abs(f - esperada), 1 - Math.abs(f - esperada)); if (df > 0.04) continue; const d = (amostra[i].x - x) ** 2 + (amostra[i].y - z) ** 2; if (d < m) { m = d; k = i; } }
    return Math.round((k / n) * 10000) / 10000;
  };
  const out = { curvas: {}, trechos: {}, faixas: FAIXAS_S.map(frac), tracejado: [] };
  for (const [nome, i] of Object.entries(CURVAS)) out.curvas[nome] = frac(cum[i]);
  for (const [nome, [a, b]] of Object.entries(TRECHOS_S)) out.trechos[nome] = [frac(a), frac(b)];
  for (const [a, b] of TRACEJADO_S) out.tracejado.push([frac(a), frac(b)]);
  out.drs = [frac(cum[111]), frac(cum[113]), frac(cum[apice] - 45)]; // detecção, abertura e fim da zona de DRS da reta dos boxes
  return out;
}

// ---------- junta tudo ----------
(async () => {
  console.log("1/4 o traçado...");
  const pista = await tracado();
  const k = pista.proj.k, S = pista.scale, P0 = pista.proj;
  const geoParaMundo = (lon, lat) => [800 * S + (lon - P0.lon0) * P0.kx * k - P0.cx, 800 * S - (lat - P0.lat0) * P0.ky * k - P0.cy];
  const mundoParaGeo = (x, z) => [P0.lon0 + (x - 800 * S + P0.cx) / (P0.kx * k), P0.lat0 - (z - 800 * S + P0.cy) / (P0.ky * k)];
  console.log(pista.relatorio.join("\n"));

  console.log("2/4 o relevo ao longo da volta...");
  const rel = await relevoNaVolta(pista, mundoParaGeo);
  console.log(`   altitude real ao longo da volta: ${rel.mn.toFixed(1)} a ${rel.mx.toFixed(1)} m (${(rel.mx - rel.mn).toFixed(1)} m de diferença), ${VK} unidades por metro`);
  console.log("   o relevo do entorno...");
  const grade = await relevoDoEntorno(geoParaMundo);

  const fr = await frações(pista, geoParaMundo, rel.pts); console.log("   frações:", JSON.stringify(fr.curvas));
  console.log("3/4 prédios, mar, parques e árvores (OpenStreetMap)...");
  const ent = await entorno(geoParaMundo, { k });

  // os prédios que ficariam em cima da pista (a pista do jogo é uns 3× mais larga que a real) andam para trás, inteiros
  const linha = rel.pts, D0 = 104 / 2 + 14 + 8;
  const hashLin = new Map(); const HC = 64; linha.forEach((p, i) => { const q = Math.floor(p.x / HC) + "," + Math.floor(p.y / HC); (hashLin.get(q) || hashLin.set(q, []).get(q)).push(i); });
  const maisPerto = (x, z, raio) => { let m = 1e12, b = null; const r = Math.ceil(raio / HC); for (let a = -r; a <= r; a++) for (let c = -r; c <= r; c++) { const l = hashLin.get((Math.floor(x / HC) + a) + "," + (Math.floor(z / HC) + c)); if (l) for (const i of l) { const d = (linha[i].x - x) ** 2 + (linha[i].y - z) ** 2; if (d < m) { m = d; b = linha[i]; } } } return b ? { d: Math.sqrt(m), p: b } : null; };
  let empurrados = 0;
  for (const b of ent.lista) {
    for (let volta = 0; volta < 6; volta++) {
      let pior = null;
      for (const [x, z] of b.P) { const q = maisPerto(x, z, D0 + 80); if (q && q.d < D0 && (!pior || q.d < pior.d)) pior = { d: q.d, x, z, p: q.p }; }
      // também o meio de cada lado (um prédio comprido pode encostar no meio)
      for (let i = 0; i < b.P.length; i++) { const a = b.P[i], c = b.P[(i + 1) % b.P.length], x = (a[0] + c[0]) / 2, z = (a[1] + c[1]) / 2, q = maisPerto(x, z, D0 + 80); if (q && q.d < D0 && (!pior || q.d < pior.d)) pior = { d: q.d, x, z, p: q.p }; }
      if (!pior) break;
      let dx = pior.x - pior.p.x, dz = pior.z - pior.p.y; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const falta = D0 - pior.d + 1;
      for (const p of b.P) { p[0] += dx * falta; p[1] += dz * falta; } b.cx += dx * falta; b.cz += dz * falta; if (volta === 0) empurrados++;
    }
  }
  console.log(`   ${ent.lista.length} prédios, ${empurrados} empurrados para trás da pista larga do jogo`);
  const predios = ent.lista.map((b) => [r0(b.alt * 2), b.esp * 8 + b.cor, ...b.P.flatMap(([x, z]) => [r0(x), r0(z)])]);

  console.log("4/4 escrevendo...");
  const MUNDO = 1600 * S;
  const dados = {
    versao: 1,
    projecao: { k: +k.toFixed(4), vk: VK, mundo: r0(MUNDO), lon0: P0.lon0, lat0: P0.lat0 },
    marcos: Object.fromEntries(ent.marcosMundo.map(([id, nome, x, z]) => [nome, [r0(x), r0(z)]])),
    relevo: grade,
    mar: ent.marPoligono.map(([x, z]) => [r0(x), r0(z)]),
    piers: ent.piers, piscinas: ent.piscinas, verde: ent.verde, arvores: ent.arvores,
    frac: fr,
    predios,
  };
  const cabecalho = `// GERADO por ferramentas/monaco-dados.js: não edite à mão. Dados reais de Mônaco no mundo do jogo (x leste, z sul; 1 unidade = ${(1 / k).toFixed(3)} m).
// Prédios, píeres, parques, costa e árvores: © colaboradores do OpenStreetMap (ODbL, https://www.openstreetmap.org/copyright), pela Overpass API.
// Relevo: EU-DEM 25 m e SRTM 30 m (média), pela API do opentopodata.org. Traçado: bacinger/f1-circuits (MIT), ver pistas.js.
// predios: [altura em meios metros, esp * 8 + cor, x0, z0, x1, z1, ...] · verde: [tipo (1 jardim, 2 mata, 3 pedra), x0, z0, ...] · relevo.z: decímetros de altitude, de norte a sul e de oeste a leste.
`;
  fs.writeFileSync(path.join(SAIDA, "dados.js"), cabecalho + "export default " + JSON.stringify(dados) + ";\n");

  const bloco = [
    `  monaco: {`,
    `    name: "Mônaco", sub: "O traçado de verdade, do OpenStreetMap: Sainte Dévote, a subida da Beau Rivage até o Cassino, Mirabeau, o grampo do Fairmont, Portier, o túnel, a chicane do porto, Tabac, a Piscine e a Rascasse",`,
    `    // Circuit de Monaco: ${r0(P0.k * 0 + 3324)} m. Linha central de bacinger/f1-circuits (mc-1929, licença MIT: ver o cabeçalho dos traçados convertidos), girada para a linha de chegada na Boulevard Albert 1er`,
    `    // (230 m antes da Sainte Dévote) e convertida por ferramentas/monaco-dados.js (a mesma conversão das outras pistas): norte em cima, na proporção de verdade`,
    `    // a rua estreita, com guard-rail colado na pista (muro: fica mesmo sem o muro das outras pistas) e sem área de escape`,
    `    scale: ${S}, width: 104, minLap: 25, walls: true, muro: true, wall: 14, flat: 20, fall: 120, largada: ${pista.largada},`,
    `    // relevo: a altitude real da volta (EU-DEM e SRTM, média e suavizado; ${rel.mn.toFixed(0)} a ${rel.mx.toFixed(0)} m, ${VK} unidades por metro)`,
    `    hills: ${JSON.stringify(rel.hills).replace(/\],\[/g, "], [")},`,
    `    points: [`,
    ...Array.from({ length: Math.ceil(pista.vert.length / 8) }, (_, i) => "      " + pista.vert.slice(i * 8, i * 8 + 8).map(([x, y, r]) => `[${r0(x)}, ${r0(y)}, ${r0(r)}]`).join(", ") + ","),
    `    ],`,
    `  },`,
  ].join("\n");
  fs.writeFileSync(path.join(SAIDA, "monaco-pista.txt"), bloco + "\n");
  const bytes = fs.statSync(path.join(SAIDA, "dados.js")).size;
  console.log(`dados.js: ${(bytes / 1024).toFixed(0)} KB · ${ent.lista.length} prédios · ${ent.arvores.length} árvores · ${ent.verde.length} áreas verdes · ${ent.piers.length} píeres · mar ${ent.marPoligono.length} pontos`);
})().catch((e) => { console.error(e); process.exit(1); });
