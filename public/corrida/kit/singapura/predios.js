// Singapura — os prédios de verdade: cada planta do OpenStreetMap (kit/singapura/dados.js) vira um bloco com a altura real (`height`, os andares de
// `building:levels` ou um palpite pelo tipo), fachada de vidro azul, verde e escuro, concreto branco ou granito, com janelas em textura; à noite as
// janelas acendem (emissiveMap, intensidade pelo laço da noite). As paredes de todos os prédios de uma região são UMA malha (cor por vértice) e os
// telhados outra: poucas chamadas de desenho em vez de 2 mil. Os prédios com peça própria (`esp` != 0: Marina Bay Sands, Flyer, Esplanade,
// Fullerton...) não entram aqui: ficam em marcos.js. O terreno por baixo é o da pista (quase plano) e cada prédio afunda até o ponto mais baixo.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { emissivoDaNoite } from "../bahrein/base.js";
import { D, K, distanciaDaAgua, poligonoDentro } from "./mundo.js";

const M_ALTURA = K * 1.0; // unidades de altura por metro de parede
const JANELA = 1.9 * K, ANDAR = 3.8 * K; // o módulo da fachada: 1,9 m de largura e 3,8 m de altura
const CELULA = 1600;
const PAREDES = [[0.46, 0.64, 0.82], [0.38, 0.64, 0.64], [0.3, 0.37, 0.47], [0.87, 0.87, 0.83], [0.8, 0.74, 0.62], [0.68, 0.72, 0.77], [0.72, 0.68, 0.62], [0.72, 0.82, 0.9]];
const TERRACO = [0.46, 0.47, 0.49];
const hash = (n) => { let h = (n * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; return (h >>> 0) / 4294967296; };
const area2 = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s; };

// a fachada: 16 × 32 janelas pequenas (cortina de vidro). A cor de dia (vidro escuro com caixilho e laje) e o mapa das acesas (a luz que sai de
// cada janela de noite: andares inteiros de escritório acesos, uns apagados, alguns tons mais frios)
function texturas() {
  const COLS = 16, LIN = 32, cw = 32, ch = 16;
  const lit = Array.from({ length: LIN }, () => Array.from({ length: COLS }, () => 0));
  let s = 77; const rr = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let a = 0; a < LIN; a++) { const andar = rr() < 0.72, tom = rr() < 0.3 ? 3 : 1 + ((rr() * 2) | 0); for (let c = 0; c < COLS; c++) lit[a][c] = (andar && rr() < 0.88) || rr() < 0.05 ? (rr() < 0.15 ? 3 : tom) : 0; }
  const dia = canvasTex(COLS * cw, LIN * ch, (x, w, h) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);
    for (let a = 0; a < LIN; a++) for (let c = 0; c < COLS; c++) {
      const x0 = c * cw, y0 = a * ch, g = x.createLinearGradient(0, y0, 0, y0 + ch), v = 0.9 + rr() * 0.2;
      g.addColorStop(0, `rgb(${(110 * v) | 0},${(136 * v) | 0},${(158 * v) | 0})`); g.addColorStop(1, `rgb(${(52 * v) | 0},${(66 * v) | 0},${(82 * v) | 0})`);
      x.fillStyle = g; x.fillRect(x0 + 1, y0 + 1, cw - 2, ch - 4);
      x.fillStyle = "#ffffff30"; x.fillRect(x0 + 2, y0 + 2, 6, ch - 6);
      x.fillStyle = "#0000002a"; x.fillRect(x0, y0 + ch - 3, cw, 3); // a laje
    }
  });
  const noite = canvasTex(COLS * cw, LIN * ch, (x, w, h) => {
    x.fillStyle = "#000000"; x.fillRect(0, 0, w, h);
    const cores = ["#000000", "#ffd98e", "#fff2cf", "#bcd6ff"];
    for (let a = 0; a < LIN; a++) for (let c = 0; c < COLS; c++) if (lit[a][c]) { x.fillStyle = cores[lit[a][c]]; x.fillRect(c * cw + 2, a * ch + 2, cw - 4, ch - 7); }
  });
  return { dia, noite };
}

