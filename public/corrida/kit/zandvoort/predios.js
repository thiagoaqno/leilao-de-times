// Zandvoort — as construções do circuito (peças só desta pista), todas em `Montador` (kit 2: cor chapada por vértice, uma malha por
// material, origem no chão, a frente para +z, 1 unidade ≈ 10 cm):
// · `predioDosBoxes`: o prédio das garagens da reta de chegada (as fotos do circuito: um prédio comprido e baixo de dois andares, térreo com
//   as portas das garagens e as faixas de patrocínio, o andar de cima de vidro escuro com a platibanda branca, o teto cheio de mastros de
//   bandeira) com a torre de controle de prova numa ponta, quadrada e branca, com a cabine de vidro e as antenas;
// · `telao`: o telão de LED numa torre de treliça, que enfeita as curvas de arquibancada grande;
// · `torreDeIluminacao`: o mastro alto com o painel de refletores;
// · `pavilhao`: o Paddock Club (pavilhão de vidro com o letreiro listrado) e as tendas brancas do fan zone.
import * as THREE from "three";
import { Montador, solido, vidro, comTextura, letreiro, tom } from "../montagem.js";

const LARANJA = "#ff6a13", VERMELHO = "#ae1c28", AZUL = "#21468b", BRANCO = "#eceeef";
const BANDEIRAS = [LARANJA, VERMELHO, "#f4f4f2", AZUL, LARANJA, "#f4f4f2", AZUL, VERMELHO]; // laranja, vermelho, branco e azul: as cores da casa

// ---------------------------------------------------------------------------------------------------------------------
// O prédio dos boxes e a torre de controle
// ---------------------------------------------------------------------------------------------------------------------
/**
 * O prédio das garagens: origem no meio da FRENTE, no chão; a frente (as portas) para +z e o prédio para trás (-z); o comprimento ao longo de x.
 * @param {object} o { comprimento=600, fundo=44, torre=0 (x da torre de controle, ou null) }
 * @returns {THREE.Group} com userData.comprimento/fundo/alto
 */
