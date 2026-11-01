// Las Vegas (GP de Las Vegas, à noite, na Strip): o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele tem, em ../lasvegas.js e ../kit/lasvegas/. O traçado é a
// linha central real do circuito de 17 curvas (bacinger/f1-circuits us-2023, MIT; conferida com o mapa oficial e com as ruas do OpenStreetMap: Harmon Avenue, Koval Lane, Sands
// Avenue e a Las Vegas Boulevard); os prédios (planta e altura), as vias, os lagos e as árvores são do OpenStreetMap e o relevo é o EU-DEM/SRTM (ferramentas/lasvegas-dados.js).
// SEM muro em volta: as barreiras (concreto com os painéis e a cerca de tela, Tecpro nas curvas de bater) só existem onde a pista real tem, em `muros` (pistas.js), e a colisão usa
// os mesmos trechos. O resto é rua aberta e escape de asfalto. As frações (0 a 1) são da volta, a partir da linha de chegada, que fica na reta dos boxes (sobe para nordeste,
// entre a Harmon Avenue e a Koval Lane, em frente ao Grand Prix Plaza):
//   reta dos boxes 0,93-0,02 · T1 (esquerda, longa) 0,022 · T2 0,038 · T3 0,059 · T4 0,079 · Koval Lane 0,09-0,227 · T5 (90° à direita) 0,230 · T6 (em volta do Sphere) 0,276 ·
//   T7-T8 (a chicane em frente ao Sphere) 0,305-0,314 · T9 0,334 · Sands Avenue 0,346-0,391 · T10 0,421 · T11 0,466 · T12 (esquerda para a Strip) 0,496 ·
//   a Strip (1,9 km) 0,50-0,81 · T13 0,794 · T14-T16 (a chicane da Harmon) 0,811-0,829 · Harmon Avenue 0,835-0,932 · T17 0,948.
import { cenarioLasVegas, depoisLasVegas } from "../lasvegas.js";
import { D, relevoLV, fundoLV, aguaLV, NIVEL_DO_MAR } from "../kit/lasvegas/mundo.js";
import { corDoChao } from "../kit/lasvegas/terra.js";

const P = window.Pistas.PISTAS.lasvegas, BOXES = P.boxes; // o corredor dos boxes e as barreiras (pistas.js)
const F = D.frac;

