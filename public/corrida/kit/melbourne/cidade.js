// Melbourne — o skyline da cidade (CBD e Southbank) que se vê da pista por cima do lago e do parque: uns 150 arranha-céus com
// janelas, a Eureka Tower de coroa dourada e a faixa vermelha, as Rialto Towers, a Australia 108 e as torres menores nas pontas.
// Duas malhas só (vidro e pedra), cor por vértice. Sem neblina do jogo (`fog: false`): a névoa de 4400 apagava tudo; a bruma é
// pintada nos vértices (mais forte embaixo e nas torres mais longe), igual à de uma foto do horizonte de Melbourne.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { sorteio } from "../comum.js";

const cor3 = (c) => new THREE.Color(c);

// a textura das janelas: vidro com a grade clara (`vidro`) ou fachada de pedra com janelinhas
function janelas(vidro) {
  return canvasTex(32, 32, (x, w, h, rr) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);
    if (vidro) { x.fillStyle = "#cfd9e2"; x.fillRect(0, 0, w, 3); x.fillRect(0, 0, 2, h); for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) { x.fillStyle = rr() < 0.18 ? "#f3e6b8" : "#aebfcd"; x.fillRect(2 + k * 8, 4 + j * 7, 6, 5); } }
    else { x.fillStyle = "#e9e4d8"; x.fillRect(0, 0, w, h); for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) { x.fillStyle = "#8d99a4"; x.fillRect(2 + k * 10, 3 + j * 10, 6, 7); } }
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
  malha(mat) {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2)); g.setIndex(this.i); g.computeVertexNormals(); return new THREE.Mesh(g, mat);
  }
}

/**
 * @param {object} tr · @param {Function} add · @param {(x:number,z:number)=>number} hAt altura do chão
 * @param {object} o
 * @param {number} [o.x0] de onde começa a cidade (x) · @param {number} [o.x1] até onde · @param {number} [o.z0] a linha da frente (z, a cidade fica para z menor) · @param {number} [o.fundo=1000]
 * @param {number} [o.escala=1] altura das torres · @param {string} [o.bruma="#d9e6ee"] a cor do ar · @param {number} [o.quantas=150] · @param {number} [o.semente=3000]
 * @param {(x:number,z:number)=>boolean} [o.livre] onde pode pôr
 */
