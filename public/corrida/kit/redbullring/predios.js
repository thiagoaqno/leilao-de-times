// Red Bull Ring — as construções do circuito (peças só desta pista), todas em `Montador` (kit 2: cor chapada por vértice, uma malha por
// material, origem no chão, a frente para +z, 1 unidade ≈ 10 cm):
// · `predioDosBoxes`: o prédio das garagens da reta de chegada (reconstruído em 2010): térreo de garagens, faixa contínua de vidro, brises
//   brancos e o terraço, com a torre de controle de prova na linha de chegada;
// · `asaDeAco`: o prédio em forma de asa de carro de corrida que olha a arquibancada principal e a reta de chegada, com o centro de imprensa de
//   vidro sob a lâmina inclinada e as duas placas laterais (como o aerofólio traseiro de um carro);
// · `casaDaEstiria`: a casa de fazenda da Estíria (paredes brancas, andar de cima e sacadas de madeira, telhado de duas águas), o celeiro e os fardos;
// · `capelaDeBulbo`: a capela de aldeia com a torre de cúpula em cebola;
// · `torreDeCamera` e `carretas`: a torre de TV da beira e a fila de carretas do paddock.
import * as THREE from "three";
import { Montador, solido, vidro, comTextura, letreiro, tom } from "../montagem.js";

const COR_PORTA = ["#e10600", "#ff8700", "#27f4d2", "#3671c6", "#229971", "#37bedd", "#ff87bc", "#6692ff", "#b6babd", "#d7172f"]; // as dez garagens, em cores de equipe

// o telhado de duas águas: um prisma triangular de base w, altura h e comprimento comp (a cumeeira ao longo de z), com a base em y = baseY
let _prisma = null;
const prisma = () => {
  if (!_prisma) { _prisma = new THREE.CylinderGeometry(1, 1, 1, 3, 1); _prisma.rotateX(-Math.PI / 2); }
  return _prisma;
};
function telhado(m, mat, x, baseY, z, w, h, comp, cor, ry = 0) {
  const sy = h / 1.5;
  m.geo(mat, prisma(), { x, y: baseY + 0.5 * sy, z, sx: w / 1.732, sy, sz: comp, ry, cor });
}
// a cúpula em cebola (esfera achatada embaixo, afinando para a ponta), de raio r
function cebola(m, mat, x, y, z, r, cor) {
  m.geo(mat, new THREE.SphereGeometry(1, 12, 8), { x, y: y + r * 0.95, z, sx: r, sy: r * 1.15, sz: r, cor });
  m.geo(mat, new THREE.ConeGeometry(1, 1, 12), { x, y: y + r * 2.7, z, sx: r * 0.55, sy: r * 1.9, sz: r * 0.55, cor });
}

// ---------------------------------------------------------------------------------------------------------------------
// O prédio dos boxes e a torre de controle
// ---------------------------------------------------------------------------------------------------------------------
/**
 * O prédio das garagens: origem no meio da FRENTE, no chão; a frente (as portas) para +z e o prédio para trás (-z); o comprimento ao longo de x.
 * @param {object} o { comprimento=600, fundo=44, torre=0 (x da torre de controle, ou null), faixa (o texto da faixa do beiral) }
 */
