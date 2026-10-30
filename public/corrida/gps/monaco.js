// Mônaco: o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele tem. O traçado é a linha central real do circuito
// (pistas.js); o relevo, a costa, as plantas e as alturas dos prédios, os marcos, o túnel, o porto e as arquibancadas vêm de dados reais
// (../kit/monaco/ e ../monaco.js, gerados por ferramentas/monaco-dados.js). Aqui ficam a configuração e as frações da volta (0 a 1, a partir
// da linha de chegada) de cada curva e de cada trecho, que o gerador mede no traçado de verdade (dados.js `frac`).
// O que Mônaco NÃO tem desliga em `sem`: olhos de gato no muro, placas de seta de autódromo, mastros de bandeira coloridos, roda-gigante,
// dirigível e bandeirolas coloridas (não há pinos nem cones: é rua com guard-rail duplo e cerca de proteção).
import { cenarioMonaco, fundoMonaco } from "../monaco.js";
import { D, distanciaDoMar } from "../kit/monaco/mundo.js";
import { pertoDe } from "../kit/som.js";

const BOXES = window.Pistas.PISTAS.monaco.boxes; // o corredor dos boxes (pistas.js): as linhas SC 1 e SC 2 são a entrada e a saída dele
const F = D.frac;

// as gaivotas voam sobre a bacia do porto: pontos de água a mais de 150 do cais, espalhados
function gaivotasDoPorto(tr) {
  const out = [], w = tr.t.world;
  for (let k = 0; out.length < 14 && k < 4000; k++) { const x = ((k * 7919) % 1000) / 1000 * w, z = ((k * 104729) % 1000) / 1000 * w; if (distanciaDoMar(x, z) > 160 && distanciaDoMar(x, z) < 700) out.push({ x, z }); }
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
  // a barreira de Mônaco: 2 m de altura, painéis de patrocinador de ponta a ponta e guard-rail cinza de duas lâminas onde não há painel (kit/beira.js `estilo: "painel"`)
  guardrail: { estilo: "painel", alto: 20, baixos: [[F.trechos.retaDosBoxes[0], F.trechos.retaDosBoxes[1], -1]], // a reta dos boxes, do lado de fora: guard-rail baixo de aço, com os prédios logo atrás
    paineis: ["rolex", "pirelli", null, "tag", "heineken", null, "dhl", "lenovo"], cores: ["#d62828", "#f4f4f4"] },
  cenario: (tr, ctx) => cenarioMonaco(tr, ctx), // o porto, a piscina, as arquibancadas, o túnel, os prédios reais, os marcos, o Rochedo e as árvores
  boxes: { garagens: true, mureta: true }, // o prédio das garagens fica do lado externo da nova faixa de parada
  ambiente: {}, // cerca de proteção, painéis, bandeiras vermelhas e brancas de Mônaco, postos e placas (os padrões do kit)
  passarelas: { candidatos: [0.03, 0.12, 0.48, 0.58, 0.72, 0.93], marcas: ["rolex", "heineken", "tag"], max: 2 }, // a da Rolex na reta dos boxes
  postes: { passo: 34 },
  montanha: { angulo: -Math.PI / 2, altura: 860 }, // a Tête de Chien, ao norte
  horizonte: false, // sem os morros genéricos de longe: o morro de verdade é o relevo do chão e a Tête de Chien, a `montanha`
  sem: { olhos: true, setas: true, mastros: true, rodas: true, dirigivel: true, bandeirolas: true },
  vida: {
    gaivotas: gaivotasDoPorto,
    som: {
      porto: (tr, x, y) => Math.max(0, Math.min(1, 1 - Math.max(0, -fundoMonaco(tr, x, y)) / 450)),
      fonte: pertoDe((tr) => tr.pracaCassino, 420),
      sinos: pertoDe((tr) => tr.capelaMonaco, 900),
    },
  },
};
