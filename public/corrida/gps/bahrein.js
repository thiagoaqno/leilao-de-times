// Bahrein (Bahrain International Circuit, Sakhir): o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele tem, em
// ../bahrein.js (o prédio dos boxes, a Torre Al Sakhir, os holofotes da corrida noturna, os jardins, as dunas e a refinaria).
// As frações (0 a 1) são da volta, a partir da linha de chegada (conferidas na curvatura do traçado de pistas.js):
// Reta dos boxes 0,90-0,10 · Curva 1 (direita) 0,102-0,111 · Curva 2 (esquerda) 0,120-0,128 · Reta para a 4 0,13-0,245 ·
// Curva 4 (direita) 0,248-0,263 · S das curvas 5 a 7 0,31-0,35 · Grampo da Curva 8 (direita) 0,382-0,395 ·
// Curvas 9 e 10 (esquerda) 0,453-0,479 · Reta de trás 0,48-0,60 · Curva 11 (esquerda) 0,603-0,627 · Curvas 12 e 13 0,66-0,69 ·
// Grampo da Curva 14 (direita) 0,723-0,737 · Reta para a 15 0,74-0,875 · Curva 15 (direita) 0,876-0,90.
import { cenarioBahrein, depoisBahrein } from "../bahrein.js";

const BOXES = window.Pistas.PISTAS.bahrein.boxes; // o corredor dos boxes (pistas.js): as linhas SC 1 e SC 2 são a entrada e a saída dele
const VERMELHO = "#ce1126", BRANCO = "#f4f4f4";

export const GP_BAHREIN = {
  asfalto: true,
  chao: {
    margem: { cor: "#8f8672" }, // o asfalto cinza-areia da faixa de escape junto da zebra
    zebra: { cores: ["#d62828", BRANCO], dentro: 380, fora: 240 }, // as zebras vermelhas e brancas
    amarelas: [[0.248, 0.264], [0.383, 0.396], [0.467, 0.48], [0.727, 0.738]], // zebra alta nas curvas 4, 8, 10 e 14
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true, remendos: 26,
  },
  // o escape de Sakhir: asfalto pintado de azul e areia (como nas fotos) do lado de fora das curvas lentas, brita cor de areia nas curvas
  // rápidas do miolo e nas 11 a 13, e muro de pneus por fora (cada trecho só tem uma coisa, para não se sobreporem)
  escape: {
    cores: ["#2b5fa8", "#e3d3a3"], corBrita: "#d8c49a", largura: 28,
    listrado: [[0.093, 0.135, "fora"], [0.243, 0.268, "fora"], [0.378, 0.4, "fora"], [0.462, 0.484, "fora"], [0.72, 0.742, "fora"], [0.872, 0.902, "fora"]],
    brita: [[0.31, 0.352, "fora"], [0.6, 0.63, "fora"], [0.658, 0.696, "fora"]],
    pneus: [[0.093, 0.135, "fora"], [0.243, 0.268, "fora"], [0.31, 0.352, "fora"], [0.378, 0.4, "fora"], [0.462, 0.484, "fora"], [0.6, 0.63, "fora"], [0.72, 0.742, "fora"], [0.872, 0.902, "fora"]],
  },
  // as arquibancadas: a principal, de frente para os boxes (do outro lado da pista), e uma por fora de cada curva lenta
  arquibancadas: {
    trechos: [
      { de: 0.935, ate: 1.055, lado: -1, degraus: 14, cor: VERMELHO, encosto: BRANCO, cobertura: true, torcida: ["#ffffff", VERMELHO, "#ffffff", "#222222"] }, // Main Grandstand
      { de: 0.085, ate: 0.13, lado: -1, degraus: 12, cor: VERMELHO, encosto: BRANCO, cobertura: true }, // Curva 1
      { de: 0.238, ate: 0.272, lado: -1, degraus: 9, cor: "#e8e2d2", encosto: VERMELHO, cobertura: true }, // Curva 4
      { de: 0.37, ate: 0.412, lado: -1, degraus: 10, cor: VERMELHO, encosto: BRANCO, cobertura: true }, // Grampo da 8
      { de: 0.46, ate: 0.492, lado: 1, degraus: 8, cor: "#e8e2d2", encosto: VERMELHO, cobertura: false }, // Curva 10
      { de: 0.715, ate: 0.75, lado: -1, degraus: 9, cor: VERMELHO, encosto: BRANCO, cobertura: true }, // Curva 14
      { de: 0.868, ate: 0.906, lado: -1, degraus: 10, cor: "#e8e2d2", encosto: VERMELHO, cobertura: true }, // Curva 15
    ],
  },
  cenario: (tr, ctx) => cenarioBahrein(tr, ctx), // o prédio dos boxes, a Torre Al Sakhir, os holofotes, os jardins, as dunas e a refinaria
  ambiente: {
    marcas: ["gulfair", "bahrain", "aramco", "rolex", "pirelli", "dhl", "heineken", "aws", "lenovo", "msc", "qatar"],
    outdoors: ["gulfair", "bahrain", "aramco", "rolex", "pirelli", "dhl", "qatar", "aws"],
    posto: "gulfair", bandeira: [0xce1126, 0xffffff], placas: [150, 100, 50], // a bandeira do Bahrein
  },
  passarelas: { candidatos: [0.9, 0.215, 0.55, 0.83], marcas: ["gulfair", "bahrain", "aramco"], max: 2 },
  montanha: { angulo: Math.PI / 3, afastamento: 4600, altura: 340, largura: 5200, rocha: "#ba9d73", mato: "#cbb48b", longe: "#e5cfb1" }, // o Jebel Dukhan, ao sul
  horizonte: false, // sem os morros verdes de longe: deserto
  beira: { palmeiras: 0.04, longe: { palmeiras: 0.015 } },
  depois: (tr, ctx) => depoisBahrein(tr, ctx), // a faixa Gulf Air no pórtico
  vida: {
    som: { campo: () => 0.8, cidade: 0.1 }, // vento do deserto, a cidade lá longe
  },
};
