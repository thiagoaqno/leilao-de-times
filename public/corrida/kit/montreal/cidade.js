// Montreal — o que se vê ao longe, do outro lado do rio: o skyline do centro (a oeste, na margem da cidade) com a Place Ville-Marie em cruz, o
// "1000 de la Gauchetière" de topo piramidal, a Basílica de Notre-Dame de torres gêmeas e a Torre do Relógio do Vieux-Port; a ponte
// Jacques-Cartier (a norte, de treliça de aço verde em três vãos) e o Biosfera (a cúpula geodésica da Expo 67, na ilha Sainte-Hélène).
// O skyline e o Biosfera não usam a neblina do jogo (`fog: false`): a névoa apagava tudo; a bruma é pintada nos vértices (mais forte embaixo
// e nas torres mais longe), como numa foto do horizonte. Duas malhas só para o skyline (vidro e pedra), uma para a ponte, uma instanciada
// para as barras do Biosfera. Referências (Wikimedia Commons): "Saint-Lawrence River @ Parc Jean Drapeau" (o skyline, o cais baixo com os choupos
// na frente), "Biosphère Montréal" (a esfera de treliça, o prédio de vidro dentro dela) e "Jacques Cartier bridge view" (a treliça verde).
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { sorteio } from "../comum.js";
import { Montador, solido } from "../montagem.js";

const cor3 = (c) => new THREE.Color(c);

function janelas(vidro) {
  return canvasTex(32, 32, (x, w, h, rr) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);
    if (vidro) { x.fillStyle = "#cfd9e2"; x.fillRect(0, 0, w, 3); x.fillRect(0, 0, 2, h); for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) { x.fillStyle = rr() < 0.15 ? "#f3e6b8" : "#aebfcd"; x.fillRect(2 + k * 8, 4 + j * 7, 6, 5); } }
    else { x.fillStyle = "#e9e4d8"; x.fillRect(0, 0, w, h); for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) { x.fillStyle = "#8d99a4"; x.fillRect(2 + k * 10, 3 + j * 10, 6, 7); } }
  });
}
class Lote {
  constructor() { this.p = []; this.c = []; this.uv = []; this.i = []; }
  caixa(x, z, y0, sx, sy, sz, ry, baixo, topo, jan = 9, andar = 14) {
    const co = Math.cos(ry), si = Math.sin(ry), q = (dx, dz) => [x + dx * co + dz * si, z - dx * si + dz * co];
    const cant = [q(-sx / 2, -sz / 2), q(sx / 2, -sz / 2), q(sx / 2, sz / 2), q(-sx / 2, sz / 2)], larg = [sx, sz, sx, sz];
    for (let f = 0; f < 4; f++) {
      const a = cant[f], b = cant[(f + 1) % 4], base = this.p.length / 3, u = larg[f] / jan, v = sy / andar;
      this.p.push(a[0], y0, a[1], b[0], y0, b[1], b[0], y0 + sy, b[1], a[0], y0 + sy, a[1]);
      this.c.push(baixo.r, baixo.g, baixo.b, baixo.r, baixo.g, baixo.b, topo.r, topo.g, topo.b, topo.r, topo.g, topo.b);
      this.uv.push(0, 0, u, 0, u, v, 0, v); this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const base = this.p.length / 3, t = y0 + sy;
    for (const [px, pz] of cant) { this.p.push(px, t, pz); this.c.push(topo.r, topo.g, topo.b); this.uv.push(0.5, 0.5); }
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // pirâmide de quatro águas sobre a base (x, z) de lado `s`, do topo da caixa até `alto` acima
  piramide(x, z, y0, s, alto, ry, baixo, topo) {
    const co = Math.cos(ry), si = Math.sin(ry), q = (dx, dz) => [x + dx * co + dz * si, z - dx * si + dz * co];
    const cant = [q(-s / 2, -s / 2), q(s / 2, -s / 2), q(s / 2, s / 2), q(-s / 2, s / 2)];
    for (let f = 0; f < 4; f++) {
      const a = cant[f], b = cant[(f + 1) % 4], base = this.p.length / 3;
      this.p.push(a[0], y0, a[1], b[0], y0, b[1], x, y0 + alto, z); this.c.push(baixo.r, baixo.g, baixo.b, baixo.r, baixo.g, baixo.b, topo.r, topo.g, topo.b);
      this.uv.push(0, 0, 4, 0, 2, 3); this.i.push(base, base + 1, base + 2);
    }
  }
  malha(mat) {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2)); g.setIndex(this.i); g.computeVertexNormals(); return new THREE.Mesh(g, mat);
  }
}

