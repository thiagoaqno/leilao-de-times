// Cidade do México (México): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (mx-1962, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_MEXICO = gpSimples("mexico", {
  bandeira: [0x006847, 0xce1126], marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc"],
  montanha: { angulo: Math.PI / 4, afastamento: 1700, altura: 1100, rocha: "#7a7468", mato: "#4f5e3e", longe: "#a8b4c4" }, // o Popocatépetl, a sudeste
  beira: { arvores: 0.1, longe: { predios: 0.3, arvores: 0.1 } }, horizonte: { cor: 0x8a8a7a },
});
