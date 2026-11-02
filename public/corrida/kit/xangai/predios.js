// Xangai — as construções da reta dos boxes (peças só desta pista), todas em `Montador` (kit 2: cor chapada por vértice, uma malha por material,
// origem no chão, a frente para +z, 1 unidade ≈ 10 cm). Das fotos do circuito:
// · `predioDosBoxes`: um módulo do prédio das garagens (comprido e baixo: térreo de concreto cinza com as garagens entre nervuras claras, uma
//   marquise escura, o andar de cima de vidro verde-acinzentado, o terraço do teto com a mureta e a galera de pé, a faixa de painéis), com a
//   torre de controle de prova sobre o teto quando pedida;
// · `torreDeVidro`: as torres das pontas do prédio dos boxes e da tribuna (vidro em faixas horizontais, o capacete branco);
// · `asa`: o que cruza a pista sobre a reta, ligando a torre dos boxes à da tribuna: a laje em forma de folha (asa), branca por cima, com o
//   ventre de vidro, as faixas de vidro no teto e os estais de aço nos mastros das torres;
// · `telao`: o telão de LED numa torre de treliça das curvas de arquibancada grande.
import * as THREE from "three";
import { Montador, solido, vidro, comTextura, letreiro } from "../montagem.js";

const BRANCO = "#eceeef", CONCRETO = "#b4b8b9", VIDRO = "#496e72", VIDRO_ESCURO = "#27434a", VERMELHO = "#c8102e", OURO = "#ffd34a";
const CAMISAS = ["#c8102e", "#ffd34a", "#ffffff", "#c8102e", "#222831", "#e9eef2", "#c8102e", "#f2a33a"];
const rnd = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// as faixas de painéis são sempre as mesmas texturas (uma por texto): módulos iguais dividem o mesmo material
const faixas = new Map();
function faixaTex(texto, fundo, cor, vezes = 1) {
  const k = [texto, fundo, cor, vezes].join("|");
  if (!faixas.has(k)) faixas.set(k, comTextura(letreiro(texto, { fundo, cor, w: 1024, h: 64, vezes, traco: false }), { roughness: 0.55 }));
  return faixas.get(k);
}

// ---------------------------------------------------------------------------------------------------------------------
// O prédio dos boxes (um módulo) e a torre de controle de prova
// ---------------------------------------------------------------------------------------------------------------------
/**
 * Um módulo do prédio das garagens: origem no meio da FRENTE, no chão; as portas para +z e o prédio para trás (-z); o comprimento ao longo de x.
 * @param {object} o { comprimento=165, fundo=44, torre=null (x da torre de controle sobre o teto, ou null), semente=1, texto="SHANGHAI CIRCUIT" }
 * @returns {THREE.Group} com userData.comprimento/fundo/alto
 */
