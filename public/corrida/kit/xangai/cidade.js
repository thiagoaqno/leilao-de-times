// Xangai — o skyline no horizonte (peça só desta pista): um anel de torres de apartamentos e de escritórios, a megacidade que não acaba, e, na direção
// do centro (sudeste), os cinco marcos que todo mundo reconhece: a Torre da Pérola Oriental (três pernas e as esferas rosa), o Jin Mao em degraus
// de pagode, o Shanghai World Financial Center (o "abridor de garrafa", com o vazado no alto), a Shanghai Tower torcida e as vizinhas.
// Três malhas só (vidro, pedra e topos), cor por vértice, `fog: false`: a névoa de 4200 apagava tudo; a bruma é pintada nos vértices (mais forte
// embaixo e nas torres mais longe), como numa foto do horizonte com poluição. Fica a mais de 5000 do centro do mundo, bem além do terreno: uma coroa da cor da neblina faz o chão de lá e o que está longe some nela.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { sorteio } from "../comum.js";

const cor3 = (c) => new THREE.Color(c);

// a textura das janelas: vidro com a grade clara (`vidro`), ou fachada de concreto de apartamentos com janelinhas e varandas
function janelas(vidro) {
  return canvasTex(32, 32, (x, w, h, rr) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);
    if (vidro) { x.fillStyle = "#d3dde5"; x.fillRect(0, 0, w, 3); x.fillRect(0, 0, 2, h); for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) { x.fillStyle = rr() < 0.16 ? "#f1e4b6" : "#a9bdca"; x.fillRect(2 + k * 8, 4 + j * 7, 6, 5); } }
    else { x.fillStyle = "#e6e1d6"; x.fillRect(0, 0, w, h); for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) { x.fillStyle = rr() < 0.2 ? "#b9b0a0" : "#8895a1"; x.fillRect(2 + k * 8, 3 + j * 8, 5, 5); x.fillStyle = "#cfc8ba"; x.fillRect(1 + k * 8, 8 + j * 8, 7, 1); } }
  });
}

