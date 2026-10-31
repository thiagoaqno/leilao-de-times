// Suzuka (Suzuka International Racing Course, Mie, Japão): configuração do GP no kit. O que só o circuito tem (o viaduto do
// cruzamento em "8", o prédio dos boxes com a torre, a arquibancada principal, a alameda de entrada com os torii, o parque com
// a roda-gigante, os morros de floresta e as cerejeiras) fica em ../suzuka.js e em ../kit/suzuka/. O traçado veio de
// bacinger/f1-circuits (jp-1962, licença MIT) por ferramentas/circuitos-f1.js. As frações (0 a 1) são da volta, a partir da chegada:
// reta dos boxes 0,955-0,07 · curvas 1 e 2 0,07-0,118 · os S (curvas 3 a 7) 0,139-0,244 · Dunlop 0,253-0,277 · Degner 1 e 2
// 0,35-0,39 (a pista passa por baixo do viaduto em 0,401) · Hairpin 0,448-0,478 · curva 12 (200R) 0,49-0,52 · Spoon 0,606-0,661 ·
// reta de trás 0,66-0,80 (passa por cima do viaduto em 0,808) · 130R 0,807-0,834 · chicane Casio 0,878-0,902 · última curva 0,905-0,946.
import { cenarioSuzuka, depoisSuzuka } from "../suzuka.js";
import { parque } from "../kit/parque.js";

const BOXES = window.Pistas.PISTAS.suzuka.boxes;
const VERMELHO = "#c8102e", BRANCO = "#f4f4f2", AZUL = "#2b4fa8", AMARELO = "#f2c400", VERDE = "#13804a";
const TORCIDA = ["#ffffff", "#bc002d", "#1e41ff", "#ffd100", "#e8002d", "#ff8700", "#27f4d2", "#ffffff"]; // a torcida japonesa: Honda/Red Bull, Ferrari, McLaren, Mercedes

export const GP_SUZUKA = {
  asfalto: true,
  chao: {
    margem: { cor: "#6a6c70" }, // o asfalto cinza da faixa junto da zebra
    zebra: { cores: [VERMELHO, BRANCO], dentro: 380, fora: 260 }, // as zebras vermelhas e brancas de Suzuka
    amarelas: [[0.349, 0.363], [0.372, 0.393], [0.447, 0.48], [0.605, 0.662], [0.805, 0.835], [0.876, 0.904]], // zebra alta nas Degner, Hairpin, Spoon, 130R e Casio
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true, remendos: 30,
  },
  // o escape: brita bege do lado de fora das curvas lentas (T1, Degner, Hairpin, Spoon, 130R) e muros de pneus por fora
  escape: {
    corBrita: "#d3c49b", largura: 30,
    brita: [[0.072, 0.12, "fora"], [0.355, 0.395, "fora"], [0.448, 0.48, "fora"], [0.606, 0.662, "fora"], [0.807, 0.836, "fora"], [0.905, 0.946, "fora"]],
    pneus: [[0.075, 0.115, "fora"], [0.448, 0.48, "fora"], [0.612, 0.66, "fora"], [0.81, 0.834, "fora"]],
  },
  // as arquibancadas de curva (a principal, na reta dos boxes, é do ../suzuka.js, em módulos do kit 2)
  arquibancadas: {
    trechos: [
      { de: 0.076, ate: 0.118, lado: -1, degraus: 12, cor: VERMELHO, encosto: BRANCO, cobertura: true, torcida: TORCIDA }, // curvas 1 e 2
      { de: 0.139, ate: 0.158, lado: 1, degraus: 8, cor: AZUL, encosto: BRANCO, cobertura: true, torcida: TORCIDA }, // os S
      { de: 0.163, ate: 0.18, lado: -1, degraus: 8, cor: AMARELO, encosto: VERMELHO, cobertura: false, torcida: TORCIDA },
      { de: 0.189, ate: 0.208, lado: 1, degraus: 9, cor: VERDE, encosto: BRANCO, cobertura: true, torcida: TORCIDA },
      { de: 0.255, ate: 0.278, lado: 1, degraus: 10, cor: VERMELHO, encosto: BRANCO, cobertura: true, torcida: TORCIDA }, // Dunlop
      { de: 0.353, ate: 0.392, lado: -1, degraus: 9, cor: AZUL, encosto: BRANCO, cobertura: true, torcida: TORCIDA }, // Degner
      { de: 0.447, ate: 0.48, lado: 1, degraus: 11, cor: AMARELO, encosto: AZUL, cobertura: true, torcida: TORCIDA }, // Hairpin
      { de: 0.608, ate: 0.636, lado: 1, degraus: 10, cor: VERMELHO, encosto: BRANCO, cobertura: true, torcida: TORCIDA }, // Spoon
      { de: 0.64, ate: 0.662, lado: 1, degraus: 9, cor: AZUL, encosto: BRANCO, cobertura: false, torcida: TORCIDA },
      { de: 0.806, ate: 0.835, lado: 1, degraus: 10, cor: VERDE, encosto: BRANCO, cobertura: true, torcida: TORCIDA }, // 130R
      { de: 0.88, ate: 0.903, lado: 1, degraus: 9, cor: AMARELO, encosto: VERMELHO, cobertura: true, torcida: TORCIDA }, // chicane Casio
      { de: 0.908, ate: 0.945, lado: -1, degraus: 10, cor: VERMELHO, encosto: BRANCO, cobertura: true, torcida: TORCIDA }, // a última curva
    ],
  },
  cenario: (tr, ctx) => { tr.camisasGP = TORCIDA; cenarioSuzuka(tr, ctx); }, // o viaduto, os boxes, a arquibancada principal, a alameda, o parque e os morros
  ambiente: {
    marcas: ["suzuka", "honda", "pirelli", "rolex", "aramco", "dhl", "heineken", "japangp", "f1", "aws", "lenovo", "yokohama", "dunlop", "msc"],
    outdoors: ["suzuka", "honda", "japangp", "pirelli", "rolex", "aramco", "dhl", "yokohama", "casio", "ganbare"],
    posto: "suzuka", bandeira: [0xffffff, 0xbc002d], placas: [150, 100, 50], // a bandeira do Japão
  },
  passarelas: { candidatos: [0.04, 0.545, 0.33, 0.7, 0.92], marcas: ["suzuka", "honda", "pirelli"], max: 3 },
  montanha: { angulo: Math.PI, afastamento: 1700, altura: 640, rocha: "#6f7a66", mato: "#3f5a36", longe: "#9fb0bf" }, // os montes Suzuka, a oeste
  beira: {}, // sem as árvores pálidas de sempre: a floresta é de ../kit/suzuka/colinas.js e do bosque do kit (parque, em `depois`)
  depois: (tr, ctx) => {
    depoisSuzuka(tr, ctx);
    // o bosque que fecha a pista dos dois lados: cedros e folhosas, depois da área de escape (kit/parque.js)
    parque(tr, ctx.add, { de: 0.085, ate: 0.94, recuo: 36, fundo: 150, alturas: [90, 175], densidade: 0.75, coniferas: 0.55, semente: 3109,
      folhas: ["#3f7a33", "#4d8a3a", "#2f6a2d", "#5c9a40", "#6aa043"] });
  },
  vida: {
    helicoptero: true, fiscais: true,
    som: { campo: () => 0.85, cidade: 0.12 }, // vento nos cedros e as cigarras; o parque e a cidade ao longe
  },
};