export function predioDosBoxes({ comprimento: L = 165, fundo: F = 44, torre = null, semente = 1, texto = "SHANGHAI CIRCUIT" } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), r = rnd(semente * 97 + 13);
  // o térreo: concreto cinza com as garagens, cada uma entre duas nervuras claras
  m.caixa(S, [0, 12, -F / 2], [L, 24, F], { cor: CONCRETO });
  const ng = Math.max(4, Math.round(L / 16.5)), larg = L / ng;
  for (let k = 0; k < ng; k++) {
    const x = -L / 2 + (k + 0.5) * larg;
    m.caixa(S, [x, 9, 0.5], [larg - 4.2, 17, 1], { cor: "#30343a" }); // o vão da garagem
    for (let y = 2; y < 17; y += 3.4) m.caixa(S, [x, y, 1], [larg - 4.4, 0.5, 0.4], { cor: "#4d535c" }); // as réguas do portão
    m.caixa(S, [x, 19.6, 0.8], [larg - 3.6, 1.4, 1.2], { cor: k % 3 === 1 ? VERMELHO : "#d9dcde" }); // a testeira, na cor da casa
    m.caixa(S, [-L / 2 + k * larg, 12, 1.2], [1.8, 24, 2.4], { cor: "#e1e4e5" }); // a nervura entre as garagens
  }
  m.caixa(S, [L / 2, 12, 1.2], [1.8, 24, 2.4], { cor: "#e1e4e5" });
  m.caixa(S, [0, 25.2, 4.6], [L + 2, 1.8, 9.6], { cor: "#555b62" }); // a marquise escura sobre as portas (nas fotos, o beiral cinza corrido)
  m.caixa(S, [0, 24.2, 0.4], [L, 0.8, 1], { cor: "#d9dcde" });
  // o andar de cima: a faixa de vidro com os montantes
  m.caixa(S, [0, 37, -F / 2], [L, 24, F], { cor: "#aeb3b5" });
  m.caixa(V, [0, 37, 0.4], [L - 6, 15, 0.9], { cor: VIDRO });
  for (let x = -L / 2 + 3; x <= L / 2 - 2.9; x += 11) m.caixa(S, [x, 37, 1], [0.8, 15.4, 1.2], { cor: "#7d858a" });
  m.caixa(S, [0, 29.4, 1], [L - 6, 0.9, 1.6], { cor: "#c6cacc" }); m.caixa(S, [0, 44.6, 1], [L - 6, 0.9, 1.6], { cor: "#c6cacc" });
  // o teto: laje cinza, a mureta de vidro com o corrimão, a galera de pé e a fita de painéis na frente
  m.caixa(S, [0, 49.8, -F / 2], [L + 1.4, 1.6, F + 1.4], { cor: "#8e9498" });
  m.caixa(V, [0, 53, 3.2], [L, 4.4, 0.5], { cor: "#7eaab0" });
  m.caixa(S, [0, 55.4, 3.2], [L, 0.5, 0.8], { cor: "#e4e7e8" });
  for (let x = -L / 2 + 1; x <= L / 2 - 0.9; x += 7) m.caixa(S, [x, 53, 3.2], [0.5, 5, 0.6], { cor: "#cfd3d5" });
  for (let x = -L / 2 + 2; x < L / 2 - 1.5; x += 2.5) if (r() < 0.82) {
    const cor = CAMISAS[(r() * CAMISAS.length) | 0], z = 1.4 + r() * 1.2;
    m.caixa(S, [x + (r() - 0.5) * 0.6, 52.8, z], [1.7, 3, 1.3], { cor }); m.caixa(S, [x, 55, z], [1.2, 1.2, 1.2], { cor: ["#f1c7a5", "#d9a37a", "#b98660"][(r() * 3) | 0] });
  }
  m.plano(faixaTex(texto, VERMELHO, "#ffffff", Math.max(2, Math.round(L / 80))), [0, 47.6, 1.2], [L - 4, 3.2]); // a faixa de painéis na beira do andar (de frente para os carros)
  for (const x of [-L * 0.3, L * 0.05, L * 0.34]) m.caixa(S, [x, 53, -F * 0.5], [20, 6, 12], { cor: "#cfd3d6" }); // as caixas de ar
  for (let x = -L / 2 + 14; x <= L / 2 - 12; x += 38) { m.cilindro(S, [x, 62, -F + 6], [0.4, 24], { cor: "#e8eaec", seg: 5 }); m.caixa(S, [x + 4, 70, -F + 6], [8, 4.8, 0.3], { cor: x % 2 ? VERMELHO : OURO }); } // as bandeiras do teto
  // a torre de controle de prova: fuste de concreto com as janelas, a cabine de vidro projetada sobre a reta, o capacete e o mastro de antenas
  if (torre !== null) {
    const tz = -F * 0.38, y0 = 50.6;
    m.caixa(S, [torre, y0 + 36, tz], [22, 72, 22], { cor: "#d9dcdd" });
    for (let y = 10; y < 66; y += 14) m.caixa(V, [torre, y0 + y, tz + 11.2], [16, 6, 0.6], { cor: VIDRO_ESCURO });
    m.caixa(S, [torre, y0 + 74, tz + 4], [46, 2.4, 32], { cor: "#8e9498" }); // a laje da cabine
    m.caixa(V, [torre, y0 + 84, tz + 4], [44, 17, 30], { cor: VIDRO_ESCURO });
    for (const sx of [-1, 0, 1]) m.caixa(S, [torre + sx * 14, y0 + 84, tz + 19.2], [1, 17.4, 1.4], { cor: "#b6bcc0" });
    m.caixa(S, [torre, y0 + 93.6, tz + 4], [48, 2.2, 34], { cor: BRANCO });
    m.caixa(S, [torre, y0 + 95.4, tz + 19], [48, 0.9, 1.2], { cor: VERMELHO }); // a testeira vermelha
    m.cilindro(S, [torre + 10, y0 + 118, tz], [0.5, 46], { cor: "#d9d9d9", seg: 5 }); m.cilindro(S, [torre - 9, y0 + 108, tz + 6], [0.4, 26], { cor: "#d9d9d9", seg: 5 });
    m.caixa(S, [torre + 10, y0 + 138, tz], [6, 0.8, 0.8], { cor: "#d9d9d9" });
    m.caixa(S, [torre - 14, y0 + 102, tz - 4], [0.6, 8, 6], { cor: "#b6bcc2" }); // a antena parabólica (de perfil)
  }
  const g = m.montar("xangai-predio-boxes"); g.userData = { comprimento: L, fundo: F, alto: torre !== null ? 160 : 70 };
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// As torres das pontas
// ---------------------------------------------------------------------------------------------------------------------
/**
 * A torre de vidro das pontas do prédio dos boxes e da tribuna: núcleo de concreto, faixas de vidro de cada andar nas três faces, nervuras verticais
 * escuras e o capacete branco. Origem no meio da FRENTE, no chão; o prédio vai para trás (-z).
 * @param {object} o { largura=44, fundo=50, alto=200 }
 */
