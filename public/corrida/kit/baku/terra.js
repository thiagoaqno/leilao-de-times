// Baku — o chão e o que cresce nele: a cor do terreno (calçadão de mármore claro na orla, rua e calçada de pedra, gramados e mata do Bulevar,
// o morro seco de Absheron), o mar Cáspio (o plano de água que anda), as árvores (plátanos, pinheiros-de-alepo e palmeiras do Bulevar, nas posições
// do OpenStreetMap e em manchas dentro dos parques) e os postes de luz de ferro com globos, que acendem ao entardecer. InstancedMesh em tudo.
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { D, VK, NIVEL_DO_MAR, distanciaDoMar, poligonoDentro, fundoBaku } from "./mundo.js";
import { livre, ocupado, sorteio, instancias } from "../comum.js";
import { materialDaNoite } from "../bahrein/base.js";

const mistura = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const RUA = [0.62, 0.6, 0.55], MARMORE = [0.84, 0.82, 0.77], GRAMA = [0.34, 0.5, 0.27], MATA = [0.2, 0.36, 0.22], SECO = [0.62, 0.55, 0.42], ROCHA = [0.5, 0.46, 0.4], FUNDO = [0.2, 0.42, 0.5], AREIA = [0.76, 0.7, 0.56];
const ruido = (x, z, s) => { const v = Math.sin(x * 0.043 + s) * Math.cos(z * 0.051 - s * 1.7) + 0.5 * Math.sin(x * 0.11 + z * 0.07 + s * 3); return v * 0.5 + 0.5; };

// a cor de cada ponto do terreno: (x, z, altura em unidades, normal.y) -> [r, g, b]
export function corDoChao() {
  const CEL = 200, grade = new Map(), polis = D.verde.map((v) => { const P = []; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (let k = 1; k < v.length; k += 2) { P.push([v[k], v[k + 1]]); x0 = Math.min(x0, v[k]); x1 = Math.max(x1, v[k]); z0 = Math.min(z0, v[k + 1]); z1 = Math.max(z1, v[k + 1]); } return { tipo: v[0], P, caixa: [x0, z0, x1, z1] }; });
  const k = (a, b) => a * 100003 + b;
  for (const p of polis) for (let i = Math.floor(p.caixa[0] / CEL); i <= Math.floor(p.caixa[2] / CEL); i++) for (let j = Math.floor(p.caixa[1] / CEL); j <= Math.floor(p.caixa[3] / CEL); j++) (grade.get(k(i, j)) || grade.set(k(i, j), []).get(k(i, j))).push(p);
  const tipoEm = (x, z) => { let t = 0; const l = grade.get(k(Math.floor(x / CEL), Math.floor(z / CEL))); if (l) for (const p of l) if (x >= p.caixa[0] && x <= p.caixa[2] && z >= p.caixa[1] && z <= p.caixa[3] && poligonoDentro(p.P, x, z)) t = Math.max(t, p.tipo === 2 ? 2 : 1); return t; };
  return (x, z, h, ny) => {
    const sMar = distanciaDoMar(x, z), n1 = ruido(x, z, 1), n2 = ruido(x * 2.3, z * 2.3, 5);
    if (sMar > 0) return mistura(FUNDO, AREIA, Math.max(0, 1 - sMar / 50));
    let c = RUA; const tipo = tipoEm(x, z), metros = h / VK;
    if (tipo === 1) c = mistura(GRAMA, [0.46, 0.6, 0.3], n1 * 0.6);
    else if (tipo === 2) c = mistura(MATA, [0.28, 0.44, 0.26], n1);
    else {
      c = mistura(RUA, [0.7, 0.66, 0.58], n1 * 0.6);
      if (metros > 45) c = mistura(c, SECO, Math.min(0.8, (metros - 45) / 70)); // o morro lá em cima é seco, de arbustos e pedra
    }
    if (sMar > -260 && tipo !== 2) c = mistura(c, MARMORE, 0.42 * (1 - Math.max(0, -sMar - 60) / 200)); // o calçadão da orla, claro
    if (ny < 0.93) c = mistura(c, ROCHA, Math.min(1, (0.93 - ny) / 0.2)); // pedra onde a encosta é íngreme
    if (sMar > -30) c = mistura(c, AREIA, 0.45 * (1 + sMar / 30));
    const f = 0.94 + n2 * 0.12; return [c[0] * f, c[1] * f, c[2] * f];
  };
}

