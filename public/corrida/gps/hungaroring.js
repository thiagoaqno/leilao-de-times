// Hungaroring (Hungria): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (hu-1986, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_HUNGARORING = gpSimples("hungaroring", {
  bandeira: [0xce2939, 0x477050], marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc"],
  beira: { arvores: 0.12, longe: { arvores: 0.2 } }, horizonte: { cor: 0x8a9a6a },
});
