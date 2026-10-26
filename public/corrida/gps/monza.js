// Monza (Autodromo Nazionale Monza, GP da Itália): o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele tem,
// em ../monza.js (a velha pista inclinada e o pódio sobre a reta). As frações (0 a 1) são da volta, a partir da chegada:
// reta dos boxes 0,92-0,12 · Variante del Rettifilo 0,115-0,135 · Curva Grande e Biassono 0,145-0,27 · Variante della
// Roggia 0,33-0,35 · Lesmo 1 e 2 0,39-0,47 · Serraglio 0,50-0,57 · Variante Ascari 0,64-0,69 · reta de trás 0,69-0,845 ·
// Parabolica (Curva Alboreto) 0,845-0,92. Dentro do Parque de Monza: o bosque fecha a pista dos dois lados.
import { prediosDosBoxes } from "../kit/boxes.js";
import { podio, sopraelevata } from "../monza.js";

// a torcida da Ferrari: quase tudo vermelho, com o branco e o amarelo da Scuderia e o verde da bandeira
const TIFOSI = ["#d4001a", "#d4001a", "#c8102e", "#e63946", "#d4001a", "#ffffff", "#ffd23f", "#009246", "#111111"];

export const GP_MONZA = {
  asfalto: true,
  chao: {
    margem: { cor: "#7a7b80" }, // o asfalto cinza da faixa de escape junto da zebra
    zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 340, fora: 200 }, // as zebras vermelhas e brancas
    amarelas: [[0.113, 0.136], [0.326, 0.35], [0.636, 0.692]], // as zebras altas das chicanes (Rettifilo, Roggia e Ascari)
    sc: [[0.9, "SC 1"], [0.2, "SC 2"]],
    grid: true, remendos: 30,
  },
  // o escape: asfalto pintado de vermelho e branco nas chicanes; brita na saída das curvas rápidas (Biassono, Lesmo 1 e 2,
  // Parabolica); pilhas de pneus nas Lesmo e na Parabolica
  escape: {
    listrado: [[0.113, 0.136, 0], [0.326, 0.35, 0], [0.636, 0.692, 0]],
    brita: [[0.235, 0.27, "fora"], [0.39, 0.425, "fora"], [0.45, 0.472, "fora"], [0.845, 0.925, "fora"]],
    pneus: [[0.39, 0.425, "fora"], [0.45, 0.472, "fora"], [0.86, 0.915, "fora"]],
    cores: ["#c8102e", "#f1f1ee"],
  },
  arquibancadas: { trechos: [
    { de: 0.928, ate: 0.0128, lado: -1, degraus: 8, cor: "#c8102e", encosto: "#f4f4f4", torcida: TIFOSI }, // a tribuna central da reta dos boxes
    { de: 0.0275, ate: 0.112, lado: -1, degraus: 8, cor: "#c8102e", encosto: "#f4f4f4", torcida: TIFOSI }, // (aberta no meio para o pódio)
    { de: 0.124, ate: 0.152, lado: -1, degraus: 6, cor: "#d4001a", encosto: "#ffd23f", torcida: TIFOSI }, // por fora da Variante del Rettifilo
    { de: 0.852, ate: 0.916, lado: -1, degraus: 7, cor: "#c8102e", encosto: "#f4f4f4", torcida: TIFOSI }, // por fora da Parabolica
  ] },
  cenario: (tr, ctx) => {
    tr.camisasGP = TIFOSI; // a torcida solta de vida.js também veste vermelho
    prediosDosBoxes(tr, ctx.add, { de: 0.984, ate: 1.078, lado: 1, recuo: 62, torre: false, paineis: ["ferrari", "pirelli", "heineken", "rolex"], cores: { parede: "#e6e4de", friso: "#c8102e" } });
    sopraelevata(tr, ctx.add);
  },
  ambiente: {
    marcas: ["ferrari", "pirelli", "heineken", "rolex", "aramco", "dhl", "iveco", "peroni", "gpit", "aws", "lenovo", "tag", "msc", "qatar"],
    outdoors: ["ferrari", "pirelli", "peroni", "iveco", "heineken", "gpit", "rolex", "aramco"],
    posto: "monza", bandeira: [0x009246, 0xce2b37, 0xf4f4f4], placas: [150, 100, 50], // a bandeira da Itália: verde, branco e vermelho
  },
  passarelas: { candidatos: [0.96, 0.76, 0.2, 0.58, 0.3], marcas: ["pirelli", "ferrari", "heineken"], max: 3 },
  marcos: (tr, ctx) => podio(tr, ctx), // o pódio sobre a reta dos boxes
  montanha: { angulo: -Math.PI / 2, afastamento: 1700, altura: 640, rocha: "#9aa3ad", mato: "#5e7a5c", longe: "#aebfd0" }, // os Alpes, ao norte
  vida: {
    gaivotas: [], // não tem mar
    som: { campo: () => 0.85, cidade: 0.08 }, // vento e passarinhos do parque; a cidade fica longe
  },
  parque: { recuo: 24, fundo: 200, alturas: [150, 270], densidade: 1.4 }, // o bosque do Parque de Monza, dos dois lados
};
