// Zandvoort (Circuit Zandvoort, GP da Holanda, nas dunas do mar do Norte): o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele
// tem, em ../zandvoort.js e ../kit/zandvoort/ (o prédio dos boxes com a torre de controle na linha de chegada, a tribuna principal laranja, a
// Tarzanbocht com a arquibancada grande e o telão, as curvas inclinadas Hugenholtz e Arie Luyendyk com a rampa de concreto, o paredão, a cerca
// alta e as arquibancadas em volta, o mar laranja com bandeiras e fumaça, o muro nas cores holandesas, as dunas com capim-de-praia, o mar do Norte
// e a praia, a vila de Zandvoort e os prédios da orla). O traçado veio de bacinger/f1-circuits (nl-1948, licença MIT) por
// ferramentas/circuitos-f1.js. As frações (0 a 1) são da volta, a partir da linha de chegada, que fica no meio da reta dos boxes:
// reta dos boxes 0,94-0,09 · Tarzanbocht (grampo à direita) 0,09-0,125 · Hugenholtz (grampo inclinado à esquerda) 0,186-0,238 · Hunserug 0,40-0,445 ·
// Scheivlak 0,485-0,56 · Hans Ernst 0,595-0,625 · chicane 0,74-0,77 · Arie Luyendyk (inclinada, à direita) 0,838-0,934. O céu é o nublado e ventoso
// do litoral (cena.js e ceu.js). Sem marcas registradas de patrocinadores: os painéis são nomes de lugar, de curva e de comida da Holanda
// (kit/zandvoort/marcas.js).
import { cenarioZandvoort, depoisZandvoort } from "../zandvoort.js";
import { CAMISAS_NL } from "../kit/zandvoort/torcida.js";
import { eixoDaCosta } from "../kit/zandvoort/lugar.js";
import { pertoDe } from "../kit/som.js";

const BOXES = window.Pistas.PISTAS.zandvoort.boxes;
const VERMELHO = "#ae1c28", BRANCO = "#f4f4f2", LARANJA = "#ff6a13", AZUL = "#21468b", AZUL_ESCURO = "#1b3a73";
const arq = (de, ate, lado, degraus, cor, encosto, cobertura = false) => ({ de, ate, lado, degraus, cor, encosto, cobertura, torcida: CAMISAS_NL });

export const GP_ZANDVOORT = {
  asfalto: true,
  chao: {
    margem: { cor: "#6d6e72" }, // o asfalto cinza da faixa junto da zebra
    zebra: { cores: [VERMELHO, BRANCO], dentro: 340, fora: 220 }, // as zebras vermelhas e brancas
    amarelas: [[0.1, 0.122]], // a zebra alta de dentro da Tarzanbocht
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true, remendos: 22,
  },
  // o escape: areia clara (o "grind" das dunas) por fora das curvas lentas e da Tarzanbocht, e os pneus no Hunserug e no Scheivlak
  escape: {
    corBrita: "#dccf9c", largura: 26,
    brita: [[0.092, 0.132, "fora"], [0.186, 0.24, "fora"], [0.4, 0.447, "fora"], [0.486, 0.562, "fora"], [0.594, 0.628, "fora"], [0.838, 0.934, "fora"], [0.738, 0.775, 0]],
    pneus: [[0.402, 0.44, "fora"], [0.49, 0.54, "fora"], [0.598, 0.62, "fora"]],
  },
  // as arquibancadas de curva (fitas do kit, de torcida laranja): a do Tarzan, por fora do grampo, é a maior; a principal e as das curvas inclinadas são de ../zandvoort.js
  arquibancadas: { trechos: [
    arq(0.086, 0.134, -1, 13, LARANJA, BRANCO), // o Tarzan, por fora
    arq(0.1, 0.126, 1, 8, AZUL, BRANCO), // o Tarzan, por dentro
    arq(0.405, 0.44, -1, 8, LARANJA, AZUL_ESCURO), arq(0.492, 0.55, -1, 8, AZUL, BRANCO, true), arq(0.6, 0.622, 1, 7, LARANJA, BRANCO), // Hunserug, Scheivlak e Hans Ernst
    arq(0.742, 0.772, -1, 7, VERMELHO, BRANCO), // a chicane
  ] },
  cenario: (tr, ctx) => cenarioZandvoort(tr, ctx), // a reta dos boxes, o Tarzan, as curvas inclinadas, a torcida laranja, os muros e as placas
  ambiente: {
    marcas: ["nlzandvoort", "nlgp", "nlnoordzee", "nlduinen", "nlholland", "nloranje", "nltulpen", "nlkaas", "nlstroop", "nlbitter", "nlhagel", "nlstrand"],
    outdoors: ["nlzandvoort", "nlgp", "nlnoordzee", "nlholland", "nloranje", "nltulpen", "nlkaas", "nlstroop"],
    posto: "nlzandvoort", cerca: false, // o muro e a cerca alta são de ../kit/zandvoort/curvas.js
    bandeira: [0xae1c28, 0x21468b], placas: [150, 100, 50], // a Holanda (vermelho e azul, com o branco no meio da torcida) e as placas de 150, 100 e 50 m
  },
  passarelas: { candidatos: [0.305, 0.66, 0.78, 0.55], marcas: ["nlzandvoort", "nlgp", "nlnoordzee"], max: 2 },
  beira: {}, // sem as árvores pálidas de sempre: o capim, as moitas e os pinheiros baixos das dunas são de ../kit/zandvoort/dunas.js, em `depois`
  horizonte: false, // o horizonte é o mar do Norte, a oeste, e a vila de Zandvoort
  depois: (tr, ctx) => depoisZandvoort(tr, ctx),
  vida: {
    gaivotas: (tr) => { const e = eixoDaCosta(tr); return [-300, 600, 1500, 2400].map((u) => { const [x, z] = e.mundo(e.costa(u) + 40, u); return { x, z, raio: 230 }; }); }, // sobre a praia
    som: {
      campo: () => 0.55, // o vento nas dunas
      porto: (tr, x, y) => { const e = eixoDaCosta(tr), d = e.s(x, y) - e.costa(e.u(x, y)); return Math.max(0, Math.min(1, 1 - d / 1100)); }, // as ondas e as gaivotas: mais forte no lado do mar
      cidade: 0.08,
    },
  },
};
void pertoDe;