export function predioDosBoxes({ comprimento: L = 600, fundo: F = 44, torre = 0, faixa: texto = "SPIELBERG" } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), concreto = "#c4c6c3", aco = "#3a3f47", cinza = "#8d949b", branco = "#f0f1f2", vermelho = "#c8102e";
  // o térreo: concreto e as vinte portas de garagem, com o friso de cor de equipe e o beiral
  m.caixa(S, [0, 13, -F / 2], [L, 26, F], { cor: concreto });
  const ng = Math.max(4, Math.round((L - 20) / 28));
  for (let k = 0; k < ng; k++) {
    const x = -(L - 20) / 2 + (k + 0.5) * ((L - 20) / ng);
    m.caixa(S, [x, 9.5, 0.35], [21, 18, 0.8], { cor: "#454b55" });
    for (let y = 2; y < 18; y += 3.2) m.caixa(S, [x, y, 0.8], [21, 0.5, 0.4], { cor: "#5a616c" }); // as réguas do portão enrolado
    m.caixa(S, [x, 19.6, 0.7], [21, 2, 1], { cor: COR_PORTA[k % COR_PORTA.length] });
  }
  m.caixa(S, [0, 27.2, 3.4], [L + 4, 1.6, 8.6], { cor: branco }); // a marquise sobre as portas
  // o andar de cima: a faixa contínua de vidro com os montantes de aço, a laje do terraço e os brises brancos
  m.caixa(V, [0, 38, -1.2], [L - 8, 19, 2], { cor: "#2f4d63" });
  for (let x = -L / 2 + 4; x <= L / 2 - 3.9; x += 12) m.caixa(S, [x, 38, 0.2], [0.9, 19, 1.3], { cor: aco });
  m.caixa(S, [0, 28.4, 0.2], [L - 8, 1.2, 1.8], { cor: aco });
  m.caixa(S, [0, 48, -F / 2 + 2], [L, 1.6, F - 4], { cor: branco }); // o teto/terraço
  for (let x = -L / 2 + 6; x < L / 2 - 6; x += 5) m.caixa(S, [x, 44.4, 3.6], [0.6, 7, 6], { cor: branco }); // os brises verticais na frente do vidro
  m.caixa(S, [0, 50.4, 1.4], [L, 0.8, 0.6], { cor: cinza }); // o guarda-corpo do terraço
  for (let x = -L / 2; x <= L / 2 + 0.1; x += 7) m.caixa(S, [x, 49.4, 1.4], [0.5, 2.4, 0.5], { cor: cinza });
  m.caixa(S, [-L / 2 + 14, 53, -F * 0.55], [22, 6, 14], { cor: "#cfd3d6" }); m.caixa(S, [L * 0.28, 53, -F * 0.55], [26, 6, 12], { cor: "#cfd3d6" }); // as caixas de ar
  // a faixa vermelha e a faixa com o nome do lugar (de frente para os carros)
  m.caixa(S, [0, 31, 0.9], [L, 1.6, 0.6], { cor: vermelho });
  const placa = comTextura(letreiro(texto, { fundo: "#15161a", cor: "#ffffff", w: 1024, h: 64, traco: false }));
  m.plano(placa, [0, 24, 1.3], [Math.min(L - 40, 320), 3.4]);
  // as pontas: cabeceiras de concreto aparente, sem janela
  for (const s of [-1, 1]) { m.caixa(S, [s * (L / 2 + 1), 26, -F / 2], [2, 52, F], { cor: tom(concreto, 0.85) }); }
  // a torre de controle de prova: núcleo de concreto, a cabine de vidro em volta, laje inclinada, mastro e antenas
  if (torre !== null) {
    const tz = -F / 2 - 2;
    m.caixa(S, [torre, 58, tz], [20, 116, 20], { cor: "#cdcfcc" });
    m.caixa(S, [torre, 118, tz], [34, 3, 34], { cor: "#7f858c" });
    m.caixa(V, [torre, 129, tz], [46, 19, 40], { cor: "#2d4a5f" });
    for (let x = -22; x <= 22.1; x += 11) m.caixa(S, [torre + x, 129, tz + 20.2], [0.9, 19, 0.9], { cor: "#d7dce0" });
    m.caixa(S, [torre, 140, tz], [52, 2.4, 46], { cor: "#e6e8ea", rx: -0.04 });
    m.cilindro(S, [torre + 10, 158, tz], [0.9, 38], { cor: "#d9d9d9", seg: 6 });
    m.caixa(S, [torre, 108, tz + 10.5], [14, 4, 0.8], { cor: vermelho });
    for (const [a, y] of [[0.5, 150], [-0.7, 154]]) m.caixa(S, [torre + 10 + a * 3, y, tz], [7, 0.6, 0.6], { cor: "#d9d9d9" });
  }
  const g = m.montar("redbullring-predio-boxes"); g.userData = { comprimento: L, fundo: F, alto: 116 };
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// A asa
// ---------------------------------------------------------------------------------------------------------------------
/**
 * O prédio em forma de asa: um volume de vidro (o centro de imprensa e de eventos) erguido sobre pilares, coberto por uma lâmina de aço
 * inclinada e arqueada como o aerofólio traseiro de um carro, com as duas placas laterais (as "endplates") e um segundo elemento por cima.
 * Origem no meio da FRENTE, no chão; a frente (a face que olha a reta e a arquibancada) para +z; o comprimento ao longo de x.
 * @param {object} o { comprimento=480, fundo=96, alto=64 (o piso do volume de vidro) }
 */
