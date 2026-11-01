#!/usr/bin/env node
// Gerador dos dados REAIS de Singapura (Marina Bay Street Circuit) para a Corrida: o traçado, as frações da volta e o que fica em volta.
// Roda uma vez (precisa de internet) e escreve dois arquivos em --saida (padrão: o diretório de cache):
//
//   singapura-pista.txt      o bloco `singapura: { ... }` de public/corrida/pistas.js (vértices, relevo, largada)
//   dados.js                 vai para public/corrida/kit/singapura/dados.js: prédios, água, parques, árvores, pontes e as frações das curvas
//
//   node ferramentas/singapura-dados.js --saida C:/temp/singapura            (tudo)
//   node ferramentas/singapura-dados.js --so-tracado                           (só o traçado e as frações, sem baixar o entorno)
//
// Fontes (dados abertos, citados no PR e no cabeçalho de dados.js):
//   · traçado: linha central do circuito em bacinger/f1-circuits (sg-2008.geojson, MIT). O arquivo está no sentido HORÁRIO e o GP corre
//     no ANTI-HORÁRIO (a reta dos boxes sobe para o norte, passa sob a ponte Benjamin Sheares e vira à esquerda na curva 1): o gerador
//     inverte a lista, mantendo a linha de chegada no primeiro ponto. É o layout de 19 curvas e 4,93 km usado desde 2023, sem a
//     seção sob a arquibancada Float das curvas 16 a 19 antigas. Confira: 19 giros, de ~30° a ~140° (ver `curvas` abaixo);
//   · prédios, água, parques, pontes e árvores: © OpenStreetMap contributors (ODbL), pela Overpass API;
//   · relevo: a pista é quase plana (de 2 a 8 m de altitude na volta inteira); o perfil é o do desenho em pistas.js (`hills`).
//
// Tudo no mesmo mundo do jogo: x para o leste e z para o sul (o norte fica em cima, como o mapa), uma unidade do mundo = 1/K metro
// (K = `proj.k`, em volta de 3,8). O traçado é o de ferramentas/monaco-tracado.js (vértices nas interseções das tangentes).
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { ajustarTracado, largadaDe } = require("./monaco-tracado.js");
const T = require("../public/corrida/pistas.js");

const URL_LINHA = "https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits/sg-2008.geojson";
const arg = (nome, padrao) => { const i = process.argv.indexOf("--" + nome); return i >= 0 ? process.argv[i + 1] : padrao; };
const tem = (nome) => process.argv.includes("--" + nome);
const CACHE = arg("cache", path.join(os.tmpdir(), "singapura-dados")), SAIDA = arg("saida", CACHE);
fs.mkdirSync(CACHE, { recursive: true }); fs.mkdirSync(SAIDA, { recursive: true });
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const r1 = (x) => Math.round(x * 10) / 10, r0 = Math.round;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// a caixa do entorno (graus) e os pedaços em que a Overpass é consultada (uma consulta só estoura o tempo)
const AREA = { sul: 1.2760, oeste: 103.8450, norte: 1.2985, leste: 103.8700 }, PEDACOS = [5, 4];
const VOLTA = +arg("volta", "18700"), LARGURA = +arg("largura", "84"), RAIO_MIN = +arg("raio", "50");

