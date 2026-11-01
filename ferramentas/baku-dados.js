#!/usr/bin/env node
// Gerador dos dados REAIS de Baku para a Corrida: o traçado, o relevo e o que fica em volta. Roda uma vez (precisa de internet) e escreve em --saida
// (padrão: o diretório de cache):
//
//   baku-pista.txt     o bloco `baku: { ... }` de public/corrida/pistas.js (vértices, relevo, largada) e as frações de cada curva
//   dados.js           vai para public/corrida/kit/baku/dados.js: prédios, relevo do entorno, mar, parques, muralha, árvores
//
//   node ferramentas/baku-dados.js --saida C:/temp/baku
//
// Fontes (dados abertos, citados no PR e no cabeçalho de dados.js):
//   · traçado: linha central do circuito em bacinger/f1-circuits (az-2016.geojson, MIT), convertida por ferramentas/monaco-tracado.js
//     (vértices nas interseções das tangentes, o raio mínimo, os trechos que se tocariam afastados), na mesma volta do jogo de antes;
//   · prédios, muralha da Cidade Velha, costa, parques, árvores: © OpenStreetMap contributors (ODbL), pela Overpass API;
//   · relevo: EU-DEM 25 m e SRTM 30 m (a média dos dois) pela API pública do opentopodata.org.
// Tudo no mesmo mundo do jogo: x para o leste e z para o sul (o norte fica em cima, como o mapa). Uma unidade do mundo = 1/K metro.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { ajustarTracado, largadaDe } = require("./monaco-tracado.js");
const T = require("../public/corrida/pistas.js");

const arg = (nome, padrao) => { const i = process.argv.indexOf("--" + nome); return i >= 0 ? process.argv[i + 1] : padrao; };
const CACHE = arg("cache", path.join(os.tmpdir(), "baku-dados")), SAIDA = arg("saida", CACHE);
fs.mkdirSync(CACHE, { recursive: true }); fs.mkdirSync(SAIDA, { recursive: true });
const URL_LINHA = "https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits/az-2016.geojson";
const VK = 2.0; // unidades de altura por metro de altitude (a pista e o morro em volta; Baku é comprimida 2,4 unidades por metro)
const LARGURA = +arg("largura", "96"), MURO = 22; // (MURO: a folga que o afastamento dos trechos que se tocariam usa; pistas.js o teste exige largura + 2 × 20)
const AREA = { sul: 40.352, oeste: 49.818, norte: 40.384, leste: 49.868 }; // a caixa dos prédios e do mar
const PASSO_RELEVO = 60, RAIO_RELEVO = 2600; // metros entre as amostras do relevo do entorno, e até onde (o morro do Flame Towers fica a 1,5 km)

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const r1 = (x) => Math.round(x * 10) / 10, r0 = Math.round;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// ---------- rede (com cache em disco: rodar de novo não baixa nada) ----------
async function cacheado(nome, buscar) {
  const f = path.join(CACHE, nome);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const v = await buscar(); fs.writeFileSync(f, JSON.stringify(v)); return v;
}
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
async function overpass(consulta) {
  for (let t = 0; t < 8; t++) for (const ep of OVERPASS) {
    try {
      const r = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(consulta), headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "corrida-da-galera-baku/1.0" } });
      const s = await r.text(); if (r.ok && s.startsWith("{")) return JSON.parse(s);
    } catch (e) { /* tenta o próximo */ }
    await espera(2500 * (t + 1));
  }
  throw new Error("a Overpass API não respondeu");
}
// a Overpass pública recusa consultas grandes: a caixa é cortada em blocos nx × ny e os resultados se juntam pelo id
async function overpassEmBlocos(nome, filtro, nx, ny) {
  return cacheado(nome, async () => {
    const out = new Map();
    for (let a = 0; a < nx; a++) for (let b = 0; b < ny; b++) {
      const s = AREA.sul + ((AREA.norte - AREA.sul) * b) / ny, n = AREA.sul + ((AREA.norte - AREA.sul) * (b + 1)) / ny, w = AREA.oeste + ((AREA.leste - AREA.oeste) * a) / nx, e = AREA.oeste + ((AREA.leste - AREA.oeste) * (a + 1)) / nx;
      const j = await overpass(`[out:json][timeout:90];(${filtro.replaceAll("BBOX", `${s},${w},${n},${e}`)});out tags geom;`);
      for (const el of j.elements) out.set(el.type + el.id, el);
      console.log(`   ${nome}: bloco ${a},${b} (${out.size})`);
    }
    return { elements: [...out.values()] };
  });
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
      } catch (e) { if (t > 6) throw e; await espera(2500 * (t + 1)); }
    }
    await espera(1100); // a API pública pede no máximo 1 pedido por segundo
  }
  return out;
}

