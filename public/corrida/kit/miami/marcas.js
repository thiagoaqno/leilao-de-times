// Miami — os letreiros do circuito. Sem marcas registradas novas: são nomes de lugar (a baía, as praias, os bairros) e de comida da Flórida,
// no jeito dos painéis de beira de pista, desenhados no canvas como o resto de `kit/marcas.js` (que é quem desenha). Os nomes começam com
// `mi` para não brigar com as marcas das outras pistas.
import { MARCAS } from "../marcas.js";

const ARIAL = "italic 900 {s}px 'Arial Black', Arial, sans-serif", SERIF = "700 {s}px Georgia, serif", SANS = "900 {s}px Arial, sans-serif";

export function registrarMarcasMiami() {
  Object.assign(MARCAS, {
    mimiami: { fundo: "#00b3b8", cor: "#ffffff", texto: "MIAMI GARDENS", fonte: ARIAL, moldura: "#ff5fa2" },
    migp: { fundo: "#ff5fa2", cor: "#ffffff", texto: "GP DE MIAMI", fonte: ARIAL, moldura: "#00b3b8" },
    mibiscayne: { fundo: "#0b5d8f", cor: "#ffffff", texto: "BAÍA BISCAYNE", fonte: SANS, moldura: "#8fe3e6" },
    mikeylime: { fundo: "#d9ef6a", cor: "#1b5e20", texto: "KEY LIME PIE", fonte: SERIF, moldura: "#1b5e20" },
    micafecito: { fundo: "#5a2f17", cor: "#ffe3b8", texto: "CAFECITO", fonte: SERIF, moldura: "#ffe3b8" },
    mipastelito: { fundo: "#ffd27a", cor: "#b3261e", texto: "PASTELITOS", fonte: SANS, moldura: "#b3261e" },
    microqueta: { fundo: "#ffffff", cor: "#e4572e", texto: "CROQUETAS", fonte: SANS, moldura: "#e4572e" },
    mistone: { fundo: "#e4572e", cor: "#ffffff", texto: "STONE CRAB", fonte: ARIAL },
    miceviche: { fundo: "#7fd6c2", cor: "#0b3d3a", texto: "CEVICHE", fonte: SANS, moldura: "#0b3d3a" },
    miwynwood: { fundo: "#7a2fbf", cor: "#ffe14f", texto: "WYNWOOD", fonte: ARIAL },
    miocean: { fundo: "#ffffff", cor: "#00a3ad", texto: "OCEAN DRIVE", fonte: SERIF, moldura: "#ff5fa2" },
    mimarina: { fundo: "#0b2a5b", cor: "#ffffff", texto: "MARINA CLUB", fonte: SANS, moldura: "#ff5fa2" },
    mipraia: { fundo: "#fff1cc", cor: "#ff5fa2", texto: "SOUTH BEACH", fonte: SERIF, moldura: "#00a3ad" },
    micalle: { fundo: "#ffcf3f", cor: "#7a1f2b", texto: "CALLE OCHO", fonte: ARIAL },
    misol: { fundo: "#ff9f1c", cor: "#ffffff", texto: "SUNSHINE STATE", fonte: ARIAL, moldura: "#ffffff" },
    mieverglades: { fundo: "#2e7d32", cor: "#e8f5c8", texto: "EVERGLADES", fonte: SERIF, moldura: "#e8f5c8" },
    mimanga: { fundo: "#ffb347", cor: "#7a2e00", texto: "MANGO & LIMÃO", fonte: SANS, moldura: "#7a2e00" },
    mibeach: { fundo: "#00a3ad", cor: "#fff1cc", texto: "BEACH CLUB", fonte: ARIAL, moldura: "#fff1cc" },
  });
}