// os 19 giros do traçado real (centro de cada curva em metros a leste e ao norte do ponto 1,2907 N, 103,858 E, medidos na linha de bacinger no sentido da
// corrida; o lado é o da curva: E esquerda, D direita) e os lugares que ganham peça própria, por latitude e longitude
const LAT_REF = 1.2907, LON_REF = 103.858, KX_REF = 111320 * Math.cos((LAT_REF * Math.PI) / 180), KY_REF = 110574;
const metrosParaGeo = ([x, y]) => [LON_REF + x / KX_REF, LAT_REF + y / KY_REF];
const CURVAS = [
  ["t1", 652, 384], ["t2", 596, 413], ["t3", 527, 462], ["t4", 484, 363], ["t5", 545, 116], ["t6", 102, 87], ["t7", -221, 261], ["t8", -333, 98], ["t9", -467, 197],
  ["t10", -711, -182], ["t11", -628, -241], ["t12", -618, -312], ["t13", -495, -446], ["t14", -340, 42], ["t15", -130, -94], ["t16", 340, -127], ["t17", 361, -171], ["t18", 643, -223], ["t19", 712, -141],
];
// os marcos (lat, lon): o prédio de OSM que contém o ponto vira `esp` e não é extrudado como os outros; as peças próprias entram no ponto
const MARCOS = {
  1: ["mbs1", 1.28270, 103.86024], 2: ["mbs2", 1.28368, 103.86071], 3: ["mbs3", 1.28459, 103.86102], 4: ["flyer", 1.289405, 103.863125], 5: ["esplanade", 1.28953, 103.85582],
  6: ["domoConcerto", 1.28931, 103.85515], 7: ["domoTeatro", 1.29021, 103.85552], 8: ["fullerton", 1.28618, 103.85309], 9: ["cityhall", 1.29055, 103.85176],
  10: ["supremacorte", 1.29060, 103.85080], 11: ["merlion", 1.28678, 103.85451], 12: ["padang", 1.29030, 103.85250], 13: ["pit", 1.29180, 103.86350],
  14: ["cricket", 1.28895, 103.85209], 15: ["oldsupreme", 1.29010, 103.85160],
};
// os prédios que ganham peça própria pelo NOME no OpenStreetMap (o código é o de MARCOS; o resto do que cai em volta do Flyer é a roda desenhada em partes)
const ESP_POR_NOME = [[/Marina Bay Sands|SkyPark/i, 1], [/Singapore Flyer/i, 4], [/Esplanade Theatres/i, 5], [/Esplanade Concert/i, 6], [/Esplanade Theatre/i, 7], [/Fullerton Hotel/i, 8], [/Old City Hall|National Gallery/i, 9], [/Supreme Court/i, 10], [/Cricket Club/i, 14]];
const FLYER = [1.289405, 103.863125]; // a roda: as peças de 117 a 165 m em volta dele são os segmentos do aro

