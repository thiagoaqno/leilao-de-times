// Montreal — as placas e as bandeiras do GP do Canadá. Só nomes de lugar e do país (sem marca de patrocinador): entram na lista do kit
// (kit/marcas.js) sem mexer nele. As bandeiras são desenhadas no canvas: o Canadá (a folha de bordo) e o Québec (a cruz branca no
// azul, com as quatro flores-de-lis), e a inscrição do Muro dos Campeões ("Bienvenue au Québec", em letra cursiva preta).
import { MARCAS } from "../marcas.js";
import { tex } from "../montagem.js";

const VERMELHO = "#d52b1e", AZUL = "#1b4f9c";

export function registrarMarcasMontreal() {
  Object.assign(MARCAS, {
    gilles: { fundo: "#ffffff", cor: VERMELHO, texto: "CIRCUIT GILLES-VILLENEUVE", fonte: "900 {s}px Arial, sans-serif", moldura: VERMELHO },
    gpcanada: { fundo: VERMELHO, cor: "#ffffff", texto: "GRAND PRIX DU CANADA", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#ffffff" },
    montreal: { fundo: "#0b2a5b", cor: "#ffffff", texto: "MONTRÉAL", fonte: "900 {s}px Arial, sans-serif", moldura: "#ffffff" },
    quebec: { fundo: "#ffffff", cor: AZUL, texto: "QUÉBEC", fonte: "900 {s}px Arial, sans-serif", moldura: AZUL },
    canada: { fundo: "#ffffff", cor: VERMELHO, texto: "CANADA", fonte: "900 {s}px Arial, sans-serif", moldura: VERMELHO },
    jeandrapeau: { fundo: "#0e6b4a", cor: "#ffffff", texto: "PARC JEAN-DRAPEAU", fonte: "900 {s}px Arial, sans-serif", moldura: "#ffffff" },
    notredame: { fundo: "#ffffff", cor: "#0b2a5b", texto: "ÎLE NOTRE-DAME", fonte: "700 {s}px Georgia, serif", moldura: "#0b2a5b" },
    bienvenue: { fundo: AZUL, cor: "#ffffff", texto: "BIENVENUE", fonte: "900 {s}px Arial, sans-serif", moldura: "#ffffff" },
  });
}

let _canada = null, _quebec = null;
/** A bandeira do Canadá: as duas faixas vermelhas, o branco no meio e a folha de bordo de onze pontas. */
export const bandeiraCanada = () => (_canada ||= tex(128, 64, (x, w, h) => {
  x.fillStyle = "#f4f4f2"; x.fillRect(0, 0, w, h); x.fillStyle = VERMELHO; x.fillRect(0, 0, w * 0.25, h); x.fillRect(w * 0.75, 0, w * 0.25, h);
  const cx = w / 2, cy = h / 2 + 1, s = h * 0.4; x.fillStyle = VERMELHO; x.beginPath();
  const pts = [[0, -1], [0.18, -0.55], [0.36, -0.7], [0.3, -0.25], [0.62, -0.42], [0.55, -0.1], [0.8, 0.0], [0.45, 0.28], [0.52, 0.42], [0.1, 0.36], [0.1, 0.9], [0, 0.9]];
  [...pts, ...pts.slice(0, -1).reverse().map(([a, b]) => [-a, b])].forEach(([a, b], k) => (k ? x.lineTo(cx + a * s, cy + b * s) : x.moveTo(cx + a * s, cy + b * s))); x.closePath(); x.fill();
}));
/** A bandeira do Québec: o azul, a cruz branca e a flor-de-lis em cada quarto (desenhada como uma gota com duas folhas). */
export const bandeiraQuebec = () => (_quebec ||= tex(128, 64, (x, w, h) => {
  x.fillStyle = "#1b4f9c"; x.fillRect(0, 0, w, h); x.fillStyle = "#f4f4f2"; x.fillRect(w * 0.44, 0, w * 0.12, h); x.fillRect(0, h * 0.44, w, h * 0.12);
  for (const [cx, cy] of [[w * 0.22, h * 0.22], [w * 0.78, h * 0.22], [w * 0.22, h * 0.78], [w * 0.78, h * 0.78]]) {
    x.beginPath(); x.moveTo(cx, cy - h * 0.17); x.quadraticCurveTo(cx + h * 0.1, cy - h * 0.02, cx, cy + h * 0.12); x.quadraticCurveTo(cx - h * 0.1, cy - h * 0.02, cx, cy - h * 0.17); x.fill();
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx, cy + h * 0.02); x.quadraticCurveTo(cx + s * h * 0.2, cy - h * 0.08, cx + s * h * 0.17, cy + h * 0.06); x.quadraticCurveTo(cx + s * h * 0.1, cy + h * 0.05, cx, cy + h * 0.1); x.fill(); }
    x.fillRect(cx - h * 0.1, cy + h * 0.1, h * 0.2, h * 0.03);
  }
}));
/** O Muro dos Campeões: o fundo branco e o "Bienvenue au Québec" em letra cursiva preta, com duas flores-de-lis azuis. */
export function muroDosCampeoes() {
  return tex(1024, 160, (x, w, h) => {
    x.fillStyle = "#f2f1ec"; x.fillRect(0, 0, w, h);
    for (let k = 0; k < 90; k++) { x.fillStyle = k % 2 ? "#e4e2db" : "#ffffff"; x.fillRect((k * 97) % w, (k * 53) % h, 18, 2); } // as marcas de roçar na pintura (sem sorteio: sai igual sempre)
    x.fillStyle = "#14141a"; x.textAlign = "left"; x.textBaseline = "middle";
    x.font = "italic 700 112px 'Brush Script MT', 'Segoe Script', 'Snell Roundhand', cursive"; x.fillText("Bienvenue", 36, h * 0.5, 560);
    x.font = "italic 700 78px 'Brush Script MT', 'Segoe Script', 'Snell Roundhand', cursive"; x.fillText("au Québec", 616, h * 0.62, 280);
    x.fillStyle = "#1b4f9c";
    for (const cx of [930, 984]) { x.beginPath(); x.moveTo(cx, h * 0.3); x.quadraticCurveTo(cx + 14, h * 0.48, cx, h * 0.72); x.quadraticCurveTo(cx - 14, h * 0.48, cx, h * 0.3); x.fill(); x.fillRect(cx - 12, h * 0.66, 24, 5); }
  });
}
