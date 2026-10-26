// Bahrein (Bahrein): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (bh-2002, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_BAHREIN = gpSimples("bahrein", {
  bandeira: [0xce1126, 0xffffff], marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc"], zebra: ["#d62828", "#f4f4f4"], margem: "#9a8a6a",
  escape: { britaCurvas: 420, corBrita: "#d8c49a", largura: 26 }, beira: { palmeiras: 0.04, longe: { palmeiras: 0.02 } }, horizonte: false,
});
