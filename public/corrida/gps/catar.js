// Catar (Catar): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (qa-2004, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_CATAR = gpSimples("catar", {
  bandeira: [0x8a1538, 0xffffff], marcas: ["qatar", "pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo"], margem: "#9a8a6a",
  escape: { britaCurvas: 420, corBrita: "#d8c49a", largura: 26 }, beira: { palmeiras: 0.03, longe: {} }, horizonte: false,
});
