// Miami (Miami International Autodrome, GP de Miami, em volta do Hard Rock Stadium, em Miami Gardens): o que o GP usa do kit (kit/README.md explica cada
// peça) e o que só ele tem, em ../miami.js e ../kit/miami/ (o estádio com a cobertura branca, os mastros e os cabos, a praça e os estacionamentos; o prédio
// dos boxes temporário com a torre de controle e o paddock; a marina falsa com os iates sobre o chão pintado de água; o Beach Club com a piscina; os
// viadutos da rodovia, com carros, por cima da chicane das curvas 14 e 15 e ao lado da reta dos boxes; as palmeiras e a cidade pastel ao longe).
// O traçado veio de bacinger/f1-circuits (us-2022, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha
// de chegada, que fica no meio da reta dos boxes:
// reta dos boxes 0,94-0,06 · a curva 1 (grampo à esquerda) 0,10-0,14 · o miolo e a curva 5 (grampo à direita junto do estádio) 0,27-0,33 ·
// a chicane estreita das curvas 14 e 15 por baixo do viaduto 0,40-0,47 · o grampo oeste 0,48-0,52 · a reta de trás 0,52-0,77 ·
// o grampo e as esses do lado leste 0,77-0,87. O céu é o do fim de tarde da Flórida (ceu.js e cena.js). As tribunas temporárias são aqua e rosa
// e os painéis só têm nomes de lugar e de comida da Flórida (kit/miami/marcas.js) e as marcas que o kit já traz.
import { cenarioMiami, depoisMiami } from "../miami.js";
import { pertoDe } from "../kit/som.js";

const BOXES = window.Pistas.PISTAS.miami.boxes;
const AQUA = "#00a3ad", ROSA = "#ff5fa2", BRANCO = "#f4f4f4";
const CAMISAS = ["#ffffff", "#ff5fa2", "#00a3ad", "#ffd23f", "#1b1b1b", "#ff9f1c", "#f4f4f4", "#7bdff2"];
const arq = (de, ate, lado, degraus, cor, encosto = BRANCO, cobertura = false) => ({ de, ate, lado, degraus, cor, encosto, cobertura, torcida: CAMISAS });

export const GP_MIAMI = {
  asfalto: true,
  chao: {
    margem: { cor: "#6d6e72" }, zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 340, fora: 220 },
    amarelas: [[0.412, 0.458]], // a zebra anticorte da chicane estreita
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true, remendos: 26,
  },
  escape: { britaCurvas: 420, corBrita: "#e3d9bd", largura: 26, pneus: [[0.4, 0.425, "fora"], [0.455, 0.475, "fora"]] },
  // as arquibancadas temporárias (andaimes com as cadeiras aqua e rosa): a grande da reta dos boxes, em frente ao prédio, as das curvas
  arquibancadas: { trechos: [
    arq(0.945, 0.05, 1, 11, AQUA, BRANCO, true), arq(0.89, 0.94, 1, 8, ROSA), arq(0.056, 0.098, 1, 8, ROSA), // a reta dos boxes
    arq(0.098, 0.128, 1, 9, AQUA), arq(0.126, 0.146, 1, 7, ROSA), // a curva 1, por fora
    arq(0.262, 0.286, -1, 9, ROSA, BRANCO, true), arq(0.3, 0.33, -1, 7, AQUA), // o grampo à direita junto do estádio
    arq(0.404, 0.43, 1, 7, AQUA), arq(0.43, 0.452, -1, 7, ROSA), arq(0.456, 0.476, 1, 7, AQUA), // a chicane das curvas 14 e 15
    arq(0.48, 0.516, 1, 9, ROSA, BRANCO, true), // o grampo oeste
    arq(0.774, 0.806, 1, 9, AQUA), arq(0.82, 0.846, 1, 8, ROSA), arq(0.856, 0.876, 1, 10, AQUA, BRANCO, true), // o lado leste
  ] },
  cenario: (tr, ctx) => cenarioMiami(tr, ctx),
  ambiente: {
    marcas: ["mimiami", "migp", "pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "mikeylime", "micafecito", "mistone", "miceviche", "mipastelito", "microqueta"],
    outdoors: ["mimiami", "migp", "mibiscayne", "miwynwood", "mimanga", "mipraia", "micalle", "misol", "mieverglades", "mimarina"],
    posto: "mimiami", bandeira: [0x3c3b6e, 0xb22234], placas: [150, 100, 50], // a bandeira dos Estados Unidos e as placas de 150, 100 e 50 m
  },
  passarelas: { candidatos: [0.965, 0.5, 0.27, 0.73], marcas: ["migp", "mimiami", "mibiscayne"], max: 2 },
  beira: { arvores: 0.05, longe: { arvores: 0.08 } }, // as palmeiras são de ../kit/miami/palmas.js, em `depois`; a cidade pastel de longe também
  horizonte: false,
  depois: (tr, ctx) => depoisMiami(tr, ctx),
  vida: {
    gaivotas: (tr) => (tr.marinaMiami ? [{ x: tr.marinaMiami.x, z: tr.marinaMiami.z, raio: 260 }, { x: tr.marinaMiami.x + 400, z: tr.marinaMiami.z, raio: 300 }] : []),
    som: {
      campo: () => 0.35, // o vento e os passarinhos entre as palmeiras
      cidade: 0.5, // a rodovia ao fundo
      porto: pertoDe((tr) => tr.marinaMiami && { x: tr.marinaMiami.x, y: tr.marinaMiami.z }, 520), // a marina: as ondinhas, as gaivotas e a buzina de iate
    },
  },
};
