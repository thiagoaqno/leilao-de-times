// Singapura (Singapura): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (sg-2008, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_SINGAPURA = gpSimples("singapura", {
  rua: true, bandeira: [0xef3340, 0xffffff], marcas: ["msc", "pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo"],
  beira: { palmeiras: 0.15, predios: 0.25, vidro: 0.35, altura: 140, longe: { vidro: 0.6, predios: 0.3 } }, horizonte: false,
});