// ---------- geometria ----------
function dp(P, tol, fechado) { // Douglas-Peucker (fechado: o anel de um polígono)
  if (P.length < 4) return P;
  const lado = (p, a, b) => { const L = dist(a, b) || 1e-9; return Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / L; };
  const fica = new Uint8Array(P.length); fica[0] = fica[P.length - 1] = 1;
  const rec = (a, b) => { let pior = -1, q = -1; for (let i = a + 1; i < b; i++) { const d = lado(P[i], P[a], P[b]); if (d > pior) { pior = d; q = i; } } if (pior > tol) { fica[q] = 1; rec(a, q); rec(q, b); } };
  if (fechado) { let m = 0, k = 0; for (let i = 1; i < P.length; i++) { const d = dist(P[0], P[i]); if (d > m) { m = d; k = i; } } fica[k] = 1; rec(0, k); rec(k, P.length - 1); } else rec(0, P.length - 1);
  return P.filter((_, i) => fica[i]);
}
const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const dentro = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

// ---------- 1. o traçado ----------
// As curvas da transmissão (mapa oficial de 20 curvas) nas distâncias da linha real, em metros a partir da linha de chegada (conferidas no
// mapa oficial e no desenho de OpenStreetMap, que acompanham a linha de bacinger): a volta tem 5976 m na linha do arquivo (6003 oficiais).
const CURVAS_S = { t1: 185, t2: 517, t3: 1392, t4: 1612, t5: 1946, t6: 2003, t7: 2395, t8: 2597, t9: 2616, t10: 2650, t11: 2695, t12: 2763, t13: 3161, t14: 3370, t15: 3610, t16: 3960, t17: 4415, t18: 4565 };
const TRECHOS_S = { // [de, até] em metros: a Cidade Velha estreita (curvas 7 a 12, com as rampas de entrada e de saída), a reta de Neftchilar à beira do Cáspio, o castelo
  estreito: [2420, 2830], retaNeftchilar: [4700, 5976], retaAzadlig: [560, 1340], cidadeVelha: [2395, 2800], subida: [2395, 2800], bulevar: [3160, 4560],
};
async function tracado() {
  const geo = await cacheado("az-2016.geojson", async () => JSON.parse(await (await fetch(URL_LINHA)).text()));
  let c = geo.features[0].geometry.coordinates.slice(); if (c[0][0] === c.at(-1)[0] && c[0][1] === c.at(-1)[1]) c.pop();
  const R = 6371008.8, lat1 = c.reduce((q, p) => q + p[1], 0) / c.length, lon1 = c.reduce((q, p) => q + p[0], 0) / c.length, kx1 = (Math.PI / 180) * R * Math.cos((lat1 * Math.PI) / 180), ky1 = (Math.PI / 180) * R;
  const Mm = c.map(([lo, la]) => [(lo - lon1) * kx1, -(la - lat1) * ky1]);
  const par = { volta: arg("volta", "14424"), raio: arg("raio", String(LARGURA / 2)), passadas: arg("passadas", "3000") };
  return cacheado(`tracado-${Object.values(par).join("-")}-${LARGURA}.json`, async () => {
    const r = ajustarTracado({ M: Mm, volta: +par.volta, largura: LARGURA, muro: MURO, raioMin: +par.raio, passadas: +par.passadas });
    const lg = largadaDe(r.vert, r.scale);
    return { vert: r.vert, scale: r.scale, largada: lg.largada, proj: { lon0: lon1, lat0: lat1, kx: kx1, ky: ky1, k: r.k, scale: r.scale, cx: r.cx, cy: r.cy }, Mm, relatorio: [`linha real ${Math.round(r.linha.length * 3 / r.k)} m, volta de ${lg.volta} no jogo, scale ${r.scale}, ${r.vert.length} vértices, ${r.voltas} passadas de afastamento; reta atrás da linha ${Math.round(lg.atras)} e adiante ${Math.round(lg.adiante)}`] };
  });
}

