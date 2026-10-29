// Spa-Francorchamps — os letreiros do circuito. Sem marcas registradas de patrocinadores: são nomes de lugar, comidas e bebidas de lá
// (inventados, no jeito dos painéis de beira de pista), desenhados no canvas como o resto de `kit/marcas.js` (que é quem desenha).
import { MARCAS } from "../marcas.js";

export function registrarMarcasSpa() {
  Object.assign(MARCAS, {
    spa: { fundo: "#ffffff", cor: "#15161a", texto: "SPA-FRANCORCHAMPS", fonte: "900 {s}px Arial, sans-serif", moldura: "#c8102e" },
    gpbelgica: { fundo: "#15161a", cor: "#fdda24", texto: "GRAND PRIX DE BELGIQUE", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#ef3340" },
    ardenas: { fundo: "#1f4f2c", cor: "#ffffff", texto: "LES ARDENNES", fonte: "700 {s}px Georgia, serif", moldura: "#ffffff" },
    eaurouge: { fundo: "#c8102e", cor: "#ffffff", texto: "EAU ROUGE", fonte: "900 {s}px Arial, sans-serif" },
    wallonie: { fundo: "#fdda24", cor: "#15161a", texto: "WALLONIE", fonte: "900 {s}px Arial, sans-serif", moldura: "#ef3340" },
    chocolat: { fundo: "#3b2418", cor: "#e8c47c", texto: "CHOCOLAT BELGE", fonte: "700 {s}px Georgia, serif", moldura: "#e8c47c" },
    frites: { fundo: "#fdda24", cor: "#c8102e", texto: "FRITES & MOULES", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif" },
    biere: { fundo: "#7a3b12", cor: "#ffe9b0", texto: "BIERE D'ABBAYE", fonte: "700 {s}px Georgia, serif", moldura: "#ffe9b0" },
    gaufres: { fundo: "#ffffff", cor: "#7a3b12", texto: "GAUFRES DE LIEGE", fonte: "900 {s}px Arial, sans-serif", moldura: "#7a3b12" },
    eau: { fundo: "#2a7fc2", cor: "#ffffff", texto: "EAU DE SPA", fonte: "700 {s}px Arial, sans-serif" },
    oranje: { fundo: "#ff6a13", cor: "#ffffff", texto: "HUP HOLLAND HUP", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#ffffff" },
    belgica: { fundo: "#15161a", cor: "#fdda24", texto: "ALLEZ LA BELGIQUE", fonte: "900 {s}px Arial, sans-serif", moldura: "#ef3340" },
  });
}