/**
 * O skyline, na margem oeste: `costa(z)` dá o x da margem; as torres ficam para trás (x menor), as mais altas no miolo (z de `miolo`).
 * @param {object} o · z0, z1: de onde a onde ao longo do rio · miolo: [za, zb] onde ficam as torres altas · escala · bruma · quantas · semente
 */
export function skyline(tr, add, costa, { z0 = 1500, z1 = 5600, miolo = [2700, 4100], escala = 1, bruma = "#d3dde5", quantas = 190, semente = 4600 } = {}) {
  const r = sorteio(semente), ar = cor3(bruma), vid = new Lote(), ped = new Lote(), topos = new Lote();
  const vidros = ["#1f4263", "#28587d", "#2e6284", "#3b6f8f", "#4d6f8f", "#23394f", "#5a7f9c", "#6d8ea6"], pedras = ["#d9d2c2", "#c8c1b2", "#e4ddcf", "#b9b2a4", "#a89d8c"];
  const zc = (miolo[0] + miolo[1]) / 2, meia = (miolo[1] - miolo[0]) / 2;
  const tom = (hex, dist) => { const c = cor3(hex), t = 0.12 + 0.28 * dist; return [c.clone().lerp(ar, Math.min(0.8, t + 0.26)), c.clone().lerp(ar, t)]; };
  const chao = (x, z) => -0.55 - 3;
  const torre = (x, z, sx, sy, sz, hex, lote = vid, o = {}) => {
    const y0 = chao(x, z), ry = o.ry ?? (r() < 0.5 ? 0.12 : 0.32 + r() * 0.2), dist = Math.min(1, Math.max(0, (costa(z) - x) / 1000)), [b, t] = tom(hex, dist);
    lote.caixa(x, z, y0, sx, sy, sz, ry, b, t, o.jan ?? 9, o.andar ?? 14);
    if (o.degrau) topos.caixa(x, z, y0 + sy, sx * 0.6, o.degrau, sz * 0.6, ry, b, t, 12, 14);
    if (o.antena) topos.caixa(x, z, y0 + sy + (o.degrau || 0), 3, o.antena, 3, 0, cor3("#d8dde2").lerp(ar, 0.4), cor3("#e84a4a").lerp(ar, 0.3), 3, 14);
    return y0;
  };
  // o miolo: torres altas no centro, mais baixas e de pedra nas pontas; o cais do Vieux-Port na frente, baixo, de pedra
  for (let k = 0; k < quantas; k++) {
    const z = z0 + r() * (z1 - z0), u = (z - zc) / (meia * 2.2), centro = Math.max(0, 1 - Math.abs(u) ** 1.4), prof = 160 + r() * 1100 * (0.5 + 0.5 * centro), x = costa(z) - prof;
    const alta = r() < 0.55 * centro + 0.06, sy = (alta ? 600 + r() * 520 : 150 + r() * 330) * escala * (0.55 + 0.45 * centro), sx = 60 + r() * 60, sz = 60 + r() * 60;
    torre(x, z, sx, sy, sz, r() < 0.28 ? pedras[(r() * pedras.length) | 0] : vidros[(r() * vidros.length) | 0], r() < 0.28 ? ped : vid, { degrau: alta && r() < 0.4 ? 50 + r() * 70 : 0, antena: alta && r() < 0.35 ? 100 + r() * 150 : 0, jan: 9 + r() * 6 });
  }
  for (let z = z0 + 200; z < z1 - 400; z += 110 + r() * 90) torre(costa(z) - 60 - r() * 40, z, 160 + r() * 140, 55 + r() * 60, 70 + r() * 40, pedras[(r() * pedras.length) | 0], ped, { ry: 0.12, jan: 14, andar: 12 }); // o cais baixo
  // a Place Ville-Marie: a torre em cruz de vidro azul, e a de vidro escuro ao lado
  const pv = [costa(zc) - 560, zc - 120];
  const y0 = torre(pv[0], pv[1], 150, 1000 * escala, 44, "#2d6a96", vid, { ry: 0.12, jan: 14 }); torre(pv[0], pv[1], 44, 1000 * escala, 150, "#2d6a96", vid, { ry: 0.12, jan: 14 });
  topos.caixa(pv[0], pv[1], y0 + 1000 * escala, 8, 70, 8, 0, cor3("#d8dde2").lerp(ar, 0.4), cor3("#e84a4a").lerp(ar, 0.3), 3, 14);
  // o "1000 de la Gauchetière": a base de vidro e o topo em pirâmide, a mais alta do cais
  const g = [costa(zc + 380) - 700, zc + 380], y1 = torre(g[0], g[1], 96, 860 * escala, 96, "#3b6f8f", vid, { ry: 0.3, jan: 12 });
  const [gb, gt] = tom("#c8d4de", 0.4); topos.piramide(g[0], g[1], y1 + 860 * escala, 96, 130, 0.3, gb, gt);
  torre(costa(zc - 500) - 620, zc - 500, 70, 760 * escala, 70, "#101c28", vid, { ry: 0.2, jan: 16 }); // a Tour de la Bourse, escura e esguia
  // a Basílica de Notre-Dame: a nave de pedra e as duas torres gêmeas, de frente para o rio (no Vieux-Port, mais ao sul)
  const bz = zc + 1150, bx = costa(bz) - 230;
  torre(bx, bz, 110, 120, 80, "#b8ad98", ped, { ry: 0.1, jan: 10, andar: 20 });
  for (const s of [-1, 1]) { const yb = torre(bx + 55, bz + s * 24, 34, 310, 34, "#b4a994", ped, { ry: 0.1, jan: 6, andar: 20 }); topos.piramide(bx + 55, bz + s * 24, yb + 310, 34, 60, 0.1, ...tom("#7c8a8f", 0.4)); }
  // a Torre do Relógio, na ponta do cais
  const rz = z0 + 150, rx = costa(rz) - 40, yr = torre(rx, rz, 30, 210, 30, "#c9bea6", ped, { ry: 0.05, jan: 5, andar: 18 }); topos.piramide(rx, rz, yr + 210, 30, 50, 0.05, ...tom("#5f7f78", 0.4));
  const matV = new THREE.MeshStandardMaterial({ map: janelas(true), vertexColors: true, roughness: 0.35, metalness: 0.25, fog: false });
  const matP = new THREE.MeshStandardMaterial({ map: janelas(false), vertexColors: true, roughness: 0.85, fog: false });
  const matT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.4, fog: false, side: THREE.DoubleSide });
  for (const [lote, mat, nome] of [[vid, matV, "vidro"], [ped, matP, "pedra"], [topos, matT, "topos"]]) if (lote.i.length) { const m = add(lote.malha(mat)); m.name = `${tr.id}-cidade-${nome}`; m.frustumCulled = false; }
  tr.cidadeMontreal = { torres: (vid.i.length + ped.i.length) / 30 };
}

