// Corrida da Galera — as marcas de verdade dos patrocinadores da F1 (o jogo é só para os amigos), desenhadas no canvas:
// a cor de fundo, a letra e o traço que faz cada logo ser reconhecido (a coroa da Rolex, o P comprido da Pirelli, as
// faixas da DHL, o sorriso da AWS...). Sem baixar imagem: funciona sem internet e em qualquer tamanho.
import { canvasTex } from "../cena.js";

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
  petrobras: { fundo: "#00793a", cor: "#ffdd00", texto: "PETROBRAS", fonte: "900 {s}px Arial, sans-serif", moldura: "#ffdd00" },
  bb: { fundo: "#fcdc2a", cor: "#0b3d91", texto: "Banco do Brasil", fonte: "900 {s}px Arial, sans-serif" },
  itau: { fundo: "#ec7000", cor: "#ffffff", texto: "itaú", fonte: "900 {s}px Arial, sans-serif", moldura: "#003a8c" },
  gpsp: { fundo: "#ffffff", cor: "#00793a", texto: "GP DE SÃO PAULO", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#ffdd00" },
  repsol: { fundo: "#ffffff", cor: "#ee7203", texto: "REPSOL", fonte: "900 {s}px Arial, sans-serif", moldura: "#ee7203" },
  lacaixa: { fundo: "#0079ae", cor: "#ffffff", texto: "la Caixa", fonte: "700 {s}px Arial, sans-serif" },
  sabadell: { fundo: "#ffffff", cor: "#0a6ebd", texto: "Sabadell", fonte: "700 {s}px Arial, sans-serif", moldura: "#0a6ebd" },
  circuit: { fundo: "#c8102e", cor: "#ffd100", texto: "BARCELONA-CATALUNYA", fonte: "900 {s}px Arial, sans-serif" },
  // Barcelona (kit/barcelona/): só nomes de lugares e do GP, sem marca registrada de patrocinador
  gpespanya: { fundo: "#c60b1e", cor: "#ffc400", texto: "GRAN PREMI D'ESPANYA", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#ffc400" },
  catalunya: { fundo: "#ffc400", cor: "#c60b1e", texto: "CATALUNYA", fonte: "900 {s}px Arial, sans-serif", moldura: "#c60b1e" },
  montmelo: { fundo: "#ffffff", cor: "#c60b1e", texto: "MONTMELÓ", fonte: "900 {s}px Arial, sans-serif", moldura: "#c60b1e" },
  mediterrani: { fundo: "#0e5fa8", cor: "#ffffff", texto: "MEDITERRÀNIA", fonte: "700 {s}px Georgia, serif" },
  valles: { fundo: "#1f6f3a", cor: "#ffd83a", texto: "VALLÈS ORIENTAL", fonte: "900 {s}px Arial, sans-serif" },
  costabrava: { fundo: "#0b8a8a", cor: "#ffffff", texto: "COSTA BRAVA", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif" },
  pirineus: { fundo: "#17325c", cor: "#ffffff", texto: "PIRINEUS", fonte: "900 {s}px Arial, sans-serif", moldura: "#ffc400" },
  cava: { fundo: "#f3e3a0", cor: "#6b4a10", texto: "CAVA DE CATALUNYA", fonte: "700 {s}px Georgia, serif", moldura: "#6b4a10" },
  oliva: { fundo: "#6b7a1e", cor: "#ffffff", texto: "OLI D'OLIVA", fonte: "700 {s}px Georgia, serif" },
  silverstone: { fundo: "#0b2a5b", cor: "#ffffff", texto: "SILVERSTONE", fonte: "900 {s}px Arial, sans-serif", moldura: "#c8102e" },
  britgp: { fundo: "#c8102e", cor: "#ffffff", texto: "BRITISH GRAND PRIX", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#0b2a5b" },
  skysports: { fundo: "#0072c9", cor: "#ffffff", texto: "sky sports", fonte: "700 {s}px Arial, sans-serif" },
  ferrari: { fundo: "#c8102e", cor: "#ffd100", texto: "Ferrari", fonte: "italic 700 {s}px Georgia, 'Times New Roman', serif", escudo: true },
  iveco: { fundo: "#ffffff", cor: "#0b3d91", texto: "IVECO", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#0b3d91" },
  peroni: { fundo: "#ffffff", cor: "#c8102e", texto: "PERONI", fonte: "900 {s}px Georgia, serif", moldura: "#0f4ea0" },
  gpit: { fundo: "#ffffff", cor: "#c8102e", texto: "GRAN PREMIO D'ITALIA", fonte: "900 {s}px Arial, sans-serif", tricolore: true },
  monza: { fundo: "#c8102e", cor: "#ffffff", texto: "AUTODROMO NAZIONALE MONZA", fonte: "900 {s}px Arial, sans-serif" },
  acm: { fundo: "#ffffff", cor: "#c8102e", texto: "AUTOMOBILE CLUB DE MONACO", fonte: "700 {s}px Georgia, serif", moldura: "#c8102e" },
  ausgp: { fundo: "#007a3d", cor: "#ffd100", texto: "AUSTRALIAN GRAND PRIX", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#ffd100" },
  gulfair: { fundo: "#221226", cor: "#d4af37", texto: "GULF AIR", fonte: "700 {s}px Georgia, serif", moldura: "#d4af37" },
  bahrain: { fundo: "#ce1126", cor: "#ffffff", texto: "BAHRAIN GP", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#ffffff" },
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
  if (m.coroa || m.estrela || m.dhl || m.escudo) { tx += h * 0.32; larg -= h * 0.6; }
  if (m.tricolore) { x.fillStyle = "#009246"; x.fillRect(x0, y0, w / 3, h * 0.12); x.fillStyle = "#f4f4f4"; x.fillRect(x0 + w / 3, y0, w / 3, h * 0.12); x.fillStyle = "#ce2b37"; x.fillRect(x0 + (2 * w) / 3, y0, w / 3, h * 0.12); x.fillRect(x0, y0 + h * 0.88, w, h * 0.12); x.fillStyle = "#009246"; x.fillRect(x0, y0 + h * 0.88, w / 3, h * 0.12); x.fillStyle = "#f4f4f4"; x.fillRect(x0 + w / 3, y0 + h * 0.88, w / 3, h * 0.12); }
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
  if (m.escudo) { // o escudo amarelo da Scuderia, com o SF em preto
    const c = esq - h * 0.4, a = h * 0.3; x.fillStyle = m.cor; x.beginPath(); x.moveTo(c - a, cy - a * 1.15); x.lineTo(c + a, cy - a * 1.15); x.lineTo(c + a, cy + a * 0.3); x.quadraticCurveTo(c + a, cy + a * 1.2, c, cy + a * 1.35); x.quadraticCurveTo(c - a, cy + a * 1.2, c - a, cy + a * 0.3); x.closePath(); x.fill();
    x.fillStyle = "#009246"; x.fillRect(c - a, cy - a * 1.15, a * 0.66, a * 0.3); x.fillStyle = "#f4f4f4"; x.fillRect(c - a * 0.34, cy - a * 1.15, a * 0.68, a * 0.3); x.fillStyle = "#ce2b37"; x.fillRect(c + a * 0.34, cy - a * 1.15, a * 0.66, a * 0.3);
    x.fillStyle = "#111"; x.font = "900 " + Math.round(a * 1.1) + "px Arial, sans-serif"; x.fillText("SF", c, cy + a * 0.45); x.fillStyle = m.cor;
  }
  if (m.aramco) { x.fillStyle = "#00a3e0"; x.fillRect(esq - h * 0.3, cy - h * 0.2, h * 0.16, h * 0.4); x.fillStyle = "#84bd00"; x.fillRect(esq - h * 0.3, cy - h * 0.2, h * 0.16, h * 0.18); }
  x.restore();
}
export const marcaTex = (nome, w = 512, h = 128) => canvasTex(w, h, (x) => desenharMarca(x, nome, 0, 0, w, h), false);