// ---- o mar ----
export function mar(tr, { add, aguaTex, size }) {
  const mat = new THREE.MeshStandardMaterial({ map: aguaTex("#2c7a96"), roughness: 0.14, metalness: 0.3 }); mat.map.repeat.set(size / 240, size / 240); tr.agua.push(mat);
  const m = add(new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat)); m.rotation.x = -Math.PI / 2; m.position.set(tr.t.world / 2, NIVEL_DO_MAR, tr.t.world / 2); m.name = "baku-mar";
}

// ---- as árvores ----
function geoCor(partes) {
  const gs = partes.map(([g, c]) => { const n = g.attributes.position.count, col = []; for (let i = 0; i < n; i++) col.push(c[0], c[1], c[2]); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); return g.index ? g.toNonIndexed() : g; });
  const pos = [], nor = [], cor = []; for (const g of gs) { pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); cor.push(...g.attributes.color.array); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3)); return g;
}
const pecas = {
  platano: () => { const t = new THREE.CylinderGeometry(1.2, 2, 14, 4); t.translate(0, 7, 0); const a = new THREE.IcosahedronGeometry(11, 0); a.scale(1.5, 1, 1.5); a.translate(0, 21, 0); const b = new THREE.IcosahedronGeometry(7, 0); b.scale(1.3, 0.9, 1.3); b.translate(6, 26, 2); return geoCor([[t, [0.4, 0.33, 0.26]], [a, [0.24, 0.46, 0.2]], [b, [0.3, 0.52, 0.24]]]); },
  pinheiro: () => { const t = new THREE.CylinderGeometry(1, 1.8, 18, 4); t.translate(0, 9, 0); const a = new THREE.IcosahedronGeometry(10, 0); a.scale(1.6, 0.7, 1.6); a.translate(0, 24, 0); const b = new THREE.IcosahedronGeometry(6, 0); b.scale(1.4, 0.7, 1.4); b.translate(-4, 29, 3); return geoCor([[t, [0.45, 0.32, 0.22]], [a, [0.16, 0.38, 0.22]], [b, [0.2, 0.42, 0.24]]]); },
  palmeira: () => { const t = new THREE.CylinderGeometry(1, 1.8, 26, 6); t.translate(0, 13, 0); const c = new THREE.ConeGeometry(13, 7, 8, 1, true); c.translate(0, 28, 0); return geoCor([[t, [0.5, 0.4, 0.28]], [c, [0.22, 0.46, 0.22]]]); },
  cipreste: () => { const a = new THREE.ConeGeometry(4.6, 34, 7); a.translate(0, 17, 0); return geoCor([[a, [0.1, 0.3, 0.16]]]); },
};