// ---------- 2. o relevo ----------
const media = (a, b) => (a == null ? b : b == null ? a : (a + b) / 2);
async function relevoNaVolta(pista, mundoParaGeo) {
  const pts = T.sample(pista.vert.map(([x, y, r]) => [x * pista.scale, y * pista.scale, r * pista.scale]), 6), n = pts.length, passo = 12;
  const idx = []; for (let i = 0; i < n; i += passo) idx.push(i);
  const locais = idx.map((i) => mundoParaGeo(pts[i].x, pts[i].y).reverse());
  const eu = await cacheado("alt-volta-eudem.json", () => elevacoes("eudem25m", locais)), sr = await cacheado("alt-volta-srtm.json", () => elevacoes("srtm30m", locais));
  let alt = idx.map((_, k) => media(eu[k], sr[k])); alt = alt.map((a) => (a == null ? -26 : a)); // o mar Cáspio fica a -27 m: o MDE devolve 0 ou nada na água, e a beira da orla está em ~ -25 m
  const m = alt.length, janela = +arg("janela", "5");
  const tri = (v) => v.map((_, i) => { let s = 0, w = 0; for (let d = -janela; d <= janela; d++) { const q = janela + 1 - Math.abs(d); s += v[(i + d + m * 4) % m] * q; w += q; } return s / w; });
  const lisa = tri(tri(alt)), mn = Math.min(...lisa), mx = Math.max(...lisa);
  const hills = lisa.map((a, k) => [Math.round((idx[k] / n) * 10000) / 10000, Math.round((a - mn) * VK * 100) / 100]); hills.push([1, hills[0][1]]); // altura em relação ao ponto mais baixo (a orla)
  return { hills, bruto: alt, alt: lisa, mn, mx, pts, idx };
}
async function relevoDoEntorno(geoParaMundo, centro) {
  const [lat0, lon0] = centro, kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110574, n = Math.ceil((2 * RAIO_RELEVO) / PASSO_RELEVO) + 1, locais = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) locais.push([lat0 + (RAIO_RELEVO - r * PASSO_RELEVO) / ky, lon0 + (-RAIO_RELEVO + c * PASSO_RELEVO) / kx]); // do norte para o sul, do oeste para o leste
  const eu = await cacheado("alt-grade-eudem.json", () => elevacoes("eudem25m", locais)), sr = await cacheado("alt-grade-srtm.json", () => elevacoes("srtm30m", locais));
  const z = locais.map((_, k) => { const a = media(eu[k], sr[k]); return a == null ? -270 : Math.round(a * 10); }); // decímetros (água: -27 m)
  const [x0, z0] = geoParaMundo(locais[0][1], locais[0][0]);
  return { n, x0: r0(x0), z0: r0(z0), passo: PASSO_RELEVO, z };
}

