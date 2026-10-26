// Madri (Espanha): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (es-2026, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_MADRI = gpSimples("madri", {
  bandeira: [0xc60b1e, 0xffc400], marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc"],
  montanha: { angulo: (-3 * Math.PI) / 4, afastamento: 1700, altura: 760, rocha: "#8a8478", mato: "#5e6648", longe: "#a8b4c4" }, // a serra de Guadarrama, a noroeste
  beira: { arvores: 0.05, predios: 0.1, longe: { predios: 0.2, vidro: 0.1 } }, horizonte: { cor: 0x9a9472 },
});
