// Abu Dhabi (Emirados Árabes): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (ae-2009, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_ABUDHABI = gpSimples("abudhabi", {
  bandeira: [0x00732f, 0xef3340], marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc"], margem: "#8a7e6a",
  beira: { palmeiras: 0.12, vidro: 0.15, longe: { vidro: 0.15 } }, horizonte: false,
});
