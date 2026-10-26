// Red Bull Ring (Áustria): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (at-1969, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_REDBULLRING = gpSimples("redbullring", {
  bandeira: [0xc8102e, 0xffffff], marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc"],
  montanha: { angulo: -Math.PI / 2, afastamento: 1400, altura: 1000, rocha: "#7d776c", mato: "#3f5a36", longe: "#9fb0c4" }, // os Alpes da Estíria, ao norte
  beira: { arvores: 0.15, longe: { arvores: 0.3 } }, horizonte: { cor: 0x56704e },
});
