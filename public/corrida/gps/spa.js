// Spa-Francorchamps (Circuit de Spa-Francorchamps, GP da Bélgica, nas Ardenas): o que o GP usa do kit (kit/README.md explica cada peça) e o
// que só ele tem, em ../spa.js e ../kit/spa/ (o prédio dos boxes com a torre de vidro, a tribuna principal, a tribuna gigante do Raidillon,
// as casas de enxaimel, o sítio de Stavelot, o riacho do Eau Rouge, as encostas de torcida laranja, o acampamento, a barreira de aço com a
// cerca verde, o muro de pneus, o asfalto de escape pintado, o abetal das Ardenas e os morros verdes). O traçado veio de bacinger/f1-circuits
// (be-1925, licença MIT) por ferramentas/circuitos-f1.js. As frações (0 a 1) são da volta, a partir da linha de chegada:
// reta dos boxes 0,965-0,03 · La Source (grampo) 0,022-0,055 · descida 0,055-0,12 · Eau Rouge 0,125 e Raidillon 0,135-0,185 (subida) · reta de
// Kemmel 0,19-0,31 · Les Combes 0,32-0,355 · Malmedy 0,36-0,375 · Bruxelles (grampo) 0,405-0,435 · Pouhon (dupla à esquerda, em descida)
// 0,515-0,575 · Fagnes 0,615-0,655 · Stavelot 0,68-0,72 · reta Paul Frère 0,72-0,81 · Blanchimont 0,82-0,88 · reta 0,88-0,94 · Bus Stop
// 0,94-0,965. O céu é o nublado das Ardenas (cena.js e ceu.js). Sem marcas registradas de patrocinadores: os painéis são nomes de lugar e de
// comida da região (kit/spa/marcas.js).
import { cenarioSpa, depoisSpa } from "../spa.js";
import { CAMISAS_SPA } from "../kit/spa/torcida.js";

const BOXES = window.Pistas.PISTAS.spa.boxes;
const VERMELHO = "#c8102e", BRANCO = "#f4f4f2", AMARELO = "#f2c500", PRETO = "#1f1f22";
const arq = (de, ate, lado, degraus, cor, encosto, cobertura = false) => ({ de, ate, lado, degraus, cor, encosto, cobertura, torcida: CAMISAS_SPA });

export const GP_SPA = {
  asfalto: true,
  chao: {
    margem: { cor: "#6d6e72" }, // o asfalto cinza da faixa junto da zebra
    zebra: { cores: [VERMELHO, BRANCO], dentro: 340, fora: 220 }, // as zebras vermelhas e brancas
    amarelas: [[0.326, 0.35], [0.944, 0.963], [0.027, 0.046]], // as zebras altas: Les Combes, a chicane do Bus Stop e a saída da La Source
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true, remendos: 26,
  },
  // o escape: brita bege só nos lugares onde o circuito tem caixa de brita (o resto é asfalto, e as pinturas e os pneus são de ../spa.js)
  escape: { corBrita: "#cdbf9a", largura: 26, brita: [[0.322, 0.35, "fora"], [0.41, 0.436, "fora"], [0.618, 0.652, "fora"], [0.15, 0.185, -1]] },
  // as arquibancadas de curva (fitas do kit, de torcida laranja): a tribuna principal e a do Raidillon são de ../spa.js
  arquibancadas: { trechos: [
    arq(0.022, 0.053, -1, 10, AMARELO, PRETO, true), // La Source, por fora do grampo
    arq(0.135, 0.168, 1, 9, VERMELHO, BRANCO), // o Raidillon, por dentro (a encosta do Eau Rouge)
    arq(0.322, 0.35, -1, 9, PRETO, AMARELO, true), arq(0.33, 0.356, 1, 8, VERMELHO, BRANCO), // Les Combes
    arq(0.36, 0.38, -1, 8, AMARELO, PRETO), // Malmedy
    arq(0.404, 0.436, -1, 10, VERMELHO, AMARELO, true), // Bruxelles
    arq(0.524, 0.566, 1, 10, PRETO, AMARELO), // Pouhon, por fora
    arq(0.617, 0.637, 1, 8, AMARELO, VERMELHO), arq(0.64, 0.658, -1, 8, VERMELHO, BRANCO), // Fagnes
    arq(0.684, 0.7, 1, 8, PRETO, AMARELO), // Stavelot
    arq(0.832, 0.868, 1, 9, AMARELO, PRETO), // Blanchimont
    arq(0.944, 0.962, -1, 8, VERMELHO, AMARELO), // o Bus Stop
  ] },
  cenario: (tr, ctx) => cenarioSpa(tr, ctx), // a reta dos boxes, La Source, o Eau Rouge, o Raidillon, as casas, o sítio, a torcida, as barreiras e as placas
  ambiente: {
    marcas: ["spa", "gpbelgica", "ardenas", "eaurouge", "wallonie", "chocolat", "frites", "biere", "gaufres", "eau"],
    outdoors: ["spa", "gpbelgica", "ardenas", "wallonie", "chocolat", "frites", "biere", "gaufres", "oranje", "belgica"],
    posto: "spa", cerca: false, // a cerca de arame verde e a barreira de aço são de ../kit/spa/barreiras.js
    bandeira: [0x000000, 0xef3340, 0xfdda24], placas: [200, 100, 50], // a bandeira da Bélgica (preto, amarelo e vermelho, em faixas verticais) e as placas de 200, 100 e 50 m
  },
  passarelas: { candidatos: [0.305, 0.27, 0.9, 0.78], marcas: ["spa", "wallonie", "gpbelgica"], max: 2 },
  beira: {}, // sem as árvores pálidas de sempre: o abetal e as folhosas são de ../kit/spa/floresta.js, em `depois`
  horizonte: { cor: 0x4f6e46 },
  depois: (tr, ctx) => depoisSpa(tr, ctx),
  vida: {
    gaivotas: [], // não tem mar
    som: { campo: () => 0.9, cidade: 0.06 }, // vento nos abetos e passarinhos; a cidade de Spa fica longe
  },
};