export function cidade(tr, add, { x0, x1, z0, fundo = 1000, escala = 1, bruma = "#d9e6ee", quantas = 150, semente = 3000, livre = () => true } = {}) {
  const r = sorteio(semente), ar = cor3(bruma), vid = new Lote(), ped = new Lote(), topos = new Lote();
  const vidros = ["#1f4263", "#28587d", "#2e6284", "#3b6f8f", "#4d6f8f", "#23394f", "#5a7f9c"], pedras = ["#d9d2c2", "#c8c1b2", "#e4ddcf", "#b9b2a4"];
  const cx = (x0 + x1) / 2, meia = (x1 - x0) / 2;
  const tom = (hex, dist) => { const c = cor3(hex), t = 0.1 + 0.3 * dist; return [c.clone().lerp(ar, Math.min(0.8, t + 0.28)), c.clone().lerp(ar, t)]; }; // [baixo, topo]
  const torre = (x, z, sx, sy, sz, hex, lote = vid, o = {}) => {
    const y0 = hAt(tr, x, z) - 2, ry = o.ry ?? (r() < 0.5 ? 0 : 0.35 + r() * 0.3), dist = Math.min(1, Math.abs(z - z0) / fundo), [b, t] = tom(hex, dist);
    lote.caixa(x, z, y0, sx, sy, sz, ry, b, t, o.jan ?? 9, o.andar ?? 14);
    if (o.degrau) topos.caixa(x, z, y0 + sy, sx * 0.6, o.degrau, sz * 0.6, ry, b, t, 12, 14);
    if (o.antena) topos.caixa(x, z, y0 + sy + (o.degrau || 0), 3, o.antena, 3, 0, cor3("#d8dde2").lerp(ar, 0.4), cor3("#e84a4a").lerp(ar, 0.3), 3, 14);
    return y0;
  };
  // o miolo (CBD): torres altas mais no meio; nas pontas, mais baixas e de pedra
  for (let k = 0; k < quantas; k++) {
    const u = r() * 2 - 1, x = cx + u * meia * (0.4 + 0.6 * r()), z = z0 - 80 - r() * fundo, centro = 1 - Math.abs(u) ** 1.5;
    if (!livre(x, z)) continue;
    const alta = r() < 0.5 * centro + 0.08, sy = (alta ? 650 + r() * 700 : 220 + r() * 380) * escala * (0.5 + 0.5 * centro), sx = 70 + r() * 60, sz = 70 + r() * 60;
    torre(x, z, sx, sy, sz, r() < 0.25 ? pedras[(r() * 4) | 0] : vidros[(r() * vidros.length) | 0], r() < 0.25 ? ped : vid, { degrau: alta && r() < 0.4 ? 60 + r() * 80 : 0, antena: alta && r() < 0.35 ? 120 + r() * 160 : 0, jan: 10 + r() * 6 });
  }
  // as de sempre: Eureka Tower (vidro azul escuro, a coroa dourada e a faixa vermelha), Rialto (dois blocos de vidro preto), Australia 108
  const eu = [cx + meia * 0.28, z0 - 260];
  if (livre(eu[0], eu[1])) {
    const y0 = torre(eu[0], eu[1], 96, 1500 * escala, 96, "#17304d", vid, { ry: 0.2 });
    topos.caixa(eu[0], eu[1], y0 + 1500 * escala, 100, 190, 100, 0.2, cor3("#c99a1c").lerp(ar, 0.2), cor3("#ffd54a").lerp(ar, 0.15), 40, 14);
    topos.caixa(eu[0], eu[1], y0 + 1500 * escala + 190, 4, 220, 4, 0, cor3("#cfd4d9").lerp(ar, 0.3), cor3("#cfd4d9").lerp(ar, 0.3), 3, 14);
    topos.caixa(eu[0] - 49, eu[1] + 49, y0, 8, 1500 * escala, 8, 0.2, cor3("#b3202c").lerp(ar, 0.3), cor3("#d6303c").lerp(ar, 0.2), 4, 14); // a faixa vermelha da quina
  }
  for (const [dx, h, g] of [[-0.18, 1050, "#0f161d"], [-0.14, 880, "#151e27"]]) { const x = cx + meia * dx, z = z0 - 200 - (g === "#0f161d" ? 0 : 90); if (livre(x, z)) torre(x, z, 100, h * escala, 80, g, vid, { ry: 0.1, jan: 18 }); }
  const au = [cx + meia * 0.05, z0 - 380];
  if (livre(au[0], au[1])) { const y0 = torre(au[0], au[1], 90, 1250 * escala, 90, "#1a4666", vid, { ry: 0.5, jan: 14 }); topos.caixa(au[0], au[1], y0 + 560, 118, 70, 118, 0.5, cor3("#d9a91f").lerp(ar, 0.25), cor3("#ffd24a").lerp(ar, 0.2), 30, 14); }
  const matV = new THREE.MeshStandardMaterial({ map: janelas(true), vertexColors: true, roughness: 0.35, metalness: 0.25, fog: false });
  const matP = new THREE.MeshStandardMaterial({ map: janelas(false), vertexColors: true, roughness: 0.85, fog: false });
  const matT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.4, fog: false });
  for (const [lote, mat, nome] of [[vid, matV, "vidro"], [ped, matP, "pedra"], [topos, matT, "topos"]]) if (lote.i.length) { const m = add(lote.malha(mat)); m.name = `${tr.id}-cidade-${nome}`; m.frustumCulled = false; }
  tr.cidadeGP = { torres: vid.i.length / 30 + ped.i.length / 30 };
}
const hAt = (tr, x, z) => tr.chao(x, z) - 1.5;
