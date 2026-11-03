// Cidade do México — os letreiros do circuito. Sem marcas registradas novas: são nomes de lugar (bairros, parques, praças, os vulcões) e de comida
// mexicana, no jeito dos painéis de beira de pista, desenhados no canvas como o resto de `kit/marcas.js` (que é quem desenha). Os nomes começam
// com `mx` para não brigar com as marcas das outras pistas.
import { MARCAS } from "../marcas.js";

const ARIAL = "italic 900 {s}px 'Arial Black', Arial, sans-serif", SERIF = "700 {s}px Georgia, serif", SANS = "900 {s}px Arial, sans-serif";

export function registrarMarcasMexico() {
  Object.assign(MARCAS, {
    mxmexico: { fundo: "#006847", cor: "#ffffff", texto: "CIUDAD DE MÉXICO", fonte: ARIAL, moldura: "#ce1126" },
    mxgp: { fundo: "#ce1126", cor: "#ffffff", texto: "GRAN PREMIO DE MÉXICO", fonte: ARIAL, moldura: "#006847" },
    mxforo: { fundo: "#101c14", cor: "#ffd23f", texto: "FORO SOL", fonte: ARIAL, moldura: "#ce1126" },
    mxtacos: { fundo: "#ffcf3f", cor: "#7a1f1f", texto: "TACOS AL PASTOR", fonte: ARIAL, moldura: "#7a1f1f" },
    mxzocalo: { fundo: "#f1e6cf", cor: "#8a1f2b", texto: "ZÓCALO", fonte: SERIF, moldura: "#8a1f2b" },
    mxchapultepec: { fundo: "#2f6a3c", cor: "#f1e6cf", texto: "CHAPULTEPEC", fonte: SERIF, moldura: "#f1e6cf" },
    mxmole: { fundo: "#4a2416", cor: "#ffd9a0", texto: "MOLE POBLANO", fonte: SERIF, moldura: "#ffd9a0" },
    mxelote: { fundo: "#ffe27a", cor: "#006847", texto: "ELOTES", fonte: SANS, moldura: "#006847" },
    mxchurros: { fundo: "#fff1d6", cor: "#b3261e", texto: "CHURROS", fonte: ARIAL, moldura: "#b3261e" },
    mxtamales: { fundo: "#e9d7a8", cor: "#2f6a3c", texto: "TAMALES", fonte: SANS, moldura: "#2f6a3c" },
    mxpozole: { fundo: "#ce1126", cor: "#fff1d6", texto: "POZOLE", fonte: SANS, moldura: "#fff1d6" },
    mxcoyoacan: { fundo: "#1f77b4", cor: "#ffe27a", texto: "COYOACÁN", fonte: SERIF, moldura: "#ffe27a" },
    mxxochimilco: { fundo: "#f26a1b", cor: "#ffffff", texto: "XOCHIMILCO", fonte: ARIAL, moldura: "#ffffff" },
    mxreforma: { fundo: "#ffffff", cor: "#006847", texto: "PASEO DE LA REFORMA", fonte: SANS, moldura: "#006847" },
    mxpopo: { fundo: "#3f5f8a", cor: "#ffffff", texto: "POPOCATÉPETL", fonte: SANS, moldura: "#ffffff" },
    mxizta: { fundo: "#e8eef4", cor: "#3f5f8a", texto: "IZTACCÍHUATL", fonte: SANS, moldura: "#3f5f8a" },
    mxmixhuca: { fundo: "#006847", cor: "#ffd23f", texto: "MAGDALENA MIXHUCA", fonte: SANS, moldura: "#ffd23f" },
    mxlucha: { fundo: "#7a2fbf", cor: "#ffe14f", texto: "LUCHA LIBRE", fonte: ARIAL, moldura: "#ffe14f" },
    mxmariachi: { fundo: "#101c14", cor: "#ffcf3f", texto: "MARIACHI GARIBALDI", fonte: SERIF, moldura: "#ffcf3f" },
    mxjamaica: { fundo: "#b3261e", cor: "#ffffff", texto: "AGUA DE JAMAICA", fonte: SANS, moldura: "#ffffff" },
    mxquesadilla: { fundo: "#ffb347", cor: "#5a1f10", texto: "QUESADILLAS", fonte: SANS, moldura: "#5a1f10" },
  });
}
