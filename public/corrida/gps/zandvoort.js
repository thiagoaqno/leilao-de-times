// Zandvoort (Países Baixos): o GP simples do kit (kit/gp-simples.js: asfalto, zebras, grid, escape, arquibancada, prédio dos
// boxes, painéis, bandeira, passarela e som), enquanto não ganha o cenário fino de cada canto. O traçado veio de
// bacinger/f1-circuits (nl-1948, licença MIT) por ferramentas/circuitos-f1.js; as frações (0 a 1) são da volta, a partir da linha de chegada.
import { gpSimples } from "../kit/gp-simples.js";

export const GP_ZANDVOORT = gpSimples("zandvoort", {
  bandeira: [0xae1c28, 0x21468b], marcas: ["heineken", "pirelli", "rolex", "aramco", "dhl", "f1", "aws", "lenovo", "msc"], corTribuna: "#ff7a00", // a torcida laranja
  escape: { britaCurvas: 420, corBrita: "#e6d7ae", largura: 26 }, beira: { arvores: 0.03, longe: { arvores: 0.04 } }, horizonte: false,
});
