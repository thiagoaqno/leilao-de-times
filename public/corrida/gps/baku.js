// Baku (Azerbaijão): o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele tem. O traçado é a linha central real do circuito (pistas.js,
// bacinger/f1-circuits az-2016, MIT); o relevo SRTM, a costa do Cáspio, as plantas e as alturas dos prédios (OpenStreetMap), a muralha, os marcos e as
// barreiras vêm de ../baku.js e ../kit/baku/ (kit/baku/dados.js é gerado por ferramentas/baku-dados.js). As frações (0 a 1) são da volta, a partir da
// linha de chegada, e vêm do gerador (D.frac). O que Baku NÃO tem desliga em `sem`: olhos de gato, setas de autódromo, mastros coloridos, roda-gigante...
// Barreira: NÃO há muro genérico em volta da pista: `muros` (pistas.js) diz onde a pista real tem barreira e a distância dela; o resto é aberto (calçada, escape).
import { cenarioBaku } from "../baku.js";
import { D, relevoBaku, fundoBaku, aguaBaku, distanciaDoMar, NIVEL_DO_MAR } from "../kit/baku/mundo.js";
import { corDoChao } from "../kit/baku/terra.js";
import { pertoDe } from "../kit/som.js";

const BOXES = window.Pistas.PISTAS.baku.boxes; // o corredor dos boxes (pistas.js)
const F = D.frac;

// as gaivotas voam sobre a baía: pontos de água a mais de 200 da costa, espalhados
function gaivotasDaBaia(tr) {
  const out = [], w = tr.t.world;
  for (let k = 0; out.length < 18 && k < 4000; k++) { const x = ((k * 7919) % 1000) / 1000 * w, z = ((k * 104729) % 1000) / 1000 * w; if (distanciaDoMar(x, z) > 200 && distanciaDoMar(x, z) < 900) out.push({ x, z }); }
  return out;
}

export const GP_BAKU = {
  mundo: { relevo: relevoBaku, fundo: fundoBaku, agua: aguaBaku, cor: corDoChao, nivelMar: NIVEL_DO_MAR, banda: (tr) => tr.W / 2 + 26 }, // o chão de verdade (pista.js `mundoDe`)
  asfalto: true,
  chao: {
    margem: "sarjeta", zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 300, fora: 190 }, // as zebras vermelhas e brancas só nas curvas (o meio-fio baixo da transmissão)
    faixasPedestre: [0.06, 0.2, 0.36, 0.52, 0.72, 0.9],
    tracejado: [[0.1, 0.22], [0.78, 0.97]], // a linha do meio da avenida (Azadlig e Neftchilar)
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]], grid: true, remendos: 34, bueiros: 26,
  },
  arquibancadas: { // as tribunas tubulares das fotos, de assentos em rosa, verde-água e azul, atrás da cerca; só onde a barreira está colada (recuo 9)
    trechos: [
      { de: 0.915, ate: 0.975, lado: 1, degraus: 6, cor: "#e07a9c", encosto: "#43bdb0", torcida: ["#e8e8ec", "#c9302c", "#ef7d1a", "#1a4fa8", "#2b8f58"] },
      { de: 0.13, ate: 0.19, lado: -1, degraus: 5, cor: "#43bdb0", encosto: "#e07a9c", torcida: ["#e8e8ec", "#1a4fa8", "#c9302c", "#f0b323"] },
      { de: 0.1, ate: 0.12, lado: 1, degraus: 4, cor: "#e07a9c", encosto: "#5aa4e8", torcida: ["#e8e8ec", "#ef7d1a", "#c9302c"] },
    ],
  },
  cenario: (tr, ctx) => cenarioBaku(tr, ctx, {
    marcasBoxes: ["rolex", "pirelli", "aramco", "dhl"],
    // as placas de patrocínio da barreira por trecho (as das fotos): Qatar Airways na reta, American Express nas curvas 1 e 2, AWS, MSC Cruises na Cidade Velha
    barreiras: {
      placas: [[0, 0.03, "qatar"], [0.03, 0.1, "amex"], [0.1, 0.23, "aws"], [0.23, 0.3, "msc"], [0.3, 0.34, "baku"], [0.34, 0.4, "azer"], [0.4, 0.47, "msc"], [0.47, 0.6, "amex"], [0.6, 0.66, "baku"], [0.66, 0.76, "aws"], [0.76, 1, "qatar"]],
      escapes: [[0.016, 0.056, 1], [0.08, 0.098, 1], [0.228, 0.252, 1]], // o asfalto pintado dos escapes (a física: SUPERFICIES_ESCAPE.baku, as mesmas frações)
      tecpro: [[0.02, 0.052, 1], [0.082, 0.098, 1], [0.23, 0.25, 1], [0.266, 0.282, -1], [0.585, 0.615, 1], [0.65, 0.67, 1]], // blocos Tecpro na frente do concreto das curvas de bater
    },
    porticos: [[0.9, "QATAR AIRWAYS", "#4a1738", "#eadcea"], [0.972, "FORMULA 1 AZERBAIJAN GRAND PRIX", "#1c1f26", "#f2f2f2"], [0.19, "MSC CRUISES", "#0d2757", "#ffffff"], [0.78, "AWS", "#222d3b", "#ffffff"]],
    muralha: [[F.curvas.t7 + 0.004, F.curvas.t18 + 0.005, -1]], // a muralha da Cidade Velha: dentro da volta, à esquerda de quem anda, das curvas 7 à 18
  }),
  boxes: {}, // o corredor dos boxes do kit (garagens, mureta e os quadrados pintados); o prédio é de ../kit/baku/reta.js
  ambiente: { paineis: false, mastros: false, marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo"], posto: "f1", placas: [100, 50] }, // os postos de fiscais e as placas de frenagem
  horizonte: false, // sem os morros genéricos de longe: o morro de verdade é o relevo SRTM do chão
  terreno: { S: 300, pedacos: 6 },
  sem: { outdoors: true, olhos: true, setas: true, mastros: true, rodas: true, dirigivel: true, bandeirolas: true },
  vida: {
    gaivotas: gaivotasDaBaia,
    som: {
      porto: (tr, x, y) => Math.max(0, Math.min(1, 1 - Math.max(0, -distanciaDoMar(x, y)) / 600)), // o mar a sotavento do Bulevar
      cidade: 0.7,
    },
  },
};
void pertoDe;
