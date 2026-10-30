// Mônaco — o chão e a vegetação da cidade: a cor do terreno (rua e calçada de pedra clara, jardins, mata, o paredão de pedra do Rochedo e
// as encostas), as palmeiras do cais e da Place du Casino, os plátanos e os pinheiros-de-alepo das encostas, nas posições das árvores
// do OpenStreetMap e em manchas dentro dos parques. InstancedMesh, uma geometria com cor por vértice por espécie.
import * as THREE from "three";
import { D, VK, distanciaDoMar, poligonoDentro } from "./mundo.js";
import { livre, ocupado, sorteio } from "../comum.js";

const mistura = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const RUA = [0.66, 0.6, 0.5], JARDIM = [0.3, 0.5, 0.25], MATA = [0.18, 0.36, 0.2], PEDRA = [0.5, 0.46, 0.41], PAREDAO = [0.42, 0.38, 0.34], AREIA = [0.74, 0.69, 0.55], FUNDO = [0.36, 0.5, 0.54], ENCOSTA = [0.34, 0.45, 0.27];
const ruido = (x, z, s) => { const v = Math.sin(x * 0.043 + s) * Math.cos(z * 0.051 - s * 1.7) + 0.5 * Math.sin(x * 0.11 + z * 0.07 + s * 3); return v * 0.5 + 0.5; };

// a cor de cada ponto do terreno: (x, z, altura em unidades, normal.y) -> [r, g, b]
export function corDoChao() {
  const CEL = 200, grade = new Map(), polis = D.verde.map((v, i) => { const P = []; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (let k = 1; k < v.length; k += 2) { P.push([v[k], v[k + 1]]); x0 = Math.min(x0, v[k]); x1 = Math.max(x1, v[k]); z0 = Math.min(z0, v[k + 1]); z1 = Math.max(z1, v[k + 1]); } return { tipo: v[0], P, caixa: [x0, z0, x1, z1], i }; });
  const k = (a, b) => a * 100003 + b;
  for (const p of polis) for (let i = Math.floor(p.caixa[0] / CEL); i <= Math.floor(p.caixa[2] / CEL); i++) for (let j = Math.floor(p.caixa[1] / CEL); j <= Math.floor(p.caixa[3] / CEL); j++) (grade.get(k(i, j)) || grade.set(k(i, j), []).get(k(i, j))).push(p);
  const tipoEm = (x, z) => { let t = 0; const l = grade.get(k(Math.floor(x / CEL), Math.floor(z / CEL))); if (l) for (const p of l) if (x >= p.caixa[0] && x <= p.caixa[2] && z >= p.caixa[1] && z <= p.caixa[3] && poligonoDentro(p.P, x, z)) t = Math.max(t, p.tipo === 3 ? 3 : p.tipo === 2 ? 2 : 1); return t; };
  return (x, z, h, ny) => {
    const sMar = distanciaDoMar(x, z), n1 = ruido(x, z, 1), n2 = ruido(x * 2.3, z * 2.3, 5);
    if (sMar > 0) return mistura(FUNDO, AREIA, Math.max(0, 1 - sMar / 60));
    let c = RUA; const tipo = tipoEm(x, z), metros = h / VK;
    if (tipo === 1) c = mistura(JARDIM, [0.5, 0.64, 0.3], n1 * 0.6);
    else if (tipo === 2) c = mistura(MATA, [0.3, 0.46, 0.26], n1);
    else if (tipo === 3) c = PEDRA;
    else {
      c = mistura(RUA, [0.6, 0.55, 0.47], n1 * 0.6);
      if (metros > 55) c = mistura(c, ENCOSTA, Math.min(0.75, (metros - 55) / 90)); // o morro lá em cima fica com mato
    }
    if (ny < 0.92) c = mistura(c, ny < 0.72 ? PAREDAO : PEDRA, Math.min(1, (0.92 - ny) / 0.2)); // paredão e pedra onde a encosta é íngreme
    if (sMar > -45) c = mistura(c, AREIA, 0.5 * (1 - (-sMar) / 45)); // a faixa de cais junto da água
    const f = 0.93 + n2 * 0.14; return [c[0] * f, c[1] * f, c[2] * f];
  };
}

