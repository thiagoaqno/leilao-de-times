// Baku — os prédios de verdade: cada planta do OpenStreetMap (kit/baku/dados.js) vira um bloco com a altura real (`height`, os andares de
// `building:levels` ou um palpite pelo tipo), com a fachada do Baku Oil Boom (séculos XIX e XX): arenito de Absheron, calcário bege e cinza,
// janelas em arco com moldura de pedra, pilastras, cornija, sacadas de ferro forjado e o térreo em arcos rústicos; os edifícios altos e modernos
// de vidro escuro. As paredes de todos os prédios de uma região são UMA malha (um material só, a cor vem dos vértices), o vidro outra e os
// telhados outra: poucas chamadas de desenho para ~2 mil prédios. Os prédios que a pista larga do jogo atropelaria andam para trás, inteiros,
// até a distância da barreira (a Cidade Velha chega a 9 unidades da barreira, como nas fotos).
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { D, poligonoDentro, distanciaDoMar } from "./mundo.js";
import { emissivoDaNoite } from "../bahrein/base.js";

const K = D.projecao.k, M_ALTURA = K * 1.35; // unidades de altura por metro de parede (um pouco exagerada: o jogo é mais largo que a rua)
const JANELA = 3.4 * K, ANDAR = 3.3 * K * 1.2; // o módulo da fachada em unidades do mundo
const CELULA = 1600;
const PEDRAS = [[0.9, 0.7, 0.42], [0.86, 0.66, 0.4], [0.93, 0.77, 0.52], [0.78, 0.67, 0.5], [0.94, 0.82, 0.6], [0.76, 0.6, 0.38], [0.84, 0.74, 0.58], [0.9, 0.68, 0.4]]; // arenito de Absheron: ocre, amarelado e cinza-bege, mais escuro que o creme
const TERRACOS = [[0.62, 0.6, 0.57], [0.72, 0.69, 0.64], [0.55, 0.54, 0.52], [0.68, 0.45, 0.36]];
const VIDROS = [[0.22, 0.34, 0.45], [0.28, 0.4, 0.5], [0.18, 0.26, 0.34], [0.34, 0.45, 0.52]];

