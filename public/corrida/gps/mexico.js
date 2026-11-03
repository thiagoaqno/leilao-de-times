// Cidade do México (Autódromo Hermanos Rodríguez, GP da Cidade do México, no parque Magdalena Mixhuca, a 2 240 m de altitude): o que o GP usa do kit
// (kit/README.md explica cada peça) e o que só ele tem, em ../mexico.js e ../kit/mexico/ (o Foro Sol, o estádio de beisebol que a pista atravessa, com a
// arquibancada em ferradura e o pódio no meio do campo; a reta dos boxes com o prédio das garagens e a tribuna principal; o Palácio dos Esportes de cúpula
// de cobre; o parque com lagos, quadras e árvores; a Peraltada antiga; e a cidade e os vulcões Popocatépetl e Iztaccíhuatl no horizonte).
// O traçado veio de bacinger/f1-circuits (mx-1962, licença MIT) por ferramentas/circuitos-f1.js e não mudou; as frações (0 a 1) são da volta, a partir da
// linha de chegada, que fica no meio da reta dos boxes:
// a reta dos boxes e a de chegada 0,93-0,25 · as curvas 1 a 3 (o "S" da freada forte) 0,25-0,34 · as curvas do meio 0,34-0,52 · a reta de trás 0,52-0,80 ·
// o fim da reta e o grampo 0,80-0,86 · o Foro Sol (curvas 12 a 16) 0,86-0,98. Painéis só com nomes de lugar e de comida do México (kit/mexico/marcas.js).
import { cenarioMexico, depoisMexico } from "../mexico.js";
import { CAMISAS_MX } from "../kit/mexico/foro.js";

const BOXES = window.Pistas.PISTAS.mexico.boxes;
const VERDE = "#0b7a4a", BRANCO = "#f4f4f0", VERMELHO = "#c8202c", ESCURO = "#2b2f36";
const arq = (de, ate, lado, degraus, cor, encosto = BRANCO, cobertura = false) => ({ de, ate, lado, degraus, cor, encosto, cobertura, torcida: CAMISAS_MX });
const MARCAS = ["mxmexico", "mxgp", "pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc", "mxtacos", "mxzocalo", "mxchapultepec", "mxmole", "mxelote", "mxchurros", "mxtamales"];

export const GP_MEXICO = {
  asfalto: true,
  chao: {
    margem: { cor: "#6d6e72" }, zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 340, fora: 220 },
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]], grid: true, remendos: 26,
  },
  escape: { britaCurvas: 420, corBrita: "#cfc4a6", largura: 26 },
  arquibancadas: { trechos: [
    arq(0.93, 1.0, -1, 10, VERDE, BRANCO, true), arq(0.002, 0.11, -1, 10, VERDE, BRANCO, true), arq(0.11, 0.2, -1, 7, VERMELHO), // a reta principal, do lado norte
    arq(0.25, 0.285, -1, 9, VERMELHO, BRANCO, true), arq(0.285, 0.33, 1, 8, VERDE), arq(0.3, 0.34, -1, 7, ESCURO), // curvas 1 a 3
    arq(0.435, 0.5, 1, 7, VERMELHO), arq(0.455, 0.5, -1, 7, VERDE), // as curvas do meio
    arq(0.8, 0.86, -1, 8, VERDE, BRANCO, true), // a freada da curva 12
    arq(0.875, 0.915, -1, 9, VERMELHO, BRANCO, true), arq(0.915, 0.945, -1, 9, VERDE, BRANCO, true), // o Foro Sol por fora
  ] },
  cenario: (tr, ctx) => cenarioMexico(tr, ctx, MARCAS),
  ambiente: {
    marcas: MARCAS, outdoors: ["mxmexico", "mxgp", "mxpopo", "mxizta", "mxmixhuca", "mxcoyoacan", "mxxochimilco", "mxreforma", "mxlucha", "mxmariachi", "mxjamaica", "mxquesadilla", "mxpozole"],
    posto: "mxmexico", bandeira: [0x006847, 0xf4f4f0, 0xce1126], placas: [150, 100, 50],
  },
  passarelas: { candidatos: [0.965, 0.5, 0.27, 0.73], marcas: ["mxgp", "mxmexico", "mxforo"], max: 2 },
  beira: { arvores: 0.02, longe: { arvores: 0.02, predios: 0 } }, // as árvores são de ../kit/mexico/parque.js, em `depois`; a cidade e os vulcões também
  horizonte: false,
  depois: (tr, ctx) => depoisMexico(tr, ctx),
  vida: { gaivotas: [], som: { campo: () => 0.7, cidade: 0.35 } },
};