// ---------- 3. o entorno: prédios, muralha, mar, parques, árvores (OpenStreetMap) ----------
const anel = (g, f) => g.map((p) => f(p.lon, p.lat));
function alturaDe(t, areaM2, tipo, h) {
  const num = (v) => { const x = parseFloat(String(v).replace(",", ".")); return Number.isFinite(x) ? x : null; };
  if (num(t.height)) return num(t.height);
  if (num(t["building:levels"])) return num(t["building:levels"]) * 3.3 + 1.5;
  const base = { house: 2, residential: 6, apartments: 8, commercial: 5, retail: 3, office: 7, hotel: 10, school: 3, college: 3, hospital: 5, civic: 4, public: 4, church: 3, mosque: 2, government: 5, service: 2, roof: 1, kiosk: 1 }[tipo] ?? 6;
  return Math.max(1, Math.round(base * (0.7 + h * 0.9) * (areaM2 > 3000 ? 0.8 : 1))) * 3.3 + 1.5;
}
// os lugares que ganham peça própria (kit/baku/marcos.js): o prédio que contém o ponto vira `esp` e não é extrudado como os outros
const MARCOS = {
  1: ["flame1", 40.360950, 49.826350], 2: ["flame2", 40.360680, 49.826020], 3: ["flame3", 40.360450, 49.826680],
  4: ["donzela", 40.366146, 49.837220], 5: ["governo", 40.373810, 49.852600], 6: ["torreTV", 40.3322, 49.8142], 7: ["crescent", 40.371770, 49.858640], 8: ["crescentTower", 40.373450, 49.857850], // (OSM: Qız Qalası, Hökumət Evi, Crescent Hotel e Crescent City Tower)
};
async function entorno(geoParaMundo, K) {
  const predios = await overpassEmBlocos("osm-predios.json", 'way["building"](BBOX);', 5, 3);
  const resto = await overpassEmBlocos("osm-resto.json", 'way["historic"="citywalls"](BBOX);way["barrier"="city_wall"](BBOX);way["natural"~"coastline|water"](BBOX);way["man_made"~"pier|breakwater"](BBOX);way["leisure"~"park|garden"](BBOX);way["landuse"~"grass|flowerbed|forest|recreation_ground"](BBOX);node["natural"="tree"](BBOX);node["historic"="tower"](BBOX);', 3, 2);
  const f = (lon, lat) => geoParaMundo(lon, lat);
  const costas = resto.elements.filter((e) => e.type === "way" && e.tags?.natural === "coastline").map((e) => anel(e.geometry, f));
  const perto = (a, b) => dist(a, b) < 3; let cadeias = [], pool = costas.slice();
  while (pool.length) {
    let c = pool.shift().slice(), cresceu = true;
    while (cresceu) { cresceu = false; for (let i = 0; i < pool.length; i++) { const w = pool[i]; if (perto(c.at(-1), w[0])) { c = c.concat(w.slice(1)); pool.splice(i, 1); cresceu = true; break; } if (perto(c[0], w.at(-1))) { c = w.slice(0, -1).concat(c); pool.splice(i, 1); cresceu = true; break; } } }
    cadeias.push(c);
  }
  cadeias = cadeias.filter((c) => c.length > 20).sort((a, b) => b.length - a.length);
  // o mar: a costa fechada pelo lado do mar. A cadeia (a costa de OpenStreetMap, com a terra à esquerda) sai da caixa; o polígono se fecha pelos cantos da
  // caixa que deixam um ponto conhecido do mar dentro e um da terra fora (testado com as combinações de cantos)
  const caixa = [f(AREA.oeste - 0.06, AREA.norte + 0.06), f(AREA.leste + 0.06, AREA.norte + 0.06), f(AREA.leste + 0.06, AREA.sul - 0.06), f(AREA.oeste - 0.06, AREA.sul - 0.06)], ponto = (lon, lat) => f(lon, lat);
  const maisPerto = (p) => caixa.map((c, i) => [dist(c, p), i]).sort((a, b) => a[0] - b[0])[0][1];
  let marPoligono = null; const costa = cadeias[0] ? dp(cadeias[0], 2, false) : [];
  const mar0 = ponto(49.87, 40.3535), terra0 = [ponto(49.8375, 40.3665), ponto(49.853, 40.373)];
  for (const sentido of [1, -1]) {
    const a = maisPerto(costa[0]), b = maisPerto(costa.at(-1)); let fech = [], k = b;
    for (let guarda = 0; guarda < 6; guarda++) { fech.push(caixa[k]); if (k === a) break; k = (k + sentido + 4) % 4; }
    const P = costa.concat(fech);
    if (dentro(P, mar0[0], mar0[1]) && terra0.every((q) => !dentro(P, q[0], q[1]))) { marPoligono = P; break; }
  }
  if (!marPoligono) console.log("   (AVISO: não achei o fechamento do mar; o mar fica sem costa)");
  const verde = [], muralha = [], arvores = [], piers = [];
  for (const e of resto.elements) {
    const t = e.tags || {};
    if (e.type === "node" && t.natural === "tree") { const [x, z] = f(e.lon, e.lat); arvores.push([r0(x), r0(z)]); continue; }
    if (e.type !== "way" || !e.geometry) continue;
    const P = anel(e.geometry, f);
    if (t.historic === "citywalls" || t.barrier === "city_wall") muralha.push(dp(P, 0.8, false).map(([x, z]) => [r1(x), r1(z)]));
    else if (t.man_made === "pier" || t.man_made === "breakwater") { const fechado = dist(P[0], P.at(-1)) < 0.5; piers.push(dp(fechado ? P.slice(0, -1) : P, 1.2, fechado).map(([x, z]) => [r0(x), r0(z)])); }
    else if (t.leisure === "park" || t.leisure === "garden" || t.landuse === "grass" || t.landuse === "flowerbed" || t.landuse === "recreation_ground") verde.push([1, ...dp(P, 3, true).flatMap(([x, z]) => [r0(x), r0(z)])]);
    else if (t.landuse === "forest") verde.push([2, ...dp(P, 3, true).flatMap(([x, z]) => [r0(x), r0(z)])]);
  }
  const marcosMundo = Object.entries(MARCOS).map(([id, [nome, lat, lon]]) => [+id, nome, ...f(lon, lat)]);
  const lista = [], metro = 1 / K;
  for (const e of predios.elements) {
    const t = e.tags || {};
    if (e.type !== "way" || !e.geometry || e.geometry.length < 4) continue;
    let P = anel(e.geometry, f); if (dist(P[0], P.at(-1)) < 0.01) P.pop();
    const A = Math.abs(area(P)) * metro * metro; if (A < 25) continue;
    P = dp(P, 2.5, true); if (P.length < 3) continue; if (area(P) > 0) P.reverse();
    const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cz = P.reduce((s, p) => s + p[1], 0) / P.length;
    const h = hash(e.id), alt = alturaDe(t, A, t.building, h);
    let esp = 0; for (const [id, , mx, mz] of marcosMundo) if (dentro(P, mx, mz)) { esp = id; break; }
    const porId = { 152809510: 5, 901738189: 7, 1067699501: 8, 418164347: 4 }; if (porId[e.id]) esp = porId[e.id]; // as plantas de OpenStreetMap dos marcos (Hökumət Evi, Crescent Hotel, Crescent City Tower, a torre da Donzela): o ponto de cada um cai no pátio da planta em H ou em volta
    lista.push({ id: e.id, P, alt, esp, cor: Math.floor(hash(e.id + "c") * 8) % 8, A, cx, cz, nome: t.name || "" });
  }
  return { cadeias, marPoligono, verde, muralha, arvores, piers, lista, marcosMundo };
}

