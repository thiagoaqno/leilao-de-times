// Melbourne (Austrália): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (au-1953, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_MELBOURNE = gpSimples("melbourne", {
  bandeira: [0x012169, 0xe4002b], marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc"], som: { campo: () => 0.7, cidade: 0.3 },
  beira: { arvores: 0.25, longe: { arvores: 0.22, vidro: 0.06 } }, horizonte: false,
});
