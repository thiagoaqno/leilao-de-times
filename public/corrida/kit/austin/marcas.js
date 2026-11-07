// Austin (Circuit of the Americas) — os letreiros do circuito. Sem marcas registradas de patrocinadores: são nomes de lugar do Texas, a comida de lá e o
// apelido do estado, no jeito dos painéis de beira de pista, desenhados no canvas como o resto de `kit/marcas.js` (que é quem desenha). Os nomes
// começam com `tx` para não brigar com as marcas das outras pistas.
import { MARCAS } from "../marcas.js";

const ARIAL = "italic 900 {s}px 'Arial Black', Arial, sans-serif", SERIF = "700 {s}px Georgia, serif", SANS = "900 {s}px Arial, sans-serif";

export function registrarMarcasAustin() {
  Object.assign(MARCAS, {
    txaustin: { fundo: "#ffffff", cor: "#bf0a30", texto: "AUSTIN, TEXAS", fonte: ARIAL, moldura: "#002868" },
    txgp: { fundo: "#002868", cor: "#ffffff", texto: "UNITED STATES GRAND PRIX", fonte: ARIAL, moldura: "#bf0a30" },
    txbigred: { fundo: "#bf0a30", cor: "#ffffff", texto: "BIG RED", fonte: ARIAL, moldura: "#ffffff" },
    txhill: { fundo: "#e9dcb4", cor: "#4a3a1c", texto: "TEXAS HILL COUNTRY", fonte: SERIF, moldura: "#4a3a1c" },
    txlonestar: { fundo: "#002868", cor: "#ffffff", texto: "LONE STAR STATE", fonte: SANS, moldura: "#bf0a30" },
    txbbq: { fundo: "#3a2418", cor: "#ffd9a0", texto: "TEXAS BARBECUE", fonte: SERIF, moldura: "#ffd9a0" },
    txbrisket: { fundo: "#bf0a30", cor: "#fff1d6", texto: "SMOKED BRISKET", fonte: SANS, moldura: "#fff1d6" },
    txtacos: { fundo: "#ffcf3f", cor: "#7a1f1f", texto: "BREAKFAST TACOS", fonte: ARIAL, moldura: "#7a1f1f" },
    txkolache: { fundo: "#f6e7c8", cor: "#8a4a1f", texto: "KOLACHES", fonte: SERIF, moldura: "#8a4a1f" },
    txqueso: { fundo: "#f2a31b", cor: "#4a1f10", texto: "CHILE CON QUESO", fonte: SANS, moldura: "#4a1f10" },
    txpecan: { fundo: "#5a3418", cor: "#ffe9b0", texto: "PECAN PIE", fonte: SERIF, moldura: "#ffe9b0" },
    txtea: { fundo: "#fff4d6", cor: "#a1340f", texto: "SWEET TEA", fonte: ARIAL, moldura: "#a1340f" },
    txmusica: { fundo: "#15161a", cor: "#ffd23f", texto: "LIVE MUSIC CAPITAL", fonte: ARIAL, moldura: "#bf0a30" },
    txcolorado: { fundo: "#2a7fc2", cor: "#ffffff", texto: "COLORADO RIVER", fonte: SANS, moldura: "#ffffff" },
    txbluebonnet: { fundo: "#3f4fc2", cor: "#ffffff", texto: "BLUEBONNET", fonte: SERIF, moldura: "#ffffff" },
    txpedernales: { fundo: "#4f7a3c", cor: "#f6f1de", texto: "PEDERNALES FALLS", fonte: SANS, moldura: "#f6f1de" },
    txzilker: { fundo: "#2f6a3c", cor: "#ffe9b0", texto: "ZILKER PARK", fonte: SERIF, moldura: "#ffe9b0" },
    txcongress: { fundo: "#ffffff", cor: "#002868", texto: "CONGRESS AVENUE", fonte: SANS, moldura: "#002868" },
    txtorre: { fundo: "#bf0a30", cor: "#ffffff", texto: "TORRE DE OBSERVAÇÃO", fonte: SANS, moldura: "#ffffff" },
  });
}
