// Austin (Circuit of the Americas, GP dos Estados Unidos, no Texas): o que o GP usa do kit (kit/README.md explica cada peça) e o que só ele tem, em ../austin.js e
// ../kit/austin/ (a Torre de Observação vermelha, o anfiteatro, a Grande Praça, a arquibancada vermelha de Big Red, o nome pintado no escape, a bandeira gigante no
// alto do morro, o palco do miolo, a galera de chapéu de vaqueiro, a paisagem seca do Texas e os morros do Hill Country). O traçado veio de bacinger/f1-circuits
// (us-2012, licença MIT) por ferramentas/circuitos-f1.js. As frações (0 a 1) são da volta, a partir da linha de chegada (o circuito corre no sentido anti-horário):
// reta dos boxes 0,94-0,03 · subida de 11% até a curva 1, Big Red (grampo à esquerda no alto do morro) 0,052-0,07 · descida da curva 2 0,09-0,12 · S rápidos das
// curvas 3 a 6 (como Maggotts-Becketts-Chapel de Silverstone) 0,148-0,236 · curvas 7 a 9 0,25-0,305 · curva 10 0,34 · curva 11 (grampo, o ponto mais longe da linha
// de chegada) 0,407-0,418 · reta de trás (1 km) 0,42-0,62 · curva 12 0,63 · curvas 13 e 14 0,665-0,69 · curva 15 0,707-0,726 (a seção do estádio, 12 a 15, lembra a de
// Hockenheim) · curvas 16 a 18 (o multiapex à direita) 0,752-0,82 · curva 19 0,854-0,863 · curva 20 (a última, e a entrada dos boxes) 0,906-0,918. O céu é o
// limpo e claro do Texas (cena.js e ceu.js). O asfalto de escape pintado de vermelho e azul NÃO entrou: não achei fonte que confirme as cores; o escape é de asfalto
// liso e só a curva 11 tem brita (o circuito pôs uma caixa de brita ali). Sem marcas registradas de patrocinadores: os painéis são nomes de lugar e de comida do
// Texas (kit/austin/marcas.js).
import { cenarioAustin, depoisAustin, corDoChao } from "../austin.js";

const BOXES = window.Pistas.PISTAS.austin.boxes;
const VERMELHO = "#bf0a30", BRANCO = "#f4f4f2";

export const GP_AUSTIN = {
  asfalto: true,
  chao: {
    margem: { cor: "#6d6e72" }, // o asfalto cinza da faixa junto da zebra
    zebra: { cores: [VERMELHO, BRANCO], dentro: 340, fora: 220 }, // as zebras vermelhas e brancas
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true, remendos: 26,
  },
  // o escape: a brita bege-calcária só na curva 11; o resto é asfalto liso (os trechos estão em SUPERFICIES_ESCAPE.austin, em ../pistas.js, e valem para a física)
  escape: { corBrita: "#cdbf9a", cores: ["#5d5e63", "#58595e"] },
  cenario: (tr, ctx) => cenarioAustin(tr, ctx), // a reta dos boxes, Big Red, a torre, o anfiteatro, a praça, o palco, as arquibancadas, a galera e as placas
  ambiente: {
    marcas: ["txaustin", "txgp", "txhill", "txlonestar", "txbbq", "txbrisket", "txtacos", "txkolache", "txqueso", "txpecan", "txtea", "txmusica"],
    outdoors: ["txaustin", "txgp", "txhill", "txlonestar", "txbbq", "txtacos", "txqueso", "txpecan", "txmusica", "txcolorado"],
    posto: "txaustin", cerca: false,
    bandeira: [0xbf0a30, 0xf4f4f2], placas: [200, 100, 50], // vermelho e branco nos mastros do circuito e as placas de 200, 100 e 50 m
  },
  passarelas: { candidatos: [0.1525, 0.7525, 0.7475, 0.1475, 0.157, 0.757], marcas: ["txaustin", "txgp", "txhill"], max: 2 }, // as duas passarelas do circuito: sobre as curvas 3 e 16
  beira: {}, // sem as árvores pálidas de sempre: a vegetação do Texas é de ../kit/austin/terra.js, em `depois`
  horizonte: false, // os morros do Hill Country são de ../kit/austin/terra.js
  terreno: { cor: (tr) => corDoChao(tr) }, // o chão de capim dourado, terra clara e calcário
  depois: (tr, ctx) => depoisAustin(tr, ctx),
  vida: {
    gaivotas: [], // não tem mar
    som: { campo: () => 0.9, cidade: 0.1 }, // vento e cigarras no campo seco; Austin fica longe
  },
};
