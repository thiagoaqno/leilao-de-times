// Xangai (Shanghai International Circuit, GP da China, em Jiading): o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele tem, em
// ../xangai.js e ../kit/xangai/ (o prédio dos boxes comprido e baixo com a torre de controle no meio e as torres de vidro nas pontas; as asas em forma
// de folha que cruzam a reta dos boxes até a tribuna principal; o paddock de pavilhões de folha de lótus sobre o lago, com os passadiços; o caracol
// das curvas 1 e 2 com a arquibancada enorme e o telão; o grampo da curva 14 no fim da reta de trás; os lagos e os canais; o parque de vegetação
// baixa e o skyline de Xangai no horizonte, na névoa). O traçado veio de bacinger/f1-circuits (cn-2004, licença MIT) por ferramentas/circuitos-f1.js
// e não mudou. As frações (0 a 1) são da volta, a partir da linha de chegada, que fica no meio da reta dos boxes:
// reta dos boxes 0,88-0,02 · curva 1 (o caracol à direita, 270°) 0,02-0,085 · curva 2 (esquerda) 0,10-0,125 · curvas 3 a 6 0,125-0,235 ·
// esses 7-8-9 0,235-0,40 · curvas 10-13 0,48-0,59 · reta de trás (1,2 km) 0,60-0,79 · curva 14 (o grampo à direita) 0,79-0,835 · curvas 15-16 0,84-0,89.
// O céu é o nublado e enevoado de Xangai (cena.js e ceu.js). Sem marcas registradas novas: os painéis são nomes de lugar e de comida de Xangai
// (kit/xangai/marcas.js) e as marcas que já existem em kit/marcas.js.
import { cenarioXangai, depoisXangai, CAMISAS_CN } from "../xangai.js";
import { alturaDoTerreno, corDoChao } from "../kit/xangai/agua.js";

const BOXES = window.Pistas.PISTAS.xangai.boxes;
const arq = (de, ate, lado, degraus, cor, encosto, cobertura = false) => ({ de, ate, lado, degraus, cor, encosto, cobertura, torcida: CAMISAS_CN });

export const GP_XANGAI = {
  asfalto: true,
  chao: {
    margem: { cor: "#6d6e72" }, // o asfalto cinza da faixa junto da zebra
    zebra: { cores: ["#c8102e", "#f4f4f2"], dentro: 340, fora: 220 }, // as zebras vermelhas e brancas nas curvas
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true, remendos: 26,
  },
  // o escape: brita clara por fora das curvas mais fechadas (o caracol, os grampos)
  escape: { britaCurvas: 420, corBrita: "#ddd3b6", largura: 26 },
  // as arquibancadas grandes à mão: o caracol das curvas 1 e 2, por fora do giro (a maior do circuito), e o grampo da curva 14; as outras curvas fechadas e a
  // tribuna principal são de ../xangai.js
  arquibancadas: { trechos: [
    arq(0.052, 0.104, -1, 16, "#c8102e", "#f4f4f2", true), // o caracol
    arq(0.797, 0.836, -1, 13, "#1d3b5c", "#f4f4f2", true), // o grampo da curva 14
  ] },
  cenario: (tr, ctx) => cenarioXangai(tr, ctx), // a reta dos boxes com as asas, o paddock de lótus sobre o lago, os telões e as curvas
  ambiente: {
    marcas: ["xgcircuito", "xggp", "pirelli", "xgjiading", "rolex", "xgpudong", "aramco", "xgxlb", "xgwaitan", "dhl", "xghuangpu", "xgsjb", "heineken", "xgyuyuan", "xglotus", "aws", "xgjiaozi", "xghsr", "f1", "xgcha", "lenovo", "xgchina"],
    outdoors: ["xgcircuito", "xggp", "xgpudong", "xgwaitan", "xgyuyuan", "xglotus", "xgxlb", "xgsjb", "xghsr", "xgchina"],
    posto: "xgcircuito",
    bandeira: [0xde2910, 0xffde00], // a bandeira da China: o vermelho e o amarelo das estrelas
    placas: [200, 150, 100, 50], // antes da curva 14 o grampo pede as placas de 200, 150, 100 e 50 m
  },
  passarelas: { candidatos: [0.93, 0.66, 0.72, 0.55], marcas: ["xgcircuito", "xggp", "xgpudong"], max: 2 },
  beira: {}, // sem as árvores e prédios genéricos: a vegetação baixa e o skyline são de ../kit/xangai/, em `depois`
  horizonte: false, // o horizonte é o skyline de Xangai
  terreno: { altura: alturaDoTerreno, cor: corDoChao }, // os lagos e canais afundam o chão (com a margem em rampa) e o gramado ganha manchas de verde
  depois: (tr, ctx) => depoisXangai(tr, ctx),
  vida: {
    gaivotas: [], // (pássaros de lago: as garças ficam por conta de vida.js)
    som: { campo: () => 0.55, cidade: 0.2 },
  },
};
