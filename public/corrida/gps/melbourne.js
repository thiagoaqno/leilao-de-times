// Melbourne (Albert Park Circuit): configuração do GP no kit. O lago Albert Park, a ilha Gunn Island, o clube de
// remo/vela e o skyline com a Eureka Tower e a cidade de Melbourne ficam em ../melbourne.js. As frações (0 a 1)
// são da volta, a partir da chegada: reta principal e boxes 0,98-0,05 · curvas 1 e 2 (Jones/Brabham) 0,05-0,09 ·
// curvas 3 e 4 0,13-0,17 · curva 6 0,26-0,31 · reta do lago (Lakeside Drive) 0,33-0,48 · curvas 9 e 10 0,49-0,54 ·
// chicane 11 e 12 (Waite) 0,66-0,71 · curva 13 e 14 0,76-0,82 · chicanes finais 15 e 16 (Prost/Senna) 0,87-0,94.
import { cenarioMelbourne, depoisMelbourne } from "../melbourne.js";

const TORCIDA = ["#ff8700", "#e8002d", "#ffffff", "#1b1b1b", "#ffd23f", "#2f6fd0"]; // a torcida laranja e vermelha da foto
const BOXES = window.Pistas.PISTAS.melbourne.boxes;

export const GP_MELBOURNE = {
  asfalto: true,
  chao: {
    margem: { cor: "#686a6e" }, // o asfalto cinza da margem do parque
    zebra: { cores: ["#007a3d", "#f4c300"], dentro: 380, fora: 240 }, // o verde e amarelo australiano tradicional
    amarelas: [[0.06, 0.082], [0.135, 0.16], [0.495, 0.535], [0.665, 0.695], [0.875, 0.91]], // zebras altas anticorte
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true,
    remendos: 28,
  },
  escape: {
    brita: [
      [0.055, 0.09, "fora"], // curva 1 e 2
      [0.13, 0.17, "fora"],  // curva 3
      [0.26, 0.31, "fora"],  // curva 6
      [0.66, 0.72, "fora"],  // chicane 11 e 12
      [0.76, 0.82, "fora"],  // curva 13
      [0.87, 0.92, "fora"],  // chicanes finais
    ],
    corBrita: "#d8caa2",
    listrado: [
      [0.085, 0.11, "fora"],
      [0.53, 0.56, "fora"],
      [0.69, 0.73, "fora"],
    ],
    cores: ["#007a3d", "#f4f4f4"],
    pneus: [
      [0.055, 0.09, "fora"],
      [0.13, 0.17, "fora"],
      [0.26, 0.31, "fora"],
      [0.66, 0.72, "fora"],
      [0.76, 0.82, "fora"],
      [0.87, 0.92, "fora"],
    ],
  },
  arquibancadas: {
    trechos: [
      // (a arquibancada longa da reta principal, a Fangio, é do kit 2: melbourne.js)
      // Jones / Brabham: freada da curva 1 e 2 (coberta, verde e amarela da Austrália)
      { de: 0.048, ate: 0.082, lado: -1, degraus: 7, cor: "#244a3a", encosto: "#e8eaee", cobertura: true, torcida: TORCIDA },
      // Moss: saída da curva 2
      { de: 0.085, ate: 0.11, lado: 1, degraus: 6, cor: "#5a2a2f", encosto: "#e8eaee", cobertura: false, torcida: TORCIDA },
      // Clark: freada da curva 9 e 10
      { de: 0.495, ate: 0.535, lado: -1, degraus: 6, cor: "#2d3a52", encosto: "#e8eaee", cobertura: false, torcida: TORCIDA },
      // Waite: chicane rápida 11 e 12 (coberta)
      { de: 0.665, ate: 0.705, lado: 1, degraus: 7, cor: "#244a3a", encosto: "#e8eaee", cobertura: true, torcida: TORCIDA },
      // Hill: curvas 13 e 14
      { de: 0.76, ate: 0.81, lado: -1, degraus: 6, cor: "#244a3a", encosto: "#e8eaee", cobertura: false, torcida: TORCIDA },
      // Prost / Senna: entrada da reta dos boxes (coberta)
      { de: 0.88, ate: 0.935, lado: -1, degraus: 7, cor: "#2d3a52", encosto: "#e8eaee", cobertura: true, torcida: TORCIDA },
    ],
  },
  cenario: (tr, ctx) => cenarioMelbourne(tr, ctx),
  ambiente: {
    marcas: ["rolex", "ausgp", "heineken", "pirelli", "aramco", "dhl", "f1", "aws", "lenovo"],
    outdoors: ["rolex", "ausgp", "heineken", "pirelli", "f1", "aramco", "dhl"],
    posto: "ausgp",
    bandeira: [0x012169, 0xe4002b], // azul marinho e vermelho (Austrália)
    placas: [150, 100, 50],
    cerca: false, // o alambrado alto e a mureta de publicidade são de kit/melbourne/cerca.js
  },
  passarelas: {
    candidatos: [0.025, 0.24, 0.58, 0.82, 0.96],
    marcas: ["rolex", "heineken", "pirelli"],
    max: 3,
  },
  parque: {
    de: 0,
    ate: 1,
    recuo: 150, // longe da pista: as árvores não fecham a vista do lago, do skyline nem das arquibancadas
    fundo: 160,
    alturas: [90, 150],
    densidade: 0.12,
    folhas: ["#2d6330", "#3a7536", "#48853b", "#366e2c", "#5a8c3d"],
    coniferas: 0.04,
  },
  vida: {
    helicoptero: true,
    fiscais: true,
    gaivotas: (tr) => {
      const l = tr.lagoMelbourne; if (!l) return [];
      return Array.from({ length: 16 }, (_, k) => ({ x: l.x + Math.cos(k * 0.9) * l.raio * 0.5, z: l.y + Math.sin(k * 0.9) * l.raio * 0.5, raio: 140 }));
    },
    som: {
      porto: (tr, x, y) => { const l = tr.lagoMelbourne; return l ? Math.max(0, Math.min(1, 1 - Math.hypot(x - l.x, y - l.y) / (l.raio + 300))) : 0; },
      cidade: 0.35,
      campo: () => 0.65,
    },
  },
  horizonte: false, // o skyline de Melbourne é modelado em 3D ao norte
  depois: (tr, ctx) => depoisMelbourne(tr, ctx),
};
