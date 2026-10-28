// Silverstone (Silverstone Circuit, o antigo aeródromo da RAF): o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele
// tem, em ../silverstone.js e ../kit/silverstone/pecas.js (o The Wing com a torre da direção de prova, as tribunas cobertas das retas,
// os hangares e a torre da RAF, as pistas de pouso, os pórticos, os telões, as placas das curvas, o patchwork de campos com sebes, as
// aldeias, as turbinas e o camping da torcida com as Union Jacks). As frações (0 a 1) são da volta, a partir da linha de chegada, na reta
// entre Club e Abbey: Abbey 0,04-0,07 · Farm 0,07-0,10 · Village 0,12-0,13 · The Loop 0,145-0,165 · Aintree 0,17-0,19 ·
// Wellington Straight 0,2-0,29 · Brooklands 0,30-0,32 · Luffield 0,33-0,36 · Woodcote 0,365-0,43 · Copse 0,49-0,52 ·
// Maggotts, Becketts e Chapel 0,58-0,67 · Hangar Straight 0,7-0,8 · Stowe 0,82-0,85 · Vale 0,915-0,93 · Club 0,94-0,97.
// Campo aberto e plano: sem muro colado, sem serra no horizonte, com a brita de Stowe e de Copse e as sebes inglesas de volta.
import { cenarioSilverstone, depoisSilverstone } from "../silverstone.js";

const AZUL = "#1d3f8f", VERMELHO = "#c8102e", BRANCO = "#f4f4f4";

export const GP_SILVERSTONE = {
  asfalto: true,
  chao: {
    margem: { cor: "#6f7075" }, // o asfalto cinza da área de escape, logo depois da zebra
    zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 330, fora: 210 },
    sc: [[0.955, "SC 1"], [0.13, "SC 2"]],
    grid: true, remendos: 30,
  },
  // o escape: brita em Copse e em Stowe (as famosas), asfalto pintado nas saídas de Abbey, Becketts e Club e muros de
  // pneus por fora das curvas rápidas
  escape: {
    largura: 30,
    brita: [[0.48, 0.535, "fora"], [0.815, 0.865, "fora"]],
    listrado: [[0.04, 0.075, "fora"], [0.6, 0.68, "fora"], [0.935, 0.975, "fora"]],
    cores: [VERMELHO, AZUL],
    pneus: [[0.48, 0.535, "fora"], [0.815, 0.865, "fora"], [0.04, 0.075, "fora"], [0.6, 0.68, "fora"]],
  },
  // as arquibancadas das curvas (fitas do kit, que acompanham a curva); as das retas são tribunas cobertas montadas em ../silverstone.js
  arquibancadas: { trechos: [
    { de: 0.934, ate: 0.966, lado: -1, degraus: 8, cor: AZUL, encosto: BRANCO }, // Club
    { de: 0.04, ate: 0.078, lado: -1, degraus: 9, cor: AZUL, encosto: VERMELHO }, // Abbey, azul e vermelha
    { de: 0.08, ate: 0.102, lado: -1, degraus: 7, cor: BRANCO, encosto: AZUL }, // Farm
    { de: 0.135, ate: 0.172, lado: 1, degraus: 6, cor: BRANCO, encosto: AZUL }, // por dentro de Village e The Loop (a Arena)
    { de: 0.172, ate: 0.192, lado: -1, degraus: 5, cor: VERMELHO, encosto: BRANCO }, // Aintree
    { de: 0.30, ate: 0.36, lado: -1, degraus: 7, cor: VERMELHO, encosto: BRANCO }, // Brooklands e Luffield
    { de: 0.368, ate: 0.43, lado: -1, degraus: 8, cor: AZUL, encosto: BRANCO }, // Woodcote
    { de: 0.48, ate: 0.535, lado: -1, degraus: 8, cor: AZUL, encosto: BRANCO }, // Copse
    { de: 0.582, ate: 0.628, lado: -1, degraus: 7, cor: VERMELHO, encosto: BRANCO }, // Maggotts e Becketts
    { de: 0.638, ate: 0.672, lado: -1, degraus: 6, cor: AZUL, encosto: VERMELHO }, // Chapel
    { de: 0.815, ate: 0.865, lado: -1, degraus: 8, cor: VERMELHO, encosto: AZUL }, // Stowe
    { de: 0.90, ate: 0.932, lado: -1, degraus: 5, cor: BRANCO, encosto: VERMELHO }, // Vale
  ] },
  cenario: (tr, ctx) => cenarioSilverstone(tr, ctx), // The Wing, tribunas, aeródromo, pórticos, telões, placas das curvas, campos, aldeias e camping
  ambiente: {
    bandeira: [0x012169, 0xc8102e], // a Union Jack: azul e vermelho
    marcas: ["pirelli", "rolex", "britgp", "heineken", "dhl", "aramco", "skysports", "silverstone", "tag", "lenovo"],
    outdoors: ["britgp", "pirelli", "rolex", "skysports", "heineken", "aramco", "dhl", "silverstone"],
    posto: "britgp", placas: [150, 100, 50],
  },
  passarelas: { candidatos: [0.7, 0.2, 0.435, 0.54], marcas: ["silverstone", "britgp", "pirelli"], max: 3 }, // as pontes de pedestres sobre as retas
  vida: {
    gaivotas: [], // não tem mar
    som: { campo: () => 1, cidade: 0.04 }, // vento e passarinhos do aeródromo; a torcida vem das arquibancadas
  },
  depois: (tr, ctx) => depoisSilverstone(tr, ctx), // as bandeiras da torcida e a faixa no pórtico da largada
};
