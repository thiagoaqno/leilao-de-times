// Las Vegas — os prédios de verdade: cada planta do OpenStreetMap (kit/lasvegas/dados.js) vira um bloco com a altura real (`height`, os andares de `building:levels` ou um
// palpite pelo tipo). Os resorts da Strip têm a fachada que têm nas fotos (o bronze do Wynn e do Encore, o vidro escuro com as faixas azuis do Cosmopolitan, o azul do
// Planet Hollywood, o rosa do Flamingo, o creme do Caesars e do Paris, o dourado do Venetian e do Palazzo) e, de noite, as janelas acesas e o contorno de neon de cada
// um. As paredes de todos os prédios de uma região são UMA malha (a cor vem dos vértices), o vidro outra, os telhados outra e o neon outra: poucas chamadas de desenho
// para ~2 mil prédios. Os prédios que a pista larga do jogo atropelaria andam para trás, inteiros, até a distância da barreira.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { D, K, ALT, poligonoDentro } from "./mundo.js";
import { emissivoDaNoite, soDeNoite } from "../bahrein/base.js";

const M_ALTURA = K * ALT; // unidades de altura por metro de parede
const JANELA = 3.2 * K, ANDAR = 3.6 * M_ALTURA; // o módulo da fachada em unidades do mundo
const CELULA = 1500;
const hash = (n) => { let h = (n * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; return (h >>> 0) / 4294967296; };
const area2 = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s; };
const rgb = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };

// o estilo de cada resort (esp de dados.js): `v` = vidro (torre de cortina) ou parede (estuque), cor da fachada e cor do neon do contorno
export const ESTILO = {
  0: { cores: [[0.78, 0.72, 0.62], [0.7, 0.66, 0.6], [0.84, 0.8, 0.72], [0.62, 0.6, 0.58], [0.86, 0.78, 0.66], [0.74, 0.7, 0.66], [0.8, 0.74, 0.64], [0.68, 0.64, 0.56]], vidros: [[0.36, 0.46, 0.55], [0.42, 0.5, 0.58], [0.3, 0.38, 0.46], [0.5, 0.56, 0.6]] },
  2: { cor: [0.9, 0.78, 0.6], neon: "#ffd28a", tipo: "parede" }, // Bellagio: pedra bege-rosada
  3: { cor: [0.95, 0.92, 0.84], neon: "#ffe4b8", tipo: "parede" }, // Caesars Palace: o creme romano
  4: { cor: [0.86, 0.78, 0.68], neon: "#ffa07a", tipo: "parede" }, // Paris
  5: { cor: [0.92, 0.8, 0.55], neon: "#ffd36a", tipo: "parede" }, // The Venetian: o dourado
  6: { cor: [0.9, 0.78, 0.56], neon: "#ffd36a", tipo: "vidro" }, // The Palazzo
  7: { cor: [0.62, 0.42, 0.24], neon: "#ffb25a", tipo: "vidro" }, // Wynn: o bronze
  8: { cor: [0.66, 0.36, 0.26], neon: "#ff8a5a", tipo: "vidro" }, // Encore: o bronze avermelhado
  9: { cor: [0.2, 0.28, 0.38], neon: "#4aa8ff", tipo: "vidro" }, // Cosmopolitan: vidro escuro e as faixas azuis
  10: { cor: [0.2, 0.42, 0.72], neon: "#ffb02a", tipo: "vidro" }, // Planet Hollywood: o azul e o dourado
  11: { cor: [0.92, 0.6, 0.68], neon: "#ff4fa0", tipo: "parede" }, // Flamingo: o rosa
  12: { cor: [0.82, 0.8, 0.8], neon: "#7fd2ff", tipo: "parede" }, // The LINQ
  13: { cor: [0.94, 0.88, 0.74], neon: "#ffc860", tipo: "parede" }, // Treasure Island
  14: { cor: [0.72, 0.6, 0.34], neon: "#ffe27a", tipo: "vidro" }, // The Mirage: vidro dourado
  15: { cor: [0.62, 0.7, 0.82], neon: "#ff6a5a", tipo: "parede" }, // Harrah's
  16: { cor: [0.86, 0.82, 0.74], neon: "#ffb86a", tipo: "parede" }, // Bally's
  20: { cor: [0.5, 0.62, 0.7], neon: "#9be0ff", tipo: "vidro" }, // Aria, Vdara, Park MGM
  21: { cor: [0.92, 0.88, 0.78], neon: "#ffe4b8", tipo: "parede" }, // Forum Shops
};

