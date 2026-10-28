// Suzuka — os morros de floresta em volta do circuito (peça nova, só desta pista): um relevo de baixa resolução com a cor
// do mato (uma malha só, cor por vértice) e, em cima dele, a floresta japonesa: cedros altos e finos (sugi), folhosas,
// bordos vermelhos e cerejeiras em flor. Tudo em InstancedMesh, sem sombra própria. O circuito de verdade fica num vale
// no meio das colinas de Mie; aqui o chão da pista continua sendo o de pista.js (o relevo da pista não muda): os morros só
// começam longe do chão dela (`inicio`) e nunca avançam sobre a pista, o miolo da volta nem os lugares reservados.
//
//   const rel = colinas(tr, add, { vazio: [[x, z, raio]] });   // rel.alturaEm(x, z) dá a altura do morro
//   florestaJaponesa(tr, add, rel, { ... });                    // cedros, folhosas e bordos nos morros e na planície
//   cerejeiras(tr, add, lugares, { ... });                      // [[x, z, escala]]: cerejeiras isoladas ou em bosquinho
import * as THREE from "three";
import { M } from "../../cena.js";
import { livre, ocupado, sorteio } from "../comum.js";

// ---- ruído de valor, suave, que repete sempre igual (a mesma pista sai sempre igual) ----
const hash = (i, j, s) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const suave = (t) => t * t * (3 - 2 * t);
function ruido(x, z, s) {
  const i = Math.floor(x), j = Math.floor(z), fx = suave(x - i), fz = suave(z - j), a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
export const relevo = (x, z, s = 7) => ruido(x / 1150, z / 1150, s) * 0.55 + ruido(x / 520, z / 520, s + 1) * 0.3 + ruido(x / 230, z / 230, s + 2) * 0.15; // 0 a 1
const lim = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const passo01 = (a, b, v) => suave(lim((v - a) / (b - a)));

// dentro da volta? (a linha central como polígono)
function dentroDaVolta(pts, x, z) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > z) !== (b.y > z) && x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x) d = !d; }
  return d;
}

/**
 * O relevo dos morros: começa a `inicio` do centro da pista (mais longe do que o chão da pista alcança) e sobe até `fim`.
 * @param {object} o { inicio=470, fim=1250, altura=360 (o morro mais alto), margem=1300 (quanto passa da borda do mundo), passo=110,
 *   vazio: [[x, z, raio]] lugares planos (o parque, o paddock), miolo: quanto do relevo vale dentro da volta (0,14) }
 * @returns {{alturaEm:(x:number,z:number)=>number, malha:THREE.Mesh}}
 */
export function colinas(tr, add, { inicio = 470, fim = 1250, altura = 360, margem = 1300, passo = 110, vazio = [], miolo = 0.14, corBaixa = "#4f8b3d", corMedia = "#3f7a36", corAlta = "#2c5e30" } = {}) {
  const { pts } = tr, mundo = tr.t.world, x0 = -margem, nn = Math.ceil((mundo + margem * 2) / passo), lado = nn + 1;
  const alt = new Float32Array(lado * lado);
  const cb = new THREE.Color(corBaixa), cm = new THREE.Color(corMedia), ca = new THREE.Color(corAlta), cp = new THREE.Color("#6f9f45"), cor = new THREE.Color();
  const pos = new Float32Array(lado * lado * 3), cores = new Float32Array(lado * lado * 3);
  for (let j = 0; j < lado; j++) for (let i = 0; i < lado; i++) {
    const x = x0 + i * passo, z = x0 + j * passo, d = tr.distAt(x, z);
    let m = passo01(inicio, fim, d);
    if (m > 0 && d < 2400 && dentroDaVolta(pts, x, z)) m *= miolo; // dentro da volta, só ondulações
    for (const [cx, cz, r] of vazio) m *= passo01(r * 0.75, r * 1.5, Math.hypot(x - cx, z - cz));
    const f = relevo(x, z), h = m * (28 + altura * f * f);
    alt[j * lado + i] = h;
    const k = j * lado + i;
    pos[k * 3] = x; pos[k * 3 + 1] = h - 3; pos[k * 3 + 2] = z;
    // a cor: o verde do chão na base, o verde fechado da mata nas encostas e as manchas de clareira
    const t = lim(h / (altura * 0.55)), mancha = ruido(x / 170, z / 170, 31);
    cor.copy(cb).lerp(cm, passo01(0, 0.35, t)).lerp(ca, passo01(0.4, 1, t));
    if (mancha > 0.66 && t < 0.5) cor.lerp(cp, (mancha - 0.66) * 2.2); else cor.multiplyScalar(0.9 + mancha * 0.2);
    cores[k * 3] = cor.r; cores[k * 3 + 1] = cor.g; cores[k * 3 + 2] = cor.b;
  }
  const idx = [];
  for (let j = 0; j < nn; j++) for (let i = 0; i < nn; i++) {
    const a = j * lado + i, b = a + 1, c = a + lado, d = c + 1;
    if (alt[a] + alt[b] + alt[c] + alt[d] < 0.5) continue; // onde não há morro nenhum não há triângulo
    // a diagonal acompanha o relevo (a que une os cantos mais altos) para a crista não serrilhar
    if (Math.abs(alt[a] - alt[d]) < Math.abs(alt[b] - alt[c])) idx.push(a, c, d, a, d, b); else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(cores, 3)); g.setIndex(idx); g.computeVertexNormals();
  const malha = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
  malha.name = `${tr.id}-colinas`; malha.receiveShadow = false; malha.castShadow = false;
  // a altura do morro em qualquer ponto (bilinear na mesma grade da malha)
  const alturaEm = (x, z) => {
    const u = (x - x0) / passo, v = (z - x0) / passo; if (u < 0 || v < 0 || u >= nn || v >= nn) return 0;
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, a = alt[j * lado + i], b = alt[j * lado + i + 1], c = alt[(j + 1) * lado + i], d = alt[(j + 1) * lado + i + 1];
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
  };
  tr.colinasSuzuka = { alturaEm, triangulos: idx.length / 3 };
  return { alturaEm, malha };
}

