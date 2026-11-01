#!/usr/bin/env node
// Gerador dos dados REAIS de Las Vegas para a Corrida: o traçado, as frações das 17 curvas, o relevo e o que fica em volta (a Strip, o Sphere, os cassinos).
// Roda uma vez (precisa de internet) e escreve em --saida (padrão: o diretório de cache):
//
//   lasvegas-pista.txt   o bloco `lasvegas: { ... }` de public/corrida/pistas.js (vértices, relevo, largada) e as frações de cada curva
//   dados.js             vai para public/corrida/kit/lasvegas/dados.js: prédios, relevo do entorno, lagos, fontes, vias, árvores e os lugares com nome
//
//   node ferramentas/lasvegas-dados.js --saida C:/temp/lasvegas            (tudo)
//   node ferramentas/lasvegas-dados.js --so-tracado                         (só o traçado e as frações)
//   node ferramentas/lasvegas-dados.js --so-cache                           (não baixa o que falta do OpenStreetMap: usa só o cache)
//   node ferramentas/lasvegas-dados.js --nomes                              (lista os prédios e lugares com nome do OpenStreetMap, para escolher os marcos)
//
// Fontes (dados abertos, citados no PR e no cabeçalho de dados.js):
//   · traçado: linha central do circuito em bacinger/f1-circuits (us-2023.geojson, MIT). O arquivo já vem no sentido da corrida (anti-horário: a
//     reta dos boxes sobe para nordeste, a curva 1 é à esquerda, Koval Lane para o norte, o Sphere, e a Strip de norte para sul), conferido contra o
//     mapa oficial das 17 curvas e o texto dos guias; a conversão é a de ferramentas/monaco-tracado.js;
//   · prédios (planta e altura), vias, lagos, fontes, árvores: © OpenStreetMap contributors (ODbL), pela Overpass API;
//   · relevo: EU-DEM 25 m e SRTM 30 m (a média dos dois) pela API pública do opentopodata.org (a pista é quase plana: ~15 m de desnível).
// Tudo no mesmo mundo do jogo: x para o leste e z para o sul (o norte fica em cima, como o mapa). Uma unidade do mundo = 1/K metro.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { ajustarTracado, largadaDe } = require("./monaco-tracado.js");
const T = require("../public/corrida/pistas.js");

