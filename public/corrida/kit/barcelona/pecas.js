// Barcelona (Circuit de Barcelona-Catalunya, Montmeló) — as peças exclusivas do autódromo, em cima do kit 2 (montagem.js: cor chapada por
// vértice, uma malha por material). Cada uma saiu de uma foto de verdade (a lista está no PR):
//   tribunaPrincipal      a grande tribuna da reta: duas fileiras de degraus de assentos vermelhos e brancos em xadrez de blocos, a faixa de
//                         vidro espelhado no meio, a cobertura em asa que sobe para trás (alumínio por cima, vigas escuras por baixo), o
//                         "bico" curvo de uma das pontas com a cabine de vidro e os núcleos de concreto cinza com os números das seções
//   complexoDosBoxes      o prédio dos boxes: térreo de portões de enrolar vermelhos, dois andares de varandas brancas com vidro escuro, o
//                         telhado em balanço, as torres redondas de escada e a torre de controle de prova no meio
//   torreDeCronometragem  a torre fina do relógio: letreiro verde em cima, hora, quadro de posições de 1 a 7 e o agradecimento
//   placaDeCurva          (em ../barcelona.js) · bandeiraEspanha, bandeiraCatalunya: as texturas das bandeiras da torcida
//   motorhome, carreta    o paddock
// Origem no chão, frente para +z, 1 unidade ≈ 10 cm (como os assets do kit 2). Sem marca registrada de patrocinador: só nomes de lugares.
import * as THREE from "three";
import { Montador, solido, vidro, comTextura, tex } from "../montagem.js";
import { sorteio } from "../comum.js";

const _t = {};
const guarda = (k, f) => (_t[k] ||= f());

// ---------------------------------------------------------------------------------------------------------------------
// Texturas pequenas (canvas)
// ---------------------------------------------------------------------------------------------------------------------
/** O degrau de assentos: blocos de quatro assentos vermelhos e brancos; a `fase` troca a cor do bloco de uma fileira para a outra (o xadrez). */
const texAssentos = (fase) => guarda("assentos" + fase, () => tex(256, 16, (x, w, h) => {
  x.fillStyle = "#cfcdc8"; x.fillRect(0, 0, w, h);
  for (let k = 0; k < 32; k++) {
    const vermelho = (Math.floor(k / 4) + fase) % 2 === 0;
    x.fillStyle = vermelho ? "#c8102e" : "#f4f3f0"; x.fillRect(k * 8 + 1, 0, 6, 7); // o encosto (para trás, em cima da imagem)
    x.fillStyle = vermelho ? "#9d0c23" : "#d9d8d3"; x.fillRect(k * 8 + 1, 8, 6, 6); // o assento
  }
}, { repeat: true }));
/** O portão de enrolar vermelho de cada garagem, entre dois pilares brancos. */
const texGaragens = () => guarda("garagens", () => tex(128, 64, (x, w, h) => {
  x.fillStyle = "#ebe9e3"; x.fillRect(0, 0, w, h);
  x.fillStyle = "#d3d0c8"; x.fillRect(0, 0, 6, h); x.fillRect(w - 6, 0, 6, h);
  x.fillStyle = "#b80f24"; x.fillRect(10, 14, w - 20, h - 14);
  x.fillStyle = "#97091b"; for (let y = 17; y < h; y += 4) x.fillRect(10, y, w - 20, 1);
  x.fillStyle = "#1c1d20"; x.fillRect(10, 8, w - 20, 6); x.fillStyle = "#f4f4f2"; x.fillRect(w / 2 - 10, 1, 20, 6);
}, { repeat: true }));
/** A faixa de vidro escuro com os montantes claros e o reflexo do céu. */
const texVidro = () => guarda("vidro", () => tex(128, 32, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#4a6a85"); g.addColorStop(0.5, "#27394a"); g.addColorStop(1, "#1a2733");
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = "#ffffff22"; x.beginPath(); x.moveTo(10, 0); x.lineTo(40, 0); x.lineTo(14, h); x.lineTo(-16, h); x.fill(); x.beginPath(); x.moveTo(78, 0); x.lineTo(96, 0); x.lineTo(70, h); x.lineTo(52, h); x.fill();
  x.fillStyle = "#e9e9e6"; for (const px of [0, 32, 64, 96]) x.fillRect(px, 0, 3, h); x.fillRect(0, 0, w, 2); x.fillRect(0, h - 3, w, 3);
}, { repeat: true }));
/** As janelas pequenas do fundo do prédio. */
const texJanelas = () => guarda("janelas", () => tex(64, 64, (x, w, h) => {
  x.fillStyle = "#e8e6df"; x.fillRect(0, 0, w, h); x.fillStyle = "#3a4b5a";
  for (let yy = 8; yy < h; yy += 20) for (let xx = 6; xx < w; xx += 16) x.fillRect(xx, yy, 10, 9);
}, { repeat: true }));
/** Os números das seções da tribuna: oito células de 64 px, cinza escuro em cima do concreto claro. */
const texNumeros = () => guarda("numeros", () => tex(512, 64, (x, w, h) => {
  x.fillStyle = "#b9b7b0"; x.fillRect(0, 0, w, h); x.fillStyle = "#4a4d52"; x.font = "900 54px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  for (let k = 0; k < 8; k++) x.fillText(String(k + 1), k * 64 + 32, 34);
}));

