// Las Vegas (Estados Unidos): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (us-2023, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_LASVEGAS = gpSimples("lasvegas", {
  rua: true, bandeira: [0x3c3b6e, 0xb22234], marcas: ["lv", "pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo"],
  montanha: { angulo: Math.PI, afastamento: 1800, altura: 800, rocha: "#9a7458", mato: "#7a6a52", longe: "#c0a890" }, // as Spring Mountains, a oeste
  beira: { vidro: 0.5, predios: 0.2, palmeiras: 0.08, altura: 160, longe: { vidro: 0.5, predios: 0.3 } }, horizonte: false,
});