export function predioDosBoxes({ comprimento: L = 600, fundo: F = 44, torre = 0 } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), concreto = "#c4c6c6", cinza = "#8f969c", escuro = "#2b2f36";
  // o térreo: concreto claro com as portas das garagens, cada uma com a faixa de uma cor da casa em cima
  m.caixa(S, [0, 13, -F / 2], [L, 26, F], { cor: concreto });
  const ng = Math.max(6, Math.round(L / 30));
  for (let k = 0; k < ng; k++) {
    const x = -L / 2 + (k + 0.5) * (L / ng), larg = L / ng - 4;
    m.caixa(S, [x, 9, 0.4], [larg, 17, 0.8], { cor: escuro });
    for (let y = 2; y < 17; y += 3.4) m.caixa(S, [x, y, 0.9], [larg, 0.5, 0.4], { cor: "#4a515c" }); // as réguas do portão enrolado
    m.caixa(S, [x, 20.4, 0.7], [larg, 3.4, 1], { cor: BANDEIRAS[k % BANDEIRAS.length] }); // a faixa de patrocínio
  }
  m.caixa(S, [0, 24.4, 3.4], [L + 4, 1.4, 7.4], { cor: BRANCO }); // a marquise corrida sobre as portas
  // o andar de cima: a faixa de vidro escuro com os montantes e a platibanda branca
  m.caixa(S, [0, 37, -F / 2], [L, 24, F], { cor: BRANCO });
  m.caixa(V, [0, 36, 0.3], [L - 8, 15, 0.8], { cor: "#2d4558" });
  for (let x = -L / 2 + 4; x <= L / 2 - 3.9; x += 12) m.caixa(S, [x, 36, 0.9], [0.8, 15.4, 1.2], { cor: cinza });
  m.caixa(S, [0, 28.6, 0.8], [L - 8, 0.8, 1.4], { cor: cinza }); m.caixa(S, [0, 43.6, 0.8], [L - 8, 0.8, 1.4], { cor: cinza });
  m.caixa(S, [0, 49.6, -F / 2], [L + 1.2, 1.8, F + 1.2], { cor: "#f6f7f7" }); // o teto, com a platibanda
  m.caixa(S, [0, 51.2, 0.2], [L + 1.2, 2, 1.4], { cor: "#f6f7f7" });
  for (const x of [-L * 0.34, -L * 0.08, L * 0.22, L * 0.38]) m.caixa(S, [x, 53, -F * 0.55], [22, 5, 11], { cor: "#cfd3d6" }); // as caixas de ar
  // a faixa do circuito no friso do teto (de frente para os carros) e o grande letreiro
  const faixa = comTextura(letreiro("CIRCUIT ZANDVOORT", { fundo: LARANJA, cor: "#ffffff", w: 1024, h: 64, traco: false }));
  m.plano(faixa, [0, 51.2, 0.95], [Math.min(L * 0.5, 300), 3.6]);
  // os mastros do teto: uma fila de bandeiras na frente (laranja, vermelho, branco e azul) e outra mais atrás
  for (let x = -L / 2 + 8, k = 0; x <= L / 2 - 7; x += 15, k++) {
    m.cilindro(S, [x, 50.5 + 20, -4], [0.45, 40], { cor: "#e8eaec", seg: 5 });
    m.caixa(S, [x + 4.4, 50.5 + 36, -4], [8.4, 5.4, 0.3], { cor: BANDEIRAS[k % BANDEIRAS.length] });
    if (k % 2 === 0) { m.cilindro(S, [x + 7, 50.5 + 14, -F + 8], [0.4, 28], { cor: "#e8eaec", seg: 5 }); m.caixa(S, [x + 10.6, 50.5 + 25, -F + 8], [7.2, 4.6, 0.3], { cor: BANDEIRAS[(k + 3) % BANDEIRAS.length] }); }
  }
  // a torre de controle: fuste branco quadrado de quatro andares, a laje, a cabine de vidro com a faixa de cima, a cobertura e as antenas
  if (torre !== null) {
    const tz = -F / 2 - 2;
    m.caixa(S, [torre, 36, tz], [26, 72, 26], { cor: "#e6e8e9" });
    for (let y = 14; y < 70; y += 17) m.caixa(V, [torre, y + 3, tz + 13.2], [20, 8, 0.6], { cor: "#2f4b60" }); // as janelas, uma por andar
    m.caixa(S, [torre, 73, tz], [30, 2.4, 30], { cor: "#9aa0a6" });
    m.caixa(V, [torre, 82, tz], [26, 15, 26], { cor: "#31506a" });
    for (const [dx, dz] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) m.caixa(S, [torre + dx, 82, tz + dz], [1.2, 15.4, 1.2], { cor: "#d7dce0" });
    m.caixa(S, [torre, 90.8, tz], [32, 2, 32], { cor: "#f1f2f3" });
    m.cilindro(S, [torre + 8, 108, tz], [0.5, 34], { cor: "#d9d9d9", seg: 5 }); m.cilindro(S, [torre - 7, 101, tz + 5], [0.4, 20], { cor: "#d9d9d9", seg: 5 });
    m.caixa(S, [torre + 8, 125, tz], [5, 0.8, 0.8], { cor: "#d9d9d9" }); m.caixa(S, [torre - 7, 110, tz + 5], [4, 0.6, 0.6], { cor: "#d9d9d9" });
    m.caixa(S, [torre - 12, 96, tz - 4], [0.6, 8, 6], { cor: "#b6bcc2" }); // a antena parabólica (de perfil)
    m.caixa(S, [torre, 8, tz + 13.3], [10, 14, 0.6], { cor: "#454b55" }); // a porta de baixo
  }
  const g = m.montar("zandvoort-predio-boxes"); g.userData = { comprimento: L, fundo: F, alto: 125 };
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// O telão numa torre de treliça, o mastro de refletores e o pavilhão
// ---------------------------------------------------------------------------------------------------------------------
/**
 * O telão de LED: duas pernas de treliça e a tela larga no alto, com o texto. Origem no chão, a tela para +z.
 * @param {object} o { largura=60, altura=30, alto=70, texto="TARZAN" }
 */