const arg = (nome, padrao) => { const i = process.argv.indexOf("--" + nome); return i >= 0 ? process.argv[i + 1] : padrao; };
const tem = (nome) => process.argv.includes("--" + nome);
const CACHE = arg("cache", path.join(os.tmpdir(), "lasvegas-dados")), SAIDA = arg("saida", CACHE);
fs.mkdirSync(CACHE, { recursive: true }); fs.mkdirSync(SAIDA, { recursive: true });
const URL_LINHA = "https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits/us-2023.geojson";
const VK = 2.4; // unidades de altura por metro de altitude (a pista é quase plana: 14 m de desnível viram ~34 unidades)
const VOLTA = +arg("volta", "14900"), LARGURA = +arg("largura", "104"), MURO = 22, RETA = +arg("reta", "150"); // (MURO: a folga que o afastamento dos trechos que se tocariam usa)
const AREA = { sul: 36.1040, oeste: -115.1800, norte: 36.1300, leste: -115.1540 }, PEDACOS = [3, 4]; // a caixa dos prédios (graus) e os pedaços em que a Overpass é consultada
const PASSO_RELEVO = 80, RAIO_RELEVO = 2500; // metros entre as amostras do relevo do entorno, e até onde

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const r1 = (x) => Math.round(x * 10) / 10, r0 = Math.round;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// ---------- rede (com cache em disco: rodar de novo não baixa nada) ----------
async function cacheado(nome, buscar) {
  const f = path.join(CACHE, nome);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const v = await buscar(); fs.writeFileSync(f, JSON.stringify(v)); return v;
}
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://z.overpass-api.de/api/interpreter"];
async function overpass(consulta) {
  for (let t = 0; t < 10; t++) {
    try {
      const r = await fetch(OVERPASS[t % 2], { method: "POST", body: "data=" + encodeURIComponent(consulta), headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "corrida-da-galera-lasvegas/1.0" }, signal: AbortSignal.timeout(180000) });
      const s = await r.text(); if (r.ok && s.startsWith("{")) return JSON.parse(s).elements;
    } catch (e) { /* tenta de novo */ }
    await espera(4000 * (t + 1));
  }
  throw new Error("a Overpass API não respondeu");
}
const CONSULTAS = {
  predios: (b) => `[out:json][timeout:170];(way["building"]${b};relation["building"]${b};);out tags geom;`,
  partes: (b) => `[out:json][timeout:170];(way["building:part"]${b};);out tags geom;`,
  vias: (b) => `[out:json][timeout:170];(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|residential|service|unclassified)$"]${b};);out tags geom;`,
  resto: (b) => `[out:json][timeout:170];(way["natural"~"water|scrub|bare_rock|sand"]${b};way["water"]${b};way["amenity"="fountain"]${b};node["amenity"="fountain"]${b};way["leisure"~"park|garden|golf_course|pitch|water_park|swimming_pool"]${b};way["landuse"~"grass|recreation_ground|flowerbed|retail|commercial|residential|industrial|construction"]${b};node["natural"="tree"]${b};way["man_made"~"tower|mast|chimney|bridge"]${b};way["bridge"="yes"]${b};node["tourism"~"attraction|hotel|viewpoint"]${b};node["amenity"="casino"]${b};way["amenity"="casino"]${b};way["tourism"~"hotel|attraction"]${b};);out tags geom;`,
};
async function baixar(tipo) {
  const out = new Map(), [NX, NY] = PEDACOS;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
    const b = `(${(AREA.sul + ((AREA.norte - AREA.sul) * j) / NY).toFixed(5)},${(AREA.oeste + ((AREA.leste - AREA.oeste) * i) / NX).toFixed(5)},${(AREA.sul + ((AREA.norte - AREA.sul) * (j + 1)) / NY).toFixed(5)},${(AREA.oeste + ((AREA.leste - AREA.oeste) * (i + 1)) / NX).toFixed(5)})`;
    const arq = path.join(CACHE, `osm-${tipo}-${i}-${j}.json`);
    if (tem("so-cache") && !fs.existsSync(arq)) { console.log(`   (sem ${path.basename(arq)}: o bloco fica de fora)`); continue; } // --so-cache: só o que já foi baixado
    const el = await cacheado(`osm-${tipo}-${i}-${j}.json`, async () => { const v = await overpass(CONSULTAS[tipo](b)); await espera(2500); return v; });
    for (const e of el) out.set(e.type + e.id, e); // o mesmo elemento pode vir em dois pedaços vizinhos
  }
  return [...out.values()];
}
async function elevacoes(conjunto, locais) { // locais: [[lat, lon]]; devolve metros (null = sem dado)
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
// a caixa orientada de menor área (o rumo do lado maior, em radianos no mundo do jogo; largura ao longo dele)
function caixaOrientada(P) {
  let melhor = null;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(ang), s = Math.sin(ang);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const [x, z] of P) { const u = x * c + z * s, v = -x * s + z * c; x0 = Math.min(x0, u); x1 = Math.max(x1, u); z0 = Math.min(z0, v); z1 = Math.max(z1, v); }
    const A = (x1 - x0) * (z1 - z0);
    if (!melhor || A < melhor.A) melhor = { A, ang, w: x1 - x0, d: z1 - z0, cx: ((x0 + x1) / 2) * c - ((z0 + z1) / 2) * s, cz: ((x0 + x1) / 2) * s + ((z0 + z1) / 2) * c };
  }
  if (melhor.d > melhor.w) { melhor.ang += Math.PI / 2; [melhor.w, melhor.d] = [melhor.d, melhor.w]; }
  return melhor;
}

