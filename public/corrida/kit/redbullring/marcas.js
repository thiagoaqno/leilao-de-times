// Red Bull Ring — os letreiros do circuito. Sem marcas registradas de patrocinadores: são nomes de lugar e de comida da Estíria (o vale do
// Mur, Spielberg, Zeltweg, Knittelfeld, Seckau; óleo de semente de abóbora, frango empanado, strudel, vinho Schilcher), inventados no jeito dos painéis de
// beira de pista e desenhados no canvas por `kit/marcas.js` (que é quem desenha).
import { MARCAS } from "../marcas.js";

export function registrarMarcasAustria() {
  Object.assign(MARCAS, {
    spielberg: { fundo: "#ffffff", cor: "#15161a", texto: "SPIELBERG", fonte: "900 {s}px Arial, sans-serif", moldura: "#c8102e" },
    gpaustria: { fundo: "#c8102e", cor: "#ffffff", texto: "GROSSER PREIS VON ÖSTERREICH", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#ffffff" },
    steiermark: { fundo: "#1f5a35", cor: "#ffffff", texto: "STEIERMARK", fonte: "700 {s}px Georgia, serif", moldura: "#ffffff" },
    murtal: { fundo: "#ffffff", cor: "#1f5a35", texto: "MURTAL", fonte: "900 {s}px Arial, sans-serif", moldura: "#1f5a35" },
    kernoel: { fundo: "#26331f", cor: "#e7d27a", texto: "STEIRISCHES KÜRBISKERNÖL", fonte: "700 {s}px Georgia, serif", moldura: "#e7d27a" },
    backhendl: { fundo: "#f2c500", cor: "#c8102e", texto: "STEIRISCHES BACKHENDL", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif" },
    strudel: { fundo: "#ffffff", cor: "#7a3b12", texto: "APFELSTRUDEL", fonte: "900 {s}px Arial, sans-serif", moldura: "#7a3b12" },
    schilcher: { fundo: "#a8334a", cor: "#ffffff", texto: "SCHILCHER AUS DER STEIERMARK", fonte: "700 {s}px Georgia, serif", moldura: "#ffffff" },
    zeltweg: { fundo: "#15161a", cor: "#ffffff", texto: "ZELTWEG", fonte: "900 {s}px Arial, sans-serif", moldura: "#c8102e" },
    knittelfeld: { fundo: "#2b5aa8", cor: "#ffffff", texto: "KNITTELFELD", fonte: "700 {s}px Arial, sans-serif" },
    seckau: { fundo: "#f4efe0", cor: "#3a2c22", texto: "STIFT SECKAU", fonte: "700 {s}px Georgia, serif", moldura: "#3a2c22" },
    aichfeld: { fundo: "#e8f1de", cor: "#1f5a35", texto: "AICHFELD", fonte: "900 {s}px Arial, sans-serif", moldura: "#1f5a35" },
    mur: { fundo: "#2a7fc2", cor: "#ffffff", texto: "MURTALER BRUNNENWASSER", fonte: "700 {s}px Arial, sans-serif" },
    oesterreich: { fundo: "#c8102e", cor: "#ffffff", texto: "SERVUS ÖSTERREICH", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#ffffff" },
    pistas: { fundo: "#15161a", cor: "#ffffff", texto: "SPIELBERG · STEIERMARK · ÖSTERREICH", fonte: "900 {s}px Arial, sans-serif", moldura: "#c8102e" },
  });
}