export function asaDeAco({ comprimento: L = 480, fundo: D = 96, alto: A = 64 } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), aco = "#d9dde0", escuro = "#33383f", vermelho = "#c8102e";
  // a base: a sapata e os pilares que erguem o volume (o prédio fica no alto, olhando a reta de cima)
  m.caixa(S, [0, 2, -D / 2], [L + 8, 4, D + 8], { cor: "#a9aaa6" });
  for (let x = -L / 2 + 14; x <= L / 2 - 13; x += 40) for (const z of [-8, -D + 10]) m.caixa(S, [x, A / 2 + 2, z], [5, A - 2, 5], { cor: "#b9bcbf" });
  m.caixa(S, [0, A, -D / 2], [L, 3, D], { cor: "#8f959b" }); // a laje do piso
  m.caixa(S, [0, 14, -D + 10], [L * 0.62, 24, 14], { cor: "#cfd2d4" }); // o núcleo de escadas e elevadores, no fundo, sob a laje
  // o volume de vidro: duas faixas (o piso das salas e o mezanino) com os montantes
  m.caixa(V, [0, A + 12, -D / 2 + 6], [L - 30, 20, D - 26], { cor: "#2f4f66" });
  for (let x = -(L - 30) / 2; x <= (L - 30) / 2 + 0.1; x += 12) m.caixa(S, [x, A + 12, -D / 2 + 6 + (D - 26) / 2 + 0.3], [0.9, 20, 1.2], { cor: escuro });
  m.caixa(S, [0, A + 23, -D / 2 + 6], [L - 26, 1.4, D - 22], { cor: aco });
  m.caixa(S, [0, A + 5, -D / 2 + 6 + (D - 26) / 2 + 3], [L - 30, 1.2, 6], { cor: "#e8ebed" }); // a varanda corrida
  // a lâmina da asa: arqueada (dois planos inclinados), mais alta atrás, e o segundo elemento por cima, mais curto
  const alt = A + 52;
  m.caixa(S, [0, alt, -D * 0.62], [L, 2.6, D * 0.78], { cor: aco, rx: 0.2 });
  m.caixa(S, [0, alt + 8.5, -D * 0.2], [L, 2.2, D * 0.42], { cor: "#eef0f1", rx: 0.34 });
  m.caixa(S, [0, alt + 15, -D * 0.98], [L * 0.99, 2, 12], { cor: aco, rx: 0.1 }); // o flap de trás
  m.caixa(S, [0, alt - 1.2, -D * 0.5], [L - 12, 1, D * 0.6], { cor: escuro, rx: 0.2 }); // o ventre escuro da lâmina
  for (const x of [-L / 2 + 8, 0, L / 2 - 8]) for (const dz of [0.22, 0.86]) m.caixa(S, [x, (A + alt) / 2 - 4, -D * dz], [3, alt - A + 6, 3], { cor: "#bfc3c6", rx: dz < 0.5 ? 0.0 : 0.1 }); // os mastros que seguram a lâmina
  // as placas laterais, inclinadas para trás, cada uma com a faixa vermelha
  for (const s of [-1, 1]) {
    m.caixa(S, [s * (L / 2 + 1), alt * 0.55 + 4, -D * 0.55], [3, alt * 1.0, D * 0.96], { cor: "#f2f4f5", rx: 0.18 });
    m.caixa(S, [s * (L / 2 + 2.6), alt * 0.55 + 4, -D * 0.55], [0.9, 8, D * 0.7], { cor: vermelho, rx: 0.18 });
  }
  const g = m.montar("redbullring-asa"); g.userData = { comprimento: L, fundo: D, alto: alt + 20 };
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// A casa de fazenda da Estíria, o celeiro e a capela de bulbo
// ---------------------------------------------------------------------------------------------------------------------
/** A casa: térreo branco, andar de cima com ripas de madeira e sacada corrida, telhado de duas águas de telha escura. Origem no meio da frente. */
export function casaDaEstiria({ comprimento: L = 110, fundo: F = 56, andares = 2, madeira = "#6b4a32", teto = "#5b3a2a", parede = "#f2eee4", semente = 3 } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), alt = 22, H = alt * andares;
  m.caixa(S, [0, 1.6, -F / 2], [L + 1.4, 3.2, F + 1.4], { cor: "#8a8478" }); // o embasamento de pedra
  m.caixa(S, [0, alt / 2 + 3, -F / 2], [L, alt, F], { cor: parede });
  if (andares > 1) {
    m.caixa(S, [0, alt * 1.5 + 3, -F / 2], [L - 2, alt, F - 2], { cor: tom(madeira, 1.08) }); // o andar de cima, de ripas de madeira
    for (let x = -L / 2 + 4; x < L / 2 - 2; x += 3.6) m.caixa(S, [x, alt * 1.5 + 3, 0.1], [0.5, alt - 1.5, 0.4], { cor: tom(madeira, 0.82) });
    m.caixa(S, [0, alt + 3, 5], [L - 4, 1.2, 8], { cor: madeira }); // a sacada corrida
    for (let x = -L / 2 + 6; x <= L / 2 - 5.9; x += 5) m.caixa(S, [x, alt + 6.4, 8.6], [0.6, 6, 0.6], { cor: tom(madeira, 0.8) });
    m.caixa(S, [0, alt + 9.5, 8.6], [L - 8, 0.8, 0.8], { cor: tom(madeira, 0.8) });
  }
  // as janelas do térreo, com veneziana verde, e a porta no meio
  for (let x = -L / 2 + 10; x < L / 2 - 4; x += 16) {
    if (Math.abs(x) < 9) { m.caixa(S, [x, 11, 0.6], [10, 16, 1.2], { cor: "#5b4030" }); continue; }
    m.caixa(V, [x, 12, 0.6], [7, 9, 0.8], { cor: "#2c3e4c" }); m.caixa(S, [x - 4.6, 12, 0.7], [1.8, 9.6, 0.9], { cor: "#3a6a42" }); m.caixa(S, [x + 4.6, 12, 0.7], [1.8, 9.6, 0.9], { cor: "#3a6a42" });
  }
  // o telhado de duas águas (cumeeira ao longo da casa), os beirais largos e a chaminé
  telhado(m, S, 0, H + 3, -F / 2, F + 16, F * 0.46, L + 12, teto, Math.PI / 2);
  m.caixa(S, [L * 0.22, H + 3 + F * 0.32, -F * 0.5], [5, 20, 5], { cor: "#7c6a5a" });
  const rr = (k) => ((Math.sin(semente * 91 + k * 17) * 43758.5453) % 1 + 1) % 1;
  if (rr(1) > 0.4) { m.caixa(S, [-L / 2 - 16, 15, -F * 0.55], [30, 30, 36], { cor: tom(madeira, 0.9) }); telhado(m, S, -L / 2 - 16, 30, -F * 0.55, 40, 14, 40, teto, Math.PI / 2); } // o galpão
  const g = m.montar("redbullring-casa"); g.userData = { comprimento: L, fundo: F, alto: H + F * 0.46 };
  return g;
}