// a fachada de estuque: 8 x 8 janelas retangulares fundas numa parede quase branca (a cor vem dos vértices)
function texturaParede() {
  return canvasTex(256, 256, (x, w, hh, rr) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 500; i++) { x.fillStyle = rr() < 0.5 ? "#0000000b" : "#ffffff26"; x.fillRect(rr() * w, rr() * hh, 3, 2); }
    for (let a = 0; a < 8; a++) for (let c = 0; c < 8; c++) {
      const x0 = c * 32, y0 = a * 32;
      x.fillStyle = "#00000012"; x.fillRect(x0, y0 + 29, 32, 3); // a junta do andar
      x.fillStyle = "#33414f"; x.fillRect(x0 + 7, y0 + 6, 18, 19); x.fillStyle = "#ffffff26"; x.fillRect(x0 + 8, y0 + 7, 5, 14); // a janela e o brilho do vidro
      x.fillStyle = "#e9e4d8"; x.fillRect(x0 + 5, y0 + 4, 22, 2); x.fillRect(x0 + 5, y0 + 25, 22, 2); // a moldura e o peitoril
    }
  });
}
function texturaParedeLuz() { // as janelas acesas à noite: a maioria, em tons quentes de quarto de hotel
  return canvasTex(256, 256, (x, w, hh, rr) => {
    x.fillStyle = "#000000"; x.fillRect(0, 0, w, hh);
    for (let a = 0; a < 8; a++) for (let c = 0; c < 8; c++) { if (rr() > 0.8) continue; const x0 = c * 32, y0 = a * 32; x.fillStyle = rr() < 0.2 ? "#fff0cf" : rr() < 0.55 ? "#ffd88a" : "#ffc766"; x.fillRect(x0 + 7, y0 + 6, 18, 19); }
  });
}
// a cortina de vidro: 8 faixas por 16 andares de vidro escuro com a laje de cada andar
function texturaVidro() {
  return canvasTex(128, 256, (x, w, hh, rr) => {
    x.fillStyle = "#b9c4cc"; x.fillRect(0, 0, w, hh);
    for (let a = 0; a < 16; a++) for (let c = 0; c < 8; c++) { x.fillStyle = rr() < 0.12 ? "#7f9fb6" : "#3d566b"; x.fillRect(c * 16 + 1, a * 16 + 2, 14, 12); x.fillStyle = "#ffffff30"; x.fillRect(c * 16 + 2, a * 16 + 3, 4, 8); }
  });
}
function texturaVidroLuz(chance, quente) {
  return canvasTex(128, 256, (x, w, hh, rr) => { x.fillStyle = "#000000"; x.fillRect(0, 0, w, hh); for (let a = 0; a < 16; a++) for (let c = 0; c < 8; c++) if (rr() < chance) { x.fillStyle = quente ? (rr() < 0.15 ? "#fff0cf" : rr() < 0.5 ? "#ffd88a" : "#ffc060") : (rr() < 0.2 ? "#e4f2ff" : rr() < 0.5 ? "#ffd48a" : "#ffc266"); x.fillRect(c * 16 + 1, a * 16 + 2, 14, 12); } });
}

class Malha {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.i = []; }
  v(x, y, z, nx, ny, nz, u, vv, c) { const k = this.p.length / 3; this.p.push(x, y, z); this.n.push(nx, ny, nz); this.uv.push(u, vv); this.c.push(c[0], c[1], c[2]); return k; }
  geometria() {
    if (!this.i.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i); return g;
  }
}

// a distância mínima da linha central até onde um prédio pode chegar, no ponto (x, z): a borda do asfalto, a barreira e uma calçada
export function foraDoCaminho(tr, x, z) {
  const i = tr.indiceAt(x, z), { pts } = tr, p = pts[i], lado = (x - p.x) * p.nx + (z - p.y) * p.ny >= 0 ? 1 : -1, r = tr.murosEscape?.[lado]?.[i] || 0;
  return tr.W / 2 + (r !== 0 ? r + 40 : 40);
}

