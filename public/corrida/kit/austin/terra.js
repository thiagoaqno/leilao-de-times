// Austin — a paisagem seca do Texas (peça só desta pista): a cor do chão (capim dourado, terra clara, calcário nas encostas e o gramado verde do miolo), os
// morros baixos do Hill Country no horizonte e a vegetação de lá em InstancedMesh: carvalhos-vivos de copa larga, cedros (zimbros-de-ashe) escuros, mesquites
// ralos, nopais, pedras de calcário e manchas de bluebonnet (a flor do estado). Tudo sem sombra própria e sem luz nova; só onde `livre` e `ocupado` deixam.
import * as THREE from "three";

import { livre, ocupado, sorteio, instancias } from "../comum.js";
import { ruido, lim } from "./lugar.js";

const suave = (t) => t * t * (3 - 2 * t);
const passo01 = (a, b, v) => suave(lim((v - a) / (b - a)));

/**
 * A cor do chão por vértice (a opção `terreno.cor` do GP): números que MULTIPLICAM a textura de capim seco de `LOOK.austin`.
 * Capim dourado em manchas grandes, terra clara onde o ruído é fraco, calcário nas encostas íngremes e verde no miolo (a Grande Praça e o anfiteatro).
 */
export function corDoChao(tr, { verdes = [] } = {}) {
  return (x, z, h, ny) => {
    const a = ruido(x / 520, z / 520, 7), b = ruido(x / 170, z / 170, 19), c = ruido(x / 60, z / 60, 31);
    let r = 1.02 + a * 0.16 - c * 0.04, g = 1.0 + a * 0.06 - b * 0.06, bl = 0.86 - a * 0.1 + c * 0.05; // capim dourado
    const terra = passo01(0.62, 0.8, b) * 0.7; // clareiras de terra batida
    r += terra * 0.12; g += terra * 0.02; bl += terra * 0.04;
    const encosta = passo01(0.93, 0.8, ny); // calcário aparecendo onde o chão é íngreme
    r += encosta * 0.18; g += encosta * 0.2; bl += encosta * 0.22;
    for (const [cx, cz, raio] of verdes) { // o gramado regado do miolo
      const v = 1 - passo01(raio * 0.6, raio * 1.2, Math.hypot(x - cx, z - cz));
      if (v > 0) { r += (0.78 - r) * v; g += (1.06 - g) * v; bl += (0.78 - bl) * v; }
    }
    return [r, g, bl];
  };
}

// junta geometrias numa só (sem depender do BufferGeometryUtils)
function juntar(gs) {
  const pos = [], nor = [], idx = []; let base = 0;
  for (const g0 of gs) { const g = g0.index ? g0.toNonIndexed() : g0; g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); idx.push(base + i); } base += p.count; }
  const r = new THREE.BufferGeometry(); r.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); r.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); r.setIndex(idx); return r;
}
const blob = (r, x, y, z, sy = 1, sx = 1, sz = 1) => { const s = new THREE.IcosahedronGeometry(r, 0); s.scale(sx, sy, sz); s.translate(x, y, z); return s; };
// carvalho-vivo: copa larga e baixa (três lóbulos achatados), de ~1,7 de largura e ~1 de altura, com a base da copa a 0,42
const geoCarvalho = () => juntar([blob(0.58, 0, 0.72, 0, 0.62), blob(0.46, 0.5, 0.62, 0.16, 0.6), blob(0.42, -0.46, 0.6, -0.14, 0.58), blob(0.34, 0.1, 0.5, 0.42, 0.6)]);
// cedro (zimbro-de-ashe): um cone cheio e desgrenhado, duas peças, de 1 de altura e ~0,5 de largura
const geoCedro = () => juntar([blob(0.5, 0, 0.42, 0, 0.85, 1, 1), blob(0.36, 0.06, 0.78, 0.04, 0.9, 1, 1), blob(0.22, -0.04, 1.02, 0, 0.9, 1, 1)]);
// mesquite: copa rala e achatada, larga
const geoMesquite = () => juntar([blob(0.62, 0, 0.8, 0, 0.36), blob(0.4, 0.46, 0.7, 0.1, 0.34), blob(0.36, -0.4, 0.66, -0.2, 0.3)]);
// nopal: quatro raquetes achatadas empilhadas
const geoNopal = () => { const g = []; for (const [x, y, z, s, r] of [[0, 0.3, 0, 0.5, 0.2], [0.34, 0.6, 0.06, 0.42, -0.5], [-0.3, 0.62, -0.04, 0.4, 0.55], [0.1, 0.92, 0.04, 0.34, 0.1]]) { const p = blob(0.5, x, y, z, 1, s, s * 0.22); p.rotateZ(r); g.push(p); } return juntar(g); };
const geoPedra = () => { const d = new THREE.DodecahedronGeometry(0.5, 0); d.scale(1, 0.62, 0.8); d.translate(0, 0.2, 0); return d; };
const geoTronco = () => { const c = new THREE.CylinderGeometry(0.07, 0.12, 0.6, 5); c.translate(0, 0.3, 0); return c; };

