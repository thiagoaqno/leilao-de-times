// Jeddah — as marcas que só esse GP usa (kit/marcas.js não muda: entram aqui, na mesma tabela, quando este arquivo carrega).
// O patrocinador do título é a stc (roxa), e a pista é cheia de Saudia, Roshn, Aramco e das cores verde e branca do país.
import { MARCAS } from "../marcas.js";

Object.assign(MARCAS, {
  stc: { fundo: "#4f008c", cor: "#ffffff", texto: "stc", fonte: "900 {s}px Arial, sans-serif", moldura: "#ff375e" },
  saudigp: { fundo: "#006c35", cor: "#ffffff", texto: "SAUDI ARABIAN GP", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#ffffff" },
  roshn: { fundo: "#0b3d3a", cor: "#e6d8b0", texto: "ROSHN", fonte: "700 {s}px Georgia, 'Times New Roman', serif" },
  saudia: { fundo: "#ffffff", cor: "#00613c", texto: "SAUDIA", fonte: "900 {s}px Arial, sans-serif", moldura: "#1e63b4" },
  redsea: { fundo: "#0a4d68", cor: "#ffffff", texto: "RED SEA", fonte: "700 {s}px Georgia, serif", moldura: "#4fd1c5" },
  visitsaudi: { fundo: "#f6efe2", cor: "#006c35", texto: "VISIT SAUDI", fonte: "900 {s}px Arial, sans-serif", moldura: "#d6a64a" },
  jeddah: { fundo: "#ffffff", cor: "#006c35", texto: "JEDDAH CORNICHE", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#006c35" },
});
