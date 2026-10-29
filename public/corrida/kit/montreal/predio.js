// Montreal — o prédio dos boxes de 2019 (o "Paddock" novo, no lugar do velho de 1988): comprido, branco e moderno, em três andares.
// Térreo de garagens com portas de aço brancas e painéis de concreto pré-moldado; o segundo andar recuado, com o terraço coberto e
// o guarda-corpo de vidro; o terceiro recuado de novo, com o terraço de cima; por cima, a laje do telhado em madeira laminada
// cruzada (CLT, o forro marrom) que avança sobre os terraços, apoiada em colunas brancas em V; no telhado, o terraço verde, os painéis
// solares e a plataforma da TV. Uma malha por material (cor chapada por vértice), origem no chão, frente para +z, 1 unidade ≈ 10 cm.
// Referências (Wikimedia Commons): "L'Espace Paddock Pit Garages" (a fachada, as portas, o vidro) e "Roof Structure of L'Espace
// Paddock" (o forro de madeira e as colunas em V).
import * as THREE from "three";
import { Montador, solido, vidro, comTextura, tex, tom } from "../montagem.js";
import { marcaTex } from "../marcas.js";

const BRANCO = "#eeede9", CINZA = "#d9d8d3", CONCRETO = "#a9a59b", MADEIRA = "#b9824c";

/**
 * @param {object} o · @param {number} [o.comprimento=640] ao longo de x · @param {number} [o.fundo=74] profundidade (para -z)
 * @returns {THREE.Group} com userData.largura/fundo/alto/frente (o quanto o telhado avança para +z)
 */
