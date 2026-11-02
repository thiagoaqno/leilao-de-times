// Xangai — o paddock sobre o lago: os pavilhões das equipes em forma de folha de lótus, em palafitas, ligados por passadiços em zigue-zague (o
// paddock do circuito é um jardim ao estilo do Jardim Yu: prédios de teto curvo sobre um lago, com caminhos e pontes entre eles). Peça só desta pista.
// Cada pavilhão: o deck redondo sobre as estacas, o tambor de vidro com os pilares vermelhos, a folha de lótus (a cobertura em guarda-chuva de
// borda ondulada, verde por cima com as nervuras e branca por baixo) e a flor rosa no alto. Tudo vira duas malhas só (as folhas, com cor por vértice,
// e o resto no `Montador` do kit 2) e fica na altura da lâmina d'água.
import * as THREE from "three";
import { Montador, solido, vidro } from "../montagem.js";
import { NIVEL, planoDaAgua } from "./agua.js";
import { ponto, indice, ruido } from "./lugar.js";

const VERDE_A = new THREE.Color("#79ab8e"), VERDE_B = new THREE.Color("#93c2a5"), BORDA = new THREE.Color("#c4dfca"), BAIXO = new THREE.Color("#ecf2ee");
const NIVEL_DECK = NIVEL + 9;

// um acumulador de triângulos coloridos (uma malha só para todas as folhas)
class Folhas {
  constructor() { this.p = []; this.c = []; this.i = []; }
  quad(a, b, c, d, cor) {
    const base = this.p.length / 3;
    for (const q of [a, b, c, d]) { this.p.push(q[0], q[1], q[2]); this.c.push(cor.r, cor.g, cor.b); }
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  malha() {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }));
    m.castShadow = m.receiveShadow = true; m.name = "xangai-folhas-de-lotus"; return m;
  }
}
// a folha: um guarda-chuva baixo de borda ondulada, em `nT` setores que alternam o tom (as nervuras)
function folha(F, cx, y0, cz, R, rot, sem) {
  const nT = 28, nR = 4, dome = 7 + R * 0.12;
  const P = (u, t, baixo) => {
    const th = (t / nT) * Math.PI * 2 + rot, rr = R * u * (1 + 0.045 * Math.cos(7 * th + sem) * u), onda = 1.7 * u ** 4 * Math.cos(5 * th + sem * 2);
    return [cx + Math.cos(th) * rr, y0 + dome * Math.pow(Math.max(0, 1 - u * u), 0.8) + onda - 2.6 * u ** 3 - (baixo ? 1.7 : 0), cz + Math.sin(th) * rr];
  };
  for (let t = 0; t < nT; t++) for (let k = 0; k < nR; k++) {
    const u0 = k / nR, u1 = (k + 1) / nR, par = t % 2 === 0, cor = k === nR - 1 ? BORDA : par ? VERDE_A : VERDE_B;
    F.quad(P(u0, t), P(u1, t), P(u1, t + 1), P(u0, t + 1), cor); // por cima
    F.quad(P(u0, t, true), P(u0, t + 1, true), P(u1, t + 1, true), P(u1, t, true), BAIXO); // por baixo
  }
  for (let t = 0; t < nT; t++) F.quad(P(1, t), P(1, t, true), P(1, t + 1, true), P(1, t + 1), BORDA); // a borda grossa
}

// ---------------------------------------------------------------------------------------------------------------------
// o passadiço entre dois pontos 3D: o piso de tábuas, o corrimão vermelho e as estacas
// ---------------------------------------------------------------------------------------------------------------------
function passadico(m, S, a, b, larg = 9, estacas = true) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], h = Math.hypot(dx, dz), len = Math.hypot(h, dy);
  if (len < 1) return;
  const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, cz = (a[2] + b[2]) / 2, ry = Math.atan2(dx, dz), rx = -Math.atan2(dy, h);
  m.caixa(S, [cx, cy, cz], [larg, 0.9, len + 0.6], { cor: "#b8a687", ry, rx });
  const nx = Math.cos(ry), nz = -Math.sin(ry); // o lado do passadiço
  for (const s of [-1, 1]) {
    m.caixa(S, [cx + nx * s * larg / 2, cy + 3.2, cz + nz * s * larg / 2], [0.7, 0.8, len + 0.6], { cor: "#a42a25", ry, rx });
    for (let t = 0; t <= len; t += 12) { const q = t / len; m.caixa(S, [a[0] + dx * q + nx * s * larg / 2, a[1] + dy * q + 1.6, a[2] + dz * q + nz * s * larg / 2], [0.7, 3.2, 0.7], { cor: "#a42a25" }); }
  }
  if (estacas) for (let t = 6; t < len; t += 34) { const q = t / len, y = a[1] + dy * q; m.cilindro(S, [a[0] + dx * q, (y + NIVEL - 4) / 2, a[2] + dz * q], [0.9, y - NIVEL + 4], { cor: "#5d3b2c", seg: 5 }); }
}

