// Austin — a torre de observação vermelha, o anfiteatro aos pés dela, a Grande Praça (espelho d'água e gramado) e o palco do miolo (peças só desta pista,
// em cima do kit 2: um Montador, cor chapada por vértice, uma malha por material). Tudo sai com a origem no chão e a frente para +z.
// A torre de verdade tem 77 m, com o mirante a 70 m, uma escada em dupla hélice em volta do poço do elevador e um "véu" de 18 tubos de aço vermelhos que sobe quase
// até o topo (a cor lembra as luzes dos carros à noite). O anfiteatro nasceu como Tower Amphitheater, aos pés da torre: bancos fixos e gramado em arquibancada.
// Aqui as proporções são as da pista do jogo (comprida pela metade, larga pelo dobro): a torre é mais baixa do que 77 m × 10, mas ainda a coisa mais alta de lá.
import * as THREE from "three";
import { Montador, solido, vidro, tom } from "../montagem.js";

const VERMELHO = "#c8102e";
const duplo = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });

// um tubo (cilindro) entre dois pontos: o cilindro nasce no eixo y; a rotação em "YXZ" leva o eixo até a direção
function tubo(m, S, [x0, y0, z0], [x1, y1, z1], r, cor, seg = 8) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L = Math.hypot(dx, dy, dz);
  m.cilindro(S, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [r, L], { cor, seg, ry: Math.atan2(dx, dz), rx: Math.acos(dy / L) });
}

/** A torre de observação: poço de concreto, escada em dupla hélice, o véu de 18 tubos vermelhos, o mirante de vidro e o mastro. */
export function torreDeObservacao({ alto = 420, tubos = 18 } = {}) {
  const m = new Montador(), S = solido(), V = vidro();
  const R0 = 34, R1 = 21, giro = 0.9, base = 9, topoTubos = alto * 0.97, plat = alto * 0.916;
  m.cilindro(S, [0, 3, 0], [52, 6], { cor: "#b9b3a2", seg: 36 }); // a base
  m.cilindro(S, [0, 7.5, 0], [43, 3], { cor: "#d8d2c2", seg: 36 });
  m.cilindro(S, [0, base + (plat - base) / 2, 0], [9, plat - base], { cor: "#8f949a", seg: 16 }); // o poço do elevador
  const passos = 72; // a escada em dupla hélice: duas fitas de degraus, uma defasada meia volta da outra
  for (let h = 0; h < 2; h++) for (let k = 0; k < passos; k++) {
    const t = k / passos, ang = h * Math.PI + t * Math.PI * 11, y = base + t * (plat - base - 4), r = 15.5;
    m.caixa(S, [Math.cos(ang) * r, y, Math.sin(ang) * r], [11, 1.4, 3.4], { cor: h ? "#b8bcc2" : "#cdd0d4", ry: -ang });
  }
  for (let k = 0; k < tubos; k++) { // o véu vermelho: cada tubo sobe e dá um quarto de volta para o lado, estreitando para o topo
    const a0 = (k / tubos) * Math.PI * 2, a1 = a0 + giro, c = k % 3 === 0 ? tom(VERMELHO, 1.12) : VERMELHO;
    tubo(m, S, [Math.cos(a0) * R0, base, Math.sin(a0) * R0], [Math.cos(a1) * R1, topoTubos, Math.sin(a1) * R1], 2.1, c);
  }
  for (const t of [0.22, 0.45, 0.68, 0.88]) m.geo(S, new THREE.TorusGeometry((R0 + (R1 - R0) * t) * 0.93, 0.8, 5, 28), { y: base + (topoTubos - base) * t, rx: Math.PI / 2, cor: "#7d0e1f" }); // os anéis que seguram o véu
  m.cilindro(S, [0, plat, 0], [47, 5], { cor: "#2b2f36", seg: 32 }); // o piso do mirante
  m.cilindro(V, [0, plat + 8.5, 0], [47, 12], { cor: "#9fc0d0", seg: 32, aberto: true }); // a faixa de vidro em volta
  m.geo(S, new THREE.TorusGeometry(47, 1.1, 5, 36), { y: plat + 15, rx: Math.PI / 2, cor: "#d7dce2" });
  m.cilindro(S, [0, plat + 17.5, 0], [49, 3], { cor: "#d7dce2", seg: 32 }); // o teto do mirante
  m.cilindro(S, [0, (plat + 17 + alto + 26) / 2, 0], [1.6, alto + 26 - plat - 17], { cor: "#d7dce2", seg: 6 }); // o mastro
  m.cilindro(S, [0, alto + 26, 0], [2.4, 6], { cor: VERMELHO, seg: 8 });
  const g = m.montar("austin-torre"); g.userData = { alto, raio: 52 };
  return g;
}

