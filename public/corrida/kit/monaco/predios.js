// Mônaco — os prédios de verdade: cada planta do OpenStreetMap (kit/monaco/dados.js) vira um bloco com a altura real (`height`, os
// andares de `building:levels` ou, sem isso, um palpite pelo tipo), fachada de Mônaco (creme, ocre, rosa e salmão, com janelas,
// venezianas e sacadas), terraço plano com casa de máquinas ou telhado de telha nos prédios baixos da cidade velha. As paredes de
// todos os prédios de uma região são UMA malha (um material só, a cor vem dos vértices) e os telhados, outra: ~40 chamadas de
// desenho em vez de 1900. O terreno por baixo é o do relevo real, e cada prédio afunda até o ponto mais baixo da planta.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { D, poligonoDentro } from "./mundo.js";

const M_ALTURA = 5.0; // unidades de altura por metro de parede (os prédios usam a escala da planta; o morro é mais achatado)
const JANELA = 14.6, ANDAR = 15.5; // o módulo da fachada: 3,5 m de largura e 3,1 m de altura, em unidades do mundo
const CELULA = 640; // as malhas por região
const PAREDES = [[1, 0.93, 0.78], [0.96, 0.8, 0.54], [0.95, 0.74, 0.66], [0.93, 0.64, 0.52], [0.97, 0.96, 0.92], [0.97, 0.89, 0.6], [0.88, 0.82, 0.72], [0.9, 0.68, 0.62]]; // creme, ocre, rosa, salmão, gelo, amarelo, areia, terracota
const TERRACOS = [[0.8, 0.77, 0.72], [0.74, 0.71, 0.68], [0.84, 0.8, 0.74], [0.5, 0.62, 0.44]];
const TELHAS = [[0.72, 0.36, 0.25], [0.78, 0.42, 0.28], [0.66, 0.32, 0.24]];

// a fachada: 4 × 4 janelas numa textura quase branca (a cor da parede vem dos vértices, que multiplicam)
function texturaFachada() {
  return canvasTex(256, 256, (x, w, hh, rr) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 700; i++) { x.fillStyle = rr() < 0.5 ? "#0000000c" : "#ffffff22"; x.fillRect(rr() * w, rr() * hh, 3, 3); }
    for (let a = 0; a < 4; a++) for (let c = 0; c < 4; c++) {
      const x0 = c * 64, y0 = a * 64, aberta = rr() < 0.5;
      x.fillStyle = "#00000014"; x.fillRect(x0, y0 + 60, 64, 4); // a laje do andar
      x.fillStyle = "#e9e2d2"; x.fillRect(x0 + 18, y0 + 10, 28, 40); // a moldura
      x.fillStyle = aberta ? "#27323d" : "#3d5063"; x.fillRect(x0 + 21, y0 + 13, 22, 34); x.fillStyle = "#ffffff38"; x.fillRect(x0 + 23, y0 + 15, 7, 30);
      x.fillStyle = "#7d8f78"; if (aberta) { x.fillRect(x0 + 10, y0 + 13, 10, 34); x.fillRect(x0 + 44, y0 + 13, 10, 34); } // as venezianas verde-acinzentadas abertas
      x.fillStyle = "#0000002c"; if (aberta) for (let k = 0; k < 34; k += 4) { x.fillRect(x0 + 10, y0 + 13 + k, 10, 1); x.fillRect(x0 + 44, y0 + 13 + k, 10, 1); }
      if (rr() < 0.6) { x.fillStyle = "#f3eee4"; x.fillRect(x0 + 8, y0 + 47, 48, 5); x.fillStyle = "#33353a"; x.fillRect(x0 + 8, y0 + 37, 48, 2); for (let k = 10; k < 56; k += 4) x.fillRect(x0 + k, y0 + 37, 1, 10); } // a sacada de ferro
      if (rr() < 0.18) { const cor = ["#b3262f", "#2a6aa6", "#d9a21b", "#ffffff"][(rr() * 4) | 0]; for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? "#fbfaf6" : cor; x.fillRect(x0 + 14 + k * 6, y0 + 3, 6, 9); } } // o toldo
    }
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