// ---------- as frações da volta (para gps/baku.js e o DRS) ----------
function fracoes(pista, amostra, geoParaMundo, geoLinha) {
  const Mm = pista.Mm, L0 = Mm.reduce((s, p, i) => s + dist(p, Mm[(i + 1) % Mm.length]), 0), cum = [0];
  for (let i = 1; i < Mm.length; i++) cum.push(cum[i - 1] + dist(Mm[i], Mm[i - 1]));
  const noS = (s) => { s = ((s % L0) + L0) % L0; let i = 1; while (i < Mm.length && cum[i] < s) i++; const t = (s - cum[i - 1]) / ((((i < Mm.length ? cum[i] : L0) - cum[i - 1])) || 1), a = geoLinha[i - 1], b = geoLinha[i % geoLinha.length]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  const n = amostra.length;
  const frac = (s) => {
    const [lon, lat] = noS(s), [x, z] = geoParaMundo(lon, lat), esperada = s / L0; let m = 1e12, k = 0;
    for (let i = 0; i < n; i++) { const fi = i / n, df = Math.min(Math.abs(fi - esperada), 1 - Math.abs(fi - esperada)); if (df > 0.03) continue; const d = (amostra[i].x - x) ** 2 + (amostra[i].y - z) ** 2; if (d < m) { m = d; k = i; } }
    return Math.round((k / n) * 10000) / 10000;
  };
  const out = { curvas: {}, trechos: {} };
  for (const [nome, s] of Object.entries(CURVAS_S)) out.curvas[nome] = frac(s);
  for (const [nome, [a, b]] of Object.entries(TRECHOS_S)) out.trechos[nome] = [frac(a), frac(b)];
  return out;
}

// ---------- junta tudo ----------
(async () => {
  console.log("1/4 o traçado...");
  const pista = await tracado();
  const k = pista.proj.k, S = pista.scale, P0 = pista.proj;
  const geoParaMundo = (lon, lat) => [800 * S + (lon - P0.lon0) * P0.kx * k - P0.cx, 800 * S - (lat - P0.lat0) * P0.ky * k - P0.cy];
  const mundoParaGeo = (x, z) => [P0.lon0 + (x - 800 * S + P0.cx) / (P0.kx * k), P0.lat0 - (z - 800 * S + P0.cy) / (P0.ky * k)];
  console.log(pista.relatorio.join("\n"), `\n   ${k.toFixed(3)} unidades por metro, mundo ${r0(1600 * S)}`);
  if (process.argv.includes("--so-tracado")) return;

  console.log("2/4 o relevo ao longo da volta...");
  const rel = await relevoNaVolta(pista, mundoParaGeo);
  console.log(`   altitude real ao longo da volta: ${rel.mn.toFixed(1)} a ${rel.mx.toFixed(1)} m (${(rel.mx - rel.mn).toFixed(1)} m de diferença), ${VK} unidades por metro`);
  const geo = JSON.parse(fs.readFileSync(path.join(CACHE, "az-2016.geojson"), "utf8")), geoLinha = geo.features[0].geometry.coordinates.slice(); if (geoLinha[0][0] === geoLinha.at(-1)[0] && geoLinha[0][1] === geoLinha.at(-1)[1]) geoLinha.pop();
  const fr = fracoes(pista, rel.pts, geoParaMundo, geoLinha); console.log("   frações:", JSON.stringify(fr));
  console.log("   o relevo do entorno...");
  const grade = await relevoDoEntorno(geoParaMundo, [40.3700, 49.8400]);

  console.log("3/4 prédios, mar, muralha, parques e árvores (OpenStreetMap)...");
  const ent = await entorno(geoParaMundo, k);

  console.log("4/4 escrevendo...");
  const MUNDO = 1600 * S;
  const predios = ent.lista.map((b) => [r0(b.alt * 2), b.esp * 8 + b.cor, ...b.P.flatMap(([x, z]) => [r0(x), r0(z)])]);
  const dados = {
    versao: 1,
    projecao: { k: +k.toFixed(4), vk: VK, mundo: r0(MUNDO), lon0: P0.lon0, lat0: P0.lat0, mn: +rel.mn.toFixed(1) },
    marcos: Object.fromEntries(ent.marcosMundo.map(([id, nome, x, z]) => [nome, [r0(x), r0(z)]])),
    relevo: grade, mar: (ent.marPoligono || []).map(([x, z]) => [r0(x), r0(z)]), piers: ent.piers, verde: ent.verde, muralha: ent.muralha, arvores: ent.arvores,
    frac: fr, predios,
  };
  const cabecalho = `// GERADO por ferramentas/baku-dados.js: não edite à mão. Dados reais de Baku no mundo do jogo (x leste, z sul; 1 unidade = ${(1 / k).toFixed(3)} m).
// Prédios, muralha da Cidade Velha, costa, parques e árvores: © colaboradores do OpenStreetMap (ODbL, https://www.openstreetmap.org/copyright), pela Overpass API.
// Relevo: EU-DEM 25 m e SRTM 30 m (média), pela API do opentopodata.org. Traçado: bacinger/f1-circuits (MIT), ver pistas.js.
// predios: [altura em meios metros, esp * 8 + cor, x0, z0, x1, z1, ...] · verde: [tipo (1 jardim, 2 mata), x0, z0, ...] · relevo.z: decímetros de altitude, de norte a sul e de oeste a leste.
`;
  fs.writeFileSync(path.join(SAIDA, "dados.js"), cabecalho + "export default " + JSON.stringify(dados) + ";\n");
  const bloco = [
    `    scale: ${S}, width: ${LARGURA}, largada: ${pista.largada},`,
    `    hills: ${JSON.stringify(rel.hills).replace(/\],\[/g, "], [")},`,
    `    points: [`,
    ...Array.from({ length: Math.ceil(pista.vert.length / 8) }, (_, i) => "      " + pista.vert.slice(i * 8, i * 8 + 8).map(([x, y, r]) => `[${r0(x)}, ${r0(y)}, ${r0(r)}]`).join(", ") + ","),
    `    ],`,
  ].join("\n");
  fs.writeFileSync(path.join(SAIDA, "baku-pista.txt"), bloco + "\n");
  console.log(`dados.js: ${(fs.statSync(path.join(SAIDA, "dados.js")).size / 1024).toFixed(0)} KB · ${ent.lista.length} prédios · ${ent.arvores.length} árvores · ${ent.verde.length} áreas verdes · ${ent.muralha.length} trechos de muralha · ${ent.cadeias.length} cadeias de costa`);
})().catch((e) => { console.error(e); process.exit(1); });
