// Spa-Francorchamps (Bélgica): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (be-1925, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_SPA = gpSimples("spa", {
  bandeira: [0x000000, 0xfdda24, 0xef3340], marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc"],
  parque: { recuo: 26, fundo: 170, alturas: [130, 230], densidade: 0.9 }, // a floresta das Ardenas
  horizonte: { cor: 0x4f6e46 },
});
