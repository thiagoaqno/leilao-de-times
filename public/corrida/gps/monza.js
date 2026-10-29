// Monza (Autodromo Nazionale Monza, GP da Itália, dentro do Parco di Monza): o que o GP usa do kit (kit/README.md explica cada peça) e o
// que só ele tem, em ../monza.js e ../kit/monza/ (o prédio dos boxes com o Paddock Club, o pódio suspenso sobre a reta, a Tribuna
// Centrale, as torres de cronometragem, a Sopraelevata, a Parabolica com o escape de asfalto, o bosque do parque, as folhas, o gramado e as
// bandeiras dos tifosi). As frações (0 a 1) são da volta, a partir da chegada:
// reta dos boxes 0,92-0,11 · Variante del Rettifilo 0,115-0,135 · Curva Grande e Biassono 0,145-0,27 · Variante della Roggia 0,33-0,35 ·
// Lesmo 1 e 2 0,39-0,47 · Serraglio 0,50-0,57 (o anel da Sopraelevata passa por cima, em 0,53) · Variante Ascari 0,64-0,69 · reta de trás
// 0,69-0,845 · Parabolica (Curva Alboreto) 0,845-0,92. O sol é o de fim de tarde de setembro (cena.js).
import { cenarioMonza, depoisMonza, TIFOSI } from "../monza.js";

const VERMELHO = "#c8102e", BRANCO = "#f4f4f2";
const tribuna = (de, ate, lado, degraus, o = {}) => ({ de, ate, lado, degraus, cor: VERMELHO, encosto: BRANCO, torcida: TIFOSI, ...o });

export const GP_MONZA = {
  asfalto: true,
  chao: {
    margem: { cor: "#7a7b80" }, // o asfalto cinza da faixa de escape junto da zebra
    zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 340, fora: 200 }, // as zebras vermelhas e brancas
    amarelas: [[0.113, 0.136], [0.326, 0.35], [0.636, 0.692]], // as zebras altas das chicanes (Rettifilo, Roggia e Ascari)
    sc: [[0.9, "SC 1"], [0.2, "SC 2"]],
    grid: true, remendos: 30,
  },
  // o escape: asfalto pintado de vermelho e branco nas chicanes; brita na saída da Biassono e nas duas Lesmo (a Parabolica tem asfalto desde
  // 2014: o escape dela é de ../monza.js); pilhas de pneus nas Lesmo, nas chicanes e na Parabolica
  escape: {
    listrado: [[0.113, 0.136, 0], [0.326, 0.35, 0], [0.636, 0.692, 0]],
    brita: [[0.235, 0.27, "fora"], [0.39, 0.425, "fora"], [0.45, 0.472, "fora"]],
    pneus: [[0.39, 0.425, "fora"], [0.45, 0.472, "fora"], [0.636, 0.692, "fora"]],
    cores: [VERMELHO, "#f1f1ee"],
  },
  // as arquibancadas de curva (fitas do kit); a Tribuna Centrale, a da Parabolica e o pódio são de ../monza.js (kit 2)
  arquibancadas: { trechos: [
    tribuna(0.918, 0.955, -1, 7), // a reta de chegada, antes da Tribuna Centrale
    tribuna(0.0405, 0.108, -1, 8, { cobertura: true }), // a reta depois da Tribuna Centrale, até a Variante del Rettifilo
    tribuna(0.088, 0.112, 1, 6, { cor: "#d4001a", encosto: "#ffd23f" }), // por dentro da Variante del Rettifilo
    tribuna(0.124, 0.152, -1, 6, { cor: "#d4001a", encosto: "#ffd23f" }), // por fora da Variante del Rettifilo
    tribuna(0.17, 0.215, -1, 7), // por fora da Curva Grande
    tribuna(0.322, 0.352, 1, 6), // a Variante della Roggia
    tribuna(0.43, 0.447, -1, 5), // entre as duas Lesmo
    tribuna(0.636, 0.668, 1, 7), // a Variante Ascari
    tribuna(0.72, 0.77, -1, 6, { cobertura: false }), // a reta de trás
  ] },
  cenario: (tr, ctx) => cenarioMonza(tr, ctx), // a reta dos boxes, a Sopraelevata, a Parabolica e as placas das curvas
  ambiente: {
    marcas: ["ferrari", "pirelli", "heineken", "rolex", "aramco", "dhl", "iveco", "peroni", "gpit", "aws", "lenovo", "tag", "msc", "qatar"],
    outdoors: ["ferrari", "pirelli", "peroni", "iveco", "heineken", "gpit", "rolex", "aramco"],
    posto: "monza", bandeira: [0x009246, 0xce2b37, 0xf4f4f4], placas: [150, 100, 50], // a bandeira da Itália: verde, branco e vermelho
  },
  passarelas: { candidatos: [0.76, 0.58, 0.3, 0.2], marcas: ["pirelli", "ferrari", "heineken"], max: 3 },
  montanha: { angulo: -Math.PI / 2, afastamento: 1700, altura: 640, rocha: "#9aa3ad", mato: "#5e7a5c", longe: "#aebfd0" }, // os Alpes, ao norte
  vida: {
    gaivotas: [], // não tem mar
    som: { campo: () => 0.85, cidade: 0.08 }, // vento e passarinhos do parque; a cidade fica longe
  },
  beira: {}, // sem as árvores pálidas de sempre: o parque (bosque, folhas, gramado) é de ../kit/monza/parque.js, em `depois`
  depois: (tr, ctx) => depoisMonza(tr, ctx),
};