/**
 * A ponte Jacques-Cartier: um tabuleiro de aço de `de` a `ate` (pontos [x, z]) a `alto` da água, os pilares de concreto e a treliça verde:
 * três vãos grandes de arco de treliça no meio e as treliças baixas nas pontas.
 */
export function ponteJacquesCartier(tr, add, { de, ate, alto = 150, trelica = 250 } = {}) {
  const dx = ate[0] - de[0], dz = ate[1] - de[1], L = Math.hypot(dx, dz), m = new Montador(), S = solido(), VERDE = "#5f8a74", VERDE2 = "#78a58e", LARG = 44;
  // quadro local: x ao longo da ponte, y para cima, z de lado
  const viga = (x0, y0, x1, y1, z, cor = VERDE, esp = 3.2) => { const l = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0); m.caixa(S, [(x0 + x1) / 2, (y0 + y1) / 2, z], [l, esp, esp], { cor, rz: ang }); };
  m.caixa(S, [L / 2, alto, 0], [L, 5, LARG], { cor: "#8a9096" }); // o tabuleiro
  for (const s of [-1, 1]) m.caixa(S, [L / 2, alto + 5, s * (LARG / 2)], [L, 6, 1.6], { cor: "#aab0b5" }); // o guarda-corpo
  for (let x = 160; x < L - 100; x += 330) m.caixa(S, [x, (alto - 6) / 2 - 20, 0], [22, alto + 28, 18], { cor: "#a9a59b" }); // os pilares, até o fundo do rio
  // os vãos de arco no meio: 3 vãos, cada um com a corda de cima em parábola e verticais e diagonais
  const meio = L / 2, vao = Math.min(1100, L * 0.24), pilares = [meio - vao * 1.5, meio - vao * 0.5, meio + vao * 0.5, meio + vao * 1.5];
  for (let k = 0; k < 3; k++) {
    const a = pilares[k], b = pilares[k + 1], N = 14, h = (t) => alto + 5 + trelica * (k === 1 ? 1 : 0.8) * (1 - (2 * t - 1) ** 2) + 18;
    for (const z of [-LARG / 2 + 2, LARG / 2 - 2]) {
      for (let i = 0; i < N; i++) {
        const t0 = i / N, t1 = (i + 1) / N, x0 = a + (b - a) * t0, x1 = a + (b - a) * t1;
        viga(x0, h(t0), x1, h(t1), z, VERDE, 4.4); // a corda de cima
        viga(x0, alto + 5, x1, alto + 5, z, VERDE2, 3.4); // a corda de baixo
        viga(x1, alto + 5, x1, h(t1), z, VERDE2, 2.6); // a vertical
        viga(i % 2 ? x0 : x1, i % 2 ? h(t0) : h(t1), i % 2 ? x1 : x0, alto + 5, z, VERDE, 2.8); // a diagonal
      }
    }
    for (let i = 1; i < N; i += 2) { const x = a + ((b - a) * i) / N; m.caixa(S, [x, h(i / N) - 4, 0], [2.4, 2.4, LARG - 4], { cor: VERDE2 }); } // os travamentos de cima
  }
  // as pontas: treliça baixa em Warren dos dois lados, até as cabeceiras
  for (const [a, b] of [[60, pilares[0]], [pilares[3], L - 60]]) for (const z of [-LARG / 2 + 2, LARG / 2 - 2]) {
    const passo = 60, nn = Math.max(2, Math.floor((b - a) / passo));
    viga(a, alto + 52, b, alto + 52, z, VERDE, 3.6); viga(a, alto + 5, b, alto + 5, z, VERDE2, 3);
    for (let i = 0; i < nn; i++) { const x0 = a + ((b - a) * i) / nn, x1 = a + ((b - a) * (i + 1)) / nn; viga(i % 2 ? x0 : x1, i % 2 ? alto + 52 : alto + 5, i % 2 ? x1 : x0, i % 2 ? alto + 5 : alto + 52, z, VERDE, 2.4); }
  }
  const g = m.montar("montreal-ponte"); g.position.set(de[0], -0.55, de[1]); g.rotation.y = -Math.atan2(dz, dx); add(g); g.name = `${tr.id}-ponte-jacques-cartier`;
  tr.ponteMontreal = { de, ate, L, alto };
  return g;
}