export function predioDosBoxes2019({ comprimento: C = 640, fundo = 74 } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), H1 = 42, H2 = 86, H3 = 126, R1 = 14, R2 = 32, AVANCO = 26, esq = -C / 2;
  m.caixa(S, [0, -35, -fundo / 2], [C + 12, 70, fundo + 12], { cor: CONCRETO }); // a base de concreto, desce até o chão lá de baixo
  // o térreo: as garagens
  m.caixa(S, [0, H1 / 2, -fundo / 2], [C, H1, fundo], { cor: BRANCO });
  const portas = comTextura(tex(240, 64, (x, w, h) => {
    x.fillStyle = "#e9e8e3"; x.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) {
      const x0 = k * 60 + 5; x.fillStyle = "#9c9c97"; x.fillRect(x0 - 1, 5, 50, h - 5); x.fillStyle = "#f6f6f3"; x.fillRect(x0, 6, 48, h - 6);
      x.fillStyle = "#d3d3cd"; for (let yy = 10; yy < h; yy += 4) x.fillRect(x0, yy, 48, 1);
      x.fillStyle = "#d8d8d2"; x.fillRect(x0 + 52, 12, 4, h - 12); // a porta de pedestre
    }
  }, { repeat: true }));
  m.plano(portas, [0, H1 / 2 - 1, 0.2], [C, H1 - 2], { uv: [C / 240, 1] });
  m.caixa(S, [0, H1 + 1, 0], [C + 2, 2, 3], { cor: CINZA }); // a testeira da laje do segundo andar
  // o segundo andar: recuado R1, com a cortina de vidro, e o terraço (o topo do térreo) com o guarda-corpo de vidro na ponta
  m.caixa(S, [0, (H1 + H2) / 2 + 1, -(R1 + fundo) / 2], [C - 4, H2 - H1 - 2, fundo - R1], { cor: CINZA });
  const vidros = comTextura(tex(64, 64, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#5f8fb0"); g.addColorStop(1, "#2c4c66"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = "#e8eef2"; x.fillRect(0, 0, 3, h); x.fillRect(0, h - 4, w, 4); x.fillStyle = "#ffffff2a"; x.fillRect(10, 8, 16, h - 18);
  }, { repeat: true }));
  m.plano(vidros, [0, (H1 + H2) / 2 + 1, -R1 + 0.3], [C - 8, H2 - H1 - 6], { uv: [(C - 8) / 34, 1] });
  const guarda = new THREE.MeshStandardMaterial({ map: tex(32, 32, (x, w, h) => { x.fillStyle = "#a9cfe0"; x.fillRect(0, 0, w, h); x.fillStyle = "#eaf6fb"; x.fillRect(0, 0, 2, h); x.fillRect(0, 0, w, 3); }, { repeat: true }), transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide });
  m.plano(guarda, [0, H1 + 7, 0.6], [C, 12], { uv: [C / 32, 1] });
  // o terceiro andar: recuado de novo (R2), com o terraço de cima (o topo do segundo) e outro guarda-corpo
  m.caixa(S, [0, (H2 + H3) / 2 + 1, -(R2 + fundo) / 2], [C - 8, H3 - H2 - 2, fundo - R2], { cor: BRANCO });
  m.plano(vidros, [0, (H2 + H3) / 2 + 1, -R2 + 0.3], [C - 12, H3 - H2 - 6], { uv: [(C - 12) / 34, 1] });
  m.caixa(S, [0, H2 + 1, -R1 / 2 - 8], [C - 4, 2, R1 + 16], { cor: CINZA }); // a laje do terraço de cima
  m.plano(guarda, [0, H2 + 7, -R1 + 0.6], [C - 4, 12], { uv: [(C - 4) / 32, 1] });
  // a laje do telhado, avançando AVANCO sobre o térreo, o forro de madeira por baixo e a testeira branca
  const zT = (AVANCO - fundo) / 2, lT = fundo + AVANCO;
  m.caixa(S, [0, H3 + 5, zT], [C + 4, 8, lT], { cor: BRANCO });
  m.caixa(S, [0, H3 + 9.4, zT + lT / 2 - 0.8], [C + 4, 2.4, 1.6], { cor: "#ffffff" });
  const forro = comTextura(tex(128, 64, (x, w, h) => {
    x.fillStyle = "#b9824c"; x.fillRect(0, 0, w, h);
    for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? "#a97440" : "#c28f58"; x.fillRect(k * 16, 0, 15, h); }
    x.strokeStyle = "#8a5a30"; x.lineWidth = 2; x.strokeRect(0, 0, w, h); x.beginPath(); x.moveTo(0, 0); x.lineTo(w, h); x.moveTo(w, 0); x.lineTo(0, h); x.stroke();
  }, { repeat: true }));
  m.plano(forro, [0, H3 + 0.9, zT], [C, lT], { rx: Math.PI / 2, uv: [C / 90, lT / 50] }); // o forro de madeira (a normal para baixo)
  // as colunas brancas em V, do terraço do térreo até o forro, na frente
  const vao = C / 8, alt = H3 - H1 - 2, abre = 15, ang = Math.atan2(abre, alt), comp = Math.hypot(alt, abre);
  for (let i = 0; i <= 8; i++) {
    const x = esq + i * vao;
    for (const s of [-1, 1]) m.cilindro(S, [x + s * abre / 2, H1 + 2 + alt / 2, AVANCO - 8], [3, comp], { cor: "#f1f0ec", rz: s * ang, seg: 8 });
  }
  // os pilares quadrados do fundo do terraço de cima
  for (let i = 0; i <= 8; i++) m.caixa(S, [esq + i * vao, (H2 + H3) / 2, -R2 + 2], [3.6, H3 - H2, 3.6], { cor: "#d4d3ce" });
  // o telhado: o terraço verde, as fileiras de painéis solares, a plataforma de TV e as escadas
  m.caixa(S, [esq + 70, H3 + 10, -fundo * 0.45], [120, 3, fundo * 0.55], { cor: "#5d9a45" });
  for (let k = 0; k < 14; k++) for (const z of [-fundo * 0.2, -fundo * 0.55]) m.caixa(S, [esq + 250 + k * 28, H3 + 11.5, z], [22, 2, 15], { cor: "#1e2f4d", rx: -0.3 });
  m.caixa(S, [C / 2 - 90, H3 + 16, -fundo * 0.4], [60, 14, 26], { cor: "#d6d5d0" }); m.caixa(S, [C / 2 - 90, H3 + 24, -fundo * 0.4 + 14], [60, 2, 4], { cor: "#2a2e35" });
  for (const s of [-1, 1]) { // as caixas de escada e elevador, de vidro, nas pontas
    m.caixa(S, [s * (C / 2 - 26), (H3 + 28) / 2, -fundo + 16], [32, H3 + 28, 30], { cor: "#e2e1dc" });
    m.plano(vidros, [s * (C / 2 - 26), H3 / 2, -fundo + 16 + 15.2], [24, H3 - 10], { uv: [1, 3] });
  }
  // o letreiro na testeira do telhado e o número das garagens
  const g = m.montar("montreal-predio-boxes");
  for (const [nome, x] of [["gilles", -C * 0.22], ["gpcanada", C * 0.22]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(190, 7.4), new THREE.MeshBasicMaterial({ map: marcaTex(nome, 1024, 40) })); p.position.set(x, H3 + 9.4, zT + lT / 2 + 0.1); g.add(p);
  }
  g.userData = { largura: C, fundo, alto: H3 + 30, frente: AVANCO };
  void V; void tom;
  return g;
}