export class Malha {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.i = []; }
  v(x, y, z, nx, ny, nz, u, vv, c) { const k = this.p.length / 3; this.p.push(x, y, z); this.n.push(nx, ny, nz); this.uv.push(u, vv); this.c.push(c[0], c[1], c[2]); return k; }
  geometria() {
    if (!this.i.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i); return g;
  }
}

// decodifica os prédios de dados.js; descarta o que toca a pista, o corredor dos boxes, a água ou um lugar reservado
export function lerPredios(tr) {
  const lista = []; let descartados = 0;
  for (const e of D.predios) {
    const P = []; for (let k = 2; k < e.length; k += 2) P.push([e[k], e[k + 1]]);
    if (P.length < 3) continue;
    if (area2(P) < 0) P.reverse();
    let cx = 0, cz = 0, x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of P) { cx += x; cz += z; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    cx /= P.length; cz /= P.length;
    const esp = e[1] >> 3;
    let toca = false;
    for (let i = 0; i < P.length && !toca; i++) {
      const a = P[i], c = P[(i + 1) % P.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]), passos = Math.max(1, Math.ceil(l / 10));
      for (let s = 0; s <= passos; s++) { const t = s / passos, x = a[0] + (c[0] - a[0]) * t, z = a[1] + (c[1] - a[1]) * t; if (tr.distAt(x, z) < tr.W / 2 + 24 || tr.noCorredor?.(x, z) || distanciaDaAgua(x, z) > -3) { toca = true; break; } }
    }
    if (!esp && (toca || (tr.reservado || []).some(([rx, rz, rr]) => (cx - rx) ** 2 + (cz - rz) ** 2 < rr * rr))) { descartados++; continue; }
    const metros = e[0] / 2;
    let baixo = Infinity, alto = -Infinity; for (const [x, z] of [...P, [cx, cz]]) { const g = tr.chao(x, z) - 1.5; baixo = Math.min(baixo, g); alto = Math.max(alto, g); }
    lista.push({ P, esp, cor: e[1] & 7, metros, h: metros * M_ALTURA, cx, cz, caixa: [x0, z0, x1, z1], baixo, alto, topo: alto + metros * M_ALTURA, id: lista.length });
  }
  tr.prediosDescartadosSG = descartados;
  return lista;
}

// a grade de busca: qual prédio está em (x, z)? (as árvores e os enfeites não nascem dentro de um)
export function indiceDePredios(lista) {
  const C = 128, mapa = new Map(), k = (a, b) => a * 100003 + b;
  for (const b of lista) for (let i = Math.floor(b.caixa[0] / C); i <= Math.floor(b.caixa[2] / C); i++) for (let j = Math.floor(b.caixa[1] / C); j <= Math.floor(b.caixa[3] / C); j++) { const q = k(i, j); (mapa.get(q) || mapa.set(q, []).get(q)).push(b); }
  return (x, z, folga = 0) => {
    const l = mapa.get(k(Math.floor(x / C), Math.floor(z / C)));
    if (l) for (const b of l) { if (x < b.caixa[0] - folga || x > b.caixa[2] + folga || z < b.caixa[1] - folga || z > b.caixa[3] + folga) continue; if (poligonoDentro(b.P, x, z) || folga > 0) return b; }
    return null;
  };
}

// o material da fachada (o mesmo para todos os prédios e para as torres dos marcos): um só por pista
export function materialFachada(tr) {
  if (tr.matFachadaSG) return tr.matFachadaSG;
  const T = texturas();
  const m = new THREE.MeshStandardMaterial({ map: T.dia, vertexColors: true, roughness: 0.55, metalness: 0.25, emissive: 0xffffff, emissiveMap: T.noite, emissiveIntensity: 0 });
  emissivoDaNoite(tr, m, 0, 0.9);
  return (tr.matFachadaSG = m);
}
export { PAREDES, JANELA, ANDAR, M_ALTURA };

