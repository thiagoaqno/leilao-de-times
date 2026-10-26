// Interlagos (Autódromo José Carlos Pace): o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele tem, em
// ../interlagos.js (o lago, o prédio dos boxes, São Paulo em volta). As frações (0 a 1) são da volta, a partir da chegada:
// S do Senna 0,07-0,13 · Curva do Sol 0,17 · Reta Oposta 0,2-0,32 · Descida do Lago 0,33-0,37 · Ferradura 0,40-0,47 ·
// Laranjinha 0,52-0,56 · Pinheirinho 0,62-0,69 · Bico de Pato 0,72-0,78 · Mergulho e Junção 0,82-0,9 · subida dos boxes.
import { cenarioInterlagos, depoisInterlagos } from "../interlagos.js";

export const GP_INTERLAGOS = {
  asfalto: true,
  chao: {
    margem: { cor: "#7b7d82" }, // o asfalto cinza-claro da faixa de escape junto da zebra
    zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 330, fora: 200 }, // as zebras vermelhas e brancas das curvas
    amarelas: [[0.8, 0.84]], // a zebra alta do Mergulho
    sc: [[0.935, "SC 1"], [0.215, "SC 2"]],
    grid: true, remendos: 34,
  },
  // o escape: asfalto pintado de verde e amarelo (as cores do Brasil) na saída do S do Senna, no Lago e na Junção; brita
  // na Ferradura e no Pinheirinho; muro de pneus por fora das curvas
  escape: {
    listrado: [[0.058, 0.14, "fora"], [0.31, 0.38, "fora"], [0.84, 0.9, "fora"]],
    brita: [[0.4, 0.48, "fora"], [0.6, 0.7, "fora"], [0.72, 0.79, "fora"]],
    pneus: [[0.06, 0.14, "fora"], [0.4, 0.48, "fora"], [0.6, 0.7, "fora"], [0.72, 0.79, "fora"], [0.84, 0.9, "fora"]],
  },
  cenario: (tr, ctx) => cenarioInterlagos(tr, ctx), // as arquibancadas (para o som), São Paulo em volta e o lago
  ambiente: {
    marcas: ["heineken", "pirelli", "petrobras", "rolex", "bb", "aramco", "itau", "dhl", "gpsp", "tag"],
    outdoors: ["heineken", "petrobras", "pirelli", "bb", "itau", "rolex", "gpsp", "aramco"],
    posto: "gpsp", bandeira: [0x009c3b, 0xffdf00], placas: [150, 100, 50], // as placas de frenagem de Interlagos têm 150 m
  },
  passarelas: { candidatos: [0.035, 0.19, 0.9, 0.55], marcas: ["gpsp", "petrobras", "heineken"], max: 2 }, // a da reta dos boxes
  montanha: { angulo: -Math.PI / 2, altura: 620, rocha: "#6f7a62", mato: "#35623a", longe: "#9db6c6" }, // a Serra da Cantareira, ao norte
  fachadas: { cores: [["#d8d2c4", "#55626d"], ["#c6beac", "#6a4f3c"], ["#e4dbc4", "#3a566e"], ["#bdbab2", "#2f4a3c"], ["#e6cba6", "#6a3d2a"], ["#cdd2d3", "#3a3f45"], ["#efe7d6", "#8a6a2f"]], toldos: [], telhas: 0.1 }, // São Paulo: concreto, tijolo e pastilha
  vida: {
    som: { campo: () => 0.7, cidade: 0.25 }, // vento e passarinhos do autódromo, a cidade lá longe
  },
  depois: (tr, ctx) => depoisInterlagos(tr, ctx),
};