// ---------- rede (com cache em disco: rodar de novo não baixa nada) ----------
async function cacheado(nome, buscar) {
  const f = path.join(CACHE, nome);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const v = await buscar(); fs.writeFileSync(f, JSON.stringify(v)); return v;
}
const OVERPASS = ["https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
async function overpass(consulta) {
  for (let t = 0; t < 8; t++) for (const ep of OVERPASS) {
    try {
      const r = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(consulta), headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "corrida-da-galera-singapura/1.0" }, signal: AbortSignal.timeout(200000) });
      if (r.ok) return (await r.json()).elements;
    } catch (e) { /* tenta o próximo */ }
    await espera(3000 * (t + 1));
  }
  throw new Error("a Overpass API não respondeu");
}
const CONSULTAS = {
  predios: (b) => `[out:json][timeout:180];(way["building"]${b};relation["building"]${b};);out tags geom;`,
  resto: (b) => `[out:json][timeout:180];(way["natural"~"coastline|water|wood|scrub|grassland|bare_rock"]${b};way["waterway"~"river|canal|riverbank"]${b};way["leisure"~"park|garden|pitch|playground|track|stadium"]${b};way["landuse"~"grass|forest|recreation_ground|flowerbed"]${b};way["man_made"~"pier|bridge|breakwater|quay"]${b};way["bridge"="yes"]["highway"]${b};node["natural"="tree"]${b};);out tags geom;`,
};
async function baixarEntorno(tipo) {
  const out = new Map(), [NX, NY] = PEDACOS;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
    const b = `(${(AREA.sul + ((AREA.norte - AREA.sul) * j) / NY).toFixed(5)},${(AREA.oeste + ((AREA.leste - AREA.oeste) * i) / NX).toFixed(5)},${(AREA.sul + ((AREA.norte - AREA.sul) * (j + 1)) / NY).toFixed(5)},${(AREA.oeste + ((AREA.leste - AREA.oeste) * (i + 1)) / NX).toFixed(5)})`;
    const el = await cacheado(`osm-${tipo}-${i}-${j}.json`, () => overpass(CONSULTAS[tipo](b)));
    for (const e of el) out.set(e.type + e.id, e); // o mesmo elemento pode vir em dois pedaços vizinhos
    await espera(300);
  }
  return [...out.values()];
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
async function tracado() {
  const geo = await cacheado("sg-2008.geojson", async () => JSON.parse(await (await fetch(URL_LINHA)).text()));
  let c = geo.features[0].geometry.coordinates.slice(); if (c[0][0] === c.at(-1)[0] && c[0][1] === c.at(-1)[1]) c.pop(); // o arquivo repete o primeiro ponto no fim
  c = [c[0], ...c.slice(1).reverse()]; // o sentido da corrida (anti-horário): a linha de chegada continua no ponto 0
  const R = 6371008.8, lat1 = c.reduce((q, p) => q + p[1], 0) / c.length, lon1 = c.reduce((q, p) => q + p[0], 0) / c.length, kx1 = (Math.PI / 180) * R * Math.cos((lat1 * Math.PI) / 180), ky1 = (Math.PI / 180) * R;
  const Mm = c.map(([lo, la]) => [(lo - lon1) * kx1, -(la - lat1) * ky1]);
  const r = ajustarTracado({ M: Mm, volta: VOLTA, largura: LARGURA, raioMin: RAIO_MIN, passadas: +arg("passadas", "3000") });
  const lg = largadaDe(r.vert, r.scale);
  const comprimento = Mm.reduce((s, p, i) => s + dist(p, Mm[(i + 1) % Mm.length]), 0);
  return { vert: r.vert, scale: r.scale, largada: lg.largada, proj: { lon0: lon1, lat0: lat1, kx: kx1, ky: ky1, k: r.k, scale: r.scale, cx: r.cx, cy: r.cy }, comprimento,
    relatorio: [`linha central real: ${Math.round(comprimento)} m, volta de ${lg.volta} no jogo, scale ${r.scale}, ${r.vert.length} vértices, ${r.voltas} passadas de afastamento, largada ${lg.largada?.toFixed(3)}; reta dos boxes ${lg.atras} atrás e ${lg.adiante} à frente da linha de chegada`] };
}

// ---------- 2. as frações da volta de cada curva e lugar ----------
function fracoes(pista, geoParaMundo, amostra) {
  const n = amostra.length, achar = (x, z, de = 0, ate = 1) => { let m = 1e12, k = 0; for (let i = 0; i < n; i++) { const f = i / n; if (f < de || f > ate) continue; const d = (amostra[i].x - x) ** 2 + (amostra[i].y - z) ** 2; if (d < m) { m = d; k = i; } } return Math.round((k / n) * 10000) / 10000; };
  const noMundo = ([x, y]) => { const [lo, la] = metrosParaGeo([x, y]); return geoParaMundo(lo, la); };
  const curvas = {}; let ultimo = 0; // as curvas seguem a ordem da volta: cada uma só procura depois da anterior (a pista passa a poucos metros dela mesma)
  for (const [nome, x, y] of CURVAS) { const [mx, mz] = noMundo([x, y]); const f = achar(mx, mz, Math.max(0, ultimo - 0.005), Math.min(1, ultimo + 0.2)); curvas[nome] = f; ultimo = f; }
  return { curvas };
}

