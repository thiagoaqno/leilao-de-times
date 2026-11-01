// Las Vegas — o chão e o que cresce nele: a cor de cada pedaço do terreno (rua e estacionamento de asfalto, cascalho do deserto, gramados e o campo de golfe do Wynn), os
// lagos (Bellagio, Mirage, Treasure Island: a placa de água), as palmeiras (o canteiro central da Strip e as calçadas, em InstancedMesh) e algumas árvores de rua.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { D, K, classes, poligonoDentro, pistaAtual } from "./mundo.js";
import { livre, ocupado, sorteio, instancias } from "../comum.js";

const mistura = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const DESERTO = [0.86, 0.74, 0.55], DESERTO2 = [0.78, 0.66, 0.48], RUA = [0.3, 0.3, 0.33], GRAMA = [0.34, 0.52, 0.27], GOLFE = [0.26, 0.55, 0.22], MATO = [0.58, 0.5, 0.36], FUNDO = [0.1, 0.22, 0.34];
const ruido = (x, z, s) => { const v = Math.sin(x * 0.021 + s) * Math.cos(z * 0.027 - s * 1.7) + 0.5 * Math.sin(x * 0.083 + z * 0.057 + s * 3); return v * 0.5 + 0.5; };

// a cor de cada ponto do terreno: (x, z, altura em unidades, normal.y) -> [r, g, b]
export function corDoChao() {
  const C = classes();
  return (x, z, h, ny) => {
    const n1 = ruido(x, z, 1), n2 = ruido(x * 2.7, z * 2.7, 5), cl = C.de(x, z);
    let c = mistura(DESERTO, DESERTO2, n1);
    if (cl === 1) c = mistura(RUA, [0.38, 0.38, 0.4], n1 * 0.6);
    else if (cl === 2) c = mistura(GRAMA, [0.42, 0.58, 0.3], n1);
    else if (cl === 3) c = mistura(GOLFE, [0.32, 0.6, 0.26], n1);
    else if (cl === 4) c = mistura(MATO, [0.5, 0.46, 0.34], n1);
    else if (cl === 5) c = FUNDO;
    else if (ny < 0.95) c = mistura(c, [0.55, 0.48, 0.38], Math.min(1, (0.95 - ny) / 0.2));
    // a calçada de concreto em volta da rua (a Strip, a Koval Lane, a Harmon): uma faixa clara até uns 60 m da borda do asfalto, depois a cor do chão
    const tr = pistaAtual; if (tr && cl !== 5) { const d = tr.distAprox ? tr.distAprox(x, z) : 1e9, L = tr.W / 2; if (d < L + 150) c = mistura(c, cl === 2 || cl === 3 ? [0.5, 0.56, 0.42] : [0.6, 0.58, 0.55], Math.max(0, 1 - Math.max(0, d - L - 20) / 130) * (cl === 2 || cl === 3 ? 0.35 : 0.85)); }
    const f = 0.95 + n2 * 0.1; return [c[0] * f, c[1] * f, c[2] * f];
  };
}

// ---- os lagos: o Bellagio (com as fontes por cima, em marcos.js), o lago do Mirage, a lagoa da Treasure Island ----
export function lagos(tr, { add, hAt, aguaTex }) {
  const mat = new THREE.MeshStandardMaterial({ map: aguaTex("#1c3a5c"), roughness: 0.12, metalness: 0.45, color: 0xcfe0ee }); tr.agua.push(mat);
  let n = 0; tr.lagosLV = [];
  for (const P of D.lagos) {
    if (P.length < 4) continue;
    let cx = 0, cz = 0, y = Infinity; for (const [x, z] of P) { cx += x; cz += z; y = Math.min(y, hAt(x, z)); }
    cx /= P.length; cz /= P.length;
    const shape = new THREE.Shape(P.map(([x, z]) => new THREE.Vector2(x, z))), g = new THREE.ShapeGeometry(shape);
    g.rotateX(Math.PI / 2); g.translate(0, y + 0.8, 0); // (ShapeGeometry fica no plano xy: z do mundo vira o y da forma, e o giro deita a forma)
    const uv = g.attributes.uv, pos = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 160, pos.getZ(i) / 160);
    const m = add(new THREE.Mesh(g, mat)); m.name = "lasvegas-lago"; m.receiveShadow = true; n++;
    tr.lagosLV.push({ P, cx, cz, y: y + 0.8 });
  }
  tr.nLagosLV = n;
}