// a fachada: 4 × 4 janelas numa textura quase branca (a cor da pedra vem dos vértices, que multiplicam)
function texturaPedra() {
  return canvasTex(256, 256, (x, w, hh, rr) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 900; i++) { x.fillStyle = rr() < 0.5 ? "#0000000d" : "#ffffff26"; x.fillRect(rr() * w, rr() * hh, 3, 2); } // o arenito é áspero e manchado
    for (let a = 0; a < 4; a++) for (let c = 0; c < 4; c++) {
      const x0 = c * 64, y0 = a * 64;
      x.fillStyle = "#00000016"; x.fillRect(x0, y0 + 61, 64, 3); // a junta do andar
      x.fillStyle = "#f4efe3"; x.fillRect(x0 + 2, y0, 4, 64); x.fillRect(x0 + 58, y0, 4, 64); // as pilastras
      x.fillStyle = "#00000012"; x.fillRect(x0 + 6, y0, 1, 64); x.fillRect(x0 + 57, y0, 1, 64);
      const arco = (a + c) % 3 !== 1; // arco ou verga reta
      x.fillStyle = "#efe8d8"; x.beginPath(); x.moveTo(x0 + 15, y0 + 52); x.lineTo(x0 + 15, y0 + 21); if (arco) x.arc(x0 + 32, y0 + 21, 17, Math.PI, 0); else { x.lineTo(x0 + 15, y0 + 8); x.lineTo(x0 + 49, y0 + 8); } x.lineTo(x0 + 49, y0 + 52); x.closePath(); x.fill(); // a moldura de pedra
      x.fillStyle = (a * 5 + c * 3) % 7 < 2 ? "#303a46" : "#40505f"; x.beginPath(); x.moveTo(x0 + 19, y0 + 50); x.lineTo(x0 + 19, y0 + 22); if (arco) x.arc(x0 + 32, y0 + 22, 13, Math.PI, 0); else { x.lineTo(x0 + 19, y0 + 12); x.lineTo(x0 + 45, y0 + 12); } x.lineTo(x0 + 45, y0 + 50); x.closePath(); x.fill();
      x.fillStyle = "#ffffff30"; x.fillRect(x0 + 21, y0 + 24, 6, 24); // o brilho do vidro
      x.fillStyle = "#e4dccb"; x.fillRect(x0 + 12, y0 + 51, 40, 4); // o peitoril
      if ((a * 3 + c * 5) % 5 < 3) { x.fillStyle = "#1c1d21"; x.fillRect(x0 + 8, y0 + 40, 48, 2); x.fillRect(x0 + 8, y0 + 53, 48, 2); for (let k = 10; k < 56; k += 4) x.fillRect(x0 + k, y0 + 41, 1, 12); x.fillStyle = "#e4dccb"; x.fillRect(x0 + 6, y0 + 53, 52, 4); } // a sacada de ferro forjado
      if (rr() < 0.07) { x.fillStyle = "#5c5348"; x.fillRect(x0 + 24, y0 + 45, 16, 7); } // o ar-condicionado
    }
    x.fillStyle = "#00000020"; x.fillRect(0, hh - 5, w, 5); x.fillStyle = "#fbf8f0"; x.fillRect(0, 0, w, 4); // a cornija a cada quatro andares
  });
}
// a luz das janelas de noite: as mesmas janelas da fachada, só algumas acesas (amarelo quente), no mapa emissivo
function texturaLuz() {
  return canvasTex(256, 256, (x, w, hh, rr) => {
    x.fillStyle = "#000000"; x.fillRect(0, 0, w, hh);
    for (let a = 0; a < 4; a++) for (let c = 0; c < 4; c++) {
      if (rr() > 0.45) continue; const x0 = c * 64, y0 = a * 64, arco = (a + c) % 3 !== 1;
      x.fillStyle = rr() < 0.3 ? "#ffe9b0" : "#ffbf5e"; x.beginPath(); x.moveTo(x0 + 19, y0 + 50); x.lineTo(x0 + 19, y0 + 22); if (arco) x.arc(x0 + 32, y0 + 22, 13, Math.PI, 0); else { x.lineTo(x0 + 19, y0 + 12); x.lineTo(x0 + 45, y0 + 12); } x.lineTo(x0 + 45, y0 + 50); x.closePath(); x.fill();
    }
  });
}
function texturaLuzVidro() {
  return canvasTex(128, 128, (x, w, hh, rr) => { x.fillStyle = "#000000"; x.fillRect(0, 0, w, hh); for (let a = 0; a < 8; a++) for (let c = 0; c < 4; c++) if (rr() < 0.5) { x.fillStyle = rr() < 0.25 ? "#d8f0ff" : "#ffd58a"; x.fillRect(c * 32 + 2, a * 16 + 2, 28, 12); } });
}
function texturaVidro() { // as torres modernas: faixas de vidro escuro e montantes
  return canvasTex(128, 128, (x, w, hh, rr) => {
    x.fillStyle = "#cfd8de"; x.fillRect(0, 0, w, hh);
    for (let a = 0; a < 8; a++) for (let c = 0; c < 4; c++) { x.fillStyle = rr() < 0.15 ? "#8fb2c8" : "#46657c"; x.fillRect(c * 32 + 2, a * 16 + 2, 28, 12); x.fillStyle = "#ffffff30"; x.fillRect(c * 32 + 3, a * 16 + 3, 8, 10); }
  });
}