// ---------- 1. o traçado ----------
// As 17 curvas da transmissão (mapa oficial) nas distâncias da linha real, em metros a partir da linha de chegada (o arquivo já corre no sentido da
// corrida; conferidas no giro de cada curva da linha e no mapa oficial: T1-T2 a esquerda longa, T3-T4 a direita que entra na Koval Lane, T5 a 90° à
// direita, T6 a esquerda em volta do Sphere, T7-T8 a chicane, T9 a esquerda, T10-T11 as curvas rápidas da Sands Avenue, T12 a esquerda para a Strip,
// T13 o toque, T14-T16 a chicane da Harmon e T17 a esquerda para a reta dos boxes). A volta tem 6221 m.
const CURVAS_S = { t1: 140, t2: 235, t3: 370, t4: 490, t5: 1432, t6: 1715, t7: 1900, t8: 1960, t9: 2085, t10: 2620, t11: 2900, t12: 3085, t13: 4935, t14: 5042, t15: 5080, t16: 5160, t17: 5900 };
const TRECHOS_S = { // [de, até] em metros
  boxes: [5800, 6221], koval: [550, 1410], sands: [2156, 2440], strip: [3100, 5030], harmon: [5200, 5800],
};
async function tracado() {
  const geo = await cacheado("us-2023.geojson", async () => JSON.parse(await (await fetch(URL_LINHA)).text()));
  let c = geo.features[0].geometry.coordinates.slice(); if (c[0][0] === c.at(-1)[0] && c[0][1] === c.at(-1)[1]) c.pop(); // o arquivo repete o primeiro ponto no fim
  const R = 6371008.8, lat1 = c.reduce((q, p) => q + p[1], 0) / c.length, lon1 = c.reduce((q, p) => q + p[0], 0) / c.length, kx1 = (Math.PI / 180) * R * Math.cos((lat1 * Math.PI) / 180), ky1 = (Math.PI / 180) * R;
  const Mm = c.map(([lo, la]) => [(lo - lon1) * kx1, -(la - lat1) * ky1]);
  const par = { volta: VOLTA, raio: LARGURA / 2, passadas: 3000, reta: RETA };
  return cacheado(`tracado-${Object.values(par).join("-")}-${LARGURA}.json`, async () => {
    const r = ajustarTracado({ M: Mm, volta: VOLTA, largura: LARGURA, muro: MURO, raioMin: par.raio, passadas: par.passadas, retaPerto: RETA });
    const lg = largadaDe(r.vert, r.scale);
    return { vert: r.vert, scale: r.scale, largada: lg.largada, proj: { lon0: lon1, lat0: lat1, kx: kx1, ky: ky1, k: r.k, scale: r.scale, cx: r.cx, cy: r.cy }, Mm, relatorio: [`linha real ${Math.round(Mm.reduce((s, p, i) => s + dist(p, Mm[(i + 1) % Mm.length]), 0))} m, volta de ${lg.volta} no jogo, scale ${r.scale}, ${r.vert.length} vértices, ${r.voltas} passadas de afastamento; reta atrás da linha ${Math.round(lg.atras)} e adiante ${Math.round(lg.adiante)}`] };
  });
}

// ---------- 2. o relevo ----------
const media = (a, b) => (a == null ? b : b == null ? a : (a + b) / 2);
async function relevoNaVolta(pista, mundoParaGeo) {
  const pts = T.sample(pista.vert.map(([x, y, r]) => [x * pista.scale, y * pista.scale, r * pista.scale]), 6), n = pts.length, passo = 10;
  const idx = []; for (let i = 0; i < n; i += passo) idx.push(i);
  const locais = idx.map((i) => mundoParaGeo(pts[i].x, pts[i].y).reverse());
  const eu = await cacheado("alt-volta-eudem.json", () => elevacoes("eudem25m", locais)), sr = await cacheado("alt-volta-srtm.json", () => elevacoes("srtm30m", locais));
  let alt = idx.map((_, k) => media(eu[k], sr[k])); const ok = alt.filter((a) => a != null), md = ok.reduce((s, a) => s + a, 0) / (ok.length || 1); alt = alt.map((a) => (a == null ? md : a));
  const m = alt.length, janela = +arg("janela", "6");
  const tri = (v) => v.map((_, i) => { let s = 0, w = 0; for (let d = -janela; d <= janela; d++) { const q = janela + 1 - Math.abs(d); s += v[(i + d + m * 4) % m] * q; w += q; } return s / w; });
  const lisa = tri(tri(alt)), mn = Math.min(...lisa), mx = Math.max(...lisa);
  const hills = lisa.map((a, k) => [Math.round((idx[k] / n) * 10000) / 10000, Math.round((a - mn) * VK * 100) / 100]); hills.push([1, hills[0][1]]); // altura em relação ao ponto mais baixo da volta
  return { hills, bruto: alt, alt: lisa, mn, mx, pts, idx };
}
async function relevoDoEntorno(geoParaMundo, centro) {
  const [lat0, lon0] = centro, kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110574, n = Math.ceil((2 * RAIO_RELEVO) / PASSO_RELEVO) + 1, locais = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) locais.push([lat0 + (RAIO_RELEVO - r * PASSO_RELEVO) / ky, lon0 + (-RAIO_RELEVO + c * PASSO_RELEVO) / kx]); // do norte para o sul, do oeste para o leste
  const eu = await cacheado("alt-grade-eudem.json", () => elevacoes("eudem25m", locais)), sr = await cacheado("alt-grade-srtm.json", () => elevacoes("srtm30m", locais));
  const z = locais.map((_, k) => { const a = media(eu[k], sr[k]); return a == null ? 6000 : Math.round(a * 10); }); // decímetros
  const [x0, z0] = geoParaMundo(locais[0][1], locais[0][0]);
  return { n, x0: r0(x0), z0: r0(z0), passo: PASSO_RELEVO, z };
}

