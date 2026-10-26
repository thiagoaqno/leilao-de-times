// Xangai (China): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (cn-2004, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_XANGAI = gpSimples("xangai", {
  bandeira: [0xde2910, 0xffde00], marcas: ["lenovo", "pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "msc"],
  beira: { arvores: 0.05, longe: { vidro: 0.12, predios: 0.1, arvores: 0.05 } }, horizonte: false,
});