/** A bandeira da Espanha: vermelha, amarela (o dobro) e vermelha, com a mancha marrom do brasão. */
export const bandeiraEspanha = () => guarda("espanha", () => tex(96, 64, (x, w, h) => {
  x.fillStyle = "#c60b1e"; x.fillRect(0, 0, w, h); x.fillStyle = "#ffc400"; x.fillRect(0, h / 4, w, h / 2);
  x.fillStyle = "#a8552a"; x.fillRect(w * 0.2, h * 0.36, w * 0.12, h * 0.26); x.fillStyle = "#c60b1e"; x.fillRect(w * 0.22, h * 0.42, w * 0.08, h * 0.1);
}));
/** A senyera, a bandeira da Catalunha: quatro faixas vermelhas sobre o amarelo. */
export const bandeiraCatalunya = () => guarda("catalunya", () => tex(96, 64, (x, w, h) => {
  x.fillStyle = "#ffc400"; x.fillRect(0, 0, w, h); x.fillStyle = "#c60b1e"; for (let k = 0; k < 4; k++) x.fillRect(0, (k * 2 + 0.5) * (h / 9), w, h / 9);
}));

const planoCelula = (m, mat, c, n, pos, tam, ry) => { // uma célula de um atlas de n colunas, de frente para +z
  const g = new THREE.PlaneGeometry(1, 1), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + c) / n);
  m.geo(mat, g, { x: pos[0], y: pos[1], z: pos[2], sx: tam[0], sy: tam[1], ry });
};

// ---------------------------------------------------------------------------------------------------------------------
// A tribuna principal
// ---------------------------------------------------------------------------------------------------------------------
export const CAMISAS_ESPANHA = ["#c60b1e", "#c60b1e", "#ffc400", "#ffffff", "#c60b1e", "#f4f4f2", "#ffc400", "#0a4ea3", "#111111", "#c60b1e", "#ff8a1f", "#ffffff"];
const PELES = ["#f1c7a5", "#d9a37a", "#a8714a", "#7a4a2a", "#e8b896"];
const CORPO = new THREE.BoxGeometry(2.4, 4.4, 1.8), CABECA = new THREE.OctahedronGeometry(1, 0); CABECA.scale(0.8, 0.85, 0.8); // a cabeça é um octaedro (8 triângulos)

/** A torcida sentada nos degraus: um InstancedMesh de corpos (a camisa) e um de cabeças. `fileiras`: [{ y, z }] do degrau; vai de x0 a x1. */
export function torcidaNosDegraus(fileiras, x0, x1, { publico = 0.5, semente = 5, camisas = CAMISAS_ESPANHA, corredores = 150 } = {}) {
  const r = sorteio(semente), corpos = [], cabecas = [];
  for (const { y, z } of fileiras) for (let x = x0 + 3; x < x1 - 2; x += 6.2) {
    if (Math.abs(((x - x0) % corredores) - corredores / 2) < 5.5 || r() > publico) continue;
    corpos.push([x + (r() - 0.5) * 1.2, y + 3.1, z, camisas[(r() * camisas.length) | 0]]); cabecas.push([x + (r() - 0.5) * 1.2, y + 6.1, z, PELES[(r() * PELES.length) | 0]]);
  }
  const g = new THREE.Group(); g.name = "torcida";
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9 }), matCabeca = new THREE.MeshStandardMaterial({ roughness: 0.9 }), d = new THREE.Object3D();
  if (!corpos.length) return g;
  const c = new THREE.InstancedMesh(CORPO, mat, corpos.length), h = new THREE.InstancedMesh(CABECA, matCabeca, corpos.length), cor = new THREE.Color();
  corpos.forEach(([x, y, z, camisa], k) => { d.position.set(x, y, z); d.updateMatrix(); c.setMatrixAt(k, d.matrix); c.setColorAt(k, cor.set(camisa)); });
  cabecas.forEach(([x, y, z, pele], k) => { d.position.set(x, y, z); d.updateMatrix(); h.setMatrixAt(k, d.matrix); h.setColorAt(k, cor.set(pele)); });
  c.castShadow = false; g.add(c, h); g.userData.pessoas = corpos.length;
  return g;
}