// ---------- 3. o entorno (OpenStreetMap) ----------
const anel = (g, f) => g.map((p) => f(p.lon, p.lat));
const num = (v) => { const x = parseFloat(String(v).replace(",", ".")); return Number.isFinite(x) ? x : null; };
function alturaDe(t, areaM2, h) {
  if (num(t.height)) return num(t.height);
  if (num(t["building:levels"])) return num(t["building:levels"]) * 3.6 + 2;
  const base = { hotel: 8, casino: 5, resort: 8, commercial: 3, retail: 2, office: 6, apartments: 8, residential: 4, parking: 4, garage: 3, garages: 2, house: 1, service: 1, industrial: 2, warehouse: 2, roof: 1, yes: 3, civic: 3, public: 3, church: 2, hospital: 5, school: 2, kiosk: 1, hangar: 2 }[t.building] ?? 3;
  return Math.max(3, Math.round(base * (0.8 + h * 0.6) * (areaM2 > 6000 ? 1.3 : 1))) * 3.6 + 2;
}
// os lugares com nome que ganham tratamento próprio (fachada e peça): o prédio de OSM cujo nome casa com o padrão vira `esp` (cor e luz próprias) e a caixa orientada dele vai
// para `nomeados` (kit/lasvegas/marcos.js põe o que é de cada um)
const NOMES = [
  [1, "sphere", /^(MSG )?Sphere$/i], [2, "bellagio", /Bellagio/i, /^Bellagio Las Vegas$/i], [3, "caesars", /Caesars Palace|Augustus|Palace Tower|Octavius|Julius|Forum Tower|Nobu/i, /Augustus Tower|Caesars Palace Hotel/i], [4, "paris", /Paris Las Vegas|Le Boulevard At Paris|Paris Self/i, /^Paris Las Vegas$/i],
  [5, "venetian", /Venetian Tower|Venezia|The Venetian|Venetian Resort/i, /Venetian Tower/i], [6, "palazzo", /Palazzo/i, /Palazzo Tower/i], [7, "wynn", /Wynn Las Vegas/i, /^Wynn Las Vegas$/i], [8, "encore", /Encore Las Vegas|^Encore$/i, /Encore Las Vegas/i], [9, "cosmopolitan", /Cosmopolitan/i, /Boulevard Tower/i],
  [10, "planethollywood", /Planet Hollywood Resort|PH Live|Aladdin/i, /Planet Hollywood Resort/i], [11, "flamingo", /Flamingo|Hilton Grand Vacations at the Flamingo/i, /Hilton Grand|Flamingo Las Vegas/i], [12, "linq", /LINQ|Imperial Palace/i, /LINQ Hotel & Casino|LINQ Hotel +/i], [13, "treasureisland", /Treasure Island/i, /Treasure Island Hotel/i],
  [14, "mirage", /Mirage/i, /Hotel|Mirage Las Vegas|The Mirage/i], [15, "harrahs", /Harrah/i, /Harrah.s Las Vegas|Showroom/i], [16, "ballys", /Bally|Horseshoe/i], [17, "pit", /Grand Prix Plaza|Pit Building|Paddock/i], [18, "highroller", /High Roller/i],
  [19, "eiffel", /Eiffel/i], [20, "aria", /^Aria|Vdara|Park MGM|Monte Carlo|Signature at MGM|Veer Towers|Waldorf/i], [21, "forumshops", /Forum Shops|Caesars Forum/i],
];
async function entorno(geoParaMundo, K, amostra) {
  const predios = await baixar("predios"), partes = await baixar("partes"), vias = await baixar("vias"), resto = await baixar("resto");
  console.log(`   ${predios.length} prédios, ${partes.length} partes, ${vias.length} vias, ${resto.length} outros`);
  const f = (lon, lat) => geoParaMundo(lon, lat), metro = 1 / K;
  // ---- água, fontes, verde, árvores, vias ----
  const encadear = (partesEl) => {
    const perto = (a, b) => dist(a, b) < 2.5, pool = partesEl.map((p) => p.slice()), fechados = [];
    while (pool.length) {
      let cad = pool.shift(), cresceu = true;
      while (cresceu && !perto(cad[0], cad.at(-1))) {
        cresceu = false;
        for (let i = 0; i < pool.length; i++) {
          const w = pool[i];
          if (perto(cad.at(-1), w[0])) { cad = cad.concat(w.slice(1)); pool.splice(i, 1); cresceu = true; break; }
          if (perto(cad.at(-1), w.at(-1))) { cad = cad.concat(w.slice(0, -1).reverse()); pool.splice(i, 1); cresceu = true; break; }
          if (perto(cad[0], w.at(-1))) { cad = w.slice(0, -1).concat(cad); pool.splice(i, 1); cresceu = true; break; }
          if (perto(cad[0], w[0])) { cad = w.slice(1).reverse().concat(cad); pool.splice(i, 1); cresceu = true; break; }
        }
      }
      if (cad.length > 3 && perto(cad[0], cad.at(-1))) fechados.push(cad.slice(0, -1));
    }
    return fechados;
  };
  const lagosPartes = [], lagosNomes = [], verde = [], arvores = [], fontes = [], nomesLugares = [];
  for (const e of resto) {
    const t = e.tags || {};
    if (e.type === "node") {
      if (t.natural === "tree") { const [x, z] = f(e.lon, e.lat); arvores.push([r0(x), r0(z), /palm/i.test(t.species || t.genus || t["species:en"] || "") || /palm/i.test(t.leaf_type || "") ? 1 : 0]); }
      else if (t.amenity === "fountain") fontes.push([...f(e.lon, e.lat).map(r0), t.name || ""]);
      else if (t.name) nomesLugares.push([t.name, ...f(e.lon, e.lat).map(r0), t.tourism || t.amenity || ""]);
      continue;
    }
    if (e.type !== "way" || !e.geometry) continue;
    const P = anel(e.geometry, f);
    if (t.name && /casino|hotel|attraction/.test(`${t.tourism || ""}${t.amenity || ""}`)) { const c = P.reduce((s, p) => [s[0] + p[0] / P.length, s[1] + p[1] / P.length], [0, 0]); nomesLugares.push([t.name, r0(c[0]), r0(c[1]), t.tourism || t.amenity]); }
    if (dist(P[0], P.at(-1)) > 1) continue;
    const Q = P.slice(0, -1);
    if (t.natural === "water" || t.water || t.leisure === "swimming_pool") { if (t.leisure === "swimming_pool") continue; lagosPartes.push(P); lagosNomes.push(t.name || ""); }
    else if (t.amenity === "fountain") fontes.push([...dp(Q, 1.5, true).flatMap(([x, z]) => [r0(x), r0(z)]).slice(0, 2), t.name || ""]);
    else if (t.leisure === "golf_course" || t.leisure === "park" || t.leisure === "garden" || t.landuse === "grass" || t.landuse === "flowerbed" || t.landuse === "recreation_ground") verde.push([t.leisure === "golf_course" ? 3 : 1, ...dp(Q, 3, true).flatMap(([x, z]) => [r0(x), r0(z)])]);
    else if (t.natural === "scrub") verde.push([2, ...dp(Q, 4, true).flatMap(([x, z]) => [r0(x), r0(z)])]);
  }
  const lagos = encadear(lagosPartes).map((P) => dp(P, 1.2, true)).filter((P) => P.length >= 4 && Math.abs(area(P)) * metro * metro > 150).map((P) => P.map(([x, z]) => [r0(x), r0(z)]));
  const viasOut = [];
  for (const e of vias) {
    const t = e.tags || {}; if (e.type !== "way" || !e.geometry) continue;
    const g = t.highway, larg = /motorway|trunk/.test(g) ? 24 : /primary/.test(g) ? 22 : /secondary/.test(g) ? 18 : /tertiary/.test(g) ? 14 : /service/.test(g) ? 7 : 10;
    const lanes = num(t.lanes), w = lanes ? Math.max(6, lanes * 3.6) : larg;
    viasOut.push([r0(w * 2) / 2, t.name || "", ...dp(anel(e.geometry, f), 1.5, false).flatMap(([x, z]) => [r0(x), r0(z)])]);
  }
  console.log(`   água: ${lagos.length} lagos, ${fontes.length} fontes, ${verde.length} áreas verdes, ${arvores.length} árvores, ${viasOut.length} vias`);

  // ---- prédios: as partes (com altura própria) valem no lugar do prédio que as contém, e herdam o nome dele ----
  const poligonos = (e) => {
    if (e.type === "way" && e.geometry) return [e.geometry];
    if (e.type === "relation") return (e.members || []).filter((m) => m.role === "outer" && m.geometry && m.geometry.length > 3).map((m) => m.geometry);
    return [];
  };
  const unidades = [];
  for (const [lista, parte] of [[partes, true], [predios, false]]) for (const e of lista) for (const g of poligonos(e)) {
    const t = e.tags || {};
    let P = anel(g, f); if (dist(P[0], P.at(-1)) < 0.01) P.pop();
    if (P.length < 3) continue;
    const A = Math.abs(area(P)) * metro * metro; if (A < 30) continue;
    P = dp(P, 2.2, true); if (P.length < 3) continue; if (area(P) > 0) P.reverse();
    const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cz = P.reduce((s, p) => s + p[1], 0) / P.length;
    unidades.push({ id: e.id, t, P, A, cx, cz, parte, nome: t.name || "" });
  }
  const pais = unidades.filter((u) => !u.parte), filhas = unidades.filter((u) => u.parte);
  // cada parte herda o nome do MENOR prédio com nome que a contém; o prédio com partes não é desenhado (as partes já o cobrem), mas guarda o nome
  for (const q of filhas) { const dono = pais.filter((p) => p.A > q.A && dentro(p.P, q.cx, q.cz)).sort((x, y) => x.A - y.A); if (dono.length) { q.pai = dono[0]; dono[0].temPartes = true; if (!q.nome) q.nome = dono.find((p) => p.nome)?.nome || ""; } }
  const lixoNome = /Parking|Garage|Employee|Employment|Expo|Convention|Valet|Theat|Studios|Museum|Conference|Dispensary|Gentlemen|Fashion Show/i;
  const porNome = (nome) => { for (const [id, chave, re] of NOMES) if (re.test(nome)) return [id, chave]; return null; };
  let descartadosPorParte = 0; const saida = [], porChave = {};
  for (const u of unidades) {
    if (!u.parte && u.temPartes) { descartadosPorParte++; if (u.nome && porNome(u.nome)) u.soNome = true; }
    const h = hash(u.id), alt = alturaDe(u.t, u.A, h), nm = u.nome && porNome(u.nome); u.alt = alt; u.esp = nm ? nm[0] : 0; u.chave = nm ? nm[1] : "";
    if (u.esp && !lixoNome.test(u.nome) && (u.t.height || u.t["building:levels"] || u.parte || u.A > 2500)) (porChave[u.chave] ||= []).push(u);
    if (!u.parte && u.temPartes) continue; // (o prédio inteiro some: as partes entram no lugar dele)
    if (!u.esp && u.alt < 8 && u.A < 400) continue; // casinhas e quiosques que não aparecem
    saida.push([r0(u.alt * 2), u.esp * 8 + (Math.floor(hash(u.id + "c") * 8) % 8), ...u.P.flatMap(([x, z]) => [r0(x), r0(z)])]);
  }
  // os lugares com nome: a caixa orientada do prédio mais alto (e, havendo empate, o maior) de cada um e a altura máxima
  const nomeados = [];
  for (const [chave, us] of Object.entries(porChave)) {
    const pref = NOMES.find((q) => q[1] === chave)[3]; let cand = us.filter((u) => !pref || pref.test(u.nome)); if (!cand.length) cand = us;
    const rep = cand.reduce((a2, b2) => (b2.alt * Math.sqrt(b2.A) > a2.alt * Math.sqrt(a2.A) ? b2 : a2)), cx = caixaOrientada(rep.P), altura = Math.max(...us.map((u) => u.alt));
    nomeados.push({ chave, nome: rep.nome || "", cx: r0(cx.cx), cz: r0(cx.cz), ang: +cx.ang.toFixed(4), w: r0(cx.w), d: r0(cx.d), h: r0(altura), n: us.length, A: r0(rep.A) });
  }
  console.log(`   ${saida.length} prédios (${descartadosPorParte} inteiros trocados pelas partes), ${nomeados.length} lugares com nome`);
  if (tem("nomes")) {
    for (const n of nomeados) console.log("   marco", JSON.stringify(n));
    const nomes = new Map(); for (const u of unidades) if (u.t.name && u.A > 600) nomes.set(u.t.name, [u.A, u.alt, r0(u.cx), r0(u.cz)]);
    console.log([...nomes.entries()].sort((a, b) => b[1][0] - a[1][0]).slice(0, 120).map(([n, [A, h, x, z]]) => `   ${n} | ${r0(A)} m2 | ${r0(h)} m | ${x},${z}`).join("\n"));
    console.log("   lugares", JSON.stringify(nomesLugares.slice(0, 80)));
  }
  return { lagos, lagosNomes, verde, arvores, fontes, vias: viasOut, saida, nomeados, nomesLugares };
}