// decodifica os prédios de dados.js; os que a pista larga atropelaria andam para trás, inteiros
export function lerPredios(tr) {
  const lista = []; let empurrados = 0, descartados = 0;
  for (const e of D.predios) {
    const P = []; for (let k = 2; k < e.length; k += 2) P.push([e[k], e[k + 1]]);
    if (P.length < 3) continue;
    if (area2(P) < 0) P.reverse();
    const esp = e[1] >> 3, metros = e[0] / 2;
    let moveu = false;
    for (let volta = 0; volta < 7; volta++) {
      let pior = null;
      const testa = (x, z) => { const d = tr.distAt(x, z), f = foraDoCaminho(tr, x, z); if (d < f && (!pior || f - d > pior.falta)) pior = { x, z, falta: f - d }; };
      for (let i = 0; i < P.length; i++) { const a = P[i], c = P[(i + 1) % P.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]), passos = Math.max(1, Math.ceil(l / 8)); for (let s = 0; s <= passos; s++) { const t = s / passos; testa(a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t); } }
      if (!pior) break;
      const q = tr.pts[tr.indiceAt(pior.x, pior.z)]; let dx = pior.x - q.x, dz = pior.z - q.y; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      for (const v of P) { v[0] += dx * (pior.falta + 1); v[1] += dz * (pior.falta + 1); } moveu = true;
    }
    if (moveu) empurrados++;
    let ainda = false; for (const [x, z] of P) if (tr.distAt(x, z) < foraDoCaminho(tr, x, z) - 2) { ainda = true; break; }
    if (ainda) { descartados++; continue; }
    let cx = 0, cz = 0, x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of P) { cx += x; cz += z; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    cx /= P.length; cz /= P.length;
    let baixo = Infinity, alto = -Infinity; for (const [x, z] of [...P, [cx, cz]]) { const g = tr.chao(x, z) - 1.5; baixo = Math.min(baixo, g); alto = Math.max(alto, g); }
    const alturaReal = metros * M_ALTURA, perto = tr.distAt(cx, cz) < 300, h = Math.max(perto ? 26 : 14, alturaReal);
    lista.push({ P, esp, cor: e[1] & 7, metros, h, cx, cz, caixa: [x0, z0, x1, z1], baixo, alto, topo: alto + h, id: lista.length });
  }
  tr.prediosLV = { empurrados, descartados };
  return lista;
}

// a grade de busca: qual prédio está em (x, z)? (para as árvores, os postes e os enfeites não nascerem dentro de um)
export function indiceDePredios(lista) {
  const C = 128, mapa = new Map(), k = (a, b) => a * 100003 + b;
  for (const b of lista) for (let i = Math.floor(b.caixa[0] / C); i <= Math.floor(b.caixa[2] / C); i++) for (let j = Math.floor(b.caixa[1] / C); j <= Math.floor(b.caixa[3] / C); j++) { const q = k(i, j); (mapa.get(q) || mapa.set(q, []).get(q)).push(b); }
  return (x, z, folga = 0) => {
    const l = mapa.get(k(Math.floor(x / C), Math.floor(z / C)));
    if (l) for (const b of l) {
      if (x < b.caixa[0] - folga || x > b.caixa[2] + folga || z < b.caixa[1] - folga || z > b.caixa[3] + folga) continue;
      if (poligonoDentro(b.P, x, z)) return b;
      if (folga > 0) for (let i = 0; i < b.P.length; i++) { const a = b.P[i], c = b.P[(i + 1) % b.P.length], dx = c[0] - a[0], dz = c[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < folga) return b; }
    }
    return null;
  };
}

