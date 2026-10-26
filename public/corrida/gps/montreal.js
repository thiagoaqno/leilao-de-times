// Montreal (Canadá): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (ca-1978, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_MONTREAL = gpSimples("montreal", {
  bandeira: [0xd52b1e, 0xffffff], marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc"], som: { campo: () => 0.8, cidade: 0.2 },
  montanha: { angulo: (-3 * Math.PI) / 4, afastamento: 1500, altura: 380, rocha: "#6f7a66", mato: "#3f5a36", longe: "#9fb0bf" }, // o Mont Royal, a noroeste
  beira: { arvores: 0.3, longe: { arvores: 0.25, vidro: 0.05 } }, horizonte: false,
});