const COR_CARVALHO = ["#4a6a34", "#527439", "#426030", "#5a7a3c"], COR_CEDRO = ["#4d6a37", "#587440", "#456131", "#62793f"], COR_MESQUITE = ["#7d9a48", "#8aa352", "#6f8d3f", "#94a85a"];
const COR_NOPAL = ["#5f8a4a", "#6c9552", "#557f44"], COR_PEDRA = ["#d6cfb8", "#c9c1a6", "#bdb59c", "#ddd6c0", "#a9a28c"], FLORES = ["#4a5fd0", "#5b6fd6", "#3f4fc2", "#7a70d8"];
const escolher = (lista, r) => lista[(r() * lista.length) | 0];
function colorir(m, lista) { if (m) { lista.forEach((o, k) => m.setColorAt(k, new THREE.Color(o.c))); if (m.instanceColor) m.instanceColor.needsUpdate = true; } return m; }

/**
 * A vegetação do Texas. Dois passos: a beira (seguindo a pista, depois de uma faixa aberta de `recuo`: o circuito é um campo limpo) e o resto do mundo, em grade
 * (dentro da volta e longe dela), com manchas por ruído: onde o ruído é alto é mata de cedro e carvalho, onde é baixo é campo aberto de capim.
 * @param {object} cfg { recuo=70, fundo=560, semente, evitar: [{ f0, f1, lado, lat0, lat1 }], passoGrade=120, ate=1 }
 */