// decodifica os prédios de dados.js e põe o terreno por baixo de cada um
export function lerPredios(tr) {
  const lista = [];
  for (const e of D.predios) {
    const P = []; for (let k = 2; k < e.length; k += 2) P.push([e[k], e[k + 1]]);
    if (P.length < 3) continue;
    if (area2(P) < 0) P.reverse(); // sentido fixo: as normais das paredes saem sempre para fora
    let cx = 0, cz = 0, x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of P) { cx += x; cz += z; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    cx /= P.length; cz /= P.length;
    let baixo = Infinity, alto = -Infinity; for (const [x, z] of [...P, [cx, cz]]) { const g = tr.chao(x, z) - 1.5; baixo = Math.min(baixo, g); alto = Math.max(alto, g); }
    const metros = e[0] / 2, h = metros <= 40 ? metros * M_ALTURA : 40 * M_ALTURA + (metros - 40) * M_ALTURA * 0.8;
    lista.push({ P, esp: e[1] >> 3, cor: e[1] & 7, metros, h, cx, cz, caixa: [x0, z0, x1, z1], baixo, alto, topo: alto + h, id: lista.length });
  }
  return lista;
}

// a grade de busca: qual prédio está em (x, z)? (para as árvores, os postes e os enfeites não nascerem dentro de um)
export function indiceDePredios(lista) {
  const C = 128, mapa = new Map(), k = (a, b) => a * 100003 + b;
  for (const b of lista) for (let i = Math.floor(b.caixa[0] / C); i <= Math.floor(b.caixa[2] / C); i++) for (let j = Math.floor(b.caixa[1] / C); j <= Math.floor(b.caixa[3] / C); j++) { const q = k(i, j); (mapa.get(q) || mapa.set(q, []).get(q)).push(b); }
  return (x, z, folga = 0) => {
    const l = mapa.get(k(Math.floor(x / C), Math.floor(z / C)));
    if (l) for (const b of l) { if (x < b.caixa[0] - folga || x > b.caixa[2] + folga || z < b.caixa[1] - folga || z > b.caixa[3] + folga) continue; if (poligonoDentro(b.P, x, z)) return b; if (folga > 0) { for (let i = 0; i < b.P.length; i++) { const a = b.P[i], c = b.P[(i + 1) % b.P.length], dx = c[0] - a[0], dz = c[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < folga) return b; } } }
    return null;
  };
}