/** O sítio: a casa, o celeiro de madeira com o portão, o silo e os fardos redondos no pasto. */
export function sitioDaEstiria({ semente = 5 } = {}) {
  const m = new Montador(), S = solido(), g = new THREE.Group(); g.name = "redbullring-sitio";
  g.add(casaDaEstiria({ comprimento: 84, fundo: 46, andares: 2, semente }));
  m.caixa(S, [-110, 20, -34], [100, 40, 54], { cor: "#7a5a3a" }); // o celeiro: caixa comprida de madeira com telhado de duas águas
  telhado(m, S, -110, 40, -34, 76, 30, 112, "#4d3a30", Math.PI / 2);
  m.caixa(S, [-110, 15, -6.4], [28, 30, 0.8], { cor: "#4a3626" }); // o portão
  m.cilindro(S, [-30, 36, -92], [10, 72], { cor: "#b8bec4", seg: 12 }); m.geo(S, new THREE.ConeGeometry(1, 1, 12), { x: -30, y: 80, z: -92, sx: 11, sy: 14, sz: 11, cor: "#8d949b" }); // o silo
  for (let k = 0; k < 9; k++) m.cilindro(S, [60 + (k % 3) * 18, 5 + Math.floor(k / 6) * 8, 40 + Math.floor((k % 6) / 3) * 18], [7, 12], { cor: "#d9bf64", rx: Math.PI / 2, seg: 10 }); // os fardos redondos
  g.add(m.montar("redbullring-sitio-celeiro")); g.userData = { raio: 190 };
  return g;
}