const area2 = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s; };
const hash = (n) => { let h = (n * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; return (h >>> 0) / 4294967296; };

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

// a distância mínima da linha central até onde um prédio pode chegar, no ponto (x, z): a borda do asfalto, a barreira (que pode entrar na pista,
// na Cidade Velha) e uma calçada de 9 unidades. `tr.murosEscape` é o mesmo mapa da física e do desenho das barreiras.
export function foraDoCaminho(tr, x, z) {
  const i = tr.indiceAt(x, z), { pts } = tr, p = pts[i], lado = (x - p.x) * p.nx + (z - p.y) * p.ny >= 0 ? 1 : -1, r = tr.murosEscape?.[lado]?.[i] || 0;
  return tr.W / 2 + (r !== 0 ? r + 10 : 20);
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
    for (let volta = 0; volta < 7; volta++) { // acha o ponto da planta mais dentro da folga e empurra o prédio inteiro para fora
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
    if (distanciaDoMar(cx, cz) > -6) { descartados++; continue; } // em cima da água (píer, plataforma): fora
    let baixo = Infinity, alto = -Infinity; for (const [x, z] of [...P, [cx, cz]]) { const g = tr.chao(x, z) - 1.5; baixo = Math.min(baixo, g); alto = Math.max(alto, g); }
    const alturaReal = metros * M_ALTURA, perto = tr.distAt(cx, cz) < 260, h = esp ? alturaReal : Math.max(perto ? 34 : 18, alturaReal);
    lista.push({ P, esp, cor: e[1] & 7, metros, h, cx, cz, caixa: [x0, z0, x1, z1], baixo, alto, topo: alto + h, id: lista.length });
  }
  tr.prediosBaku = { empurrados, descartados };
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

// um prédio só, para os marcos (o Palácio do Governo...): a planta extrudada com a mesma fachada de pedra, do chão mais baixo da planta até `y1`
let _matPedra = null;
export function blocoDePedra(add, P, y0, y1, cor = PEDRAS[0], nome = "baku-marco") {
  _matPedra ||= new THREE.MeshStandardMaterial({ map: texturaPedra(), vertexColors: true, roughness: 0.92 });
  const par = new Malha(), tel = new Malha(), n = P.length; let u = 0;
  for (let i = 0; i < n; i++) {
    const a = P[i], c = P[(i + 1) % n], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.5) continue;
    const nx = dz / l, nz = -dx / l, u1 = u + l / (JANELA * 4), v1 = (y1 - y0) / (ANDAR * 4);
    const q = par.v(a[0], y0, a[1], nx, 0, nz, u, 0, cor), r = par.v(c[0], y0, c[1], nx, 0, nz, u1, 0, cor), s = par.v(c[0], y1, c[1], nx, 0, nz, u1, v1, cor), t = par.v(a[0], y1, a[1], nx, 0, nz, u, v1, cor);
    par.i.push(q, s, r, q, t, s); u = u1;
  }
  const tris = THREE.ShapeUtils.triangulateShape(P.map(([x, z]) => new THREE.Vector2(x, z)), []), base = tel.p.length / 3; for (const [x, z] of P) tel.v(x, y1 + 0.4, z, 0, 1, 0, 0, 0, TERRACOS[0]);
  for (const [i, j, k] of tris) { const A = P[i], B = P[j], C = P[k], cruz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]); if (cruz > 0) tel.i.push(base + i, base + k, base + j); else tel.i.push(base + i, base + j, base + k); }
  const gp = par.geometria(), gt = tel.geometria(); gt.computeVertexNormals();
  const m1 = add(new THREE.Mesh(gp, _matPedra)), m2 = add(new THREE.Mesh(gt, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })));
  m1.castShadow = m1.receiveShadow = m2.receiveShadow = true; m1.name = nome; m2.name = nome + "-teto"; return [m1, m2];
}
export const PEDRA_BAKU = PEDRAS;