// ---------- as frações da volta ----------
function fracoes(pista, amostra, geoParaMundo) {
  const Mm = pista.Mm, L0 = Mm.reduce((s, p, i) => s + dist(p, Mm[(i + 1) % Mm.length]), 0), cum = [0];
  for (let i = 1; i < Mm.length; i++) cum.push(cum[i - 1] + dist(Mm[i], Mm[i - 1]));
  const P0 = pista.proj, geoLinha = Mm.map(([x, y]) => [P0.lon0 + x / P0.kx, P0.lat0 - y / P0.ky]);
  const noS = (s) => { s = ((s % L0) + L0) % L0; let i = 1; while (i < Mm.length && cum[i] < s) i++; const t = (s - cum[i - 1]) / ((((i < Mm.length ? cum[i] : L0) - cum[i - 1])) || 1), a = geoLinha[i - 1], b = geoLinha[i % geoLinha.length]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  const n = amostra.length;
  const frac = (s) => {
    const [lon, lat] = noS(s), [x, z] = geoParaMundo(lon, lat), esperada = s / L0; let m = 1e12, k = 0;
    for (let i = 0; i < n; i++) { const fi = i / n, df = Math.min(Math.abs(fi - esperada), 1 - Math.abs(fi - esperada)); if (df > 0.03) continue; const d = (amostra[i].x - x) ** 2 + (amostra[i].y - z) ** 2; if (d < m) { m = d; k = i; } }
    return Math.round((k / n) * 10000) / 10000;
  };
  const out = { curvas: {}, trechos: {}, volta: Math.round(L0) };
  for (const [nome, s] of Object.entries(CURVAS_S)) out.curvas[nome] = frac(s);
  for (const [nome, [a, b]] of Object.entries(TRECHOS_S)) out.trechos[nome] = [frac(a), frac(Math.min(b, L0 - 1))];
  return out;
}

// ---------- junta tudo ----------
(async () => {
  console.log("1/4 o traçado...");
  const pista = await tracado();
  const k = pista.proj.k, S = pista.scale, P0 = pista.proj;
  const geoParaMundo = (lon, lat) => [800 * S + (lon - P0.lon0) * P0.kx * k - P0.cx, 800 * S - (lat - P0.lat0) * P0.ky * k - P0.cy];
  const mundoParaGeo = (x, z) => [P0.lon0 + (x - 800 * S + P0.cx) / (P0.kx * k), P0.lat0 - (z - 800 * S + P0.cy) / (P0.ky * k)];
  console.log(pista.relatorio.join("\n"), `\n   ${k.toFixed(3)} unidades por metro, mundo ${r0(1600 * S)}, largada ${pista.largada}`);
  const amostra = T.sample(pista.vert.map(([x, y, r]) => [x * S, y * S, r * S]), 6);
  pista.Mm = pista.Mm; pista.proj = P0;
  const fr = fracoes(pista, amostra, geoParaMundo); console.log("   frações:", JSON.stringify(fr));
  if (tem("so-tracado")) return;

  console.log("2/4 o relevo ao longo da volta...");
  const rel = await relevoNaVolta(pista, mundoParaGeo);
  console.log(`   altitude real ao longo da volta: ${rel.mn.toFixed(1)} a ${rel.mx.toFixed(1)} m (${(rel.mx - rel.mn).toFixed(1)} m de diferença), ${VK} unidades por metro`);
  console.log("   o relevo do entorno...");
  const grade = await relevoDoEntorno(geoParaMundo, [36.1165, -115.1668]);
  const bloco = [
    `    scale: ${S}, width: ${LARGURA}, minLap: 35, flat: 20, fall: 120, largada: ${pista.largada}, hillsSuave: true, muroFolga: 12,`,
    `    hills: ${JSON.stringify(rel.hills).replace(/\],\[/g, "], [")},`,
    `    points: [`,
    ...Array.from({ length: Math.ceil(pista.vert.length / 8) }, (_, i) => "      " + pista.vert.slice(i * 8, i * 8 + 8).map(([x, y, r]) => `[${r0(x)}, ${r0(y)}, ${r0(r)}]`).join(", ") + ","),
    `    ],`,
  ].join("\n");
  fs.writeFileSync(path.join(SAIDA, "lasvegas-pista.txt"), bloco + "\n");
  console.log("   lasvegas-pista.txt escrito");
  if (tem("so-relevo")) { console.log("   hills:", JSON.stringify(rel.hills).slice(0, 400)); return; }

  console.log("3/4 prédios, lagos, fontes, vias e árvores (OpenStreetMap)...");
  const ent = await entorno(geoParaMundo, k, amostra);
  if (tem("nomes")) return;

  console.log("4/4 escrevendo...");
  const MUNDO = 1600 * S;
  const dados = {
    versao: 1,
    projecao: { k: +k.toFixed(4), vk: VK, mundo: r0(MUNDO), lon0: P0.lon0, lat0: P0.lat0, kx: +P0.kx.toFixed(3), ky: +P0.ky.toFixed(3), cx: +P0.cx.toFixed(3), cy: +P0.cy.toFixed(3), scale: S, mn: +rel.mn.toFixed(1) },
    marcos: ent.nomeados, relevo: grade, lagos: ent.lagos, verde: ent.verde, fontes: ent.fontes, arvores: ent.arvores, vias: ent.vias, frac: fr, predios: ent.saida, lugares: ent.nomesLugares,
  };
  const cabecalho = `// GERADO por ferramentas/lasvegas-dados.js: não edite à mão. Dados reais de Las Vegas (a Strip, a Sands Avenue e a Koval Lane) no mundo do jogo (x leste, z sul; 1 unidade = ${(1 / k).toFixed(3)} m).
// Prédios (plantas e alturas), vias, lagos, fontes e árvores: © colaboradores do OpenStreetMap (ODbL, https://www.openstreetmap.org/copyright), pela Overpass API.
// Relevo: EU-DEM 25 m e SRTM 30 m (média), pela API do opentopodata.org. Traçado: bacinger/f1-circuits (MIT), ver pistas.js.
// predios: [altura em meios metros, esp * 8 + cor, x0, z0, x1, z1, ...] · verde: [tipo (1 jardim, 2 mato, 3 campo de golfe), x0, z0, ...] · vias: [largura em m, nome, x0, z0, ...] · relevo.z: decímetros de altitude, de norte a sul e de oeste a leste.
`;
  fs.writeFileSync(path.join(SAIDA, "dados.js"), cabecalho + "export default " + JSON.stringify(dados) + ";\n");
  console.log(`dados.js: ${(fs.statSync(path.join(SAIDA, "dados.js")).size / 1024).toFixed(0)} KB · ${ent.saida.length} prédios · ${ent.arvores.length} árvores · ${ent.lagos.length} lagos · ${ent.vias.length} vias`);
})().catch((e) => { console.error(e); process.exit(1); });
