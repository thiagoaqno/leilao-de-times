// Zandvoort — os letreiros do circuito. Sem marcas registradas de patrocinadores: são nomes de lugar, de curva, da cultura de arquibancada
// e comidas da Holanda (inventados, no jeito dos painéis de beira de pista), desenhados no canvas como o resto de `kit/marcas.js` (que é
// quem desenha). Os nomes começam com `nl` para não brigar com as marcas das outras pistas.
import { MARCAS } from "../marcas.js";

export function registrarMarcasZandvoort() {
  Object.assign(MARCAS, {
    nlzandvoort: { fundo: "#ff6a13", cor: "#ffffff", texto: "CIRCUIT ZANDVOORT", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#ffffff" },
    nlgp: { fundo: "#21468b", cor: "#ffffff", texto: "GROTE PRIJS VAN NEDERLAND", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#ae1c28" },
    nlnoordzee: { fundo: "#1b6b8f", cor: "#ffffff", texto: "NOORDZEE", fonte: "900 {s}px Arial, sans-serif", moldura: "#ffffff" },
    nlduinen: { fundo: "#e8dcb0", cor: "#3f5a2b", texto: "DUINEN", fonte: "700 {s}px Georgia, serif", moldura: "#3f5a2b" },
    nlholland: { fundo: "#ff6a13", cor: "#ffffff", texto: "HUP HOLLAND HUP", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#21468b" },
    nloranje: { fundo: "#ffffff", cor: "#ff6a13", texto: "ORANJE BOVEN", fonte: "900 {s}px Arial, sans-serif", moldura: "#ff6a13" },
    nltulpen: { fundo: "#ae1c28", cor: "#ffffff", texto: "TULPEN VAN HOLLAND", fonte: "700 {s}px Georgia, serif" },
    nlkaas: { fundo: "#f2c230", cor: "#21468b", texto: "KAAS VAN HOLLAND", fonte: "900 {s}px Arial, sans-serif", moldura: "#21468b" },
    nlstroop: { fundo: "#7a3b12", cor: "#ffe9b0", texto: "STROOPWAFEL", fonte: "700 {s}px Georgia, serif", moldura: "#ffe9b0" },
    nlbitter: { fundo: "#ffffff", cor: "#ae1c28", texto: "BITTERBALLEN", fonte: "900 {s}px Arial, sans-serif", moldura: "#ae1c28" },
    nlhagel: { fundo: "#21468b", cor: "#ffd23f", texto: "HAGELSLAG", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif" },
    nlstrand: { fundo: "#f6efd8", cor: "#1b6b8f", texto: "STRAND ZANDVOORT", fonte: "700 {s}px Georgia, serif", moldura: "#1b6b8f" },
  });
}
