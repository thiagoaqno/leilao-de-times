// Jeddah (Arábia Saudita): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (sa-2021, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_JEDDAH = gpSimples("jeddah", {
  rua: true, bandeira: [0x006c35, 0xffffff], marcas: ["aramco", "pirelli", "rolex", "dhl", "heineken", "f1", "aws", "lenovo", "msc"],
  beira: { palmeiras: 0.2, predios: 0.15, vidro: 0.1, cores: ["#efe6d2", "#e6dcc4", "#d9cfb8"], longe: { vidro: 0.2, predios: 0.2 } }, horizonte: false,
});