/**
 * A tribuna principal de Montmeló, de frente para +z, com o primeiro degrau em z = 0 (cresce para -z) e centrada em x.
 * @param {object} o · comprimento: ao longo da pista (1500) · publico: 0 (vazia) a 1 (lotada) · semente · bico: a ponta curva em -x (padrão sim)
 * @returns {THREE.Group} com userData { largura, profundidade, alto, pessoas, fileiras: [{ y, z }] (os degraus, para pôr as bandeiras) }
 */
export function tribunaPrincipal({ comprimento: L = 1500, publico = 0.42, semente = 11, bico = true } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), x0 = -L / 2, x1 = L / 2;
  const A = comTextura(texAssentos(0)), B = comTextura(texAssentos(1)), CONC = "#b4b1a8", ESCURO = "#5a554d";
  const T0 = 14, FUNDO0 = 8.5, SOBE = 5.5, DECK = 46, T1 = 16, FUNDO1 = 8.75, YDECK = T0 * SOBE; // dois lances de degraus com o corredor no meio
  const zDeck = -T0 * FUNDO0, zU = zDeck - DECK, yU = YDECK + 27, zFundo = zU - T1 * FUNDO1, yTopo = yU + T1 * SOBE;
  const fileiras = [];
  // os degraus: o piso (assento) e o espelho (concreto), cada fileira com a fase trocada para formar o xadrez
  const lance = (n, z0, y0, fundo, tam) => {
    for (let k = 0; k < n; k++) {
      const zf = z0 - k * fundo, yp = y0 + (k + 1) * SOBE, mat = (k + tam) % 2 ? B : A;
      m.plano(mat, [0, yp, zf - fundo / 2], [L - 1, fundo], { rx: -Math.PI / 2, uv: [L / 170, 1] });
      m.caixa(S, [0, y0 + k * SOBE + SOBE / 2, zf], [L - 1, SOBE, 0.4], { cor: "#a29f96" });
      fileiras.push({ y: yp, z: zf - fundo * 0.45 });
    }
  };
  lance(T0, 0, 0, FUNDO0, 0);
  lance(T1, zU, yU, FUNDO1, 1);
  // o piso do corredor entre os dois lances, a faixa de vidro espelhado (os camarotes) e o parapeito
  m.caixa(S, [0, YDECK - 0.8, (zDeck + zU) / 2], [L - 1, 1.6, DECK], { cor: CONC });
  m.caixa(S, [0, (YDECK - 1.6) / 2, (zDeck + zU) / 2], [L - 1, YDECK - 1.6, DECK - 1], { cor: "#7d7a72" });
  m.caixa(V, [0, YDECK + 13.5, zU - 0.6], [L - 1, 27, 1.2], { cor: "#355068" });
  m.caixa(S, [0, yU - 0.4, zU - 1.2], [L - 1, 1.4, 3.6], { cor: "#e4e3de" }); // a testeira em cima do vidro
  m.caixa(V, [0, YDECK + 2.5, zDeck - 0.5], [L - 1, 5, 0.5], { cor: "#aebfcd" }); // o parapeito de vidro da beira do corredor
  m.caixa(S, [0, 10, zFundo - 2], [L - 1, 20, 4], { cor: ESCURO }); // a base do fundo
  m.caixa(S, [0, -5, (zFundo - 20) / 2], [L + 8, 10, -zFundo + 20], { cor: "#8f8c84" }); // a fundação, para a tribuna não flutuar no declive
  // as paredes das pontas: o corte em escada da tribuna (um polígono só, de concreto)
  const pts = [[0, 0]]; // [fundo (a), altura (b)]
  for (let k = 0; k < T0; k++) pts.push([k * FUNDO0, (k + 1) * SOBE], [(k + 1) * FUNDO0, (k + 1) * SOBE]);
  pts.push([T0 * FUNDO0, YDECK], [-zU, YDECK], [-zU, yU]);
  for (let k = 0; k < T1; k++) pts.push([-zU + k * FUNDO1, yU + (k + 1) * SOBE], [-zU + (k + 1) * FUNDO1, yU + (k + 1) * SOBE]);
  pts.push([-zFundo + 4, yTopo], [-zFundo + 4, 0]);
  const shape = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b))), parede = new THREE.ShapeGeometry(shape);
  for (const x of [x0, x1]) m.geo(S, parede, { x, ry: Math.PI / 2, cor: "#a8a59c" });
  // a cobertura em asa: sobe para trás; alumínio por cima, vigas escuras por baixo, a borda da frente grossa e branca
  const yf = 150, yb = 238, zf = -112, zb = zFundo - 24, len = Math.hypot(zf - zb, yb - yf), ang = Math.atan2(yb - yf, zf - zb), zc = (zf + zb) / 2, yc = (yf + yb) / 2;
  m.caixa(S, [0, yc + 1.4, zc], [L + 6, 2.6, len], { cor: "#c3c9cf", rx: ang }); // o alumínio
  m.caixa(S, [0, yc - 1.2, zc], [L + 5, 2.4, len], { cor: "#6a5d4c", rx: ang }); // a face de baixo, de painéis escuros
  for (let x = x0 + 12; x <= x1; x += 60) m.caixa(S, [x, yc - 7, zc], [2.4, 9, len - 6], { cor: "#3f3a33", rx: ang }); // as vigas
  m.caixa(S, [0, yf - 2.5, zf + 1.5], [L + 6, 8, 5], { cor: "#e2e5e8", rx: ang }); // a borda da frente
  for (let x = x0 + 60; x < x1; x += 120) { // os tirantes finos da borda até a testeira
    const dz = zf - zU, dy = yf - (yU + 4), l = Math.hypot(dz, dy);
    m.caixa(S, [x, (yf + yU + 4) / 2, (zf + zU) / 2], [1.2, 1.2, l], { cor: "#9aa0a6", rx: -Math.atan2(dy, dz) });
  }
  // o fundo: os núcleos de concreto cinza (escadas e elevadores), com os números das seções em blocos pintados
  const numeros = comTextura(texNumeros(), { roughness: 0.9 });
  for (let k = 0; k < 5; k++) {
    const x = x0 + 150 + (k * (L - 300)) / 4;
    m.cilindro(S, [x, 128, zFundo - 28], [22, 256], { cor: "#aeb0b3", seg: 16 });
    m.cilindro(S, [x, 258, zFundo - 28], [23, 4], { cor: "#7d8084", seg: 16 });
  }
  for (let k = 0; k < 8; k++) { // os blocos de entrada, de frente para trás, com o número da seção
    const x = x0 + 110 + (k * (L - 220)) / 7;
    m.caixa(S, [x, 34, zFundo - 18], [78, 68, 26], { cor: "#b9b7b0" });
    planoCelula(m, numeros, k, 8, [x, 44, zFundo - 31.2], [40, 40], Math.PI);
    for (const s of [-1, 1]) m.cilindro(S, [x + s * 31, 40, zFundo - 31], [3.4, 80], { cor: "#c6c4bd", seg: 8 });
  }
  for (let x = x0 + 40; x < x1; x += 80) m.cilindro(S, [x, 120, zb + 4], [2.6, 240], { cor: "#9a9da1", seg: 8 }); // os pilares do fundo do telhado
  // o bico: a ponta de -x, onde a borda da cobertura se enrola para a frente e para cima, com a cabine de vidro por baixo
  if (bico) {
    const arco = [[-112, 150], [-96, 154], [-72, 164], [-42, 180], [-10, 202], [18, 230]], bx = x0 + 34;
    for (let k = 0; k + 1 < arco.length; k++) {
      const [za, ya] = arco[k], [zb2, yb2] = arco[k + 1], l = Math.hypot(zb2 - za, yb2 - ya);
      m.caixa(S, [bx, (ya + yb2) / 2, (za + zb2) / 2], [64 - k * 6, 7, l + 1.5], { cor: "#d9dde0", rx: Math.atan2(ya - yb2, zb2 - za) });
    }
    m.caixa(V, [bx, 176, -78], [62, 34, 40], { cor: "#3a566e" }); // a cabine
    m.caixa(S, [bx, 160, -78], [66, 3, 44], { cor: "#e4e5e2" });
    for (const s of [-1, 1]) m.caixa(S, [bx + s * 31, 176, -78], [2, 36, 42], { cor: "#d9dde0" });
    for (const [pz, py, ph, rx] of [[-62, 112, 108, 0.28], [-20, 112, 120, 0.12]]) m.caixa(S, [bx, py, pz], [4, ph, 4], { cor: "#9aa0a6", rx }); // as escoras
    m.caixa(S, [bx - 20, 120, -108], [3, 120, 3], { cor: "#cfd2d6" });
  }
  const g = m.montar("barcelona-tribuna-principal");
  const gente = torcidaNosDegraus(fileiras, x0, x1, { publico, semente }); g.add(gente);
  g.userData = { largura: L, profundidade: -zFundo + 30, alto: 262, pessoas: gente.userData.pessoas || 0, fileiras, yTopo };
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// O prédio dos boxes
// ---------------------------------------------------------------------------------------------------------------------
/**
 * O prédio dos boxes e da direção de prova, de frente para +z (a frente em z = 0, cresce para -z), centrado em x. O térreo tem os portões de enrolar
 * vermelhos; em cima, dois andares de varandas brancas e vidro escuro; o telhado sai em balanço; torres redondas de escada nas pontas e
 * a torre de controle de prova, toda de vidro, no meio.
 * @param {object} o · comprimento (1200) · fundo (62) · passoGaragem (60: a distância entre os portões; no jogo, a das garagens do corredor dos boxes) · @returns {THREE.Group} com userData { largura, profundidade, alto, torre: { x, z, y } }
 */