// ---- as árvores ----
const colorir = (m, lista) => { if (m) { lista.forEach((o, k) => m.setColorAt(k, new THREE.Color(o.c))); if (m.instanceColor) m.instanceColor.needsUpdate = true; } return m; };
function instanciar(add, geo, mat, lista, nome) {
  if (!lista.length) return null;
  const m = add(new THREE.InstancedMesh(geo, mat, lista.length)), d = new THREE.Object3D();
  lista.forEach((o, k) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r || 0, 0); d.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1); d.updateMatrix(); m.setMatrixAt(k, d.matrix); });
  m.castShadow = false; m.receiveShadow = false; m.name = nome; colorir(m, lista); return m;
}
// um cedro (sugi): três cones abertos empilhados, cada um mais fino que o de baixo, de 1 de altura e 1 de raio na base
function geoCedro() {
  const gs = [];
  [[1, 0.56, 0], [0.66, 0.5, 0.42]].forEach(([r, h, y]) => { const c = new THREE.ConeGeometry(r, h * 1.25, 6, 1, true); c.translate(0, y + (h * 1.25) / 2 - 0.02, 0); gs.push(c); });
  return mergeSimples(gs);
}
// junta geometrias sem índice/com índice numa só (sem depender do BufferGeometryUtils)
function mergeSimples(gs) {
  const pos = [], nor = [], idx = []; let base = 0;
  for (const g0 of gs) { const g = g0.index ? g0.toNonIndexed() : g0; g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); idx.push(base + i); } base += p.count; }
  const r = new THREE.BufferGeometry(); r.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); r.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); r.setIndex(idx); return r;
}
// uma copa de cerejeira: três esferas facetadas juntas (de raio 1 no total, ~1 de altura)
function geoCopa(blobs) {
  const gs = blobs.map(([x, y, z, r]) => { const s = new THREE.IcosahedronGeometry(r, 0); s.translate(x, y, z); return s; });
  return mergeSimples(gs);
}
const COPA_CEREJA = [[0, 0.1, 0, 0.62], [0.5, -0.05, 0.1, 0.5], [-0.46, -0.02, -0.18, 0.52], [0.05, 0.3, 0.3, 0.44]];
const COPA_FOLHA = [[0, 0.05, 0, 0.72], [0.4, -0.1, 0.1, 0.5]];

/**
 * A floresta japonesa: cedros altos e finos em maioria, folhosas, bordos vermelhos e, aqui e ali, cerejeiras em flor.
 * Planta em grade com sorteio, depois da área da pista (`minDist`) e só onde `livre`/`ocupado` deixam, em manchas de mata
 * (o ruído decide onde é mata e onde é campo).
 * @param {object} rel o resultado de `colinas` (a altura do chão em cima dos morros)
 * @param {object} o { passo=62, minDist=260, densidade=1, semente=5171, de: [x0,z0], ate: [x1,z1] }
 */
