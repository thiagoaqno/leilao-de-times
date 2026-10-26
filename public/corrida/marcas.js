// Corrida da Galera — as marcas de verdade dos patrocinadores da F1 (o jogo é só para os amigos), desenhadas no canvas:
// a cor de fundo, a letra e o traço que faz cada logo ser reconhecido (a coroa da Rolex, o P comprido da Pirelli, as
// faixas da DHL, o sorriso da AWS...). Sem baixar imagem: funciona sem internet e em qualquer tamanho.
import { canvasTex } from "./cena.js";

export const MARCAS = {
  rolex: { fundo: "#00603a", cor: "#c9a54c", texto: "ROLEX", fonte: "700 {s}px Georgia, 'Times New Roman', serif", coroa: true },
  pirelli: { fundo: "#111111", cor: "#ffd100", texto: "PIRELLI", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", pirelli: true },
  aramco: { fundo: "#ffffff", cor: "#00843d", texto: "aramco", fonte: "700 {s}px Arial, sans-serif", aramco: true },
  heineken: { fundo: "#007a3d", cor: "#ffffff", texto: "Heineken", fonte: "700 {s}px Georgia, serif", estrela: true },
  dhl: { fundo: "#ffcc00", cor: "#d40511", texto: "DHL", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", dhl: true },
  tag: { fundo: "#ffffff", cor: "#c8102e", texto: "TAG HEUER", fonte: "900 {s}px Arial, sans-serif", moldura: "#00563f" },
  lenovo: { fundo: "#e2231a", cor: "#ffffff", texto: "Lenovo", fonte: "700 {s}px Arial, sans-serif" },
  aws: { fundo: "#232f3e", cor: "#ffffff", texto: "aws", fonte: "700 {s}px Arial, sans-serif", sorriso: true },
  qatar: { fundo: "#5c0632", cor: "#ffffff", texto: "QATAR AIRWAYS", fonte: "700 {s}px Arial, sans-serif" },
  f1: { fundo: "#e10600", cor: "#ffffff", texto: "FORMULA 1", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif" },
  msc: { fundo: "#0b1f3a", cor: "#ffffff", texto: "MSC CRUISES", fonte: "700 {s}px Georgia, serif" },
  lv: { fundo: "#3b2a1e", cor: "#c9a96e", texto: "LOUIS VUITTON", fonte: "400 {s}px Georgia, serif" },
  crypto: { fundo: "#0b2a5b", cor: "#ffffff", texto: "crypto.com", fonte: "700 {s}px Arial, sans-serif" },
  acm: { fundo: "#ffffff", cor: "#c8102e", texto: "AUTOMOBILE CLUB DE MONACO", fonte: "700 {s}px Georgia, serif", moldura: "#c8102e" },
};
// a ordem em que as marcas se repetem pela pista
export const PATROCINIO = ["rolex", "pirelli", "aramco", "heineken", "dhl", "tag", "lenovo", "aws", "f1", "qatar", "msc", "crypto", "lv"];

// desenha a marca no retângulo (x0, y0, w, h) de um contexto de canvas
export function desenharMarca(x, nome, x0, y0, w, h) {
  const m = MARCAS[nome] || MARCAS.f1, s = Math.round(h * 0.56), cy = y0 + h / 2;
  x.save(); x.beginPath(); x.rect(x0, y0, w, h); x.clip();
  x.fillStyle = m.fundo; x.fillRect(x0, y0, w, h);
  if (m.moldura) { x.strokeStyle = m.moldura; x.lineWidth = Math.max(2, h * 0.06); x.strokeRect(x0 + h * 0.08, y0 + h * 0.08, w - h * 0.16, h - h * 0.16); }
  let tx = x0 + w / 2, larg = w - h * 0.5;
  if (m.coroa || m.estrela || m.dhl) { tx += h * 0.32; larg -= h * 0.6; }
  x.font = m.fonte.replace("{s}", s); x.fillStyle = m.cor; x.textAlign = "center"; x.textBaseline = "middle";
  const medida = Math.min(larg, x.measureText(m.texto).width), esq = tx - medida / 2;
  if (m.dhl) { x.fillStyle = m.cor; for (let k = 0; k < 4; k++) x.fillRect(x0 + h * 0.12 + k * h * 0.06, cy - h * 0.18 + k * h * 0.1, h * 0.55 - k * h * 0.08, h * 0.06); x.fillStyle = m.cor; }
  if (m.coroa) { // a coroa de cinco pontas, à esquerda do nome
    const c = esq - h * 0.42, b = cy + h * 0.14, a = h * 0.36, l = h * 0.3, picos = [];
    x.fillStyle = m.cor; x.beginPath(); x.moveTo(c - l, b);
    for (let k = 0; k <= 4; k++) { const px = c - l + (k * l) / 2, py = b - a * (k === 2 ? 1 : k % 2 ? 0.9 : 0.75); picos.push([px, py]); x.lineTo(px, py); if (k < 4) x.lineTo(px + l / 4, b - a * 0.4); }
    x.lineTo(c + l, b); x.closePath(); x.fill(); x.fillRect(c - l, b + h * 0.02, 2 * l, h * 0.07);
    for (const [px, py] of picos) { x.beginPath(); x.arc(px, py - h * 0.03, h * 0.04, 0, Math.PI * 2); x.fill(); }
  }
  if (m.estrela) { // a estrela vermelha
    const c = esq - h * 0.36, r = h * 0.2; x.fillStyle = "#e2231a"; x.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; x.lineTo(c + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    x.closePath(); x.fill(); x.fillStyle = m.cor;
  }
  x.fillStyle = m.cor; x.fillText(m.texto, tx, cy + h * 0.02, larg);
  if (m.pirelli) { x.fillRect(esq + medida * 0.05, cy - s * 0.48, medida * 0.95, s * 0.12); } // o P comprido, o traço por cima do nome
  if (m.sorriso) { x.strokeStyle = "#ff9900"; x.lineWidth = h * 0.06; x.lineCap = "round"; x.beginPath(); x.moveTo(esq + medida * 0.08, cy + s * 0.45); x.quadraticCurveTo(tx, cy + s * 0.75, esq + medida * 0.9, cy + s * 0.42); x.stroke(); }
  if (m.aramco) { x.fillStyle = "#00a3e0"; x.fillRect(esq - h * 0.3, cy - h * 0.2, h * 0.16, h * 0.4); x.fillStyle = "#84bd00"; x.fillRect(esq - h * 0.3, cy - h * 0.2, h * 0.16, h * 0.18); }
  x.restore();
}
export const marcaTex = (nome, w = 512, h = 128) => canvasTex(w, h, (x) => desenharMarca(x, nome, 0, 0, w, h), false);
