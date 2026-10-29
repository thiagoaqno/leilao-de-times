// Montreal (Circuit Gilles-Villeneuve, GP do Canadá, na ilha Notre-Dame): o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele
// tem, em ../montreal.js e ../kit/montreal/ (a ilha e a água, o prédio dos boxes de 2019, a arquibancada principal, os muros de concreto, o Muro
// dos Campeões, o skyline, a ponte Jacques-Cartier, o Biosfera, os bordos e os choupos). O traçado veio de bacinger/f1-circuits (ca-1978, licença
// MIT) por ferramentas/circuitos-f1.js. As frações (0 a 1) são da volta, a partir da chegada:
// reta dos boxes 0,955-0,10 · T1 e T2 0,10-0,14 · T3 e T4 0,207-0,232 · T6 e T7 0,327-0,364 · T8 e T9 0,50-0,53 · grampo 0,653-0,678 ·
// reta do Cassino 0,68-0,93 · chicane final 0,936-0,955 · Muro dos Campeões 0,95-0,975.
import { cenarioMontreal, depoisMontreal, CAMISAS_MONTREAL } from "../montreal.js";

const BOXES = window.Pistas.PISTAS.montreal.boxes;
const VERMELHO = "#d52b1e", BRANCO = "#f4f4f2", AZUL = "#1b4f9c";
const tribuna = (de, ate, lado, degraus, o = {}) => ({ de, ate, lado, degraus, cor: VERMELHO, encosto: BRANCO, cobertura: false, torcida: CAMISAS_MONTREAL, ...o });

export const GP_MONTREAL = {
  asfalto: true,
  chao: {
    margem: { cor: "#6a6c70" }, // o asfalto cinza junto da zebra
    zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 340, fora: 220 }, // as zebras vermelhas e brancas
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true, remendos: 30,
  },
  // o escape: pouco, e perto do muro. Asfalto pintado de vermelho e branco nas duas chicanes e brita por fora do grampo e da T2
  escape: {
    largura: 20, cores: [VERMELHO, BRANCO],
    listrado: [[0.1, 0.14, 0], [0.936, 0.955, 0], [0.5, 0.53, 0]],
    brita: [[0.655, 0.677, "fora"], [0.118, 0.14, "fora"]],
    pneus: [[0.656, 0.676, "fora"]],
  },
  // as arquibancadas de curva (fitas do kit); a principal, na reta dos boxes, é de ../montreal.js
  arquibancadas: { trechos: [
    tribuna(0.654, 0.678, -1, 14, { cobertura: true }), tribuna(0.658, 0.674, 1, 6), // o grampo: a de fora, enorme, e a de dentro
    tribuna(0.118, 0.14, -1, 10, { cor: AZUL }), tribuna(0.1, 0.112, 1, 7), // a Senna
    tribuna(0.72, 0.77, -1, 9, { cor: AZUL, cobertura: true }), tribuna(0.82, 0.9, -1, 9), // a reta do Cassino, do lado da bacia
    tribuna(0.208, 0.232, -1, 7), tribuna(0.328, 0.364, -1, 8, { cor: AZUL }), tribuna(0.502, 0.53, -1, 8), // T3 e T4, T6 e T7, T8 e T9
    tribuna(0.936, 0.952, 1, 7, { cobertura: true }), // a chicane final, junto ao corredor
  ] },
  cenario: (tr, ctx) => cenarioMontreal(tr, ctx), // a ilha, a água, os boxes, a arquibancada principal, os muros, o Muro dos Campeões e as placas
  ambiente: {
    marcas: ["gpcanada", "gilles", "quebec", "canada", "montreal", "jeandrapeau", "notredame", "bienvenue"],
    outdoors: ["gpcanada", "gilles", "quebec", "canada", "montreal", "jeandrapeau"],
    posto: "gilles", bandeira: [0xd52b1e, 0xffffff], placas: [150, 100, 50], cerca: false, // a bandeira do Canadá; o alambrado é o dos muros
  },
  passarelas: { candidatos: [0.76, 0.58, 0.3, 0.2], marcas: ["quebec", "canada", "montreal"], max: 3 },
  montanha: { angulo: -2.5, afastamento: 1500, altura: 330, rocha: "#7a8a76", mato: "#3f6a36", longe: "#a5b6c4" }, // o Mont Royal, a oeste-noroeste, atrás do skyline
  vida: {
    helicoptero: true, fiscais: true,
    gaivotas: (tr) => [{ x: tr.pts[Math.floor(0.82 * tr.n)].x + 700, z: tr.pts[Math.floor(0.82 * tr.n)].y, raio: 380 }, { x: 2400, z: 3600, raio: 500 }, { x: 4300, z: 6900, raio: 400 }], // sobre a bacia e o rio
    som: { campo: () => 0.8, cidade: 0.18 }, // vento nos choupos; a cidade ao longe
  },
  beira: {}, // sem as árvores pálidas de sempre: os bordos e os choupos são de ../kit/montreal/parque.js, em `depois`
  horizonte: false, // a terra, a água e o skyline são modelados
  depois: (tr, ctx) => depoisMontreal(tr, ctx),
};
