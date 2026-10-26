// Baku (Azerbaijão): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (az-2016, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_BAKU = gpSimples("baku", {
  rua: true, bandeira: [0x00b5e2, 0xef3340], marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc"],
  beira: { predios: 0.6, arvores: 0.05, cores: ["#d9c9a3", "#cdb98f", "#e6dcc4", "#bfae8a"], longe: { predios: 0.6, vidro: 0.1 } }, horizonte: { cor: 0xa89a7a },
});
