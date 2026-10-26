// Austin (Estados Unidos): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (us-2012, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_AUSTIN = gpSimples("austin", {
  bandeira: [0x3c3b6e, 0xb22234], marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc"],
  beira: { arvores: 0.05, longe: { arvores: 0.06 } }, horizonte: false,
});
