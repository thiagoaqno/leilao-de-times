// Red Bull Ring — o touro de aço do miolo do circuito (peça só desta pista). A escultura de verdade, de 2012, é feita de chapas de aço corten
// (a ferrugem de proposta, marrom-alaranjada, sem tinta) e tem os chifres cobertos de folha de ouro; com o arco em que se apoia, passa
// de 17 m de altura. Aqui, em escala de F1 (1 unidade ≈ 10 cm): o touro de chapas facetadas (fatias do corpo, pescoço, cabeça, pernas e rabo), os
// chifres dourados que sobem e abrem, o arco de aço embaixo e a sapata de concreto. Origem no chão, a frente do touro para +z; tudo é cor
// chapada por vértice (`Montador`), em uma malha para o corten, uma para o ouro e uma para o concreto.
import * as THREE from "three";
import { Montador, solido, tom } from "../montagem.js";

const ALTURA = 172; // 17,2 m com o arco (a altura da escultura)
let _ouro = null;
const ouro = () => (_ouro ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.85, emissive: 0x3a2a08, emissiveIntensity: 0.35 }));
let _corten = null;
const corten = () => (_corten ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.25 }));

/** @param {object} o { cor="#8a4526" (o corten) } · @returns {THREE.Group} com userData.alto, userData.raio */
export function touroDeAco({ cor = "#8a4526" } = {}) {
  const m = new Montador(), C = corten(), O = ouro(), S = solido();
  // a sapata de concreto e o arco de aço em que o touro se apoia
  m.cilindro(S, [0, 2, 0], [92, 4], { cor: "#a8a9a6", seg: 24 });
  const N = 9;
  for (let k = 0; k < N; k++) {
    const t0 = (k / N) * Math.PI, t1 = ((k + 1) / N) * Math.PI, z0 = 72 * Math.cos(t0), y0 = 4 + 22 * Math.sin(t0), z1 = 72 * Math.cos(t1), y1 = 4 + 22 * Math.sin(t1);
    const dz = z1 - z0, dy = y1 - y0, L = Math.hypot(dz, dy);
    for (const s of [-1, 1]) m.caixa(C, [s * 20, (y0 + y1) / 2 - 3, (z0 + z1) / 2], [10, 7, L + 1.5], { cor: tom(cor, 0.84 + (k % 2) * 0.1), rx: Math.atan2(dy, dz) * -1 });
  }
  m.caixa(C, [0, 22, 0], [62, 6, 150], { cor: tom(cor, 0.7) }); // a laje por cima do arco, onde as patas se apoiam
  // o corpo: fatias de chapa, mais altas no ombro e mais finas no quadril; cada uma de um tom de corten, que dá o jeito de chapas soldadas
  const fatias = [[-56, 28, 36, 96], [-40, 38, 46, 98], [-22, 44, 54, 102], [-2, 46, 58, 106], [18, 44, 62, 110], [36, 38, 54, 110]];
  fatias.forEach(([z, w, h, y], k) => {
    m.caixa(C, [0, y, z], [w, h, 18.6], { cor: tom(cor, 0.9 + ((k * 7) % 5) * 0.045) });
    m.caixa(C, [0, y + h / 2 + 0.6, z], [w - 8, 1.6, 18.6], { cor: tom(cor, 1.18) }); // a aresta clara da chapa de cima
  });
  m.caixa(C, [0, 142, 22], [30, 12, 26], { cor: tom(cor, 1.05), rx: 0.12 }); // a corcova do ombro
  // o pescoço, a cabeça e o focinho
  m.caixa(C, [0, 112, 54], [30, 36, 22], { cor: tom(cor, 0.95), rx: -0.18 });
  m.caixa(C, [0, 116, 70], [26, 30, 28], { cor: tom(cor, 1.0), rx: 0.08 });
  m.caixa(C, [0, 104, 86], [17, 17, 16], { cor: tom(cor, 0.88) });
  m.caixa(C, [0, 110, 94.6], [13, 7, 1], { cor: "#2a1a10" }); // as narinas, escuras
  for (const s of [-1, 1]) {
    m.caixa(C, [s * 15, 124, 64], [8, 4, 12], { cor: tom(cor, 0.8), rz: s * -0.5 }); // as orelhas
    m.caixa(S, [s * 7.2, 119, 82.4], [3.6, 3.6, 1], { cor: "#1b130d" }); // os olhos
  }
  // as pernas, cada uma em dois pedaços (coxa e canela), e o casco
  for (const [x, z] of [[-14, 24], [14, 24], [-14, -42], [14, -42]]) {
    m.caixa(C, [x, 62, z], [13, 30, 16], { cor: tom(cor, 0.82) });
    m.caixa(C, [x, 38, z + (z > 0 ? 1.6 : -1.6)], [10, 26, 12], { cor: tom(cor, 0.76) });
    m.caixa(S, [x, 25.5, z + (z > 0 ? 2.4 : -2.4)], [12.6, 3.4, 15], { cor: "#2a1a10" });
  }
  // o rabo: uma tira de chapa que desce do quadril e a pena na ponta
  m.caixa(C, [0, 100, -68], [5, 38, 5], { cor: tom(cor, 0.7), rx: 0.18 });
  m.caixa(C, [0, 78, -62], [8, 12, 8], { cor: tom(cor, 0.58) });
  // os chifres de folha de ouro: saem da cabeça, abrem para os lados e sobem, afinando (7 m de ponta a ponta)
  for (const s of [-1, 1]) {
    const pontos = [[10, 124], [20, 130], [29, 142], [33, 156], [34.5, 168]], raios = [3.9, 3.4, 2.8, 2.1, 1.3];
    for (let k = 0; k < pontos.length - 1; k++) {
      const [ax, ay] = pontos[k], [bx, by] = pontos[k + 1], dx = (bx - ax) * s, dy = by - ay, L = Math.hypot(dx, dy);
      m.cilindro(O, [((ax + bx) / 2) * s, (ay + by) / 2, 66], [raios[k], L + 1.6], { cor: "#e6b73f", rz: Math.atan2(-dx, dy), seg: 8 });
    }
    m.geo(O, new THREE.SphereGeometry(1, 8, 6), { x: 34.5 * s, y: 169, z: 66, sx: 1.6, sy: 1.6, sz: 1.6, cor: "#f3cf63" });
  }
  const g = m.montar("redbullring-touro"); g.userData = { alto: ALTURA, raio: 92 };
  return g;
}
