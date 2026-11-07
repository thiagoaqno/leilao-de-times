// Austin — as bandeiras do circuito (peça só desta pista): a dos Estados Unidos e a do Texas (a estrela solitária), as duas desenhadas num atlas de canvas,
// num quadrilátero ondulado cada uma, todas numa malha só, com as hastes em InstancedMesh. Em cima do morro da curva 1 tem uma bandeira dos Estados Unidos
// gigante, que a transmissão mostra ao fundo (a bandeira da colina fica no alto, e uma construção nova teve de afastá-la um pouco para a esquerda).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { instancias } from "../comum.js";

const AZUL = "#002868", VERMELHA = "#bf0a30", BRANCO = "#ffffff";
function estrela(x, cx, cy, r) {
  x.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.4 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fill();
}
let _atlas = null;
// 256 × 256: em cima os Estados Unidos (treze listras, o quadro azul e as estrelas em fileiras), embaixo o Texas (barra azul com a estrela, branco e vermelho)
function atlas() {
  return (_atlas ||= canvasTex(256, 256, (x) => {
    for (let k = 0; k < 13; k++) { x.fillStyle = k % 2 ? BRANCO : VERMELHA; x.fillRect(0, (k * 128) / 13, 256, 128 / 13 + 1); }
    x.fillStyle = AZUL; x.fillRect(0, 0, 102, 128 * 7 / 13); x.fillStyle = BRANCO;
    for (let a = 0; a < 5; a++) for (let b = 0; b < 6; b++) { x.beginPath(); x.arc(9 + b * 17 + (a % 2) * 8, 9 + a * 12, 2.3, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = BRANCO; x.fillRect(86, 128, 170, 64); x.fillStyle = VERMELHA; x.fillRect(86, 192, 170, 64);
    x.fillStyle = AZUL; x.fillRect(0, 128, 86, 128); x.fillStyle = BRANCO; estrela(x, 43, 192, 27);
  }, false));
}
const CELULA = [[0, 0.5], [0, 0]]; // o canto de cada bandeira no atlas (u, v); cada uma tem 1 × 0,5

/**
 * As bandeiras em hastes, numa malha só. `lista`: [{ x, z, tipo (0 Estados Unidos, 1 Texas), alto, larg, rot (giro em y), y (o chão; padrão tr.chao) }]. A bandeira tem 1,9 : 1.
 */
export function bandeirasEmHastes(tr, add, lista) {
  if (!lista.length) return 0;
  const vs = [], uv = [], idx = [], hastes = [], bolas = [], PASSOS = 8;
  lista.forEach((o, k) => {
    const y0 = o.y ?? tr.chao(o.x, o.z) - 1.5, alto = o.alto ?? 90, w = o.larg ?? 36, h = w / 1.9, c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0), [u0, v0] = CELULA[o.tipo % 2], base = vs.length / 3;
    for (let q = 0; q <= PASSOS; q++) {
      const t = q / PASSOS, lado = t * w, onda = Math.sin(t * 5.2 + k) * w * 0.045 * t; // a ponta solta ondula, a que fica na haste não
      for (const yy of [0, 1]) { vs.push(o.x + c * lado - s * onda, y0 + alto - yy * h, o.z - s * lado - c * onda); uv.push(u0 + 0.5 * 0 + t, v0 + 0.5 * (1 - yy)); }
      if (q < PASSOS) { const a = base + q * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    hastes.push({ x: o.x, y: y0 + alto / 2, z: o.z, sx: Math.max(0.7, w * 0.022), sy: alto, sz: Math.max(0.7, w * 0.022) });
    bolas.push({ x: o.x, y: y0 + alto + 0.6, z: o.z, sx: Math.max(1.2, w * 0.04), sy: Math.max(1.2, w * 0.04), sz: Math.max(1.2, w * 0.04) });
  });
  // o atlas tem 256 de largura por bandeira: o u anda de 0 a 1 no atlas inteiro; cada bandeira usa a largura toda e metade da altura
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: atlas(), roughness: 0.85, side: THREE.DoubleSide }))); m.name = `${tr.id}-bandeiras`;
  instancias(add, new THREE.CylinderGeometry(1, 1, 1, 6), M(0xe2e4e6, { roughness: 0.5, metalness: 0.4 }), hastes, { sombra: false, nome: `${tr.id}-hastes` });
  instancias(add, new THREE.IcosahedronGeometry(1, 0), M(0xd4af37, { roughness: 0.4, metalness: 0.6 }), bolas, { sombra: false, nome: `${tr.id}-pontas` });
  tr.bandeirasAustin = (tr.bandeirasAustin || 0) + lista.length;
  return lista.length;
}