// ---- as árvores: a palmeira (leque de folhas arqueadas), o pinheiro de rua e o arbusto do deserto ----
function geoCor(partes) {
  const gs = partes.map(([g, c]) => { const n = g.attributes.position.count, col = []; for (let i = 0; i < n; i++) col.push(c[0], c[1], c[2]); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); return g.index ? g.toNonIndexed() : g; });
  const pos = [], nor = [], cor = []; for (const g of gs) { pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); cor.push(...g.attributes.color.array); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3)); return g;
}
function palmeira() { // o tronco fino de ~17 m e a copa de folhas arqueadas
  const partes = [], tronco = new THREE.CylinderGeometry(0.9, 1.5, 36, 6); tronco.translate(0, 18, 0); partes.push([tronco, [0.52, 0.42, 0.32]]);
  for (let f = 0; f < 9; f++) {
    const fo = new THREE.ConeGeometry(1.7, 17, 4); fo.translate(0, 8.5, 0); fo.rotateZ(Math.PI / 2 + 0.55); // a folha sai para o lado e cai
    fo.rotateY((f / 9) * Math.PI * 2 + (f % 2) * 0.3); fo.translate(0, 36, 0); partes.push([fo, [0.2 + (f % 3) * 0.03, 0.4 + (f % 2) * 0.05, 0.2]]);
  }
  const topo = new THREE.SphereGeometry(2, 6, 5); topo.translate(0, 36.5, 0); partes.push([topo, [0.4, 0.34, 0.22]]);
  return geoCor(partes);
}
function arvoreRua() { const t = new THREE.CylinderGeometry(0.9, 1.4, 12, 5); t.translate(0, 6, 0); const a = new THREE.IcosahedronGeometry(8, 0); a.scale(1.3, 1, 1.3); a.translate(0, 17, 0); return geoCor([[t, [0.42, 0.34, 0.26]], [a, [0.28, 0.46, 0.22]]]); }
function arbusto() { const a = new THREE.IcosahedronGeometry(4, 0); a.scale(1.4, 0.7, 1.4); a.translate(0, 2.2, 0); return geoCor([[a, [0.52, 0.5, 0.34]]]); }

export function arvores(tr, add, { hAt, predioEm }) {
  const r = sorteio(7777), listas = { palmeira: [], rua: [], arbusto: [] }, w = tr.t.world;
  const cabe = (x, z, raio) => x > -400 && z > -400 && x < w + 400 && z < w + 400 && livre(tr, x, z, 24 + raio) && !ocupado(tr, x, z) && !predioEm(x, z, raio * 0.4) && !D.lagos.some((P) => poligonoDentro(P, x, z));
  const poe = (tipo, x, z, s) => { if (!cabe(x, z, 7 * s)) return false; listas[tipo].push({ x, y: hAt(x, z), z, s, r: r() * 6.3, t: 0.88 + r() * 0.24 }); return true; };
  for (const [x, z, p] of D.arvores) poe(p || r() < 0.5 ? "palmeira" : "rua", x + (r() - 0.5) * 2, z + (r() - 0.5) * 2, 0.85 + r() * 0.5);
  // as palmeiras do canteiro central e das calçadas da Strip, da Koval Lane e da Harmon: uma fileira por lado, atrás da barreira (onde o chão está livre)
  const { pts, n } = tr; let k = 0;
  for (let i = 0; i < n; i += 7) for (const lado of [-1, 1]) {
    const p = pts[i], rm = tr.murosEscape?.[lado]?.[i] || 0, d = tr.W / 2 + Math.max(rm, 4) + 16 + (lado === -1 && i / n > 0.5 && i / n < 0.8 ? 6 : 0), x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d;
    if (k++ % 2 === 0 || r() < 0.2) continue;
    poe("palmeira", x, z, 0.9 + r() * 0.3);
  }
  // o arbusto do deserto nos terrenos baldios (a classe 0 do chão), em manchas
  for (let a = 0; a < 700; a++) { const x = r() * w, z = r() * w; if (classes().de(x, z) !== 0 && classes().de(x, z) !== 4) continue; if (ruido(x, z, 9) < 0.55) continue; poe("arbusto", x, z, 0.8 + r() * 0.6); }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), o = new THREE.Object3D(), cor = new THREE.Color(); let total = 0;
  const gs = { palmeira: palmeira, rua: arvoreRua, arbusto };
  for (const [tipo, lista] of Object.entries(listas)) {
    if (!lista.length) continue;
    const m = add(new THREE.InstancedMesh(gs[tipo](), mat, lista.length)); m.name = `lasvegas-${tipo}`; m.castShadow = false; m.receiveShadow = true;
    lista.forEach((a, i) => { o.position.set(a.x, a.y, a.z); o.rotation.set(0, a.r, 0); o.scale.set(a.s, a.s * (tipo === "palmeira" ? 0.9 + (a.t - 1) * 1.4 : 1), a.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, cor.setRGB(a.t, a.t, a.t)); });
    total += lista.length;
  }
  tr.arvoresLV = { total, ...Object.fromEntries(Object.entries(listas).map(([k2, l]) => [k2, l.length])) };
}
void canvasTex; void instancias; void K;
function ruidoLocal() {} void ruidoLocal;