export function florestaJaponesa(tr, add, rel, { passo = 80, minDist = 260, densidade = 1, semente = 5171, cedros = 0.7, folhosas = 0.2, bordos = 0.04 } = {}) {
  const r = sorteio(semente), mundo = tr.t.world, ext = 1100;
  const cedro = [], folha = [], bordo = [], troncos = [], flor = [];
  const verdesCedro = ["#1d4a2a", "#245a33", "#2d6a3b", "#193f27", "#31703d"], verdesFolha = ["#4d8a3a", "#5c9a40", "#3f7a33", "#6aa043", "#79a845"], bordos_ = ["#c23a22", "#d6622a", "#e08a2e", "#b02a20"];
  for (let x = -ext; x < mundo + ext; x += passo) for (let z = -ext; z < mundo + ext; z += passo) {
    const px = x + (r() - 0.5) * passo * 0.9, pz = z + (r() - 0.5) * passo * 0.9, d = tr.distAt(px, pz);
    if (d < minDist) continue;
    const mata = ruido(px / 420, pz / 420, 91), prob = lim((d - minDist) / 420, 0.12, 1) * densidade * passo01(0.3, 0.55, mata);
    if (r() > prob) continue;
    if (ocupado(tr, px, pz)) continue;
    const y = Math.max(0, rel.alturaEm(px, pz) - 3) - 1.5, u = r();
    if (u < cedros) { const alto = 130 + r() * 190, w = alto * (0.17 + r() * 0.07); cedro.push({ x: px, y, z: pz, sx: w, sy: alto, sz: w, r: r() * 6, c: verdesCedro[(r() * verdesCedro.length) | 0] }); }
    else if (u < cedros + folhosas) { const alto = 120 + r() * 120; folha.push({ x: px, y: y + alto * 0.55, z: pz, sx: alto * 0.4, sy: alto * 0.4, sz: alto * 0.4, r: r() * 6, c: verdesFolha[(r() * verdesFolha.length) | 0] }); troncos.push({ x: px, y: y + alto * 0.2, z: pz, sx: alto * 0.04, sy: alto * 0.4, sz: alto * 0.04 }); }
    else if (u < cedros + folhosas + bordos) { const alto = 110 + r() * 90; bordo.push({ x: px, y: y + alto * 0.55, z: pz, sx: alto * 0.38, sy: alto * 0.38, sz: alto * 0.38, r: r() * 6, c: bordos_[(r() * bordos_.length) | 0] }); troncos.push({ x: px, y: y + alto * 0.2, z: pz, sx: alto * 0.04, sy: alto * 0.4, sz: alto * 0.04 }); }
    else { const alto = 100 + r() * 80; flor.push({ x: px, y: y + alto * 0.58, z: pz, sx: alto * 0.44, sy: alto * 0.4, sz: alto * 0.44, r: r() * 6, c: ["#f7c6d9", "#f4b4cc", "#fbd9e6", "#eaa0bd"][(r() * 4) | 0] }); troncos.push({ x: px, y: y + alto * 0.2, z: pz, sx: alto * 0.04, sy: alto * 0.4, sz: alto * 0.04 }); }
  }
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), casca = M(0x4d3a2b, { roughness: 1 });
  instanciar(add, geoCedro(), mat, cedro, `${tr.id}-cedros`);
  const copaFolha = geoCopa(COPA_FOLHA);
  instanciar(add, copaFolha, mat, folha, `${tr.id}-folhosas`);
  instanciar(add, copaFolha, mat, bordo, `${tr.id}-bordos`);
  instanciar(add, geoCopa(COPA_CEREJA), mat, flor, `${tr.id}-cerejeiras-longe`);
  instanciar(add, new THREE.CylinderGeometry(0.7, 1, 1, 5), casca, troncos, `${tr.id}-troncos`);
  tr.florestaSuzuka = { cedros: cedro.length, folhosas: folha.length, bordos: bordo.length, cerejeiras: flor.length };
}

/**
 * Cerejeiras em flor (sakura) com o tronco torto e a copa rosa, em bosquinho ou isoladas, só onde `livre`/`ocupado` deixam.
 * @param {Array} lugares [[x, z, escala]] (escala 1 = 150 de altura)
 */
export function cerejeiras(tr, add, lugares, { hAt, folga = 20, semente = 6029 } = {}) {
  const r = sorteio(semente), flor = [], troncos = [], petalas = [];
  for (const [x, z, s = 1] of lugares) {
    const alto = 150 * s, larg = alto * 0.5;
    if (!livre(tr, x, z, larg + folga) || ocupado(tr, x, z)) continue;
    const y = hAt(x, z);
    flor.push({ x, y: y + alto * 0.62, z, sx: larg, sy: alto * 0.42, sz: larg, r: r() * 6, c: ["#f9d3e1", "#f6bdd2", "#fbe0ea", "#f2a9c4", "#f8c9da"][(r() * 5) | 0] });
    troncos.push({ x, y: y + alto * 0.22, z, sx: alto * 0.045, sy: alto * 0.44, sz: alto * 0.045 });
    for (let k = 0; k < 3; k++) { const a = r() * 6.3, dd = larg * (0.4 + r() * 0.9); petalas.push({ x: x + Math.cos(a) * dd, y: y + 0.6 + r() * 0.4, z: z + Math.sin(a) * dd, sx: 7 + r() * 8, sy: 1, sz: 5 + r() * 6, r: r() * 6, c: "#f9c8da" }); }
  }
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
  instanciar(add, geoCopa(COPA_CEREJA), mat, flor, `${tr.id}-cerejeiras`);
  instanciar(add, new THREE.CylinderGeometry(0.7, 1, 1, 5), M(0x4a362a, { roughness: 1 }), troncos, `${tr.id}-cerejeiras-troncos`);
  // pétalas no chão debaixo de cada copa: discos rosados achatados
  instanciar(add, new THREE.CylinderGeometry(1, 1, 0.5, 6), new THREE.MeshStandardMaterial({ roughness: 1 }), petalas, `${tr.id}-petalas`);
  tr.cerejeirasSuzuka = flor.length;
  return flor.length;
}