/**
 * O Biosfera: três quartos de uma esfera geodésica de barras finas e cinzas (a poliedro de 320 faces: cada aresta vira uma barra, numa
 * malha instanciada só), com dois pisos de concreto e o prédio de vidro por dentro, em (x, z) e de raio `r`.
 */
export function biosfera(tr, add, x, z, r = 210) {
  const geo = new THREE.IcosahedronGeometry(1, 2), P = geo.attributes.position, chave = (v) => `${Math.round(v.x * 1e4)},${Math.round(v.y * 1e4)},${Math.round(v.z * 1e4)}`, arestas = new Map(), v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const idx = geo.index ? (k) => geo.index.getX(k) : (k) => k, total = geo.index ? geo.index.count : P.count;
  for (let t = 0; t < total; t += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(P, idx(t + k));
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const ka = chave(v[a]), kb = chave(v[b]), kk = ka < kb ? ka + "|" + kb : kb + "|" + ka; if (!arestas.has(kk)) arestas.set(kk, [v[a].clone(), v[b].clone()]); }
  }
  const lista = [...arestas.values()].filter(([a, b]) => a.y > -0.32 || b.y > -0.32).map(([a, b]) => [a.clone().multiplyScalar(r), b.clone().multiplyScalar(r)]);
  const barra = new THREE.BoxGeometry(1, 1, 1), mat = new THREE.MeshStandardMaterial({ color: 0xcfd5db, roughness: 0.45, metalness: 0.6, fog: false }), inst = new THREE.InstancedMesh(barra, mat, lista.length), d = new THREE.Object3D(), up = new THREE.Vector3(0, 0, 1);
  lista.forEach(([a, b], k) => { const c = a.clone().add(b).multiplyScalar(0.5), dir = b.clone().sub(a), len = dir.length(); d.position.copy(c); d.quaternion.setFromUnitVectors(up, dir.normalize()); d.scale.set(r * 0.012, r * 0.012, len); d.updateMatrix(); inst.setMatrixAt(k, d.matrix); });
  inst.frustumCulled = false; inst.position.set(x, -0.55 + r * 0.3, z); inst.name = `${tr.id}-biosfera`; add(inst);
  // por dentro: as plataformas de concreto e o prédio de vidro escalonado
  const m = new Montador(), S = solido();
  m.caixa(S, [0, r * 0.02, 0], [r * 1.5, 4, r * 0.9], { cor: "#a9a59b" }); m.caixa(S, [r * 0.05, r * 0.4, 0], [r * 1.1, 4, r * 0.7], { cor: "#b4b0a6" }); m.caixa(S, [r * 0.15, r * 0.85, 0], [r * 0.6, 4, r * 0.5], { cor: "#b4b0a6" });
  m.caixa(S, [r * 0.38, r * 0.45, 0], [r * 0.34, r * 0.9, r * 0.3], { cor: "#8fb4c4" }); m.caixa(S, [r * 0.38, r * 0.95, 0], [r * 0.2, r * 0.16, r * 0.2], { cor: "#a8c8d4" });
  for (const s of [-1, 1]) for (const q of [-0.5, 0, 0.5]) m.caixa(S, [q * r, r * 0.2, s * r * 0.4], [3, r * 0.4, 3], { cor: "#8a9096" });
  const g = m.montar("montreal-biosfera-miolo"); g.position.set(x, -0.55 + r * 0.02, z); add(g);
  // a base: a ilha em volta, com o bosque no morro (o bosque é do parque)
  tr.biosferaMontreal = { x, z, r, barras: lista.length };
  return inst;
}