/** A capela de aldeia: a nave de paredes brancas e telhado de duas águas, a torre quadrada com o relógio e a cúpula em cebola verde-cobre. */
export function capelaDeBulbo({ escala = 1 } = {}) {
  const m = new Montador(), S = solido(), V = vidro();
  m.caixa(S, [0, 12, -22], [30, 24, 44], { cor: "#f2eee4" }); telhado(m, S, 0, 24, -22, 36, 15, 46, "#5b3a2a", Math.PI / 2);
  m.caixa(S, [0, 30, 6], [20, 60, 20], { cor: "#f2eee4" }); // a torre
  m.caixa(S, [0, 44, 16.2], [9, 9, 0.6], { cor: "#f4f1e8" }); m.cilindro(S, [0, 44, 16.6], [3.6, 0.5], { cor: "#26323d", rx: Math.PI / 2, seg: 12 }); // o mostrador do relógio
  m.caixa(S, [0, 61, 6], [22, 3, 22], { cor: "#7b6a5a" });
  m.caixa(V, [0, 54, 16.2], [6, 8, 0.6], { cor: "#26323d" }); // o vão dos sinos
  cebola(m, S, 0, 62, 6, 11, "#3f8a73");
  m.cilindro(S, [0, 100, 6], [0.5, 12], { cor: "#d7ba4a", seg: 6 }); m.caixa(S, [0, 103, 6], [5, 0.8, 0.8], { cor: "#d7ba4a" });
  const g = m.montar("redbullring-capela"); g.scale.setScalar(escala); g.userData = { raio: 50 * escala };
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// O paddock e a torre de câmera
// ---------------------------------------------------------------------------------------------------------------------
/** Uma fila de carretas de equipe (caminhão de 18 m, branco com a faixa colorida) de frente para +z; `cores`: a faixa de cada uma. */
export function carretas({ cores = COR_PORTA, passo = 52 } = {}) {
  const m = new Montador(), S = solido();
  cores.forEach((cor, k) => {
    const x = (k - (cores.length - 1) / 2) * passo;
    m.caixa(S, [x, 17, -34], [34, 30, 66], { cor: "#eceeef" }); m.caixa(S, [x, 17, -1.2], [34.2, 12, 0.8], { cor });
    m.caixa(S, [x, 10, 6], [30, 18, 12], { cor }); m.caixa(S, [x, 15, 12.3], [24, 8, 0.6], { cor: "#26323d" });
    for (const dz of [-20, -46, -58]) for (const s of [-1, 1]) m.cilindro(S, [x + s * 16, 5, dz], [5, 4], { cor: "#1b1b1f", rz: Math.PI / 2, seg: 8 });
  });
  return m.montar("redbullring-carretas");
}

/** A torre de câmera (a TV): mastro de treliça em faixas vermelhas e brancas com a cabine de vidro e as antenas. Altura em unidades. */
export function torreDeCamera({ alto = 150 } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), n = 6;
  for (let k = 0; k < n; k++) m.cilindro(S, [0, ((k + 0.5) * alto * 0.8) / n, 0], [2.2 - k * 0.14, (alto * 0.8) / n], { cor: k % 2 ? "#f4f4f2" : "#c8102e", seg: 8 });
  m.caixa(S, [0, alto * 0.8 + 1, 0], [18, 2, 18], { cor: "#8d949b" }); m.caixa(V, [0, alto * 0.8 + 8, 0], [17, 12, 17], { cor: "#2c4256" }); m.caixa(S, [0, alto * 0.8 + 15, 0], [20, 2, 20], { cor: "#e6e8ea" });
  m.cilindro(S, [0, alto * 0.8 + 28, 0], [0.7, 26], { cor: "#d9d9d9", seg: 6 });
  m.caixa(S, [0, 1.5, 0], [26, 3, 26], { cor: "#9d9fa0" });
  return m.montar("redbullring-torre-camera");
}