// uma faixa de arco: de `r0` a `r1` em raio, da altura y0 a y1, entre os ângulos t0 e t1 (em xz, x = cos, z = sin); com r0 = r1 é um degrau vertical
function faixaArco(r0, r1, y0, y1, t0, t1, seg = 40) {
  const pos = [], idx = [];
  for (let k = 0; k <= seg; k++) {
    const t = t0 + ((t1 - t0) * k) / seg, c = Math.cos(t), s = Math.sin(t);
    pos.push(c * r0, y0, s * r0, c * r1, y1, s * r1);
    if (k < seg) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/**
 * O anfiteatro: o palco coberto na origem, de frente para +z, com os bancos fixos (vermelhos e brancos, em degraus) e o gramado em arquibancada atrás deles.
 * O público fica em +z. `abertura` é o arco da plateia (rad).
 */
export function anfiteatro({ raio0 = 84, degraus = 8, degrauAlto = 4.2, degrauFundo = 8, gramado = 9, abertura = 2.5 } = {}) {
  const m = new Montador(), S = solido(), D = duplo(), t0 = Math.PI / 2 - abertura / 2, t1 = Math.PI / 2 + abertura / 2;
  let r = raio0, y = 0;
  for (let k = 0; k < degraus; k++) { // os bancos reservados
    m.geo(D, faixaArco(r, r, y, y + degrauAlto, t0, t1), { cor: "#8f9298" });
    m.geo(D, faixaArco(r, r + degrauFundo, y + degrauAlto, y + degrauAlto, t0, t1), { cor: k % 2 ? "#e8e8e4" : VERMELHO });
    r += degrauFundo; y += degrauAlto;
  }
  m.geo(D, faixaArco(r, r + degrauFundo * gramado, y, y + degrauAlto * 3.2, t0, t1, 32), { cor: "#9a9a58" }); // o gramado seco, em rampa
  m.geo(D, faixaArco(raio0 - 14, raio0, 0, 0, t0, t1), { cor: "#6f7276" }); // o piso entre o palco e os bancos
  // o palco: plataforma, fundo, cobertura de membrana branca sobre treliças e as caixas de som
  const L = 150, P = 56;
  m.caixa(S, [0, 5, 0], [L, 10, P], { cor: "#3a3d43" });
  m.caixa(S, [0, 10.4, 0], [L + 2, 0.8, P + 2], { cor: "#15161a" });
  m.caixa(S, [0, 30, -P / 2 + 2], [L, 40, 3], { cor: "#26282d" }); // o fundo do palco
  for (const s of [-1, 1]) { m.caixa(S, [s * (L / 2 - 3), 32, 0], [4, 44, 4], { cor: "#7d8186" }); m.caixa(S, [s * (L / 2 + 12), 22, 6], [10, 34, 10], { cor: "#1b1c20" }); } // as torres e as caixas de som
  m.caixa(S, [0, 54, 2], [L + 10, 3, P + 8], { cor: "#7d8186" }); // a treliça da frente
  m.caixa(S, [0, 57, -2], [L + 6, 1.6, P + 16], { cor: "#f2f1ec", rx: -0.13 }); // a membrana branca
  const g = m.montar("austin-anfiteatro"); g.userData = { raio: raio0 + degraus * degrauFundo + degrauFundo * gramado, largura: L };
  return g;
}

/** A Grande Praça: o gramado, o espelho d'água grande e a aleia coberta de treliça ao longo de uma borda. Retângulo de `w` × `d`, origem no meio da frente. */
export function pracaGrande({ w = 360, d = 240 } = {}) {
  const m = new Montador(), S = solido(), AGUA = new THREE.MeshStandardMaterial({ color: 0x4f93b8, roughness: 0.08, metalness: 0.35 });
  m.caixa(S, [0, 0.4, -d / 2], [w, 1.2, d], { cor: "#8fa85a" }); // o gramado
  const pw = w * 0.5, pd = d * 0.42; // o espelho d'água, com a borda de pedra
  m.caixa(S, [0, 1.1, -d * 0.45], [pw + 8, 1.6, pd + 8], { cor: "#d8d2c2" });
  for (let x = -w / 2 + 20; x <= w / 2 - 20; x += 16) { // a aleia de treliça: pares de colunas e vigas cruzadas a cada 16
    for (const z of [-d + 28, -d + 52]) m.caixa(S, [x, 12, z], [1.6, 24, 1.6], { cor: "#e6dfcc" });
    m.caixa(S, [x, 24.6, -d + 40], [1.6, 1.4, 28], { cor: "#e6dfcc" });
  }
  m.caixa(S, [0, 25.6, -d + 28], [w - 36, 1.2, 1.4], { cor: "#d3ccb8" }); m.caixa(S, [0, 25.6, -d + 52], [w - 36, 1.2, 1.4], { cor: "#d3ccb8" });
  const g = m.montar("austin-praca");
  const agua = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), AGUA); agua.rotation.x = -Math.PI / 2; agua.position.set(0, 2.0, -d * 0.45); g.add(agua);
  g.userData = { w, d };
  return g;
}

/** O palco do miolo (entre as curvas 11 e 12): plataforma com cobertura de treliça, o telão atrás e as torres de som. De frente para +z. */
export function palcoDoMiolo({ largura = 130, profundidade = 50, telao = null } = {}) {
  const m = new Montador(), S = solido(), L = largura, P = profundidade;
  m.caixa(S, [0, 6, -P / 2], [L, 12, P], { cor: "#303338" });
  m.caixa(S, [0, 12.5, -P / 2], [L + 2, 1, P + 2], { cor: "#15161a" });
  for (const s of [-1, 1]) for (const z of [-4, -P + 4]) m.caixa(S, [s * (L / 2 - 2), 34, z], [3.4, 44, 3.4], { cor: "#8a9096" });
  m.caixa(S, [0, 57, -P / 2], [L + 4, 3, P + 4], { cor: "#8a9096" }); m.caixa(S, [0, 58.8, -P / 2], [L, 0.8, P], { cor: "#e9e7e1" });
  for (const s of [-1, 1]) m.caixa(S, [s * (L / 2 + 16), 26, -P / 2], [12, 50, 12], { cor: "#1b1c20" }); // as torres de som
  m.caixa(S, [0, 33, -P + 1.5], [L - 16, 40, 2.4], { cor: "#101114" }); // o fundo do telão
  const g = m.montar("austin-palco");
  if (telao) { const t = new THREE.Mesh(new THREE.PlaneGeometry(L - 22, 34), new THREE.MeshBasicMaterial({ map: telao })); t.position.set(0, 33, -P + 3); g.add(t); }
  g.userData = { largura: L, profundidade: P };
  return g;
}