// ---- as árvores ----
function geoCor(partes) { // junta [geometria, cor] numa geometria só, com a cor nos vértices
  const gs = partes.map(([g, c]) => { const n = g.attributes.position.count, col = []; for (let i = 0; i < n; i++) col.push(c[0], c[1], c[2]); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); return g.index ? g.toNonIndexed() : g; });
  const pos = [], nor = [], cor = []; for (const g of gs) { pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); cor.push(...g.attributes.color.array); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3)); return g;
}
const pecas = {
  palmeira: () => { const t = new THREE.CylinderGeometry(1.5, 2.4, 46, 6); t.translate(0, 23, 0); const c = new THREE.ConeGeometry(21, 11, 8, 1, true); c.translate(0, 50, 0); const c2 = new THREE.ConeGeometry(12, 9, 7, 1, true); c2.translate(0, 55, 0); return geoCor([[t, [0.5, 0.38, 0.26]], [c, [0.22, 0.52, 0.24]], [c2, [0.3, 0.6, 0.28]]]); },
  platano: () => { const t = new THREE.CylinderGeometry(1.8, 2.8, 24, 6); t.translate(0, 12, 0); const a = new THREE.IcosahedronGeometry(17, 1); a.scale(1.2, 0.9, 1.2); a.translate(0, 32, 0); const b = new THREE.IcosahedronGeometry(11, 0); b.translate(7, 40, 3); return geoCor([[t, [0.55, 0.5, 0.42]], [a, [0.32, 0.55, 0.26]], [b, [0.4, 0.62, 0.3]]]); },
  pinheiro: () => { const t = new THREE.CylinderGeometry(1.4, 2.2, 30, 5); t.translate(0, 15, 0); const a = new THREE.IcosahedronGeometry(15, 0); a.scale(1.3, 0.8, 1.3); a.translate(0, 38, 0); return geoCor([[t, [0.45, 0.33, 0.24]], [a, [0.2, 0.42, 0.24]]]); },
};

export function arvores(tr, add, { hAt, predioEm }) {
  const r = sorteio(777), L = tr.wallLat, listas = { palmeira: [], platano: [], pinheiro: [] }, w = tr.t.world;
  const cabe = (x, z, raio) => x > -400 && z > -400 && x < w + 400 && z < w + 400 && livre(tr, x, z, 14 + raio) && !ocupado(tr, x, z) && !predioEm(x, z, raio * 0.5) && distanciaDoMar(x, z) < -6;
  const poe = (tipo, x, z, s) => { if (!cabe(x, z, 14 * s)) return false; listas[tipo].push({ x, y: hAt(x, z), z, s, r: r() * 6.3, t: 0.86 + r() * 0.26 }); return true; };
  for (const [x, z] of D.arvores) {
    const costa = distanciaDoMar(x, z) > -330, alto = hAt(x, z) / VK > 45;
    poe(costa && r() < 0.62 ? "palmeira" : alto && r() < 0.4 ? "pinheiro" : "platano", x + (r() - 0.5) * 4, z + (r() - 0.5) * 4, 0.85 + r() * 0.5);
  }
  // as manchas dentro dos jardins e da mata: a densidade de cada tipo
  for (const v of D.verde) {
    const P = []; for (let k = 1; k < v.length; k += 2) P.push([v[k], v[k + 1]]);
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    if (v[0] === 3) continue;
    const passo = v[0] === 2 ? 56 : 84, esp = v[0] === 2 ? 1.1 : 0.9;
    for (let z = z0; z < z1; z += passo) for (let x = x0; x < x1; x += passo) {
      const px = x + (r() - 0.5) * passo * 0.8, pz = z + (r() - 0.5) * passo * 0.8; if (!poligonoDentro(P, px, pz)) continue;
      const costa = distanciaDoMar(px, pz) > -330;
      poe(v[0] === 2 ? "pinheiro" : costa && r() < 0.5 ? "palmeira" : "platano", px, pz, esp * (0.8 + r() * 0.5));
      if (listas.palmeira.length + listas.platano.length + listas.pinheiro.length > 1700) break;
    }
  }
  // as árvores da calçada: palmeiras no cais e plátanos nas avenidas, ao longo da pista onde há calçada livre (não ficam em cima do prédio nem do muro)
  const { pts, n } = tr;
  for (let i = 0; i < n; i += 14) for (const lado of [-1, 1]) {
    const p = pts[i], d = L + 15 + r() * 6, x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d, costa = distanciaDoMar(x, z) > -420;
    if (r() < 0.55) poe(costa ? "palmeira" : "platano", x, z, 0.9 + r() * 0.4);
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), o = new THREE.Object3D(), cor = new THREE.Color();
  let total = 0;
  for (const [tipo, lista] of Object.entries(listas)) {
    if (!lista.length) continue;
    const m = add(new THREE.InstancedMesh(pecas[tipo](), mat, lista.length)); m.name = `monaco-${tipo}`; m.castShadow = false; m.receiveShadow = true;
    lista.forEach((a, i) => { o.position.set(a.x, a.y, a.z); o.rotation.set(0, a.r, 0); o.scale.set(a.s, a.s * (tipo === "palmeira" ? 1 + (a.t - 1) * 1.6 : 1), a.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, cor.setRGB(a.t, a.t, a.t)); });
    total += lista.length;
  }
  tr.arvoresMonaco = { total, palmeiras: listas.palmeira.length, platanos: listas.platano.length, pinheiros: listas.pinheiro.length };
}