class Lote {
  constructor() { this.p = []; this.c = []; this.uv = []; this.i = []; }
  // caixa com o centro da base em (x, z), com a bruma em degradê de baixo (`baixo`) para cima (`topo`); o uv conta janelas
  caixa(x, z, y0, sx, sy, sz, ry, baixo, topo, jan = 9, andar = 14) {
    const co = Math.cos(ry), si = Math.sin(ry), q = (dx, dz) => [x + dx * co + dz * si, z - dx * si + dz * co];
    const cant = [q(-sx / 2, -sz / 2), q(sx / 2, -sz / 2), q(sx / 2, sz / 2), q(-sx / 2, sz / 2)], larg = [sx, sz, sx, sz];
    for (let f = 0; f < 4; f++) {
      const a = cant[f], b = cant[(f + 1) % 4], base = this.p.length / 3, u = larg[f] / jan, v = sy / andar;
      this.p.push(a[0], y0, a[1], b[0], y0, b[1], b[0], y0 + sy, b[1], a[0], y0 + sy, a[1]);
      this.c.push(baixo.r, baixo.g, baixo.b, baixo.r, baixo.g, baixo.b, topo.r, topo.g, topo.b, topo.r, topo.g, topo.b);
      this.uv.push(0, 0, u, 0, u, v, 0, v); this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const base = this.p.length / 3, t = y0 + sy; // o teto
    for (const [px, pz] of cant) { this.p.push(px, t, pz); this.c.push(topo.r, topo.g, topo.b); this.uv.push(0.5, 0.5); }
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // uma esfera (a Pérola): anéis de `n` pontos
  esfera(x, z, y, raio, baixo, topo, n = 14) {
    const base = this.p.length / 3, m = n >> 1;
    for (let j = 0; j <= m; j++) for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI * 2, b = (j / m) * Math.PI, t = j / m, rr = Math.sin(b) * raio;
      this.p.push(x + Math.cos(a) * rr, y + Math.cos(b) * raio, z + Math.sin(a) * rr);
      this.c.push(baixo.r + (topo.r - baixo.r) * (1 - t), baixo.g + (topo.g - baixo.g) * (1 - t), baixo.b + (topo.b - baixo.b) * (1 - t)); this.uv.push(0.5, 0.5);
    }
    for (let j = 0; j < m; j++) for (let k = 0; k < n; k++) { const a = base + j * (n + 1) + k, b = a + n + 1; this.i.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  malha(mat) {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2)); g.setIndex(this.i); g.computeVertexNormals(); return new THREE.Mesh(g, mat);
  }
}

/**
 * @param {object} tr · @param {Function} add
 * @param {object} o { raio=3250, fundo=380, angulo (a direção dos marcos, rad: 0 = +x, π/2 = +z), escala=1, bruma="#d3dad9", quantas=300, semente=8800 }
 */
export function cidadeDeXangai(tr, add, { raio = 5400, fundo = 900, angulo = Math.PI / 4, escala = 1.7, bruma = "#d0d6d4", quantas = 520, semente = 8800 } = {}) {
  const r = sorteio(semente), ar = cor3(bruma), vid = new Lote(), ped = new Lote(), topos = new Lote(), mundo = tr.t.world, cx = mundo / 2, cz = mundo / 2;
  const vidros = ["#2a4a66", "#34607f", "#3f6c8a", "#51748f", "#27394d", "#5d8199", "#6a8aa0"], pedras = ["#d8d1c3", "#c9c2b4", "#e2dccf", "#bdb6a8", "#d0c5b0"];
  // [baixo, topo] com a bruma: mais forte embaixo e nas torres mais longe
  const tom = (hex, dist) => { const c = cor3(hex), t = 0.34 + 0.24 * dist; return [c.clone().lerp(ar, Math.min(0.92, t + 0.3)), c.clone().lerp(ar, t)]; };
  const dif = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  const torre = (x, z, sx, sy, sz, hex, lote = vid, o = {}) => {
    const y0 = -3, ry = o.ry ?? (r() < 0.5 ? 0 : 0.2 + r() * 0.6), dist = Math.min(1, Math.hypot(x - cx, z - cz) / (raio + fundo)), [b, t] = tom(hex, dist);
    lote.caixa(x, z, y0, sx, sy, sz, ry, b, t, o.jan ?? 9, o.andar ?? 14);
    if (o.degrau) topos.caixa(x, z, y0 + sy, sx * 0.55, o.degrau, sz * 0.55, ry, b, t, 12, 14);
    if (o.antena) topos.caixa(x, z, y0 + sy + (o.degrau || 0), 3, o.antena, 3, 0, cor3("#d8dde2").lerp(ar, 0.4), cor3("#e84a4a").lerp(ar, 0.3), 3, 14);
    return y0;
  };
  // o anel: apartamentos de concreto em blocos largos e escritórios de vidro; mais cheio e mais alto para o lado do centro
  for (let k = 0; k < quantas; k++) {
    const a = r() * Math.PI * 2, d = raio + r() * fundo, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, centro = Math.max(0, 1 - dif(a, angulo) / 1.5);
    if (r() > 0.55 + 0.4 * centro) continue;
    const alta = r() < 0.18 + 0.3 * centro, h = (alta ? 480 + r() * 520 : 190 + r() * 300) * escala * (0.7 + 0.4 * centro), sx = 60 + r() * 60, sz = 60 + r() * 60, vi = r() < 0.4;
    torre(x, z, sx, h, sz, vi ? vidros[(r() * vidros.length) | 0] : pedras[(r() * pedras.length) | 0], vi ? vid : ped, { degrau: alta && r() < 0.4 ? 40 + r() * 70 : 0, antena: alta && r() < 0.3 ? 80 + r() * 140 : 0, jan: 8 + r() * 6 });
    if (!alta && r() < 0.5) { const a2 = a + (r() - 0.5) * 0.02; torre(cx + Math.cos(a2) * (d + 70), cz + Math.sin(a2) * (d + 70), sx * 0.9, h * (0.8 + r() * 0.4), sz * 0.9, pedras[(r() * pedras.length) | 0], ped, { jan: 8 }); } // o quarteirão em fileira
  }
  // os marcos (a direção do centro: sudeste)
  const base = (u, v) => { const d = raio + 130 + v * 160, a = angulo + u; return [cx + Math.cos(a) * d, cz + Math.sin(a) * d]; };
  const at = (x, z) => 1; void at;
  const bruma2 = (hex, t = 0.34) => cor3(hex).lerp(ar, t);
  // a Shanghai Tower: torcida, em fatias que giram e afinam
  { const [x, z] = base(-0.04, 0.55), H = 1560 * escala, n = 14;
    for (let k = 0; k < n; k++) { const t = k / n, w = 150 * (1 - t * 0.62), h = H / n; topos.caixa(x, z, -3 + k * h, w, h + 0.5, w, k * 0.1 + 0.3, bruma2("#8fa6b8", 0.34 + 0.12 * (1 - t)), bruma2("#b7c9d6", 0.32), 12, 14); }
    topos.caixa(x, z, -3 + H, 8, 120, 8, 0, bruma2("#d8dde2"), bruma2("#d8dde2")); }
  // o Shanghai World Financial Center: o prisma esguio com o vazado trapezoidal no alto (duas pontas e a ponte)
  { const [x, z] = base(0.015, 0.2), H = 1180 * escala, w = 118;
    vid.caixa(x, z, -3, w, H * 0.8, w * 0.8, 0.4, bruma2("#7c93a3", 0.36), bruma2("#9fb4c2", 0.32), 16, 14);
    for (const s of [-1, 1]) topos.caixa(x + Math.cos(0.4) * s * w * 0.3, z - Math.sin(0.4) * s * w * 0.3, -3 + H * 0.8, w * 0.36, H * 0.2, w * 0.8, 0.4, bruma2("#7c93a3", 0.34), bruma2("#a9bdca", 0.3), 8, 14);
    topos.caixa(x, z, -3 + H * 0.97, w, H * 0.03, w * 0.8, 0.4, bruma2("#9fb4c2", 0.3), bruma2("#c3d2dc", 0.3), 8, 14); }
  // o Jin Mao: a torre de pagode, em 13 degraus cada vez mais estreitos
  { const [x, z] = base(0.07, 0.35), H = 1050 * escala, n = 13;
    for (let k = 0; k < n; k++) { const t = k / n, w = 112 * (1 - t * 0.74), h = (H * 0.92) / n; topos.caixa(x, z, -3 + k * h, w, h * (k === 0 ? 1.0 : 0.94), w, 0.1, bruma2("#a4b0ae", 0.36), bruma2("#cdd7d4", 0.32), 10, 14); if (k > 1) topos.caixa(x, z, -3 + (k + 1) * h - 3, w * 1.12, 5, w * 1.12, 0.1, bruma2("#8d9a98", 0.34), bruma2("#b8c4c1", 0.32), 4, 14); }
    topos.caixa(x, z, -3 + H * 0.92, 5, H * 0.08, 5, 0, bruma2("#d8dde2"), bruma2("#d8dde2")); }
  // a Torre da Pérola Oriental: as três pernas inclinadas, a esfera grande, a pequena, o fuste e a antena
  { const [x, z] = base(0.11, 0.1), H = 1200 * escala;
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 0.4; for (let s = 0; s < 6; s++) { const t0 = s / 6, w = 18 - s * 1.4; topos.caixa(x + Math.cos(a) * (60 * (1 - t0 * 0.7)), z + Math.sin(a) * (60 * (1 - t0 * 0.7)), -3 + t0 * H * 0.28, w, H * 0.28 / 6 + 1, w, a, bruma2("#b9bec4"), bruma2("#d6dadf")); } }
    topos.caixa(x, z, -3, 26, H * 0.62, 26, 0, bruma2("#b9bec4", 0.4), bruma2("#d6dadf", 0.34), 3, 14);
    topos.esfera(x, z, -3 + H * 0.3, 96, bruma2("#a73a5c", 0.3), bruma2("#e0829f", 0.3)); // a esfera grande, rosa
    topos.esfera(x, z, -3 + H * 0.6, 62, bruma2("#a73a5c", 0.3), bruma2("#e0829f", 0.3)); // a do meio
    topos.esfera(x, z, -3 + H * 0.74, 36, bruma2("#a73a5c", 0.3), bruma2("#e0829f", 0.3)); // a de cima
    topos.caixa(x, z, -3 + H * 0.77, 10, H * 0.23, 10, 0, bruma2("#d8dde2"), bruma2("#d8dde2"), 2, 14); }
  // o chão de longe: a mesma cor da neblina, onde o terreno acaba (o terreno de pista.js já está fundido na névoa a 3700 de distância, então a emenda não aparece)
  const coroa = new THREE.Mesh(new THREE.RingGeometry(3300, 14000, 64, 1), new THREE.MeshBasicMaterial({ color: tr.look?.fog ?? 0xd0d6d4, fog: false }));
  coroa.rotation.x = -Math.PI / 2; coroa.position.set(cx, -3.4, cz); coroa.name = `${tr.id}-cidade-chao`; add(coroa);
  const matV = new THREE.MeshStandardMaterial({ map: janelas(true), vertexColors: true, roughness: 0.35, metalness: 0.25, fog: false });
  const matP = new THREE.MeshStandardMaterial({ map: janelas(false), vertexColors: true, roughness: 0.85, fog: false });
  const matT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.35, fog: false });
  for (const [lote, mat, nome] of [[vid, matV, "vidro"], [ped, matP, "pedra"], [topos, matT, "marcos"]]) if (lote.i.length) { const m = add(lote.malha(mat)); m.name = `${tr.id}-cidade-${nome}`; m.frustumCulled = false; }
  tr.cidadeXangai = { torres: Math.round((vid.i.length + ped.i.length) / 30), marcos: 4 };
}
