// Red Bull Ring (Spielberg, GP da Áustria, na Estíria): o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele tem, em ../redbullring.js e
// ../kit/redbullring/ (o prédio dos boxes com a torre, a asa de aço que olha a reta, a tribuna principal, o touro de chapas de corten com os chifres de ouro no meio
// do circuito, as tribunas das curvas, os sítios e a capela da Estíria, as encostas lotadas, a bacia de morros verdes, a mata de abetos em manchas com o pasto
// limpo e as montanhas ao fundo). O traçado veio de bacinger/f1-circuits (at-1969, licença MIT) por ferramentas/circuitos-f1.js e o relevo e as barreiras de
// ferramentas/pista-real.js (EU-DEM e OpenStreetMap). As frações (0 a 1) são da volta, a partir da linha de chegada:
// reta dos boxes 0,905-0,062 · curva 1 (Niki Lauda, a direita que sobe) 0,062-0,088 · subida longa 0,09-0,275, com a curva 2 (esquerda leve) em 0,22 · curva 3
// (Remus, o grampo no alto) 0,278-0,305 · reta de Schönberg (em descida) 0,305-0,46 · curva 4 (Schlossgold) 0,462-0,498 · curva 5 0,498-0,535 · curva 6 (Rauch, a
// esquerda em descida) 0,575-0,625 · curva 7 (Würth, no fundo do vale) 0,655-0,695 · curva 8 0,698-0,735 · reta de volta 0,74-0,83 · curva 9 (Rindt) 0,832-0,858 ·
// curva 10 0,875-0,905. A brita é a de SUPERFICIES_ESCAPE (a física lê a mesma). O céu é o de serra (cena.js e ceu.js). Sem marcas registradas de patrocinadores: os painéis
// são nomes de lugar e de comida da região (kit/redbullring/marcas.js); só as curvas levam os nomes que têm de verdade.
import { cenarioRedBullRing, depoisRedBullRing } from "../redbullring.js";

const BOXES = window.Pistas.PISTAS.redbullring.boxes;
const VERMELHO = "#d62828", BRANCO = "#f4f4f2";

export const GP_REDBULLRING = {
  asfalto: true,
  chao: {
    margem: { cor: "#6b6c71" }, // o asfalto cinza da faixa junto da zebra
    zebra: { cores: [VERMELHO, BRANCO], dentro: 360, fora: 260 }, // as zebras vermelhas e brancas
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true, remendos: 22,
  },
  // o escape: a brita bege automática do lado de fora das curvas fechadas e as duas faixas de SUPERFICIES_ESCAPE (pistas.js), as mesmas que a física lê
  escape: { corBrita: "#cfc4a4", largura: 26, britaCurvas: 420, brita: [[0.84, 0.875, -1], [0.89, 0.93, -1]] },
  cenario: (tr, ctx) => cenarioRedBullRing(tr, ctx), // a reta dos boxes, o touro, as tribunas, os sítios, as encostas e as placas
  ambiente: {
    marcas: ["spielberg", "gpaustria", "steiermark", "murtal", "kernoel", "backhendl", "strudel", "schilcher", "zeltweg", "knittelfeld"],
    outdoors: ["spielberg", "gpaustria", "steiermark", "murtal", "kernoel", "backhendl", "strudel", "schilcher", "seckau", "aichfeld", "mur", "oesterreich"],
    posto: "spielberg", cerca: false, // a cerca é a barreira de pista.js (`muros` em pistas.js)
    mastros: false, placas: [200, 100, 50], // sem os mastros de duas cores do kit (a Áustria é vermelho, branco e vermelho: as bandeiras são as da torcida) e as placas de 200, 100 e 50 m
  },
  beira: {}, // sem as árvores pálidas de sempre: o abetal e as folhosas são de ../kit/redbullring/paisagem.js, em `depois`
  horizonte: false, // as montanhas e os morros são de ../kit/redbullring/paisagem.js
  sem: { mastros: true }, // os mastros coloridos do kit não: as bandeiras da Áustria e da Estíria são da torcida
  depois: (tr, ctx) => depoisRedBullRing(tr, ctx),
  vida: {
    gaivotas: [], // não tem mar
    som: { campo: () => 0.9, cidade: 0.06 }, // vento nos abetos e passarinhos; as cidades ficam longe
  },
};