export function predios(tr, add, lista, { ignorar = (b) => b.esp } = {}) {
  const cel = new Map(), pegar = (b) => { const q = Math.floor(b.cx / CELULA) + "," + Math.floor(b.cz / CELULA); if (!cel.has(q)) cel.set(q, { par: new Malha(), tel: new Malha() }); return cel.get(q); };
  let paredes = 0, usados = 0;
  for (const b of lista) {
    if (ignorar(b)) continue;
    usados++;
    const { par, tel } = pegar(b), P = b.P, n = P.length, y0 = b.baixo - 3, y1 = b.topo, cor = PAREDES[b.cor], semente = hash(b.id + 11);
    let u = semente * 8;
    for (let i = 0; i < n; i++) {
      const a = P[i], c = P[(i + 1) % n], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.5) continue;
      const nx = dz / l, nz = -dx / l, u0 = u, u1 = u + l / (JANELA * 16), v1 = (y1 - y0) / (ANDAR * 32), tx = b.dt ? b.dt[0] : 0, tz = b.dt ? b.dt[1] : 0; // `dt`: o topo desloca (a perna inclinada do Marina Bay Sands)
      const q = par.v(a[0], y0, a[1], nx, 0, nz, u0, 0, cor), r = par.v(c[0], y0, c[1], nx, 0, nz, u1, 0, cor), s = par.v(c[0] + tx, y1, c[1] + tz, nx, 0, nz, u1, v1, cor), t = par.v(a[0] + tx, y1, a[1] + tz, nx, 0, nz, u0, v1, cor);
      par.i.push(q, s, r, q, t, s); u = u1; paredes++;
    }
    const contorno = P.map(([x, z]) => new THREE.Vector2(x, z)), tris = THREE.ShapeUtils.triangulateShape(contorno, []);
    const base = tel.p.length / 3, dtx = b.dt ? b.dt[0] : 0, dtz = b.dt ? b.dt[1] : 0; for (const [x, z] of P) tel.v(x + dtx, y1 + 0.4, z + dtz, 0, 1, 0, 0, 0, b.corTopo || TERRACO);
    for (const t of tris) { const [i, j, k] = t, A = P[i], B = P[j], C = P[k], cruz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]); if (cruz > 0) tel.i.push(base + i, base + k, base + j); else tel.i.push(base + i, base + j, base + k); }
    // a casa de máquinas no terraço dos prédios altos e largos
    if (b.metros > 40 && Math.abs(area2(P)) / 2 > 500) {
      const w = Math.min(14, Math.sqrt(Math.abs(area2(P)) / 2) * 0.16), hh = 8 + hash(b.id + 9) * 8, bx = b.cx, bz = b.cz, top = y1 + 0.4 + hh, c2 = [0.58, 0.58, 0.6];
      if ([[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([sx, sz]) => poligonoDentro(P, bx + sx * w, bz + sz * w))) {
        for (const [px, pz, qx, qz, nx, nz] of [[bx - w, bz - w, bx + w, bz - w, 0, -1], [bx + w, bz - w, bx + w, bz + w, 1, 0], [bx + w, bz + w, bx - w, bz + w, 0, 1], [bx - w, bz + w, bx - w, bz - w, -1, 0]]) {
          const q = tel.v(px, y1, pz, nx, 0, nz, 0, 0, c2), r = tel.v(qx, y1, qz, nx, 0, nz, 0, 0, c2), s = tel.v(qx, top, qz, nx, 0, nz, 0, 0, c2), t = tel.v(px, top, pz, nx, 0, nz, 0, 0, c2); tel.i.push(q, s, r, q, t, s);
        }
        const q = tel.v(bx - w, top, bz - w, 0, 1, 0, 0, 0, c2), r = tel.v(bx + w, top, bz - w, 0, 1, 0, 0, 0, c2), s = tel.v(bx + w, top, bz + w, 0, 1, 0, 0, 0, c2), t = tel.v(bx - w, top, bz + w, 0, 1, 0, 0, 0, c2); tel.i.push(q, t, s, q, s, r);
      }
    }
  }
  const matParede = materialFachada(tr);
  const matTelhado = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  let malhas = 0;
  for (const { par, tel } of cel.values()) {
    const gp = par.geometria(), gt = tel.geometria();
    if (gp) { const m = add(new THREE.Mesh(gp, matParede)); m.castShadow = m.receiveShadow = true; m.name = "singapura-predios"; malhas++; }
    if (gt) { gt.computeVertexNormals(); const m = add(new THREE.Mesh(gt, matTelhado)); m.castShadow = m.receiveShadow = true; m.name = "singapura-telhados"; malhas++; }
  }
  tr.prediosSG = { predios: usados, paredes, malhas, descartados: tr.prediosDescartadosSG };
}