export function torreDeVidro({ largura: W = 44, fundo: D = 50, alto: A = 200 } = {}) {
  const m = new Montador(), S = solido(), V = vidro();
  m.caixa(S, [0, A / 2, -D / 2], [W, A, D], { cor: "#a7acae" });
  m.caixa(S, [0, 3, -D / 2], [W + 8, 6, D + 8], { cor: "#7d8386" }); // o embasamento
  for (let y = 14; y < A - 8; y += 15) {
    m.caixa(V, [0, y, 0.4], [W - 4, 9, 0.8], { cor: VIDRO });
    for (const sx of [-1, 1]) m.caixa(V, [sx * W / 2, y, -D / 2], [0.8, 9, D - 4], { cor: VIDRO_ESCURO });
    m.caixa(S, [0, y + 7.6, 0.9], [W, 0.8, 1.6], { cor: "#cfd3d5" });
  }
  for (const x of [-W * 0.3, 0, W * 0.3]) m.caixa(S, [x, A / 2, 1.1], [1.2, A - 12, 1.6], { cor: "#3b4046" });
  m.caixa(S, [0, A + 2, -D / 2], [W + 6, 4, D + 6], { cor: BRANCO }); // o capacete
  m.caixa(S, [0, A + 5, -D / 2], [W * 0.5, 2, D * 0.5], { cor: "#cfd3d5" });
  const g = m.montar("xangai-torre"); g.userData = { largura: W, fundo: D, alto: A };
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// A asa sobre a reta
// ---------------------------------------------------------------------------------------------------------------------
// uma superfície paramétrica (u ao longo do vão, v ao longo da corda) em malha; `cima` define o sentido dos triângulos (normal para cima ou para baixo)
function malha(f, u0, u1, v0, v1, nU, nV, cima) {
  const pos = [], idx = [];
  for (let i = 0; i <= nU; i++) for (let j = 0; j <= nV; j++) pos.push(...f(u0 + (u1 - u0) * (i / nU), v0 + (v1 - v0) * (j / nV)));
  const a = (i, j) => i * (nV + 1) + j;
  for (let i = 0; i < nU; i++) for (let j = 0; j < nV; j++) {
    if (cima) idx.push(a(i, j), a(i + 1, j), a(i, j + 1), a(i, j + 1), a(i + 1, j), a(i + 1, j + 1));
    else idx.push(a(i, j), a(i, j + 1), a(i + 1, j), a(i + 1, j), a(i, j + 1), a(i + 1, j + 1));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/**
 * A asa que cruza a pista (a ponte em forma de folha das fotos: laje branca de bordas levantadas e ventre de vidro). Origem na face da frente da torre dos
 * boxes (z = 0), no chão; o vão vai para +z até o meio da torre da tribuna; a corda (a largura da asa) corre ao longo de x.
 * @param {object} o { vao=270, cordaMin=46, cordaMax=130, y0=150 (a altura onde encosta nas torres), subida=26, espMin=12, espMax=34, alturaTorre=200 }
 */
export function asa({ vao = 270, cordaMin = 46, cordaMax = 130, y0 = 150, subida = 26, espMin = 12, espMax = 34, alturaTorre = 200 } = {}) {
  const m = new Montador(), S = solido(), V = vidro();
  const s = (u) => Math.sin(Math.PI * u), esc = (u) => Math.pow(Math.max(0, s(u)), 0.7);
  const corda = (u) => cordaMin + (cordaMax - cordaMin) * esc(u), ym = (u) => y0 + subida * s(u), esp = (u) => espMin + (espMax - espMin) * s(u);
  // a laje: a lente de cima e de baixo, as bordas levantadas como a pontinha de uma folha de lótus
  const topo = (u, v) => { const q = Math.pow(Math.max(0, 1 - v * v), 0.75); return [v * corda(u) / 2, ym(u) + esp(u) * 0.52 * q + 7 * Math.pow(Math.abs(v), 3) * esc(u), 6 + vao * u]; };
  const base = (u, v) => { const q = Math.pow(Math.max(0, 1 - v * v), 0.75); return [v * corda(u) / 2, ym(u) - esp(u) * 0.46 * q + 7 * Math.pow(Math.abs(v), 3) * esc(u), 6 + vao * u]; };
  m.geo(S, malha(topo, 0, 1, -1, 1, 34, 12, true), { cor: "#f1f3f4" });
  m.geo(V, malha(base, 0, 1, -1, 1, 34, 12, false), { cor: "#8fb0b3" });
  // o ventre de vidro (a cabine da imprensa de um lado, a hospitalidade do outro): outra lente, mais fina, pendurada embaixo
  const cab = (sinal) => (u, v) => { const q = Math.pow(Math.max(0, 1 - v * v), 0.6); return [v * corda(u) * 0.34, ym(u) - esp(u) * 0.34 + sinal * 15 * q * esc(u) - (sinal < 0 ? 4 : 0), 6 + vao * u]; };
  m.geo(V, malha(cab(1), 0.08, 0.92, -1, 1, 26, 10, true), { cor: "#5f8d94" });
  m.geo(V, malha(cab(-1), 0.08, 0.92, -1, 1, 26, 10, false), { cor: "#4d7c84" });
  // as faixas de vidro no teto (por cima da laje, sobre a mesma superfície)
  for (const [a, b] of [[0.14, 0.34], [0.4, 0.6], [0.66, 0.86]]) {
    const claraboia = (u, v) => { const p = topo(u, v); p[1] += 0.5; return p; };
    m.geo(V, malha(claraboia, a, b, -0.46, 0.46, 8, 4, true), { cor: VIDRO_ESCURO });
  }
  // os mastros nas duas torres e os estais de aço até a laje
  const yTopo = alturaTorre + 82;
  for (const [zm, us] of [[-16, [0.3, 0.55]], [6 + vao, [0.7, 0.45]]]) {
    m.cilindro(S, [0, (alturaTorre + yTopo) / 2 + 4, zm], [1.2, yTopo - alturaTorre], { cor: "#d7dce0", seg: 6 });
    for (const u of us) {
      const p = topo(u, 0), dz = p[2] - zm, dy = p[1] - yTopo, len = Math.hypot(dz, dy);
      m.caixa(S, [0, (p[1] + yTopo) / 2, (p[2] + zm) / 2], [0.7, 0.7, len], { cor: "#cfd3d6", rx: -Math.atan2(dy, dz) });
    }
  }
  const g = m.montar("xangai-asa"); g.userData = { vao, alto: y0 + subida + espMax };
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// O telão numa torre de treliça
// ---------------------------------------------------------------------------------------------------------------------
/** O telão de LED: duas pernas de treliça e a tela larga no alto, com o texto. Origem no chão, a tela para +z. */
export function telao({ largura: W = 60, altura: H = 30, alto: A = 70, texto = "SHANGHAI", fundo = VERMELHO } = {}) {
  const m = new Montador(), S = solido();
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 3);
    for (const dz of [-1.6, 1.6]) m.caixa(S, [x + dz * 0.2, A / 2, dz - 3], [0.9, A, 0.9], { cor: "#aeb4ba" });
    for (let y = 6; y < A; y += 8) { m.caixa(S, [x, y, -3], [0.5, 0.5, 3.6], { cor: "#aeb4ba" }); m.caixa(S, [x, y + 4, -3], [0.5, 8.6, 0.5], { cor: "#9ba1a8", rx: 0.65 }); }
    m.caixa(S, [x, 1.5, -3], [8, 3, 8], { cor: "#80858b" });
  }
  m.caixa(S, [0, A - H / 2 - 4, -3.4], [W + 2, H + 2, 2.6], { cor: "#2a2e34" });
  m.plano(comTextura(letreiro(texto, { fundo, cor: "#ffffff", w: 512, h: 256, traco: false }), { roughness: 0.4 }), [0, A - H / 2 - 4, -1.9], [W, H]);
  m.caixa(S, [0, A - H - 5.4, -3], [W + 2, 1, 3], { cor: "#aeb4ba" });
  const g = m.montar("xangai-telao"); g.userData = { largura: W, alto: A };
  return g;
}