export function predios(tr, add, lista) {
  const cel = new Map(), pegar = (b) => { const q = Math.floor(b.cx / CELULA) + "," + Math.floor(b.cz / CELULA); if (!cel.has(q)) cel.set(q, { par: new Malha(), tel: new Malha() }); return cel.get(q); };
  let paredes = 0, telhados = 0;
  for (const b of lista) {
    const { par, tel } = pegar(b), P = b.P, n = P.length, y0 = b.baixo - 3, y1 = b.topo, sementeB = hash(b.id + 11);
    const cor = PAREDES[b.cor];
    // as paredes: um painel por lado, com a fachada repetida pelo tamanho de verdade (janelas de 3,5 m, andares de 3,1 m)
    let u = sementeB * 4;
    for (let i = 0; i < n; i++) {
      const a = P[i], c = P[(i + 1) % n], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.5) continue;
      const nx = dz / l, nz = -dx / l, u0 = u, u1 = u + l / (JANELA * 4), v0 = 0, v1 = (y1 - y0) / (ANDAR * 4);
      const q = par.v(a[0], y0, a[1], nx, 0, nz, u0, v0, cor), r = par.v(c[0], y0, c[1], nx, 0, nz, u1, v0, cor), s = par.v(c[0], y1, c[1], nx, 0, nz, u1, v1, cor), t = par.v(a[0], y1, a[1], nx, 0, nz, u0, v1, cor);
      par.i.push(q, s, r, q, t, s); u = u1; paredes++; // o sentido anti-horário visto de fora
    }
    // o telhado: terraço plano (quase sempre) ou, nos prédios baixos e pequenos, quatro águas de telha
    const pequeno = Math.abs(area2(P)) / 2 < 1800 && b.metros < 16, telha = pequeno && hash(b.id + 3) < 0.45, topoCor = telha ? TELHAS[(hash(b.id + 5) * 3) | 0] : TERRACOS[(hash(b.id + 5) * 4) | 0];
    if (telha) {
      const apice = y1 + 6 + Math.sqrt(Math.abs(area2(P)) / 2) * 0.16, cn = tel.v(b.cx, apice, b.cz, 0, 1, 0, 0, 0, topoCor);
      for (let i = 0; i < n; i++) { const a = P[i], c = P[(i + 1) % n], ex = tel.v(a[0], y1, a[1], 0, 1, 0, 0, 0, topoCor), fx = tel.v(c[0], y1, c[1], 0, 1, 0, 0, 0, topoCor); tel.i.push(ex, cn, fx); }
      // a face de baixo do beiral não aparece; as normais de cima saem do cálculo das malhas (computeVertexNormals abaixo)
    } else {
      const contorno = P.map(([x, z]) => new THREE.Vector2(x, z)), tris = THREE.ShapeUtils.triangulateShape(contorno, []);
      const base = tel.p.length / 3; for (const [x, z] of P) tel.v(x, y1 + 0.4, z, 0, 1, 0, 0, 0, topoCor);
      for (const t of tris) { const [i, j, k] = t, A = P[i], B = P[j], C = P[k], cruz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]); if (cruz > 0) tel.i.push(base + i, base + k, base + j); else tel.i.push(base + i, base + j, base + k); }
      // a casa de máquinas e a caixa d'água no terraço dos prédios grandes
      if (Math.abs(area2(P)) / 2 > 700 && b.metros > 9) {
        const bx = b.cx + (hash(b.id + 7) - 0.5) * 8, bz = b.cz + (hash(b.id + 8) - 0.5) * 8; if (poligonoDentro(P, bx, bz)) {
          const w = 14 + hash(b.id + 9) * 12, hh = 9 + hash(b.id + 10) * 8, c2 = [0.72, 0.7, 0.66], top = y1 + 0.4 + hh;
          for (const [px, pz, qx, qz, nx, nz] of [[bx - w, bz - w, bx + w, bz - w, 0, -1], [bx + w, bz - w, bx + w, bz + w, 1, 0], [bx + w, bz + w, bx - w, bz + w, 0, 1], [bx - w, bz + w, bx - w, bz - w, -1, 0]]) {
            const q = tel.v(px, y1, pz, nx, 0, nz, 0, 0, c2), r = tel.v(qx, y1, qz, nx, 0, nz, 0, 0, c2), s = tel.v(qx, top, qz, nx, 0, nz, 0, 0, c2), t = tel.v(px, top, pz, nx, 0, nz, 0, 0, c2); tel.i.push(q, s, r, q, t, s);
          }
          const q = tel.v(bx - w, top, bz - w, 0, 1, 0, 0, 0, c2), r = tel.v(bx + w, top, bz - w, 0, 1, 0, 0, 0, c2), s = tel.v(bx + w, top, bz + w, 0, 1, 0, 0, 0, c2), t = tel.v(bx - w, top, bz + w, 0, 1, 0, 0, 0, c2); tel.i.push(q, t, s, q, s, r);
        }
      }
    }
    telhados++;
  }
  const matParede = new THREE.MeshStandardMaterial({ map: texturaFachada(), vertexColors: true, roughness: 0.85 }), matTelhado = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  let malhas = 0;
  for (const { par, tel } of cel.values()) {
    const gp = par.geometria(), gt = tel.geometria();
    if (gp) { const m = add(new THREE.Mesh(gp, matParede)); m.castShadow = m.receiveShadow = true; m.name = "monaco-predios"; malhas++; }
    if (gt) { gt.computeVertexNormals(); const m = add(new THREE.Mesh(gt, matTelhado)); m.castShadow = m.receiveShadow = true; m.name = "monaco-telhados"; malhas++; }
  }
  tr.prediosMonaco = { predios: lista.length, paredes, telhados, malhas };
}