export function arvores(tr, add, { hAt, predioEm }) {
  const r = sorteio(4242), listas = { platano: [], pinheiro: [], palmeira: [], cipreste: [] }, w = tr.t.world;
  const cabe = (x, z, raio) => x > -400 && z > -400 && x < w + 400 && z < w + 400 && livre(tr, x, z, 22 + raio) && !ocupado(tr, x, z) && !predioEm(x, z, raio * 0.4) && distanciaDoMar(x, z) < -8 && fundoBaku(tr, x, z) < -4;
  const poe = (tipo, x, z, s) => { if (!cabe(x, z, 11 * s)) return false; listas[tipo].push({ x, y: hAt(x, z), z, s, r: r() * 6.3, t: 0.86 + r() * 0.26 }); return true; };
  for (const [x, z] of D.arvores) { const alto = hAt(x, z) / VK > 30; poe(r() < 0.1 ? "palmeira" : alto && r() < 0.5 ? "pinheiro" : r() < 0.3 ? "cipreste" : "platano", x + (r() - 0.5) * 3, z + (r() - 0.5) * 3, 0.85 + r() * 0.5); }
  for (const v of D.verde) { // manchas dentro dos parques (o Bulevar) e da mata
    const P = []; for (let k = 1; k < v.length; k += 2) P.push([v[k], v[k + 1]]);
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const passo = v[0] === 2 ? 56 : 74;
    for (let z = z0; z < z1; z += passo) for (let x = x0; x < x1; x += passo) {
      const px = x + (r() - 0.5) * passo * 0.8, pz = z + (r() - 0.5) * passo * 0.8; if (!poligonoDentro(P, px, pz)) continue;
      poe(v[0] === 2 ? "pinheiro" : r() < 0.45 ? "pinheiro" : r() < 0.2 ? "palmeira" : "platano", px, pz, 0.9 + r() * 0.5);
      if (listas.platano.length + listas.pinheiro.length + listas.palmeira.length + listas.cipreste.length > 1100) break;
    }
  }
  // as árvores da calçada junto da pista, onde não há barreira nem prédio (o Bulevar: pinheiros e plátanos em fileira)
  const { pts, n } = tr;
  for (let i = 0; i < n; i += 9) for (const lado of [-1, 1]) {
    const p = pts[i], rm = tr.murosEscape?.[lado]?.[i] || 0, d = tr.W / 2 + Math.max(rm, 0) + 22 + r() * 8, x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d;
    if (r() < 0.55) poe(r() < 0.3 ? "palmeira" : r() < 0.55 ? "pinheiro" : "platano", x, z, 0.9 + r() * 0.35);
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), o = new THREE.Object3D(), cor = new THREE.Color(); let total = 0;
  for (const [tipo, lista] of Object.entries(listas)) {
    if (!lista.length) continue;
    const m = add(new THREE.InstancedMesh(pecas[tipo](), mat, lista.length)); m.name = `baku-${tipo}`; m.castShadow = false; m.receiveShadow = true;
    lista.forEach((a, i) => { o.position.set(a.x, a.y, a.z); o.rotation.set(0, a.r, 0); o.scale.set(a.s, a.s * (tipo === "palmeira" ? 1 + (a.t - 1) * 1.6 : 1), a.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, cor.setRGB(a.t, a.t, a.t)); });
    total += lista.length;
  }
  tr.arvoresBaku = { total, ...Object.fromEntries(Object.entries(listas).map(([k, l]) => [k, l.length])) };
}

// ---- os postes de luz: ferro preto e dourado, com três globos (o Bulevar e as avenidas), a cada ~90 unidades onde há calçada livre ----
export function postesDeLuz(tr, add, { hAt, predioEm }) {
  const { pts, n } = tr, lista = [];
  for (let i = 0; i < n; i += 14) for (const lado of [-1, 1]) {
    const p = pts[i], rm = tr.murosEscape?.[lado]?.[i] || 0, d = tr.W / 2 + Math.max(rm, 4) + 13, x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d;
    if (!livre(tr, x, z, 8) || ocupado(tr, x, z, i) || predioEm(x, z, 3) || fundoBaku(tr, x, z) > -6) continue;
    lista.push({ x, y: hAt(x, z), z, r: Math.atan2(p.ty, p.tx) });
  }
  const poste = new THREE.CylinderGeometry(0.55, 0.9, 26, 6); poste.translate(0, 13, 0);
  instancias(add, poste, M(0x1b1a1c, { roughness: 0.5, metalness: 0.4 }), lista.map((a) => ({ x: a.x, y: a.y, z: a.z, r: a.r })), { nome: "baku-postes-luz" });
  const braco = new THREE.BoxGeometry(11, 0.7, 0.7); braco.translate(0, 26, 0);
  instancias(add, braco, M(0x1b1a1c, { roughness: 0.5, metalness: 0.4 }), lista.map((a) => ({ x: a.x, y: a.y, z: a.z, r: -a.r - Math.PI / 2 })), { sombra: false });
  const globo = new THREE.SphereGeometry(1.7, 8, 6), luz = materialDaNoite(tr, 0xe9dfc0, 0xfff1c4);
  const gl = []; for (const a of lista) for (const dx of [-5, 0, 5]) { gl.push({ x: a.x - dx * Math.sin(a.r), y: a.y + 25.2, z: a.z + dx * Math.cos(a.r) }); }
  instancias(add, globo, luz, gl, { sombra: false, nome: "baku-globos" });
  tr.postesBaku = lista.length;
}