export function predios(tr, add, lista) {
  const cel = new Map(), pegar = (b) => { const q = Math.floor(b.cx / CELULA) + "," + Math.floor(b.cz / CELULA); if (!cel.has(q)) cel.set(q, { par: new Malha(), vid: new Malha(), res: new Malha(), tel: new Malha(), neon: new Malha() }); return cel.get(q); };
  let paredes = 0, vidros = 0, neons = 0;
  const geral = ESTILO[0];
  for (const b of lista) {
    if (b.esp === 1 || b.esp === 17 || b.esp === 18 || b.esp === 19) continue; // o Sphere, o prédio dos boxes, a High Roller e a Torre Eiffel têm peça própria (marcos.js e reta.js)
    const { par, vid, res, tel, neon } = pegar(b), P = b.P, n = P.length, y0 = b.baixo - 3, y1 = b.topo, est = b.esp ? ESTILO[b.esp] : null;
    const moderno = est ? est.tipo === "vidro" : b.metros > 32 && hash(b.id + 17) < 0.7;
    const malha = moderno ? (est ? res : vid) : par, cor = est ? est.cor.map((c, i) => Math.max(0, Math.min(1, c * (0.94 + hash(b.id * 3 + i) * 0.12)))) : moderno ? geral.vidros[(hash(b.id + 2) * 4) | 0] : geral.cores[b.cor];
    let u = hash(b.id + 11) * 4;
    for (let i = 0; i < n; i++) {
      const a = P[i], c = P[(i + 1) % n], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.5) continue;
      const nx = dz / l, nz = -dx / l, u0 = u, u1 = u + l / (JANELA * 8), v1 = (y1 - y0) / (moderno ? ANDAR * 16 : ANDAR * 8);
      const q = malha.v(a[0], y0, a[1], nx, 0, nz, u0, 0, cor), r = malha.v(c[0], y0, c[1], nx, 0, nz, u1, 0, cor), s = malha.v(c[0], y1, c[1], nx, 0, nz, u1, v1, cor), t = malha.v(a[0], y1, a[1], nx, 0, nz, u0, v1, cor);
      malha.i.push(q, s, r, q, t, s); u = u1; if (moderno) vidros++; else paredes++;
    }
    const topoCor = [0.3, 0.3, 0.32], tris = THREE.ShapeUtils.triangulateShape(P.map(([x, z]) => new THREE.Vector2(x, z)), []), base = tel.p.length / 3;
    for (const [x, z] of P) tel.v(x, y1 + 0.4, z, 0, 1, 0, 0, 0, topoCor);
    for (const [i, j, k] of tris) { const A = P[i], B = P[j], C = P[k], cruz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]); if (cruz > 0) tel.i.push(base + i, base + k, base + j); else tel.i.push(base + i, base + j, base + k); }
    // o neon do contorno: uma faixa luminosa em volta do alto de cada resort e, nas torres, mais algumas pelo corpo (só de noite)
    if (est?.neon && b.metros > 12 && n <= 40) {
      const cn = rgb(est.neon), faixas = b.metros > 60 ? [0.985, 0.78, 0.56, 0.34] : [0.985];
      for (const fr of faixas) {
        const yy = y0 + (y1 - y0) * fr;
        for (let i = 0; i < n; i++) {
          const a = P[i], c = P[(i + 1) % n], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); if (l < 2) continue;
          const nx = dz / l, nz = -dx / l, e = 0.9, g = fr > 0.9 ? 2.2 : 1.1;
          const q = neon.v(a[0] + nx * e, yy - g, a[1] + nz * e, nx, 0, nz, 0, 0, cn), r = neon.v(c[0] + nx * e, yy - g, c[1] + nz * e, nx, 0, nz, 0, 0, cn), s = neon.v(c[0] + nx * e, yy + g, c[1] + nz * e, nx, 0, nz, 0, 0, cn), t = neon.v(a[0] + nx * e, yy + g, a[1] + nz * e, nx, 0, nz, 0, 0, cn);
          neon.i.push(q, s, r, q, t, s); neons++;
        }
      }
    }
  }
  const matParede = emissivoDaNoite(tr, new THREE.MeshStandardMaterial({ map: texturaParede(), vertexColors: true, roughness: 0.9, emissive: 0xffffff, emissiveMap: texturaParedeLuz() }), 0, 0.9);
  const matVidro = emissivoDaNoite(tr, new THREE.MeshStandardMaterial({ map: texturaVidro(), vertexColors: true, roughness: 0.28, metalness: 0.25, emissive: 0xffffff, emissiveMap: texturaVidroLuz(0.7, false) }), 0, 1.0);
  const matResort = emissivoDaNoite(tr, new THREE.MeshStandardMaterial({ map: texturaVidro(), vertexColors: true, roughness: 0.3, metalness: 0.3, emissive: 0xffffff, emissiveMap: texturaVidroLuz(0.95, true) }), 0, 1.15);
  const matTelhado = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  const matNeon = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false, fog: true }); matNeon.userData.bloom = 2.2;
  let malhas = 0;
  for (const { par, vid, res, tel, neon } of cel.values()) {
    for (const [g, mat, nome] of [[par.geometria(), matParede, "predios"], [vid.geometria(), matVidro, "torres"], [res.geometria(), matResort, "resorts"], [tel.geometria(), matTelhado, "telhados"], [neon.geometria(), matNeon, "neon"]]) {
      if (!g) continue; if (nome === "telhados") g.computeVertexNormals();
      const m = add(new THREE.Mesh(g, mat)); m.castShadow = m.receiveShadow = nome !== "neon"; m.name = `lasvegas-${nome}`; malhas++;
      if (nome === "neon") { soDeNoite(tr, m); m.userData.semContato = true; }
    }
  }
  tr.prediosLVMalhas = { predios: lista.length, paredes, vidros, neons, malhas };
}