export function telao({ largura: W = 60, altura: H = 30, alto: A = 70, texto = "TARZAN" } = {}) {
  const m = new Montador(), S = solido();
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 3);
    for (const dz of [-1.6, 1.6]) m.caixa(S, [x + dz * 0.2, A / 2, dz - 3], [0.9, A, 0.9], { cor: "#aeb4ba" });
    for (let y = 6; y < A; y += 8) { m.caixa(S, [x, y, -3], [0.5, 0.5, 3.6], { cor: "#aeb4ba" }); m.caixa(S, [x, y + 4, -3], [0.5, 8.6, 0.5], { cor: "#9ba1a8", rx: 0.65 }); }
    m.caixa(S, [x, 1.5, -3], [8, 3, 8], { cor: "#80858b" });
  }
  m.caixa(S, [0, A - H / 2 - 4, -3.4], [W + 2, H + 2, 2.6], { cor: "#2a2e34" });
  const tela = comTextura(letreiro(texto, { fundo: LARANJA, cor: "#ffffff", w: 512, h: 256, traco: false }), { roughness: 0.4 });
  m.plano(tela, [0, A - H / 2 - 4, -1.9], [W, H]);
  m.caixa(S, [0, A - H - 5.4, -3], [W + 2, 1, 3], { cor: "#aeb4ba" });
  const g = m.montar("zandvoort-telao"); g.userData = { largura: W, alto: A };
  return g;
}
/** O mastro de iluminação: um fuste fino com o painel de refletores no alto (as luzes são só desenho). Origem no chão, o painel para +z. */
export function torreDeIluminacao({ alto = 140 } = {}) {
  const m = new Montador(), S = solido();
  m.cilindro(S, [0, alto / 2, 0], [1.1, alto], { cor: "#9ba1a8", seg: 6 });
  m.caixa(S, [0, alto + 4, 1.2], [20, 11, 1.2], { cor: "#3a3f46" });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) m.caixa(S, [(i - 2.5) * 3.1, alto + 1 + j * 3.4, 2], [2.2, 2.4, 0.5], { cor: "#fff4d8" });
  const g = m.montar("zandvoort-mastro-luz"); g.userData = { alto };
  return g;
}
/** O Paddock Club: um pavilhão de vidro de dois andares, com a faixa listrada no alto (as fotos do circuito) e a tenda branca ao lado. Origem no chão, frente para +z. */
export function pavilhao({ largura: W = 90, fundo: F = 36, texto = "PADDOCK CLUB" } = {}) {
  const m = new Montador(), S = solido(), V = vidro();
  m.caixa(S, [0, 1, -F / 2], [W + 6, 2, F + 6], { cor: "#d1d3d4" });
  m.caixa(V, [0, 15, -F / 2], [W, 26, F], { cor: "#7c93a3" });
  for (let x = -W / 2; x <= W / 2 + 0.1; x += 15) m.caixa(S, [x, 15, 0.3], [0.9, 26, 1], { cor: "#b8bdc2" });
  m.caixa(S, [0, 14, 0.8], [W, 0.9, 1.4], { cor: "#b8bdc2" });
  m.caixa(S, [0, 29.4, -F / 2], [W + 4, 2.4, F + 4], { cor: "#f3f4f5" });
  m.plano(comTextura(letreiro(texto, { fundo: "#ffffff", cor: VERMELHO, w: 512, h: 64, traco: false })), [0, 33, -1], [W * 0.62, 5.2]);
  m.caixa(S, [0, 31.8, -0.4], [W + 4, 1.2, 1.6], { cor: VERMELHO }); // a faixa vermelha e branca
  m.caixa(S, [0, 30.6, -0.4], [W + 4, 1.2, 1.6], { cor: "#ffffff" });
  const g = m.montar("zandvoort-pavilhao"); g.userData = { largura: W, fundo: F };
  return g;
}


/** A roda-gigante do fan zone (parada, só desenho): dois aros com os raios, as cabines nas cores da casa e as pernas em A. Origem no chão, o plano da roda para +z. */
export function rodaGigante({ raio = 120, cabines = 16 } = {}) {
  const m = new Montador(), S = solido(), cubo = raio * 1.1, meio = raio * 0.09, pe = raio * 0.6, cores = [LARANJA, "#f4f4f2", AZUL, VERMELHO];
  for (const sz of [-1, 1]) {
    const z = sz * meio;
    m.geo(S, new THREE.TorusGeometry(raio, raio * 0.014, 5, 40), { y: cubo, z, cor: "#f4f5f7" });
    m.geo(S, new THREE.TorusGeometry(raio * 0.55, raio * 0.008, 5, 28), { y: cubo, z, cor: LARANJA });
    for (let k = 0; k < cabines; k++) { const a = (k / cabines) * Math.PI * 2; m.caixa(S, [-Math.sin(a) * raio / 2, cubo + Math.cos(a) * raio / 2, z], [raio * 0.01, raio, raio * 0.01], { cor: "#e8eaec", rz: a }); }
    for (const sx of [-1, 1]) {
      const comp = Math.hypot(pe, cubo), ang = Math.atan2(pe, cubo);
      m.caixa(S, [sx * pe / 2, cubo / 2, z * 1.3], [raio * 0.045, comp, raio * 0.05], { cor: "#e8eaec", rz: sx * ang });
      m.caixa(S, [sx * pe, 3, z * 1.3], [raio * 0.2, 6, raio * 0.11], { cor: "#9a9ea6" });
    }
  }
  for (let k = 0; k < cabines; k++) { const a = (k / cabines) * Math.PI * 2; m.caixa(S, [-Math.sin(a) * raio, cubo + Math.cos(a) * raio - raio * 0.05, 0], [raio * 0.085, raio * 0.07, meio * 1.7 + 4], { cor: cores[k % 4] }); }
  m.cilindro(S, [0, cubo, 0], [raio * 0.07, meio * 2 + 14], { cor: "#6a7078", rx: Math.PI / 2, seg: 10 });
  const g = m.montar("zandvoort-roda-gigante"); g.userData = { raio };
  return g;
}

// uma tribuna aberta e grande como a do Tarzan, feita de `tribunaCoberta` (kit/coberturas.js): só muda a cor das seções e a estrutura
export const CORES_TRIBUNA = ["#ff6a13", "#f4f4f2", "#21468b", "#ff6a13", "#ae1c28", "#f4f4f2", "#21468b"];
void THREE; void tom;
