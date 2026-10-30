// Mônaco: o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele tem. O traçado é a linha central real do circuito
// (pistas.js); o relevo, a costa, as plantas e as alturas dos prédios, os marcos, o túnel, o porto e as arquibancadas vêm de dados reais
// (../kit/monaco/ e ../monaco.js, gerados por ferramentas/monaco-dados.js). Aqui ficam a configuração e as frações da volta (0 a 1, a partir
// da linha de chegada) de cada curva e de cada trecho, que o gerador mede no traçado de verdade (dados.js `frac`).
// O que Mônaco NÃO tem desliga em `sem`: olhos de gato no muro, placas de seta de autódromo, mastros de bandeira coloridos, roda-gigante,
// dirigível e bandeirolas coloridas (não há pinos nem cones: é rua com guard-rail duplo e cerca de proteção).
import { cenarioMonaco, fundoMonaco, vidaMonaco } from "../monaco.js";
import { D, distanciaDoMar } from "../kit/monaco/mundo.js";
import { pertoDe } from "../kit/som.js";
import { PORTICO_ADIANTE } from "../kit/monaco/detalhes.js";

const BOXES = window.Pistas.PISTAS.monaco.boxes; // o corredor dos boxes (pistas.js): as linhas SC 1 e SC 2 são a entrada e a saída dele
const F = D.frac;

// as gaivotas voam sobre a bacia do porto: pontos de água a mais de 150 do cais, espalhados
function gaivotasDoPorto(tr) {
  const out = [], w = tr.t.world;
  for (let k = 0; out.length < 22 && k < 4000; k++) { const x = ((k * 7919) % 1000) / 1000 * w, z = ((k * 104729) % 1000) / 1000 * w; if (distanciaDoMar(x, z) > 160 && distanciaDoMar(x, z) < 700) out.push({ x, z }); }
  return out;
}

export const GP_MONACO = {
  asfalto: true, // o asfalto de GP de asfalto-gp.js, com as linhas de borda e a borracha
  chao: {
    margem: "sarjeta",
    amarelas: [F.trechos.nouvelleChicane, F.trechos.piscine], // Nouvelle Chicane e Piscine
    faixasPedestre: F.faixas,
    tracejado: F.tracejado, // a linha do meio da rua: a Avenue d'Ostende, a Boulevard Albert 1er e o cais
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true, remendos: 46, bueiros: 40,
  },
  // A barreira de Mônaco: UM muro físico pela volta inteira (`tr.wallLat`; o desenho e a colisão ficam no mesmo lugar), mas o visual muda trecho a trecho, como na transmissão (kit/beira.js
  // `estilo: "monaco"`: lâminas de aço embaixo e a faixa de patrocínio em cima, uma marca por trecho; `painel: false`: só as lâminas; `estilo: "tunel"`: a barreira branca do túnel). `alto`: a altura
  // (20 a barreira alta com painel, 12 a mureta). `ambiente.semCerca` tira a cerca alta de detritos de alguns trechos. Mapa trecho -> estilo, nas frações da volta (de, ate; a reta dos boxes cruza a linha de chegada):
  //   reta dos boxes e pórtico: Rolex e TAG Heuer · Sainte Dévote: Pirelli (com Tecpro) · subida da Beau Rivage: lâminas nuas com a cerca alta · Massenet e Cassino: Louis Vuitton ·
  //   Mirabeau, grampo e Portier: F1 TV e #MonacoGP (trechos de TV) · túnel: barreira branca "Monaco Circuit" · saída do túnel e chicane: Salesforce · cais: Louis Vuitton, mureta baixa, sem cerca ·
  //   Tabac e Piscine: Aramco, DHL e Heineken · Rascasse: Heineken e #MonacoGP · Anthony Noghès: lâminas nuas, sem cerca.
  guardrail: {
    estilo: "monaco", alto: 20, trecho: 360, sequencia: ["rolex", "tag", "pirelli", "aramco", "dhl", "lv", "salesforce", "heineken", "monacogp", "f1tv"],
    trechos: [
      { de: F.trechos.retaDosBoxes[0], ate: F.trechos.retaDosBoxes[1], sequencia: ["rolex", "tag"] },
      { de: F.trechos.retaDosBoxes[1], ate: 0.105, sequencia: ["pirelli"] },
      { de: 0.105, ate: 0.225, painel: false, alto: 12 },
      { de: 0.225, ate: 0.31, sequencia: ["lv"] },
      { de: 0.31, ate: F.trechos.tunel[0] - 0.003, sequencia: ["f1tv", "monacogp"] },
      { de: F.trechos.tunel[0] - 0.003, ate: F.trechos.tunel[1] + 0.003, estilo: "tunel", alto: 12, vLen: 176 },
      { de: F.trechos.tunel[1] + 0.003, ate: 0.66, sequencia: ["salesforce"] },
      { de: 0.66, ate: F.trechos.cais[1], sequencia: ["lv"], alto: 12 },
      { de: F.trechos.cais[1], ate: 0.85, sequencia: ["aramco", "dhl", "heineken"] },
      { de: 0.85, ate: 0.9, sequencia: ["heineken", "monacogp"] },
      { de: 0.9, ate: F.trechos.retaDosBoxes[0], painel: false, alto: 12 },
    ],
  },
  cenario: (tr, ctx) => cenarioMonaco(tr, ctx), // o porto, a piscina, as arquibancadas, o túnel, os prédios reais, os marcos, o Rochedo e as árvores
  boxes: { garagens: true, mureta: true }, // o prédio das garagens fica do lado externo da nova faixa de parada
  ambiente: { paineis: false, mastros: false, semCerca: [[0.66, F.trechos.cais[1]], [0.9, F.trechos.retaDosBoxes[0]]] }, // a cerca de detritos, os postos de fiscais e as placas de frenagem (a barreira e os painéis são do guardrail acima)
  passarelas: { candidatos: [0.03, 0.12, 0.48, 0.58, 0.72, 0.93], marcas: ["rolex", "heineken", "tag"], max: 2 }, // a da Rolex na reta dos boxes
  portico: { adiante: PORTICO_ADIANTE }, // o pórtico das luzes de largada fica 260 depois da linha de chegada (a pole o vê lá na frente)
  postes: { passo: 34 },
  montanha: { angulo: -Math.PI / 2, altura: 860 }, // a Tête de Chien, ao norte
  terreno: { S: 250, pedacos: 4 }, // o morro é suave (o MDE é borrado): grade de 33 unidades e 4 × 4 pedaços bastam, e poupam malhas e triângulos
  horizonte: false, // sem os morros genéricos de longe: o morro de verdade é o relevo do chão e a Tête de Chien, a `montanha`
  sem: { outdoors: true, olhos: true, setas: true, mastros: true, rodas: true, dirigivel: true, bandeirolas: true },
  vida: {
    gaivotas: gaivotasDoPorto,
    som: {
      porto: (tr, x, y) => Math.max(0, Math.min(1, 1 - Math.max(0, -fundoMonaco(tr, x, y)) / 450)),
      fonte: pertoDe((tr) => tr.pracaCassino, 420),
      sinos: pertoDe((tr) => tr.capelaMonaco, 900),
    },
  },
};
