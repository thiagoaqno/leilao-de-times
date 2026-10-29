// Barcelona (Circuit de Barcelona-Catalunya, Montmeló, GP da Espanha): o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele tem,
// em ../barcelona.js e ../kit/barcelona/ (a grande tribuna principal coberta com a asa de alumínio, o prédio dos boxes com a torre de controle de prova,
// a torre do relógio, as tribunas de curva nas encostas, as placas das curvas, o asfalto vermelho da curva 13, as bandeiras da Espanha e da
// Catalunha, os pinhais mansos e de alepo, as serras de Sant Llorenç del Munt, Montserrat e Montseny e os povoados do Vallès). As frações (0 a 1) são da
// volta, a partir da chegada, no meio da reta dos boxes:
// reta dos boxes 0,935-0,155 (a tribuna principal de 0,92 a 0,11 do lado de fora, o prédio dos boxes do lado de dentro, o pórtico em 0) ·
// Elf (1) 0,157-0,171 · Renault (2) 0,179-0,196 · curva 3 0,211-0,264 · Repsol (4) 0,344-0,399 · Seat (5) 0,435-0,454 · Würth (6) 0,50 ·
// curvas 7-8 0,529-0,563 · Campsa (9) 0,599-0,628, o ponto mais alto · La Caixa (10) 0,735-0,747 · curva 11 0,762 · Banc de Sabadell (12) 0,781-0,821 ·
// curva 13 0,838-0,877 · curva 14 0,903-0,932. Autódromo largo: sem muro colado, brita clara e asfalto verde de escape, o céu limpo e o sol forte do verão.
import { cenarioBarcelona, depoisBarcelona, TORCIDA } from "../barcelona.js";

const VERMELHO = "#c8102e", BRANCO = "#f4f3f0", VERDE = ["#2f9a62", "#36a86a"];
const arq = (de, ate, lado, degraus, o = {}) => ({ de, ate, lado, degraus, cor: VERMELHO, encosto: BRANCO, torcida: TORCIDA, ...o });

export const GP_BARCELONA = {
  asfalto: true, // o asfalto de GP de asfalto-gp.js, com as linhas de borda e a borracha
  chao: {
    margem: { cor: "#6d6e72" }, // a faixa de asfalto cinza, logo depois da zebra
    zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 340, fora: 220 }, // as zebras vermelhas e brancas
    sc: [[0.93, "SC 1"], [0.12, "SC 2"]],
    grid: true, remendos: 26,
  },
  // o escape: brita clara do lado de fora de todas as curvas; asfalto pintado de verde por dentro das mais abertas (como em Montmeló desde 2007); pilhas de
  // pneus só nas duas curvas mais fortes (Elf e La Caixa)
  escape: {
    largura: 24, corBrita: "#e8e1cc", cores: VERDE,
    brita: [[0.15, 0.177, "fora"], [0.178, 0.2, "fora"], [0.205, 0.268, "fora"], [0.34, 0.4, "fora"], [0.432, 0.46, "fora"], [0.527, 0.545, "fora"], [0.595, 0.632, "fora"],
      [0.728, 0.762, "fora"], [0.778, 0.825, "fora"], [0.835, 0.88, "fora"], [0.9, 0.935, "fora"]],
    listrado: [[0.152, 0.176, "dentro"], [0.208, 0.266, "dentro"], [0.342, 0.4, "dentro"], [0.597, 0.63, "dentro"], [0.78, 0.822, "dentro"], [0.902, 0.934, "dentro"]],
    pneus: [[0.152, 0.176, "fora"], [0.728, 0.762, "fora"]],
  },
  // as arquibancadas de curva (fitas do kit); a tribuna principal, as tribunas das encostas (Elf, curva 3, Repsol, Campsa e La Caixa) e o resto são de ../barcelona.js
  arquibancadas: { trechos: [
    arq(0.176, 0.202, 1, 7, { encosto: "#ffc400" }), // por fora da Renault
    arq(0.428, 0.462, 1, 8), // por fora da Seat
    arq(0.526, 0.55, 1, 6, { encosto: "#ffc400" }), // por fora da curva 7
    arq(0.776, 0.824, -1, 8), // Banc de Sabadell
    arq(0.836, 0.878, -1, 8, { encosto: "#ffc400" }), // a curva 13
    arq(0.9, 0.934, -1, 7), // a curva 14, antes da reta
  ] },
  cenario: (tr, ctx) => cenarioBarcelona(tr, ctx), // a reta dos boxes, as tribunas das encostas, as placas das curvas e o asfalto vermelho
  // sem marca registrada de patrocinador: só o nome do GP, do circuito e de lugares da Catalunha
  ambiente: {
    marcas: ["gpespanya", "catalunya", "mediterrani", "montmelo", "valles", "costabrava", "pirineus", "cava", "oliva", "circuit"],
    outdoors: ["gpespanya", "catalunya", "mediterrani", "montmelo", "valles", "costabrava", "pirineus", "cava"],
    bandeira: [0xc60b1e, 0xffc400], posto: "catalunya", placas: [150, 100, 50], // a Espanha: vermelha e amarela
  },
  passarelas: { candidatos: [0.962, 0.5, 0.62, 0.32], marcas: ["gpespanya", "catalunya", "circuit"], max: 3 }, // a da reta dos boxes, pouco antes dos boxes
  horizonte: false, // os morros de longe são as serras de ../kit/barcelona/paisagem.js
  vida: {
    gaivotas: [], // não tem mar
    som: { campo: () => 1, cidade: 0.12 }, // vento e passarinhos de autódromo; a cidade fica longe
  },
  beira: {}, // sem as árvores redondas de sempre: a vegetação mediterrânea é de ../kit/barcelona/vegetacao.js, em `depois`
  depois: (tr, ctx) => depoisBarcelona(tr, ctx), // as serras, os povoados, a vegetação, as bandeiras da torcida e a faixa no pórtico da largada
};