export const GP_LASVEGAS = {
  mundo: { relevo: relevoLV, fundo: fundoLV, agua: aguaLV, cor: corDoChao, nivelMar: NIVEL_DO_MAR, banda: (tr) => tr.W / 2 + 26 }, // o chão de verdade (pista.js `mundoDe`)
  asfalto: true,
  chao: {
    margem: "sarjeta", zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 300, fora: 190 }, // as zebras vermelhas e brancas só nas curvas (o meio-fio baixo da transmissão)
    faixasPedestre: [0.095, 0.205, 0.35, 0.53, 0.76, 0.865, 0.915],
    tracejado: [[0.095, 0.22], [0.52, 0.79], [0.84, 0.925]], // a linha do meio da avenida (a Koval Lane, a Strip e a Harmon)
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]], grid: true, remendos: 40, bueiros: 28,
  },
  arquibancadas: { // as arquibancadas de aço pintadas nas cores do GP (preto e rosa), só onde a barreira está colada (recuo 10)
    trechos: [
      { de: 0.955, ate: 0.012, lado: 1, degraus: 7, cor: "#1c1f26", encosto: "#e10a50", cobertura: false, torcida: ["#ffffff", "#e10a50", "#1c1f26", "#ffd23f", "#4fd0ff"] }, // em frente aos boxes
      { de: 0.1, ate: 0.18, lado: -1, degraus: 6, cor: "#e10a50", encosto: "#1c1f26", cobertura: false, torcida: ["#ffffff", "#4fd0ff", "#1c1f26", "#ffd23f"] }, // a Koval Lane
      { de: 0.57, ate: 0.62, lado: 1, degraus: 6, cor: "#1c1f26", encosto: "#4fd0ff", cobertura: false }, // a Strip, em frente ao Bellagio
      { de: 0.87, ate: 0.92, lado: -1, degraus: 6, cor: "#e10a50", encosto: "#ffffff", cobertura: false }, // a Harmon Avenue
    ],
  },
  cenario: (tr, ctx) => cenarioLasVegas(tr, ctx, {
    marcasBoxes: ["aramco", "pirelli", "rolex", "heineken"],
    // as placas de patrocínio da barreira por trecho (as das fotos do GP): Aramco (azul e verde) nas retas, Heineken, Pirelli, Las Vegas Grand Prix, AWS, T-Mobile...
    barreiras: {
      placas: [[0, 0.03, "aramco"], [0.03, 0.09, "heineken"], [0.09, 0.14, "aramco2"], [0.14, 0.23, "aramco"], [0.23, 0.3, "pirelli"], [0.3, 0.36, "tmobile"], [0.36, 0.43, "aramco"], [0.43, 0.5, "lvgp"], [0.5, 0.58, "aramco2"], [0.58, 0.66, "aramco"], [0.66, 0.74, "heineken"], [0.74, 0.8, "aramco2"], [0.8, 0.85, "pirelli"], [0.85, 0.92, "aramco"], [0.92, 1, "lvgp"]],
      escapes: P.barreiras.escapes, // o asfalto pintado de azul e verde dos escapes (a física: SUPERFICIES_ESCAPE.lasvegas, as mesmas frações)
      tecpro: P.barreiras.tecpro, // blocos Tecpro na frente do concreto das curvas de bater
    },
    porticos: [[0.915, "FORMULA 1  HEINEKEN SILVER  LAS VEGAS GRAND PRIX", "#14181f", "#ffffff", "#e10a50"], [0.15, "ARAMCO", "#0a6fb4", "#ffffff", "#5ab94a"], [0.6, "LAS VEGAS  THE ENTERTAINMENT CAPITAL", "#1b0b2b", "#ffd36a", "#ff3b8a"], [0.87, "PIRELLI", "#f2c100", "#111111", "#14181f"]],
    montanha: { angulo: Math.PI, afastamento: 2600, altura: 1250, largura: 14000, rocha: "#8a6a52", mato: "#6b5a44", longe: "#b9a38d" }, // as Spring Mountains, a oeste
  }),
  depois: (tr, ctx) => depoisLasVegas(tr, ctx), // por último: as palmeiras, os letreiros de neon e os telões, os postes de luz e o laço da noite
  murosProprios: true, // as barreiras são as de kit/lasvegas/barreiras.js (o desenho padrão de pista.js não entra)
  boxes: {}, // o corredor dos boxes do kit (garagens, mureta e os quadrados pintados); o prédio é de ../kit/lasvegas/reta.js
  ambiente: { paineis: false, mastros: false, cerca: false, marcas: ["aramco", "pirelli", "rolex", "heineken", "dhl", "f1", "aws", "lenovo"], posto: "f1", placas: [100, 50], bandeira: [0x3c3b6e, 0xb22234] }, // os postos de fiscais e as placas de frenagem
  horizonte: false, // sem os morros genéricos de longe: a serra de verdade é `montanha` em ../lasvegas.js
  beira: {}, // sem as árvores, os prédios e as palmeiras genéricos: tudo vem dos dados reais
  terreno: { S: 280, pedacos: 6 }, // (a grade do chão: o relevo é suave)
  sem: { outdoors: true, olhos: true, setas: true, mastros: true, rodas: true, dirigivel: true, bandeirolas: true }, // Las Vegas tem a High Roller de verdade (kit/lasvegas/marcos.js), não a roda-gigante do kit
  vida: {
    helicoptero: true,
    som: { cidade: () => 1, campo: () => 0, porto: () => 0 },
  },
};
void F;