// ---------------------------------------------------------------------------------------------------------------------
// o conjunto
// ---------------------------------------------------------------------------------------------------------------------
/**
 * Põe os pavilhões sobre o lago do paddock, os passadiços entre eles e os caminhos até o prédio dos boxes. Devolve a lista dos pavilhões.
 * @param {object} o { lado, atras: lat do fundo do prédio dos boxes, margem: recuo mínimo da margem }
 */
export function paddockSobreOLago(tr, add, { lado = -1, atras = 192, ao0 = 0 } = {}) {
  const plano = planoDaAgua(tr), campo = plano.campo, m = new Montador(), S = solido(), V = vidro(), F = new Folhas();
  const pavilhoes = [], cone = new THREE.ConeGeometry(1, 1, 6, 1, true), bola = new THREE.SphereGeometry(1, 6, 4);
  // as fileiras: a distância do eixo (fundo do prédio + k) e as posições ao longo da reta, com um deslocamento por fileira
  const fileiras = [[300, [-700, -560, -420, -280, -140, 0, 140, 280, 420, 560, 700, 840], 46], [450, [-330, -170, 10, 190, 360, 520], 58], [600, [-250, -60, 130, 330], 50]];
  fileiras.forEach(([k, aos, Rb], fi) => {
    const linha = [];
    aos.forEach((ao, j) => {
      const jit = (ruido(ao / 90, k / 90, 5 + fi) - 0.5) * 50, p = ponto(tr, 0, lado * (atras + k + jit * 0.6), ao0 + ao + jit), R = Rb * (0.82 + 0.5 * ruido(p.x / 70, p.z / 70, 9));
      if (campo(p.x, p.z) < R * 1.3 + 18) return;
      if (pavilhoes.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < q.R + R + 34)) return;
      linha.push({ x: p.x, z: p.z, R, ao, k, fi, ry: Math.atan2(p.p.ty, p.p.tx) });
    });
    pavilhoes.push(...linha);
  });
  const y0 = NIVEL_DECK;
  pavilhoes.forEach((q, n) => {
    const { x, z, R } = q, sem = n * 1.7;
    m.cilindro(S, [x, y0 - 0.6, z], [R * 1.08, 1.4], { cor: "#b8a687", seg: 18 }); // o deck
    m.cilindro(S, [x, y0 - 1.6, z], [R * 1.12, 0.8], { cor: "#7d6a55", seg: 18 }); // o rodapé
    for (let a = 0; a < 8; a++) { const t = (a / 8) * Math.PI * 2; m.cilindro(S, [x + Math.cos(t) * R * 0.95, (y0 + NIVEL - 4) / 2, z + Math.sin(t) * R * 0.95], [1.1, y0 - NIVEL + 4], { cor: "#5d3b2c", seg: 5 }); } // as estacas
    m.cilindro(V, [x, y0 + 9, z], [R * 0.6, 16], { cor: "#49716f", seg: 14 }); // o tambor de vidro
    for (let a = 0; a < 10; a++) { const t = (a / 10) * Math.PI * 2 + 0.3; m.cilindro(S, [x + Math.cos(t) * R * 0.62, y0 + 9.6, z + Math.sin(t) * R * 0.62], [0.9, 17.4], { cor: "#a42a25", seg: 6 }); } // os pilares vermelhos
    m.cilindro(S, [x, y0 + 0.4, z], [R * 0.66, 1.6], { cor: "#d8d2c4", seg: 14 });
    m.cilindro(S, [x, y0 + 18.6, z], [R * 0.64, 1.3], { cor: "#e6e0d2", seg: 14 }); // a laje sob a folha
    folha(F, x, y0 + 19.2, z, R * 1.12, q.ry, sem);
    // a flor de lótus no alto: pétalas rosa em volta de um miolo dourado
    const top = y0 + 19.2 + 7 + R * 0.12;
    for (let a = 0; a < 8; a++) { const t = (a / 8) * Math.PI * 2 + sem; m.geo(S, cone, { x: x + Math.cos(t) * 2.2, y: top + 2.6, z: z + Math.sin(t) * 2.2, rx: Math.sin(t) * 0.5, rz: -Math.cos(t) * 0.5, sx: 2.2, sy: 5.4, sz: 2.2, cor: a % 2 ? "#f2b6c8" : "#f7cfda" }); }
    m.geo(S, bola, { x, y: top + 2, z, sx: 1.5, sy: 1.5, sz: 1.5, cor: "#e8b62c" });
    for (let a = 0; a < 6; a++) { const t = (a / 6) * Math.PI * 2 + 0.5; m.geo(S, bola, { x: x + Math.cos(t) * R * 0.9, y: y0 + 5.4, z: z + Math.sin(t) * R * 0.9, sx: 1.5, sy: 1.8, sz: 1.5, cor: "#c8102e" }); } // as lanternas vermelhas na beira do deck
  });
  // os passadiços: cada fileira em zigue-zague, e uma ponte de cada fileira para a próxima
  const ponte = (A, B) => {
    const dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d, a = [A.x + ux * A.R * 0.98, y0, A.z + uz * A.R * 0.98], b = [B.x - ux * B.R * 0.98, y0, B.z - uz * B.R * 0.98];
    const meio = [(a[0] + b[0]) / 2 - uz * 14, y0, (a[2] + b[2]) / 2 + ux * 14]; // o cotovelo do zigue-zague
    passadico(m, S, a, meio); passadico(m, S, meio, b);
  };
  const porFila = [0, 1, 2].map((fi) => pavilhoes.filter((q) => q.fi === fi).sort((a, b) => a.ao - b.ao));
  for (const fila of porFila) for (let i = 0; i + 1 < fila.length; i++) if (Math.hypot(fila[i + 1].x - fila[i].x, fila[i + 1].z - fila[i].z) < 340) ponte(fila[i], fila[i + 1]);
  for (let fi = 0; fi < 2; fi++) for (const A of porFila[fi]) {
    let B = null, dm = 1e9; for (const q of porFila[fi + 1]) { const d = Math.hypot(q.x - A.x, q.z - A.z); if (d < dm) { dm = d; B = q; } }
    if (B && dm < 300 && A.ao % 2 === 0) ponte(A, B);
  }
  // os caminhos da margem até a porta de trás do prédio dos boxes: tábuas rente ao chão, e a rampa que sobe ao deck da primeira fileira
  let caminhos = 0;
  for (const A of porFila[0]) {
    if (Math.abs(A.ao % 280) > 1 && A.ao !== 0) continue;
    const dir = ponto(tr, 0, lado * (atras + 6), ao0 + A.ao), dx = dir.x - A.x, dz = dir.z - A.z, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d;
    // da beira do deck até a praia (onde o campo passa de -4), de rampa em rampa até o chão
    let sx = A.x + ux * A.R * 0.98, sz = A.z + uz * A.R * 0.98, t = 0;
    while (t < d && campo(sx, sz) > -4) { sx += ux * 4; sz += uz * 4; t += 4; }
    const chaoY = tr.chao(sx, sz) - 1.2 + 1.2, praia = [sx, Math.max(chaoY, NIVEL + 0.4), sz];
    passadico(m, S, [A.x + ux * A.R * 0.98, y0, A.z + uz * A.R * 0.98], praia, 9);
    // e, de lá, o caminho de pedra até o prédio
    const passos = Math.max(1, Math.floor(Math.hypot(dir.x - sx, dir.z - sz) / 26));
    for (let s = 0; s < passos; s++) {
      const q0 = s / passos, q1 = (s + 1) / passos, x0 = sx + (dir.x - sx) * q0, z0 = sz + (dir.z - sz) * q0, x1 = sx + (dir.x - sx) * q1, z1 = sz + (dir.z - sz) * q1, yy = tr.chao((x0 + x1) / 2, (z0 + z1) / 2) + 0.3;
      m.caixa(S, [(x0 + x1) / 2, yy, (z0 + z1) / 2], [9.5, 0.8, Math.hypot(x1 - x0, z1 - z0) + 0.5], { cor: "#cfc7b6", ry: Math.atan2(x1 - x0, z1 - z0) });
    }
    caminhos++;
  }
  const g = m.montar("xangai-paddock"); g.add(F.malha()); add(g);
  tr.paddockXangai = { pavilhoes: pavilhoes.length, caminhos, lista: pavilhoes.map((q) => ({ x: Math.round(q.x), z: Math.round(q.z), R: Math.round(q.R) })) };
  void indice;
  return pavilhoes;
}