export function vegetacaoTexas(tr, add, cfg = {}) {
  const { pts, n, W } = tr, r = sorteio(cfg.semente ?? 6161), recuo = W / 2 + (cfg.recuo ?? 70), fundo = cfg.fundo ?? 560, evitar = cfg.evitar || [];
  const carvalhos = [], cedros = [], mesquites = [], nopais = [], pedras = [], flores = [], troncos = [];
  const plantar = (x, z, tipo, i, folga) => {
    if (!livre(tr, x, z, folga + 8) || ocupado(tr, x, z, i)) return;
    const y = tr.chao(x, z) - 1.2;
    if (tipo === "carvalho") { const s = 52 + r() * 36; carvalhos.push({ x, y: y + s * 0.1, z, sx: s, sy: s * 0.9, sz: s, r: r() * 6, c: escolher(COR_CARVALHO, r) }); troncos.push({ x, y, z, sx: s * 0.55, sy: s * 0.9, sz: s * 0.55, r: 0, c: "#6b5a45" }); }
    else if (tipo === "cedro") { const s = 32 + r() * 34; cedros.push({ x, y, z, sx: s * (0.9 + r() * 0.5), sy: s, sz: s * (0.9 + r() * 0.5), r: r() * 6, c: escolher(COR_CEDRO, r) }); }
    else if (tipo === "mesquite") { const s = 44 + r() * 34; mesquites.push({ x, y, z, sx: s, sy: s, sz: s, r: r() * 6, c: escolher(COR_MESQUITE, r) }); troncos.push({ x, y, z, sx: s * 0.45, sy: s * 0.8, sz: s * 0.45, r: 0, c: "#7a6a4f" }); }
    else if (tipo === "nopal") { const s = 12 + r() * 14; nopais.push({ x, y, z, sx: s, sy: s, sz: s, r: r() * 6, c: escolher(COR_NOPAL, r) }); }
    else if (tipo === "pedra") { const s = 8 + r() * r() * 34; pedras.push({ x, y: y + 0.5, z, sx: s * (1 + r() * 0.6), sy: s * (0.6 + r() * 0.5), sz: s, r: r() * 6, c: escolher(COR_PEDRA, r) }); }
  };
  const tipoDe = (x, z, mata, perto = false) => { // `mata` 0 a 1: o quanto o lugar é de árvore
    const q = r();
    if (q < 0.1) return "pedra";
    if (q < 0.2) return "nopal";
    if (r() > mata) return q < 0.5 ? "pedra" : "nopal";
    const t = ruido(x / 300, z / 300, 5) > 0.55 ? (r() < 0.55 ? "carvalho" : "cedro") : (r() < 0.55 ? "cedro" : r() < 0.6 ? "mesquite" : "carvalho");
    return t === "carvalho" && perto ? "mesquite" : t;
  };
  // 1. a beira
  for (let i = 0; i < Math.floor((cfg.ate ?? 1) * n); i += 3) {
    const p = pts[i];
    for (const lado of [-1, 1]) for (let k = 0, q = (r() < 0.55 ? 1 : 0) + (r() < 0.12 ? 1 : 0); k < q; k++) {
      const d = recuo + r() * r() * fundo, x = p.x + p.nx * lado * d + (r() - 0.5) * 30, z = p.y + p.ny * lado * d + (r() - 0.5) * 30;
      if (evitar.some((e) => e.lado === lado && i >= e.f0 * n && i <= e.f1 * n && d > e.lat0 - 40 && d < e.lat1 + 60)) continue;
      const mata = lim(0.25 + ruido(x / 420, z / 420, 3) * 1.1 - (d < recuo + 60 ? 0.5 : 0)); // logo depois da cerca, quase só pedra, nopal e moita
      plantar(x, z, tipoDe(x, z, mata, d < recuo + 110), i % n, 50);
    }
  }
  // 2. o resto do mundo, em grade
  const mundo = tr.t.world, passo = cfg.passoGrade ?? 120, ext = 700;
  for (let gx = -ext; gx < mundo + ext; gx += passo) for (let gz = -ext; gz < mundo + ext; gz += passo) {
    const x = gx + (r() - 0.5) * passo, z = gz + (r() - 0.5) * passo, d = tr.distAt(x, z);
    if (d < recuo + 40) continue; // a beira já cuidou
    const mata = ruido(x / 520, z / 520, 9), prob = lim((d - recuo) / 500, 0.15, 1) * (0.1 + mata * 0.45);
    if (r() > prob) continue;
    plantar(x, z, tipoDe(x, z, lim(mata * 1.6)), 0, 40);
  }
  // 3. as manchas de bluebonnet, em volta das clareiras de capim
  for (let i = 0; i < n; i += 2) {
    const p = pts[i];
    for (const lado of [-1, 1]) {
      const d = recuo + 30 + r() * 320, x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d;
      if (ruido(x / 140, z / 140, 41) < 0.7 || !livre(tr, x, z, 30) || ocupado(tr, x, z, i)) continue;
      for (let k = 0; k < 3; k++) { const a = x + (r() - 0.5) * 70, b = z + (r() - 0.5) * 70; if (livre(tr, a, b, 30) && !ocupado(tr, a, b, i)) flores.push({ x: a, y: tr.chao(a, b) - 0.6, z: b, sx: 6 + r() * 10, sy: 1, sz: 6 + r() * 10, r: r() * 6, c: escolher(FLORES, r) }); }
    }
  }
  const mat = () => new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
  const inst = (geo, lista, nome, material = mat()) => colorir(instancias(add, geo, material, lista, { sombra: false, nome: `${tr.id}-${nome}` }), lista);
  inst(geoCarvalho(), carvalhos, "carvalhos"); inst(geoCedro(), cedros, "cedros"); inst(geoMesquite(), mesquites, "mesquites"); inst(geoNopal(), nopais, "nopais"); inst(geoPedra(), pedras, "calcario");
  inst(geoTronco(), troncos, "troncos");
  const flor = new THREE.CircleGeometry(1, 6); flor.rotateX(-Math.PI / 2);
  inst(flor, flores, "bluebonnet", new THREE.MeshStandardMaterial({ roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  tr.vegetacaoAustin = { carvalhos: carvalhos.length, cedros: cedros.length, mesquites: mesquites.length, nopais: nopais.length, pedras: pedras.length, flores: flores.length };
  return tr.vegetacaoAustin;
}

/**
 * Os morros baixos do Hill Country: uma malha só, com cor por vértice (capim dourado, mato de cedro verde-oliva e o calcário claro nas bordas), longe da pista
 * e do chão dela, que continua sendo o de pista.js. A altura em qualquer ponto vem em `alturaEm`.
 * @param {object} o { inicio=620, fim=1700, altura=210, margem=1700, passo=120, miolo=0 (dentro da volta só o chão), vazio: [[x, z, raio]] }
 */
export function colinas(tr, add, { inicio = 620, fim = 1700, altura = 210, margem = 1700, passo = 120, miolo = 0, vazio = [] } = {}) {
  const mundo = tr.t.world, x0 = -margem, nn = Math.ceil((mundo + margem * 2) / passo), lado = nn + 1, alt = new Float32Array(lado * lado);
  const pos = new Float32Array(lado * lado * 3), cores = new Float32Array(lado * lado * 3);
  const capim = new THREE.Color("#c2ad64"), cedro = new THREE.Color("#8a8a4c"), calcario = new THREE.Color("#c9bf9a"), ouro = new THREE.Color("#c2ad62"), cor = new THREE.Color();
  const dentro = (x, z) => { let d = false; for (let i = 0, j = tr.pts.length - 1; i < tr.pts.length; j = i++) { const a = tr.pts[i], b = tr.pts[j]; if ((a.y > z) !== (b.y > z) && x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x) d = !d; } return d; };
  for (let j = 0; j < lado; j++) for (let i = 0; i < lado; i++) {
    const x = x0 + i * passo, z = x0 + j * passo, d = tr.distAt(x, z);
    let m = passo01(inicio, fim, d);
    if (m > 0 && d < 2600 && dentro(x, z)) m *= miolo;
    for (const [cx, cz, r] of vazio) m *= passo01(r * 0.75, r * 1.5, Math.hypot(x - cx, z - cz));
    const f = ruido(x / 1500, z / 1500, 11) * 0.55 + ruido(x / 600, z / 600, 12) * 0.3 + ruido(x / 250, z / 250, 13) * 0.15, h = m * (24 + altura * f * f), k = j * lado + i;
    alt[k] = h; pos[k * 3] = x; pos[k * 3 + 1] = h - 3; pos[k * 3 + 2] = z;
    const t = lim(h / (altura * 0.7)), mancha = ruido(x / 230, z / 230, 37), mato = ruido(x / 480, z / 480, 53);
    cor.copy(capim).lerp(ouro, mancha * 0.7).lerp(cedro, passo01(0.2, 0.9, t) * (0.4 + 0.6 * mato)); if (mancha < 0.14 && t > 0.1) cor.lerp(calcario, (0.14 - mancha) * 5); else cor.multiplyScalar(0.92 + mancha * 0.16);
    cores[k * 3] = cor.r; cores[k * 3 + 1] = cor.g; cores[k * 3 + 2] = cor.b;
  }
  const idx = [];
  for (let j = 0; j < nn; j++) for (let i = 0; i < nn; i++) {
    const a = j * lado + i, b = a + 1, c = a + lado, d = c + 1;
    if (alt[a] + alt[b] + alt[c] + alt[d] < 0.5) continue;
    if (Math.abs(alt[a] - alt[d]) < Math.abs(alt[b] - alt[c])) idx.push(a, c, d, a, d, b); else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(cores, 3)); g.setIndex(idx); g.computeVertexNormals();
  const malha = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
  malha.name = `${tr.id}-colinas`; malha.receiveShadow = false; malha.castShadow = false;
  const alturaEm = (x, z) => {
    const u = (x - x0) / passo, v = (z - x0) / passo; if (u < 0 || v < 0 || u >= nn || v >= nn) return 0;
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, a = alt[j * lado + i], b = alt[j * lado + i + 1], c = alt[(j + 1) * lado + i], d = alt[(j + 1) * lado + i + 1];
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
  };
  tr.colinasAustin = { alturaEm, triangulos: idx.length / 3 };
  return { alturaEm, malha };
}

/** Cedros e carvalhos em manchas por cima dos morros e da planície, até o horizonte (versão barata, sem as árvores da beira). */
export function matoDeLonge(tr, add, rel, { passo = 130, minDist = 380, semente = 5173, ext = 1600 } = {}) {
  const r = sorteio(semente), mundo = tr.t.world, cedros = [], carvalhos = [];
  for (let x = -ext; x < mundo + ext; x += passo) for (let z = -ext; z < mundo + ext; z += passo) {
    const px = x + (r() - 0.5) * passo * 0.9, pz = z + (r() - 0.5) * passo * 0.9, d = tr.distAt(px, pz);
    if (d < minDist) continue;
    const mata = ruido(px / 480, pz / 480, 91), prob = lim((d - minDist) / 450, 0.1, 1) * passo01(0.4, 0.65, mata) * 0.5;
    if (r() > prob || ocupado(tr, px, pz)) continue;
    const y = Math.max(tr.chao(px, pz), rel.alturaEm(px, pz) - 3) - 1.2, s = 50 + r() * 60;
    if (r() < 0.7) cedros.push({ x: px, y, z: pz, sx: s * 0.7, sy: s, sz: s * 0.7, r: r() * 6, c: escolher(COR_CEDRO, r) });
    else carvalhos.push({ x: px, y: y + s * 0.06, z: pz, sx: s, sy: s * 0.7, sz: s, r: r() * 6, c: escolher(COR_CARVALHO, r) });
  }
  const mat = () => new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
  colorir(instancias(add, geoCedro(), mat(), cedros, { sombra: false, nome: `${tr.id}-cedros-longe` }), cedros);
  colorir(instancias(add, geoCarvalho(), mat(), carvalhos, { sombra: false, nome: `${tr.id}-carvalhos-longe` }), carvalhos);
  tr.matoLongeAustin = { cedros: cedros.length, carvalhos: carvalhos.length };
  return tr.matoLongeAustin;
}
