// Singapura — a segunda metade do gerador (ferramentas/singapura-dados.js): o entorno do OpenStreetMap no mundo do jogo. Escreve o
// dados.js de public/corrida/kit/singapura/: prédios (planta, altura), água (a baía de Marina Bay, o rio Singapura, o canal de Kallang),
// parques e gramados (o Padang), árvores, pontes e viadutos (a Anderson, a Esplanade, a Benjamin Sheares) e a posição de cada marco.
"use strict";
const fs = require("fs");
const path = require("path");

exports.entorno = async function entorno(c) {
  const { SAIDA, AREA, MARCOS, ESP_POR_NOME, FLYER, k, S, P0, geoParaMundo, amostra, fr, baixarEntorno, dp, area, dentro, hash, dist, r0, r1 } = c;
  console.log("2/3 o entorno (OpenStreetMap)...");
  const f = (lon, lat) => geoParaMundo(lon, lat);
  const predios = c.semOsm ? [] : await baixarEntorno("predios"), resto = c.semOsm ? [] : await baixarEntorno("resto");
  console.log(`   ${predios.length} prédios, ${resto.length} outros elementos`);
  const anel = (g) => g.map((p) => f(p.lon, p.lat));
  const metroPorUnidade = 1 / k;

  // ---- a linha da pista (para empurrar os prédios para trás e descartar o que não importa) ----
  const linha = amostra, HC = 64, grade = new Map(), hk = (a, b) => a * 100003 + b;
  linha.forEach((p, i) => { const q = hk(Math.floor(p.x / HC), Math.floor(p.y / HC)); (grade.get(q) || grade.set(q, []).get(q)).push(i); });
  const maisPerto = (x, z, raio) => { let m = 1e12, b = null; const r = Math.ceil(raio / HC); for (let a = -r; a <= r; a++) for (let d = -r; d <= r; d++) { const l = grade.get(hk(Math.floor(x / HC) + a, Math.floor(z / HC) + d)); if (l) for (const i of l) { const e = (linha[i].x - x) ** 2 + (linha[i].y - z) ** 2; if (e < m) { m = e; b = linha[i]; } } } return b ? { d: Math.sqrt(m), p: b } : null; };

  // ---- água: anéis fechados (ways e relações), encadeando as pontas ----
  const encadear = (partes) => {
    const perto = (a, b) => dist(a, b) < 2.5, pool = partes.map((p) => p.slice()), fechados = [];
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
  const aguaPartes = [];
  for (const e of resto) {
    const t = e.tags || {};
    const agua = t.natural === "water" || t.waterway === "riverbank" || (t.water && t.natural !== "wetland");
    if (!agua) continue;
    if (e.type === "way" && e.geometry) aguaPartes.push(anel(e.geometry));
    else if (e.type === "relation") for (const m of e.members || []) if (m.role === "outer" && m.geometry) aguaPartes.push(anel(m.geometry));
  }
  // a Marina Reservoir (a baía) é uma relação grande: vem à parte (osm-reservoir.json: `relation(9542146); out geom;`)
  const resFile = path.join(c.CACHE, "osm-reservoir.json");
  if (!c.semOsm && fs.existsSync(resFile)) for (const el of JSON.parse(fs.readFileSync(resFile, "utf8"))) for (const m of el.members || []) if (m.role === "outer" && m.geometry) aguaPartes.push(anel(m.geometry));
  const aguaAneis = encadear(aguaPartes).map((P) => dp(P, 2, true)).filter((P) => P.length >= 4 && Math.abs(area(P)) * metroPorUnidade * metroPorUnidade > 400);
  // o canal e os rios que só vêm como linha (waterway=river/canal) ganham uma faixa de água
  const rios = [];
  for (const e of resto) { const t = e.tags || {}; if (e.type === "way" && e.geometry && (t.waterway === "river" || t.waterway === "canal")) rios.push({ nome: t.name || "", P: dp(anel(e.geometry), 2, false) }); }
  console.log(`   água: ${aguaAneis.length} anéis, ${rios.length} linhas de rio`);

  // ---- parques, gramados, árvores, píeres ----
  const verde = [], piers = [], arvores = [], pontes = [], campos = [];
  for (const e of resto) {
    const t = e.tags || {};
    if (e.type === "node" && t.natural === "tree") { const [x, z] = f(e.lon, e.lat); arvores.push([r0(x), r0(z)]); continue; }
    if (e.type !== "way" || !e.geometry) continue;
    const P = anel(e.geometry);
    if (t.bridge === "yes" && t.highway) {
      const grande = /motorway|trunk|primary/.test(t.highway), larg = grande ? 16 : /secondary|tertiary/.test(t.highway) ? 10 : /pedestrian|footway|cycleway|path/.test(t.highway) ? 3.5 : 8;
      pontes.push({ nome: t.name || "", tipo: t.highway, larg: +(t["width"] || larg), camadas: +(t.layer || 1), P: dp(P, 1.5, false).map(([x, z]) => [r0(x), r0(z)]) });
      continue;
    }
    if (t.man_made === "pier" || t.man_made === "quay" || t.man_made === "breakwater") { piers.push(dp(P, 1.2, dist(P[0], P.at(-1)) < 0.5).map(([x, z]) => [r0(x), r0(z)])); continue; }
    if (dist(P[0], P.at(-1)) > 1) continue; // só áreas fechadas daqui para a frente
    const Q = P.slice(0, -1);
    if (t.leisure === "pitch" || t.leisure === "track" || t.leisure === "stadium") campos.push([1, ...dp(Q, 2, true).flatMap(([x, z]) => [r0(x), r0(z)]), t.name || ""]);
    else if (t.leisure === "park" || t.leisure === "garden" || t.landuse === "grass" || t.landuse === "flowerbed" || t.landuse === "recreation_ground" || t.natural === "grassland") verde.push([1, ...dp(Q, 3, true).flatMap(([x, z]) => [r0(x), r0(z)])]);
    else if (t.natural === "wood" || t.natural === "scrub" || t.landuse === "forest") verde.push([2, ...dp(Q, 3, true).flatMap(([x, z]) => [r0(x), r0(z)])]);
  }
  console.log(`   ${verde.length} áreas verdes, ${campos.length} campos, ${arvores.length} árvores, ${pontes.length} pontes, ${piers.length} cais`);

  // ---- prédios ----
  const marcosMundo = Object.entries(MARCOS).map(([id, [nome, lat, lon]]) => [+id, nome, ...f(lon, lat)]);
  const num = (v) => { const x = parseFloat(String(v).replace(",", ".")); return Number.isFinite(x) ? x : null; };
  const alturaDe = (t, A, h) => {
    if (num(t.height)) return num(t.height);
    if (num(t["building:levels"])) return num(t["building:levels"]) * 3.4 + 2;
    const tipo = t.building, base = { house: 2, residential: 12, apartments: 14, commercial: 12, retail: 4, office: 16, hotel: 14, civic: 4, public: 4, church: 3, government: 6, industrial: 3, warehouse: 3, hospital: 8, school: 4, university: 5, parking: 5, transportation: 3, roof: 1, shed: 1, service: 2, ruins: 1, construction: 8 }[tipo] ?? 7;
    return Math.max(4, Math.round(base * (0.7 + h * 0.8) * (A > 6000 ? 1.2 : 1)) * 3.4);
  };
  const flyerMundo = f(FLYER[1], FLYER[0]), lista = [];
  for (const e of predios) {
    const t = e.tags || {};
    let ag = null;
    if (e.type === "way" && e.geometry) ag = e.geometry; else if (e.type === "relation") { const ext = (e.members || []).find((m) => m.role === "outer" && m.geometry); ag = ext && ext.geometry; }
    if (!ag || ag.length < 4) continue;
    let P = anel(ag); if (dist(P[0], P.at(-1)) < 0.01) P.pop();
    const A = Math.abs(area(P)) * metroPorUnidade * metroPorUnidade;
    if (A < 45) continue;
    P = dp(P, 2.2, true); if (P.length < 3) continue;
    if (area(P) > 0) P.reverse();
    const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cz = P.reduce((s, p) => s + p[1], 0) / P.length;
    const h = hash(e.id), alt = alturaDe(t, A, h);
    let esp = 0; for (const [id, , mx, mz] of marcosMundo) if (dentro(P, mx, mz)) { esp = id; break; }
    if (!esp && t.name) for (const [re, codigo] of ESP_POR_NOME) if (re.test(t.name)) { esp = codigo; break; }
    if (!esp && Math.hypot(cx - flyerMundo[0], cz - flyerMundo[1]) < 40 * k && alt > 60) continue; // os segmentos do aro da roda (building:part de 117 a 165 m)
    const q = maisPerto(cx, cz, 4000), dpista = q ? q.d : 1e9;
    // o que importa: tudo que passa de 28 m (o skyline), o que está perto da pista (até 520 m, a partir de 8 m) e os marcos
    if (!esp && !(alt >= 28 || (dpista < 1900 && alt >= 8))) continue;
    if (!esp && alt < 28 && A < 120 && dpista > 900) continue;
    lista.push({ id: e.id, P, alt, esp, cor: Math.floor(hash(e.id + "c") * 8) % 8, A, cx, cz, nome: t.name || "" });
  }
  // os marcos que não acharam prédio: o maior prédio perto do ponto
  const achados = new Set(lista.map((b) => b.esp));
  for (const [id, nome, mx, mz] of marcosMundo) {
    if (achados.has(id)) continue;
    let melhor = null; for (const b of lista) { if (b.esp) continue; const d = dist([b.cx, b.cz], [mx, mz]); if (d < 22 * k && (!melhor || b.A > melhor.A)) melhor = b; }
    if (melhor) melhor.esp = id; else console.log(`   (o marco ${nome} não achou prédio; a peça entra no ponto dele)`);
  }
  // os prédios que ficariam em cima da pista ou do muro andam para trás, inteiros (a pista do jogo é mais larga que a real)
  const D0 = c.D0 ?? 84 / 2 + 14 + 22;
  let empurrados = 0;
  for (const b of lista) {
    if (b.esp) continue;
    for (let volta = 0; volta < 6; volta++) {
      let pior = null;
      const testar = (x, z) => { const q = maisPerto(x, z, D0 + 80); if (q && q.d < D0 && (!pior || q.d < pior.d)) pior = { d: q.d, x, z, p: q.p }; };
      for (let i = 0; i < b.P.length; i++) { const a = b.P[i], d = b.P[(i + 1) % b.P.length]; testar(a[0], a[1]); testar((a[0] + d[0]) / 2, (a[1] + d[1]) / 2); }
      if (!pior) break;
      let dx = pior.x - pior.p.x, dz = pior.z - pior.p.y; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const falta = D0 - pior.d + 1;
      for (const p of b.P) { p[0] += dx * falta; p[1] += dz * falta; } b.cx += dx * falta; b.cz += dz * falta; if (volta === 0) empurrados++;
    }
  }
  console.log(`   ${lista.length} prédios, ${empurrados} empurrados para trás`);
  const saida = lista.map((b) => [r0(b.alt * 2), b.esp * 8 + b.cor, ...b.P.flatMap(([x, z]) => [r0(x), r0(z)])]);

  const MUNDO = 1600 * S;
  const dados = {
    versao: 1,
    projecao: { k: +k.toFixed(4), vk: 3, mundo: r0(MUNDO), lon0: P0.lon0, lat0: P0.lat0, kx: P0.kx, ky: P0.ky, cx: P0.cx, cy: P0.cy, scale: S },
    marcos: Object.fromEntries(marcosMundo.map(([id, nome, x, z]) => [nome, [r0(x), r0(z)]])),
    frac: fr,
    agua: aguaAneis.map((P) => P.map(([x, z]) => [r0(x), r0(z)])),
    rios, pontes, piers, verde, campos, arvores,
    predios: saida,
  };
  const cabecalho = `// GERADO por ferramentas/singapura-dados.js: não edite à mão. Dados reais de Singapura (Marina Bay) no mundo do jogo (x leste, z sul; 1 unidade = ${(1 / k).toFixed(3)} m).
// Prédios, água, parques, pontes e árvores: © colaboradores do OpenStreetMap (ODbL, https://www.openstreetmap.org/copyright), pela Overpass API. Traçado: bacinger/f1-circuits (MIT), ver pistas.js.
// predios: [altura em meios metros, esp * 8 + cor, x0, z0, x1, z1, ...] · verde: [tipo (1 jardim ou gramado, 2 mata), x0, z0, ...] · campos: [1, x0, z0, ..., nome] · agua: anéis de [x, z].
`;
  fs.writeFileSync(path.join(SAIDA, "dados.js"), cabecalho + "export default " + JSON.stringify(dados) + ";\n");
  console.log(`dados.js: ${(fs.statSync(path.join(SAIDA, "dados.js")).size / 1024).toFixed(0)} KB · ${lista.length} prédios · ${arvores.length} árvores · ${aguaAneis.length} anéis de água · ${pontes.length} pontes`);
};
