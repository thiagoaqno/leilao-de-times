// Singapura (Marina Bay Street Circuit, GP de Singapura, à noite): o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele tem, em
// ../singapura.js e ../kit/singapura/. O traçado é a linha central real do circuito de 19 curvas (bacinger/f1-circuits, no sentido anti-horário de
// verdade; ferramentas/singapura-dados.js); os prédios (planta e altura), a baía, o rio, os parques e as árvores são do OpenStreetMap.
// SEM muro em volta: as barreiras (concreto com a tela de detritos, Tecpro nos escapes curtos) só existem onde a pista real tem, em `muros`
// (pistas.js), e a colisão usa os mesmos trechos. O resto é rua aberta, calçada, escape pintado e a orla da baía.
// As frações (0 a 1) são da volta, a partir da linha de chegada, que fica na reta dos boxes (sobe para o norte, em frente ao Pit Building):
//   reta dos boxes 0,945-0,056 · T1 (esquerda, sob a ponte Benjamin Sheares) 0,056 · T2 0,071 · T3 0,088 · T4 0,113 · T5 (Republic Boulevard) 0,166 ·
//   Raffles Boulevard 0,19-0,32 · T6 0,263 · T7 Memorial 0,337 · T8 0,38 · T9 0,417 · reta do Padang (St Andrew's Road) 0,42-0,51 · T10 0,517 ·
//   T11 0,539 · T12 0,553 · Anderson Bridge 0,56-0,58 · T13 (o grampo em frente ao Fullerton) 0,591 · Esplanade Bridge e Esplanade Drive 0,6-0,69 ·
//   T14 (Raffles Avenue) 0,704 · T15 0,758 · reta da Raffles Avenue 0,76-0,85 · T16 0,854 · T17 0,864 · T18 0,925 · T19 0,948 (o Singapore Flyer).
import { cenarioSingapura, depoisSingapura } from "../singapura.js";
import { D } from "../kit/singapura/mundo.js";
import { alturaDoTerreno, corDoChao, distanciaDaAgua } from "../kit/singapura/mundo.js";
import { PATROCINIO_SG } from "../kit/singapura/barreiras.js";
import { pertoDe } from "../kit/som.js";

const BOXES = window.Pistas.PISTAS.singapura.boxes;
const F = D.frac.curvas;

export const GP_SINGAPURA = {
  asfalto: true,
  chao: {
    margem: { cor: "#5a5b60" }, // o asfalto de rua que sobra até a zebra
    zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 260, fora: 150 }, // as zebras vermelhas e brancas, nas curvas
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true, remendos: 30, bueiros: 26,
  },
  // as arquibancadas de verdade (blocos de cadeiras azuis, amarelas e vermelhas, como nas fotos): a do outro lado da reta dos boxes, a do Padang e a Bay Grandstand na Raffles Avenue
  arquibancadas: { trechos: [
    { de: 0.955, ate: 0.052, lado: 1, degraus: 8, cor: "#2b57bd", encosto: "#f2c21a", cobertura: false },
    { de: 0.435, ate: 0.5, lado: -1, degraus: 8, cor: "#d63a32", encosto: "#2b57bd", cobertura: false },
    { de: 0.775, ate: 0.84, lado: 1, degraus: 8, cor: "#f2c21a", encosto: "#2fa05a", cobertura: false },
  ] },
  murosProprios: true, // o desenho das barreiras é de ../kit/singapura/barreiras.js, em cima de tr.murosEscape (os mesmos trechos da colisão)
  cenario: (tr, ctx) => cenarioSingapura(tr, ctx), // a água, os prédios, os marcos, as barreiras, as arquibancadas e o pit building
  depois: (tr, ctx) => depoisSingapura(tr, ctx), // a luz da noite, as árvores e a vida
  terreno: { S: 240, pedacos: 6, altura: alturaDoTerreno, cor: corDoChao }, // a baía e o rio afundam o chão; a cor sai dos parques e das ruas
  boxes: { garagens: false, mureta: true }, // só o corredor e a mureta: as garagens, o Pit Building e os terraços são de ../kit/singapura/boxes.js
  ambiente: { paineis: false, mastros: false, cerca: false, marcas: PATROCINIO_SG, posto: "sia", placas: [100, 50], outdoors: PATROCINIO_SG, bandeira: [0xef3340, 0xffffff] }, // a barreira, a tela e os painéis são nossos
  horizonte: false, // sem os morros genéricos: o horizonte é a cidade
  beira: {}, // sem as árvores, os prédios e as palmeiras genéricos: tudo vem dos dados reais
  sem: { outdoors: true, olhos: true, setas: true, mastros: true, rodas: true, dirigivel: true, bandeirolas: true }, // Singapura tem a Flyer de verdade (kit/singapura/flyer.js), não a roda-gigante do kit
  vida: {
    helicoptero: true,
    gaivotas: (tr) => [[4500, 5800], [3300, 5600], [5200, 5500]].map(([x, z]) => ({ x, z, raio: 260 })).filter((g) => distanciaDaAgua(g.x, g.z) > 0), // sobre a baía
    som: {
      cidade: () => 0.9,
      porto: (tr, x, y) => Math.max(0, Math.min(1, 1 - Math.max(0, -distanciaDaAgua(x, y)) / 420)),
      campo: () => 0,
    },
  },
};
void F; void pertoDe;