export function predios(tr, add, lista) {
  const cel = new Map(), pegar = (b) => { const q = Math.floor(b.cx / CELULA) + "," + Math.floor(b.cz / CELULA); if (!cel.has(q)) cel.set(q, { par: new Malha(), vid: new Malha(), tel: new Malha() }); return cel.get(q); };
  let paredes = 0, vidros = 0;
  for (const b of lista) {
    if (b.esp && b.esp < 7) continue; // os marcos têm peça própria (kit/baku/marcos.js); as torres Crescent (7 e 8) são prédios de vidro comuns, só altos
    const { par, vid, tel } = pegar(b), P = b.P, n = P.length, y0 = b.baixo - 3, y1 = b.topo, moderno = b.esp >= 7 || (b.metros > 45 && hash(b.id + 17) < 0.7);
    const malha = moderno ? vid : par, cor = moderno ? VIDROS[(hash(b.id + 2) * VIDROS.length) | 0] : PEDRAS[b.cor];
    let u = hash(b.id + 11) * 4;
    for (let i = 0; i < n; i++) {
      const a = P[i], c = P[(i + 1) % n], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.5) continue;
      const nx = dz / l, nz = -dx / l, u0 = u, u1 = u + l / (JANELA * 4), v1 = (y1 - y0) / (moderno ? ANDAR * 4 : ANDAR * 4);
      const q = malha.v(a[0], y0, a[1], nx, 0, nz, u0, 0, cor), r = malha.v(c[0], y0, c[1], nx, 0, nz, u1, 0, cor), s = malha.v(c[0], y1, c[1], nx, 0, nz, u1, v1, cor), t = malha.v(a[0], y1, a[1], nx, 0, nz, u0, v1, cor);
      malha.i.push(q, s, r, q, t, s); u = u1; if (moderno) vidros++; else paredes++;
    }
    const topoCor = TERRACOS[(hash(b.id + 5) * TERRACOS.length) | 0], contorno = P.map(([x, z]) => new THREE.Vector2(x, z)), tris = THREE.ShapeUtils.triangulateShape(contorno, []);
    const base = tel.p.length / 3; for (const [x, z] of P) tel.v(x, y1 + 0.4, z, 0, 1, 0, 0, 0, topoCor);
    for (const t of tris) { const [i, j, k] = t, A = P[i], B = P[j], C = P[k], cruz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]); if (cruz > 0) tel.i.push(base + i, base + k, base + j); else tel.i.push(base + i, base + j, base + k); }
    // a platibanda: uma faixa de pedra em volta do terraço (os prédios do Oil Boom têm cornija saliente)
    for (let i = 0; i < n && !moderno; i++) { const a = P[i], c = P[(i + 1) % n], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.5) continue; const nx = dz / l, nz = -dx / l, e = 1.6, q = tel.v(a[0] + nx * e, y1 - 3, a[1] + nz * e, nx, 0, nz, 0, 0, cor), r = tel.v(c[0] + nx * e, y1 - 3, c[1] + nz * e, nx, 0, nz, 0, 0, cor), s = tel.v(c[0] + nx * e, y1 + 3.2, c[1] + nz * e, nx, 0, nz, 0, 0, cor), t = tel.v(a[0] + nx * e, y1 + 3.2, a[1] + nz * e, nx, 0, nz, 0, 0, cor); tel.i.push(q, s, r, q, t, s); }
  }
  const matPedra = emissivoDaNoite(tr, new THREE.MeshStandardMaterial({ map: texturaPedra(), vertexColors: true, roughness: 0.92, emissive: 0xffffff, emissiveMap: texturaLuz() }), 0, 0.85), matVidro = emissivoDaNoite(tr, new THREE.MeshStandardMaterial({ map: texturaVidro(), vertexColors: true, roughness: 0.28, metalness: 0.2, emissive: 0xffffff, emissiveMap: texturaLuzVidro() }), 0, 0.9), matTelhado = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  let malhas = 0;
  for (const { par, vid, tel } of cel.values()) {
    for (const [g, mat, nome] of [[par.geometria(), matPedra, "predios"], [vid.geometria(), matVidro, "torres"], [tel.geometria(), matTelhado, "telhados"]]) {
      if (!g) continue; if (nome === "telhados") g.computeVertexNormals();
      const m = add(new THREE.Mesh(g, mat)); m.castShadow = m.receiveShadow = true; m.name = `baku-${nome}`; malhas++;
    }
  }
  tr.prediosBakuMalhas = { predios: lista.length, paredes, vidros, malhas };
}
