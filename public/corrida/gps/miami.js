// Miami (Estados Unidos): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (us-2022, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_MIAMI = gpSimples("miami", {
  bandeira: [0x3c3b6e, 0xb22234], marcas: ["crypto", "pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo"], som: { campo: () => 0.5, cidade: 0.4 }, corTribuna: "#00a3ad",
  beira: { palmeiras: 0.25, predios: 0.06, longe: { palmeiras: 0.15, vidro: 0.1 } }, horizonte: false,
});