export function complexoDosBoxes({ comprimento: L = 1200, fundo: D = 62, passoGaragem = 60 } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), BRANCO = "#ecebe6", CINZA = "#b9bbbe";
  const garagens = comTextura(texGaragens()), janelas = comTextura(texVidro()), fundos = comTextura(texJanelas());
  m.caixa(S, [0, -4, -D / 2 + 4], [L + 24, 8, D + 20], { cor: "#a8a59c" }); // a laje do chão
  // o térreo: as garagens
  m.caixa(S, [0, 12, -D / 2], [L, 24, D - 0.4], { cor: BRANCO });
  m.plano(garagens, [0, 12, 0.15], [L, 24], { uv: [L / passoGaragem, 1] }); // um portão por garagem do jogo: `passoGaragem` é a distância entre elas (corredor dos boxes)
  // primeiro andar: varanda de 20 de profundidade e a parede de vidro escuro recuada
  m.caixa(S, [0, 25.5, 9], [L + 4, 3, 22], { cor: BRANCO });
  m.caixa(V, [0, 27.4, 19.6], [L + 4, 4, 0.5], { cor: "#a9c0d1" }); // o guarda-corpo de vidro
  m.caixa(S, [0, 37, -(D + 2) / 2], [L, 20, D - 2], { cor: "#2a3f52" });
  m.plano(janelas, [0, 37, -1.9], [L, 20], { uv: [L / 40, 1] });
  // segundo andar (o clube): outra varanda, menor, e o vidro mais recuado
  m.caixa(S, [0, 48.5, 5], [L + 2, 3, 14], { cor: BRANCO });
  m.caixa(V, [0, 50.4, 11.6], [L + 2, 4, 0.5], { cor: "#a9c0d1" });
  m.caixa(S, [0, 59, -(D + 10) / 2], [L, 18, D - 10], { cor: "#2a3f52" });
  m.plano(janelas, [0, 59, -9.9], [L, 18], { uv: [L / 40, 1] });
  // o telhado em balanço, com a borda branca e o friso vermelho do circuito
  m.caixa(S, [0, 69.5, (26 - D - 4) / 2], [L + 6, 3, D + 30], { cor: BRANCO });
  m.caixa(S, [0, 69, 26], [L + 6, 6, 2.4], { cor: "#f4f4f1" });
  m.caixa(S, [0, 65.8, 26], [L + 6, 1.4, 2.6], { cor: "#c8102e" });
  m.caixa(S, [0, 64.3, 26], [L + 6, 1.2, 2.6], { cor: "#ffc400" });
  for (let x = -L / 2 + 20; x < L / 2; x += 40) m.caixa(S, [x, 60, 25], [1.2, 12, 1.2], { cor: "#d9dbdd" }); // as aletas sob a borda
  // as torres redondas de escada, com a fenda de vidro (nas pontas e nos quartos)
  for (const x of [-L / 2, -L / 4, L / 4, L / 2]) {
    m.cilindro(S, [x, 38, 6], [15, 76], { cor: BRANCO, seg: 20 });
    m.cilindro(V, [x, 40, 6], [15.5, 56], { cor: "#26384a", seg: 20, aberto: true }); // a faixa de vidro em volta (muito rente)
    m.cilindro(S, [x, 77, 6], [16, 2], { cor: "#d4d6d8", seg: 20 });
  }
  // a torre de controle de prova, no meio: um bloco de vidro com a laje em balanço e o mastro com a bandeira
  m.caixa(S, [0, 91.5, -30], [170, 41, 36], { cor: "#f0efeb" });
  m.caixa(S, [0, 91.5, -10.9], [168, 36, 0.4], { cor: "#26384a" });
  m.plano(janelas, [0, 91.5, -10.6], [168, 36], { uv: [168 / 40, 1] });
  m.caixa(S, [0, 113.5, -24], [182, 3, 54], { cor: BRANCO });
  m.caixa(S, [0, 115, 3], [182, 2.2, 2], { cor: "#c8102e" });
  m.cilindro(S, [60, 138, -30], [1.4, 50], { cor: "#cfd2d6", seg: 6 });
  m.cilindro(S, [-50, 125, -30], [0.8, 24], { cor: "#cfd2d6", seg: 6 }); m.cilindro(S, [-30, 121, -30], [3.4, 1.6], { cor: "#e8e8e8", seg: 12, rz: 0.6 }); // a antena e a parabólica
  m.plano(comTextura(bandeiraEspanha()), [60 + 14, 152, -30], [28, 18]);
  m.plano(comTextura(bandeiraEspanha()), [60 + 14, 152, -30.2], [28, 18], { ry: Math.PI });
  // o fundo: a parede com as janelas pequenas, virada para o paddock
  m.plano(fundos, [0, 35.5, -D - 0.15], [L, 71], { ry: Math.PI, uv: [L / 50, 1] });
  m.caixa(S, [0, 35.5, -D - 0.5], [L, 71, 0.6], { cor: CINZA });
  const g = m.montar("barcelona-boxes");
  g.userData = { largura: L, profundidade: D + 26, alto: 152, torre: { x: 0, z: -30, y: 113 } };
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// A torre de cronometragem
// ---------------------------------------------------------------------------------------------------------------------
const texLetreiro = () => guarda("torre-letreiro", () => tex(256, 40, (x, w, h) => { x.fillStyle = "#0f5a3a"; x.fillRect(0, 0, w, h); x.strokeStyle = "#e8d58a"; x.lineWidth = 3; x.strokeRect(4, 4, w - 8, h - 8); x.fillStyle = "#f2e7b0"; x.font = "700 24px Georgia, serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("CIRCUIT BARCELONA", w / 2, h / 2 + 1, w - 20); }));
const texRelogio = () => guarda("torre-relogio", () => tex(128, 40, (x, w, h) => { x.fillStyle = "#101114"; x.fillRect(0, 0, w, h); x.fillStyle = "#ffb000"; x.font = "700 24px 'Courier New', monospace"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("17:28:13", w / 2, 14); x.font = "700 12px Arial, sans-serif"; x.fillStyle = "#e8e8e8"; x.fillText("VOLTA", w / 2, 32); }));
const texPlacar = () => guarda("torre-placar", () => tex(64, 256, (x, w, h) => {
  x.fillStyle = "#141518"; x.fillRect(0, 0, w, h);
  for (let k = 0; k < 7; k++) { x.fillStyle = "#f4f4f2"; x.font = "700 20px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(k + 1), 14, 20 + k * 22); x.fillStyle = ["#ffb000", "#e8e8e8", "#27f4d2", "#e8002d", "#3671c6", "#ff8700", "#229971"][k]; x.fillRect(28, 11 + k * 22, 30, 17); }
  x.fillStyle = "#ffd23f"; x.font = "700 18px Arial, sans-serif"; x.save(); x.translate(w / 2, 214); x.fillText("GRÀCIES", 0, 0, 56); x.restore();
}));
/**
 * A torre do relógio da reta: o fuste branco fino com o letreiro verde em cima, o relógio e o placar de 1 a 7, nas duas faces (±z).
 * @param {object} o · alto (170) · @returns {THREE.Group} com userData { alto, raio }
 */
export function torreDeCronometragem({ alto = 170 } = {}) {
  const m = new Montador(), S = solido();
  m.caixa(S, [0, 3, 0], [34, 6, 18], { cor: "#a9a79f" });
  m.caixa(S, [0, alto / 2, 0], [10, alto, 6], { cor: "#e4e2dc" });
  m.caixa(S, [0, alto * 0.62, 0], [14, alto * 0.76, 6], { cor: "#d3d1ca" }); // a lâmina por trás do placar
  m.caixa(S, [0, alto - 10, 0], [44, 12, 5], { cor: "#0f5a3a" }); m.caixa(S, [0, alto - 24, 0], [34, 10, 5], { cor: "#101114" }); m.caixa(S, [0, alto - 74, 0], [14, 50, 5], { cor: "#141518" });
  const L = comTextura(texLetreiro()), R = comTextura(texRelogio()), P = comTextura(texPlacar());
  for (const f of [1, -1]) {
    m.plano(L, [0, alto - 10, f * 2.7], [42, 11], { ry: f > 0 ? 0 : Math.PI });
    m.plano(R, [0, alto - 24, f * 2.7], [32, 9], { ry: f > 0 ? 0 : Math.PI });
    m.plano(P, [0, alto - 74, f * 2.7], [12, 48], { ry: f > 0 ? 0 : Math.PI });
  }
  m.caixa(S, [0, alto + 1, 0], [44, 2, 8], { cor: "#d4d6d8" });
  const g = m.montar("barcelona-torre-cronometragem"); g.userData = { alto: alto + 2, raio: 22 };
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// O paddock
// ---------------------------------------------------------------------------------------------------------------------
/** Um motorhome de equipe: dois andares de caixas brancas com a faixa da cor da equipe, o terraço e o toldo. De frente para +z. */
export function motorhome({ cor = "#c8102e", comprimento = 130, texto = "" } = {}) {
  const m = new Montador(), S = solido();
  m.caixa(S, [0, 12, 0], [comprimento, 24, 54], { cor: "#f1f0ec" });
  m.caixa(S, [0, 38, -6], [comprimento - 14, 26, 42], { cor: "#f6f5f2" });
  m.caixa(S, [0, 25.5, 14], [comprimento + 4, 3, 30], { cor: "#e5e4df" }); // o terraço
  m.caixa(S, [0, 15, 27.2], [comprimento - 4, 5, 0.6], { cor }); // a faixa
  m.caixa(S, [0, 33, 15.2], [comprimento - 6, 6, 0.6], { cor: "#2a3f52" });
  m.caixa(S, [0, 52, -6], [comprimento - 8, 2.4, 46], { cor: "#e4e3de" });
  for (let x = -comprimento / 2 + 10; x < comprimento / 2; x += 22) m.caixa(S, [x, 31, 28], [1, 12, 1], { cor: "#cfd2d6" });
  if (texto) m.plano(comTextura(tex(256, 32, (x, w, h) => { x.fillStyle = cor; x.fillRect(0, 0, w, h); x.fillStyle = "#ffffff"; x.font = "900 22px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto, w / 2, h / 2 + 1, w - 14); })), [0, 20, 27.6], [comprimento - 12, 7.5]);
  const g = m.montar("barcelona-motorhome"); g.userData = { largura: comprimento, profundidade: 54, alto: 54 };
  return g;
}
/** As carretas de equipe enfileiradas: caixa branca com a faixa da cor da equipe, cabine e rodas (tudo num Montador já aberto). */
export function carretasEm(m, x0, z, cores, passo = 120) {
  const S = solido();
  cores.forEach((cor, k) => {
    const x = x0 + k * passo;
    m.caixa(S, [x, 21, z], [78, 32, 28], { cor: "#eceeef" }); m.caixa(S, [x, 21, z - 14.3], [78, 10, 0.6], { cor });
    m.caixa(S, [x + 46, 15, z], [16, 24, 24], { cor }); m.caixa(S, [x + 50.4, 20, z], [8, 9, 21], { cor: "#26323d" });
    for (const dx of [-26, -10, 36, 48]) for (const s of [-1, 1]) m.cilindro(S, [x + dx, 6, z + s * 12], [6, 5], { cor: "#1b1b1f", rx: Math.PI / 2, seg: 8 });
  });
}