// o perfil de altura (metros acima do mar, a pista é quase plana: de 2 a 7 m): cada ponto é uma curva (nome) ou uma fração da volta. As pontes sobre o rio
// (Anderson e Esplanade) ganham a lombada do arco; a Raffles Boulevard e a Nicoll Highway sobem de leve até a curva 7 e a orla do Flyer é a parte mais baixa.
const PERFIL = [[0, 3], ["t1", 4], ["t3", 3.2], ["t5", 3.4], [0.2, 4.2], [0.26, 5.4], ["t7", 7], ["t8", 6.2], ["t9", 6], [0.47, 5.2], ["t10", 4.2], [0.54, 3.8], [0.575, 5.4], ["t13", 3.6], [0.645, 5], ["t14", 5], ["t15", 4.6], ["t16", 3.6], [0.9, 3], ["t19", 2.4], [1, 3]];
const VK = 3.0; // unidades de altura por metro (o mesmo de Mônaco)
function relevo(fr) {
  const hills = PERFIL.map(([f, m]) => [typeof f === "string" ? fr.curvas[f] : f, Math.round(m * VK * 100) / 100]).sort((a, b) => a[0] - b[0]);
  return hills;
}

// ---------- junta tudo ----------
(async () => {
  console.log("1/3 o traçado...");
  const pista = await tracado(), k = pista.proj.k, S = pista.scale, P0 = pista.proj;
  const geoParaMundo = (lon, lat) => [800 * S + (lon - P0.lon0) * P0.kx * k - P0.cx, 800 * S - (lat - P0.lat0) * P0.ky * k - P0.cy];
  const mundoParaGeo = (x, z) => [P0.lon0 + (x - 800 * S + P0.cx) / (P0.kx * k), P0.lat0 - (z - 800 * S + P0.cy) / (P0.ky * k)];
  console.log(pista.relatorio.join("\n"));
  const amostra = T.sample(pista.vert.map(([x, y, r]) => [x * S, y * S, r * S]), 6);
  const fr = fracoes(pista, geoParaMundo, amostra);
  console.log("   frações das curvas:", JSON.stringify(fr.curvas));
  const bloco = [
    `  singapura: {`,
    `    name: "Singapura", sub: "Marina Bay à noite: a reta Raffles Boulevard, o Padang, a ponte Anderson, a Esplanade Drive e o Singapore Flyer, em 19 curvas, no sentido anti-horário de verdade", f1: true,`,
    `    // Marina Bay Street Circuit (layout de 2023: 19 curvas): ${r0(pista.comprimento)} m. Linha central de bacinger/f1-circuits (sg-2008, licença MIT: ver o cabeçalho dos traçados convertidos), no SENTIDO DA CORRIDA`,
    `    // (anti-horário: a reta dos boxes sobe para o norte e a curva 1 é à esquerda; o arquivo vem no horário), convertida por ferramentas/singapura-dados.js (a mesma conversão de Mônaco),`,
    `    // norte em cima e na proporção de verdade. Os muros vêm de \`muros\` (só onde a pista real tem barreira) e a pista não tem muro em volta.`,
    `    scale: ${S}, width: ${LARGURA}, minLap: 45, walls: false, wall: 14, flat: 400, fall: 260, largada: ${pista.largada}, hillsSuave: true,`,
    `    // relevo: quase plano (2 a 7 m), ${VK} unidades por metro`,
    `    hills: ${JSON.stringify(relevo(fr)).replace(/\],\[/g, "], [")},`,
    `    points: [`,
    ...Array.from({ length: Math.ceil(pista.vert.length / 8) }, (_, i) => "      " + pista.vert.slice(i * 8, i * 8 + 8).map(([x, y, r]) => `[${r0(x)}, ${r0(y)}, ${r0(r)}]`).join(", ") + ","),
    `    ],`,
    `  },`,
  ].join("\n");
  fs.writeFileSync(path.join(SAIDA, "singapura-pista.txt"), bloco + "\n");
  fs.writeFileSync(path.join(SAIDA, "tracado.json"), JSON.stringify({ proj: P0, vert: pista.vert, fr, largada: pista.largada }));
  if (tem("so-tracado")) { console.log("só o traçado: escrito em", SAIDA); return; }
  await require("./singapura-entorno.js").entorno({ semOsm: tem("sem-osm"), SAIDA, CACHE, AREA, MARCOS, ESP_POR_NOME, FLYER, k, S, P0, geoParaMundo, mundoParaGeo, amostra, fr, baixarEntorno, dp, area, dentro, hash, dist, r0, r1 });
})().catch((e) => { console.error(e); process.exit(1); });
