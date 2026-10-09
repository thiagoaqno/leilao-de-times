// Carreira de Treinador: os escudos dos clubes, desenhados por nós em SVG (nenhum é cópia de escudo de verdade).
// Cada escudo é uma forma (escudo, tábua, ponta, redondo ou triângulo) com camadas por dentro: o fundo, listras, faixas,
// diagonais, o anel, a borda, estrelas, um símbolo e as letras do clube, tudo recortado na forma, com um contorno escuro e
// um brilho suave por cima.
// - Os 20 do Brasileirão e os 96 clubes das cinco ligas europeias têm o desenho feito à mão (ESPECIAIS), com o jeito de
//   cada clube: as listras do Flamengo, o cruzeiro do Cruzeiro, a âncora do Corinthians, a torre do Everton, o morcego do
//   Valencia, o submarino do Villarreal, a flor-de-lis da Fiorentina, a torre Eiffel do PSG...
// - Os outros clubes usam a receita da base (clube.escudo: forma, fundo, listras, faixa, diagonal, anel, borda, texto,
//   simbolo, estrelasTopo...). Quando a receita é só fundo, borda e as letras, o escudo ganha um desenho de um dos 7
//   jeitos (faixa no topo, duas metades, faixa no meio, V, diagonal, listras ou cantos) e uma das 3 formas, sorteados
//   pelo id do clube: dois clubes com as mesmas cores não ficam iguais.
// O desenho cabe numa caixa de 80x90 (a mesma proporção de antes, 8:9). Escudos.svg(clube) devolve o <svg>.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Escudos = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const W = 80, H = 90, CONTORNO = "#0b1510", OURO = "#ffd200";
  const FORMAS = {
    escudo: "M6 6H74V46C74 68 59 81 40 87C21 81 6 68 6 46Z",
    tabua: "M6 20C6 11 12 6 21 6H59C68 6 74 11 74 20V47C74 68 59 81 40 87C21 81 6 68 6 47Z",
    ponta: "M40 3L74 17V48C74 68 59 80 40 88C21 80 6 68 6 48V17Z",
    redondo: "M4 45a36 36 0 1 0 72 0a36 36 0 1 0 -72 0Z",
    triangulo: "M5 8H75L40 87Z",
  };
  const hash = (s) => [...String(s)].reduce((n, ch) => (Math.imul(n, 31) + ch.charCodeAt(0)) >>> 0, 7);
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const n2 = (v) => +v.toFixed(2);
  // contraste entre duas cores (para as letras nunca sumirem no fundo)
  const luz = (hx) => { const n = parseInt(String(hx).slice(1, 7), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const contraste = (a, b) => { const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

  // ---------- as peças ----------
  const pol = (pts, cor, extra = "") => `<polygon points="${pts.map((p) => p.join(",")).join(" ")}" fill="${cor}" ${extra}/>`;
  const ret = (x, y, w, h, cor, rx = 0, extra = "") => `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(rx)}" fill="${cor}" ${extra}/>`;
  const fundo = (cor) => ret(0, 0, W, H, cor);
  const faixa = (y0, y1, cor) => ret(-2, y0, W + 4, y1 - y0, cor);
  const listrasV = (cores, n = 6, y0 = 0, y1 = H) => Array.from({ length: n }, (_, i) => ret((W / n) * i - 0.2, y0, W / n + 0.4, y1 - y0, cores[i % cores.length])).join("");
  const listrasH = (cores, alt, y0 = 0) => { let s = ""; for (let y = y0, i = 0; y < H + 1; y += alt, i++) s += ret(-2, y, W + 4, alt + 0.3, cores[i % cores.length]); return s; };
  const listrasD = (cores, larg) => { let s = ""; for (let k = -H, i = 0; k < W + 10; k += larg, i++) s += pol([[k, 0], [k + larg + 0.3, 0], [k + larg + 0.3 + H * 0.7, H], [k + H * 0.7, H]], cores[i % cores.length]); return s; };
  const diag = (cor, meia) => pol([[-meia, 0], [meia, 0], [W + meia, H], [W - meia, H]], cor);
  const anel = (r, cor, larg) => `<circle cx="40" cy="45" r="${r}" fill="none" stroke="${cor}" stroke-width="${larg}"/>`;
  const disco = (cx, cy, r, cor, borda = null) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${cor}"${borda ? ` stroke="${borda}" stroke-width="2.2"` : ""}/>`;
  const borda = (d, cor, larg) => `<path d="${d}" fill="none" stroke="${cor}" stroke-width="${larg * 2}"/>`;
  const estrelaPts = (cx, cy, R) => Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? R * 0.42 : R, a = (-90 + i * 36) * Math.PI / 180; return [n2(cx + r * Math.cos(a)), n2(cy + r * Math.sin(a))]; });
  const estrela = (cx, cy, R, cor) => pol(estrelaPts(cx, cy, R), cor, 'stroke-linejoin="round"');
  const estrelas = (n, cy, R, cor) => { const passo = R * 2.3; return Array.from({ length: n }, (_, i) => estrela(40 + (i - (n - 1) / 2) * passo, cy, R, cor)).join(""); };
  const cruz = (cor, larg = 12, cx = 40, cy = 45) => ret(cx - larg / 2, 0, larg, H, cor) + ret(0, cy - larg / 2, W, larg, cor);
  const chevron = (cor, y = 0) => pol([[-5, y - 6], [40, y + 32], [85, y - 6], [85, y + 16], [40, y + 54], [-5, y + 16]], cor);
  const metade = (cor) => ret(40, 0, 40, H, cor);
  const losangos = (cor, cx, cy, r, n) => { let s = ""; for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) if ((i + j) % 2 === 0) s += pol([[cx + i * r, cy + j * r - r], [cx + i * r + r, cy + j * r], [cx + i * r, cy + j * r + r], [cx + i * r - r, cy + j * r]], cor); return s; };
  const FONTE = "Geist, Inter, system-ui, Arial, sans-serif";
  const tamanhoQueCabe = (s, tam, max, extra = 0) => Math.min(tam, max / ([...s].length * 0.62 + extra));
  function texto(s, cx, cy, tam, cor, { max = 58, contorno = "#0b151073" } = {}) {
    const size = tamanhoQueCabe(s, tam, max);
    return `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="${FONTE}" font-weight="800" font-size="${n2(size)}" letter-spacing="-.02em" fill="${cor}" stroke="${contorno}" stroke-width="${n2(size * 0.07)}" paint-order="stroke" stroke-linejoin="round">${esc(s)}</text>`;
  }
  // as letras numa pílula (garante a leitura sobre qualquer fundo)
  function pill(s, cx, cy, tam, cor1, cor2, contorno) {
    const size = tamanhoQueCabe(s, tam, 60, 0.8), w = [...s].length * 0.62 * size + size * 0.8, h = size * 1.32;
    return `<rect x="${n2(cx - w / 2)}" y="${n2(cy - h / 2)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(h / 2)}" fill="${cor1}" stroke="${contorno}" stroke-width="2"/>`
      + `<text x="${cx}" y="${n2(cy + size * 0.04)}" text-anchor="middle" dominant-baseline="central" font-family="${FONTE}" font-weight="800" font-size="${n2(size)}" letter-spacing="-.02em" fill="${cor2}">${esc(s)}</text>`;
  }
  // símbolos desenhados numa caixa de -20 a 20 (x, y é o centro; esc a escala)
  const SIMBOLOS = {
    estrela: (c) => estrela(0, 1, 20, c),
    cruzeiro: (c) => [[0, -15, 7], [-15, 2, 6.2], [14, -4, 6.6], [0, 16, 7.4], [8, 6, 3]].map(([x, y, R]) => estrela(x, y, R, c)).join(""),
    ancora: (c) => `<g fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="0" cy="-14" r="3.6"/><path d="M0 -10.4V17M-7.5 -5H7.5M-15 4C-13 15 -4 19 0 19C4 19 13 15 15 4M-15 4L-18.5 8.5M15 4L18.5 8.5"/></g>`,
    remos: (c) => `<g stroke="${c}" stroke-width="3" stroke-linecap="round"><path d="M-13 -17L13 13M13 -17L-13 13"/></g>`
      + `<ellipse rx="3.4" ry="7" transform="translate(14.5 15) rotate(-42)" fill="${c}"/><ellipse rx="3.4" ry="7" transform="translate(-14.5 15) rotate(42)" fill="${c}"/>`,
    cruzCristo: (c, c2) => `<path d="M-4.5 -19H4.5L5.5 -5.5L19 -4.5V4.5L5.5 5.5L4.5 19H-4.5L-5.5 5.5L-19 4.5V-4.5L-5.5 -5.5Z" fill="${c}"/><path d="M-1.6 -11H1.6V-1.6H11V1.6H1.6V11H-1.6V1.6H-11V-1.6H-1.6Z" fill="${c2 || "#fff"}"/>`,
    canhao: (c) => `<g fill="${c}"><rect x="-19" y="-7" width="30" height="11" rx="5.5" transform="rotate(-16)"/><circle cx="-5" cy="9" r="8.5"/><circle cx="-5" cy="9" r="3" fill="#0b151099"/></g>`,
    chama: (c) => `<path d="M0 -19C7 -9 11 -3 11 5C11 13 6 19 0 19C-6 19 -11 13 -11 5C-11 -1 -7 -4 -5 -9C-3 -5 -1 -3 0 -2C2 -8 0 -13 0 -19Z" fill="${c}"/>`,
    torre: (c, c2) => `<path d="M-9 20V-6H-12V-15H-7V-10H-3V-15H3V-10H7V-15H12V-6H9V20Z" fill="${c}"/><path d="M-3.5 20V10C-3.5 5 3.5 5 3.5 10V20Z" fill="${c2 || "#0b1510aa"}"/><rect x="-1.6" y="-4" width="3.2" height="7" rx="1.2" fill="${c2 || "#0b1510aa"}"/>`,
    arvore: (c) => `<g fill="${c}"><rect x="-3.2" y="5" width="6.4" height="15"/><circle cx="0" cy="-8" r="11.5"/><circle cx="-9.5" cy="2" r="8.5"/><circle cx="9.5" cy="2" r="8.5"/></g>`,
    morcego: (c) => `<path d="M-19 -5C-12 -13 -6 -9 0 -13C6 -9 12 -13 19 -5C14 -4 12 0 10 5C6 1 4 1 0 5C-4 1 -6 1 -10 5C-12 0 -14 -4 -19 -5Z" fill="${c}"/>`,
    submarino: (c, c2) => `<g fill="${c}"><ellipse cx="0" cy="4" rx="19" ry="9.5"/><rect x="-5" y="-8" width="10" height="12" rx="2.5"/><rect x="1.5" y="-14" width="3" height="8"/><rect x="1.5" y="-14" width="10" height="3"/><path d="M19 4L24 -2V10Z"/></g><g fill="${c2 || "#0b151099"}"><circle cx="-9" cy="4" r="2.6"/><circle cx="0" cy="4" r="2.6"/><circle cx="9" cy="4" r="2.6"/></g>`,
    flordelis: (c) => `<g fill="${c}"><path d="M0 -20C7 -13 7 -4 0 5C-7 -4 -7 -13 0 -20Z"/><path d="M-4 3C-13 -9 -21 -5 -19 3C-18 9 -11 10 -5 7Z"/><path d="M4 3C13 -9 21 -5 19 3C18 9 11 10 5 7Z"/><rect x="-10" y="8" width="20" height="4.5" rx="1.5"/><path d="M-4 12L0 20L4 12Z"/></g>`,
    flor: (c, c2) => `<g fill="${c}">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-10" rx="6.5" ry="9.5" transform="rotate(${a})"/>`).join("")}</g><circle r="5.2" fill="${c2 || "#0b151099"}"/>`,
    touro: (c, c2) => `<g fill="${c}"><path d="M-19 -15C-19 -4 -12 2 -7 2L7 2C12 2 19 -4 19 -15C14 -8 10 -6 6 -6L-6 -6C-10 -6 -14 -8 -19 -15Z"/><ellipse cx="0" cy="8" rx="9.5" ry="12.5"/></g><circle cx="-4.2" cy="7" r="1.7" fill="${c2 || "#0b1510"}"/><circle cx="4.2" cy="7" r="1.7" fill="${c2 || "#0b1510"}"/>`,
    eiffel: (c) => `<g fill="${c}"><path d="M-2 -20H2L11 20H5L0 4L-5 20H-11Z"/><rect x="-6.5" y="-5" width="13" height="3"/><rect x="-9.5" y="8" width="19" height="3"/></g>`,
    coroa: (c) => `<path d="M-17 11L-19 -9L-9 -1L0 -14L9 -1L19 -9L17 11Z" fill="${c}"/>`,
    bola: (c) => `<circle r="16" fill="#fff" stroke="${c}" stroke-width="2.4"/><path d="M0 -7L6.6 -2.2L4 5.6H-4L-6.6 -2.2Z" fill="${c}"/><path d="M0 -7V-16M6.6 -2.2L15 -5M4 5.6L9 13.5M-4 5.6L-9 13.5M-6.6 -2.2L-15 -5" stroke="${c}" stroke-width="2" fill="none"/>`,
    raio: (c) => `<path d="M5 -20L-12 4H-2L-6 20L13 -5H3Z" fill="${c}" stroke="#0b151066" stroke-width="1.2" stroke-linejoin="round"/>`,
  };
  const simbolo = (nome, x, y, esc2, cor, cor2) => `<g transform="translate(${x} ${y}) scale(${esc2})">${SIMBOLOS[nome](cor, cor2)}</g>`;

  // ---------- os 20 do Brasileirão, desenhados um a um ----------
  // forma + as camadas (recebem o contorno da forma, para a borda)
  const ESPECIAIS = {
    flamengo: { forma: "tabua", cam: (d) => [listrasH(["#c8102e", "#111111"], 15), borda(d, "#f4f1ea", 3), pill("CRF", 40, 45, 24, "#111111", "#ffffff", "#f4f1ea")] },
    palmeiras: { forma: "redondo", cam: () => [fundo("#006437"), anel(32, "#ffffff", 3.5), anel(25.5, "#0a8a4f", 1.4), texto("SEP", 40, 23, 11, "#ffffff"), texto("P", 40, 53, 46, "#ffffff")] },
    cruzeiro: { forma: "redondo", cam: () => [fundo("#0033a0"), anel(32, "#ffffff", 3.5), simbolo("cruzeiro", 40, 46, 1.2, "#ffffff")] },
    mirassol: { forma: "tabua", cam: (d) => [fundo("#ffd200"), faixa(6, 30, "#00843d"), texto("MFC", 40, 19, 17, "#ffd200"), texto("M", 40, 61, 44, "#00843d", { contorno: "#ffffff00" }), borda(d, "#00843d", 3.5)] },
    fluminense: { forma: "escudo", cam: (d) => [listrasV(["#7a1e3a", "#ffffff", "#00613c"], 3), borda(d, "#e8d38a", 3), pill("FFC", 40, 46, 22, "#ffffff", "#7a1e3a", "#e8d38a")] },
    botafogo: { forma: "ponta", cam: (d) => [fundo("#111111"), borda(d, "#ffffff", 3.5), estrela(40, 37, 20, "#ffffff"), texto("BFR", 40, 68, 16, "#ffffff", { contorno: "#00000000" })] },
    bahia: { forma: "redondo", cam: () => [listrasV(["#0057b8", "#ffffff", "#d0021b"], 3), anel(32, "#0a2f6b", 4.5), disco(40, 45, 14, "#ffffff", "#0a2f6b"), texto("B", 40, 46, 22, "#0057b8", { contorno: "#ffffff00" })] },
    saopaulo: { forma: "tabua", cam: (d) => [fundo("#ffffff"), faixa(6, 25, "#d0021b"), faixa(25, 35, "#111111"), estrelas(3, 15.5, 5.5, OURO), texto("SPFC", 40, 56, 24, "#d0021b", { contorno: "#ffffff00" }), borda(d, "#111111", 3)] },
    gremio: { forma: "escudo", cam: (d) => [listrasV(["#0d80bf", "#111111", "#ffffff"], 3), borda(d, "#0a4f78", 3), pill("GRÊMIO", 40, 48, 15, "#111111", "#ffffff", "#ffffff")] },
    bragantino: { forma: "tabua", cam: (d) => [fundo("#ffffff"), faixa(6, 34, "#d0021b"), texto("RB", 40, 21, 24, "#ffffff"), texto("BRAGANTINO", 40, 46, 9.5, "#d0021b", { contorno: "#ffffff00" }), simbolo("bola", 40, 65, 0.7, "#111111"), borda(d, "#d0021b", 3.5)] },
    atleticomg: { forma: "escudo", cam: (d) => [listrasV(["#111111", "#ffffff"], 6), borda(d, "#d6a800", 3), estrelas(1, 15, 6, OURO), pill("CAM", 40, 52, 22, "#ffffff", "#111111", "#111111")] },
    santos: { forma: "tabua", cam: (d) => [fundo("#ffffff"), listrasV(["#111111", "#ffffff"], 6, 0, 34), borda(d, "#111111", 3), texto("SFC", 40, 61, 27, "#111111", { contorno: "#ffffffaa" })] },
    corinthians: { forma: "redondo", cam: () => [fundo("#ffffff"), anel(32, "#111111", 5), estrela(40, 21, 4.8, "#d0021b"), simbolo("ancora", 40, 51, 1.02, "#111111")] },
    vasco: { forma: "tabua", cam: (d) => [fundo("#111111"), diag("#ffffff", 12), borda(d, "#ffffff", 3), simbolo("cruzCristo", 40, 30, 0.98, "#d0021b", "#ffffff"), pill("CRVG", 40, 68, 12, "#111111", "#ffffff", "#ffffff")] },
    vitoria: { forma: "escudo", cam: (d) => [listrasH(["#d0021b", "#111111"], 15), borda(d, OURO, 3), estrelas(2, 17, 5, OURO), pill("ECV", 40, 49, 22, "#111111", "#ffffff", OURO)] },
    internacional: { forma: "redondo", cam: () => [fundo("#d0021b"), anel(32, "#ffffff", 3.5), estrela(40, 21, 5, "#ffffff"), texto("SCI", 40, 53, 32, "#ffffff")] },
    coritiba: { forma: "redondo", cam: () => [fundo("#ffffff"), anel(32, "#00543d", 5.5), faixa(36, 40, "#00543d"), faixa(50, 54, "#00543d"), pill("CFC", 40, 45, 21, "#00543d", "#ffffff", "#ffffff")] },
    athletico: { forma: "ponta", cam: (d) => [listrasD(["#d0021b", "#111111"], 12), borda(d, "#ffffff", 3), pill("CAP", 40, 38, 20, "#111111", "#ffffff", "#ffffff"), simbolo("raio", 40, 65, 0.62, OURO)] },
    chapecoense: { forma: "escudo", cam: (d) => [fundo("#00843d"), borda(d, "#ffffff", 3.5), texto("ACF", 40, 40, 27, "#ffffff"), faixa(51, 54, "#ffffff"), texto("CHAPE", 40, 64, 12, "#ffffff")] },
    remo: { forma: "escudo", cam: (d) => [fundo("#0a2a66"), borda(d, "#ffffff", 3.5), estrela(40, 19, 6.5, OURO), simbolo("remos", 40, 38, 0.95, "#ffffff"), texto("REMO", 40, 67, 13, "#ffffff")] },
  };

  // ---------- os 96 das cinco ligas europeias ----------
  // cada um com as cores do clube e um elemento que lembra o escudo (sem copiar o desenho)
  Object.assign(ESPECIAIS, {
    // Inglaterra
    "afc-bournemouth": { forma: "ponta", cam: (d) => [listrasV(["#d71920", "#111111"], 6), borda(d, "#ffffff", 3), pill("AFCB", 40, 50, 20, "#111111", "#ffffff", "#ffffff")] },
    arsenal: { forma: "escudo", cam: (d) => [fundo("#ef0107"), borda(d, "#ffffff", 3.5), simbolo("canhao", 40, 36, 1.3, "#ffffff"), texto("ARS", 40, 67, 16, "#ffffff")] },
    "aston-villa": { forma: "tabua", cam: (d) => [fundo("#670e36"), faixa(6, 28, "#95bfe5"), borda(d, "#95bfe5", 3), texto("AVFC", 40, 17, 15, "#670e36", { contorno: "#ffffff00" }), simbolo("coroa", 40, 48, 0.95, "#f2c14e"), texto("VILLA", 40, 72, 12, "#95bfe5")] },
    brentford: { forma: "tabua", cam: (d) => [listrasV(["#e30613", "#ffffff"], 6), borda(d, "#111111", 3), pill("BFC", 40, 50, 22, "#111111", "#ffffff", "#e30613")] },
    brighton: { forma: "escudo", cam: (d) => [listrasV(["#0057b8", "#ffffff"], 6), borda(d, "#ffffff", 3), pill("BHA", 40, 52, 22, "#0057b8", "#ffffff", "#ffffff"), estrelas(1, 17, 5.5, OURO)] },
    chelsea: { forma: "tabua", cam: (d) => [fundo("#034694"), borda(d, "#d1a915", 4), disco(40, 40, 21, "#ffffff", "#d1a915"), texto("CFC", 40, 41, 17, "#034694", { contorno: "#ffffff00" }), texto("1905", 40, 72, 12, "#ffffff")] },
    "coventry-city": { forma: "ponta", cam: (d) => [fundo("#6cb4e4"), borda(d, "#ffffff", 3.5), disco(40, 36, 19, "#ffffff"), simbolo("bola", 40, 36, 0.8, "#6cb4e4"), pill("CCFC", 40, 66, 17, "#6cb4e4", "#ffffff", "#ffffff")] },
    "crystal-palace": { forma: "ponta", cam: (d) => [listrasV(["#1b458f", "#c4122e"], 6), borda(d, "#ffffff", 3), simbolo("estrela", 40, 33, 0.9, "#ffffff"), pill("CPFC", 40, 64, 18, "#1b458f", "#ffffff", "#ffffff")] },
    everton: { forma: "escudo", cam: (d) => [fundo("#003399"), borda(d, "#ffffff", 3.5), simbolo("torre", 40, 38, 1.35, "#ffffff", "#003399"), texto("EFC", 40, 69, 15, "#ffffff")] },
    fulham: { forma: "tabua", cam: (d) => [fundo("#ffffff"), faixa(6, 26, "#111111"), faixa(66, 90, "#111111"), borda(d, "#111111", 3), texto("FFC", 40, 47, 29, "#111111", { contorno: "#ffffffaa" })] },
    "hull-city": { forma: "ponta", cam: (d) => [listrasH(["#f5a12d", "#111111"], 11), borda(d, "#111111", 3), pill("HULL", 40, 48, 20, "#111111", "#f5a12d", "#f5a12d")] },
    "ipswich-town": { forma: "tabua", cam: (d) => [fundo("#0044a9"), faixa(58, 90, "#ffffff"), borda(d, "#ffffff", 3), texto("ITFC", 40, 34, 21, "#ffffff"), texto("TOWN", 40, 72, 12, "#0044a9", { contorno: "#ffffff00" })] },
    "leeds-united": { forma: "escudo", cam: (d) => [fundo("#ffffff"), faixa(6, 22, "#1d428a"), faixa(22, 26, "#ffd100"), borda(d, "#1d428a", 3.5), estrelas(1, 14.5, 5, "#ffd100"), texto("LUFC", 40, 52, 22, "#1d428a", { contorno: "#ffffffaa" })] },
    liverpool: { forma: "tabua", cam: (d) => [fundo("#c8102e"), borda(d, "#f6c342", 3.5), simbolo("chama", 40, 36, 1.25, "#f6c342"), texto("LFC", 40, 69, 19, "#ffffff")] },
    "manchester-city": { forma: "escudo", cam: (d) => [fundo("#6cabdd"), borda(d, "#ffffff", 3.5), estrelas(3, 16, 5, "#f6e7a1"), pill("MCFC", 40, 47, 20, "#1c2c5b", "#ffffff", "#ffffff"), faixa(62, 65, "#ffffff"), faixa(69, 71, "#ffffff")] },
    "manchester-united": { forma: "tabua", cam: (d) => [fundo("#da291c"), borda(d, "#fbe122", 3.5), texto("MUFC", 40, 36, 21, "#fbe122"), faixa(48, 51, "#fbe122"), simbolo("chama", 40, 67, 0.5, "#fbe122")] },
    "newcastle-utd": { forma: "ponta", cam: (d) => [listrasV(["#111111", "#ffffff"], 6), borda(d, "#111111", 3), pill("NUFC", 40, 48, 20, "#111111", "#ffffff", "#ffffff")] },
    "nottingham-forest": { forma: "escudo", cam: (d) => [fundo("#dd0000"), borda(d, "#ffffff", 3.5), simbolo("arvore", 40, 36, 1.2, "#ffffff"), texto("NFFC", 40, 69, 14, "#ffffff")] },
    sunderland: { forma: "tabua", cam: (d) => [listrasV(["#eb172b", "#ffffff"], 6), borda(d, "#111111", 3), pill("SAFC", 40, 50, 20, "#ffffff", "#eb172b", "#eb172b")] },
    tottenham: { forma: "ponta", cam: (d) => [fundo("#ffffff"), borda(d, "#132257", 3.5), texto("THFC", 40, 36, 21, "#132257", { contorno: "#ffffffaa" }), simbolo("bola", 40, 62, 0.72, "#132257")] },
    // Espanha
    alaves: { forma: "escudo", cam: (d) => [listrasV(["#005baa", "#ffffff"], 5), borda(d, "#005baa", 3), pill("ALA", 40, 50, 22, "#005baa", "#ffffff", "#ffffff")] },
    "athletic-club": { forma: "escudo", cam: (d) => [listrasV(["#ee2523", "#ffffff"], 6), faixa(6, 20, "#111111"), borda(d, "#111111", 3.5), pill("ATH", 40, 52, 22, "#111111", "#ffffff", "#ee2523")] },
    "atletico-de-madrid": { forma: "escudo", cam: (d) => [listrasV(["#d71920", "#ffffff"], 6, 26, 90), faixa(6, 26, "#1b3b8f"), estrelas(7, 16, 3.1, "#ffffff"), borda(d, "#1b3b8f", 3), pill("ATM", 40, 56, 22, "#1b3b8f", "#ffffff", "#ffffff")] },
    "ca-osasuna": { forma: "tabua", cam: (d) => [fundo("#d71920"), faixa(6, 28, "#0a2a66"), borda(d, "#0a2a66", 3), ret(35, 34, 10, 42, "#ffffff"), ret(23, 46, 34, 10, "#ffffff"), texto("OSA", 40, 17, 15, "#ffffff")] },
    "celta-de-vigo": { forma: "ponta", cam: (d) => [fundo("#8ac3ee"), borda(d, "#ffffff", 3.5), simbolo("coroa", 40, 30, 0.95, "#ffffff"), pill("CELTA", 40, 60, 15, "#ffffff", "#2b7bb9", "#2b7bb9")] },
    "deportivo-la-coruna": { forma: "escudo", cam: (d) => [listrasV(["#005bac", "#ffffff"], 6), borda(d, "#005bac", 3), disco(40, 22, 12, "#005bac"), simbolo("coroa", 40, 22, 0.62, "#f2c14e"), pill("RCD", 40, 56, 21, "#005bac", "#ffffff", "#ffffff")] },
    "elche-cf": { forma: "tabua", cam: (d) => [fundo("#ffffff"), diag("#198754", 13), borda(d, "#198754", 3), pill("ELC", 40, 50, 22, "#198754", "#ffffff", "#ffffff")] },
    "fc-barcelona": { forma: "tabua", cam: (d) => [listrasV(["#004d98", "#a50044"], 6, 26, 90), faixa(6, 26, "#f0c24a"), borda(d, "#f0c24a", 3), texto("FCB", 40, 17, 16, "#a50044", { contorno: "#f0c24a00" }), simbolo("bola", 40, 58, 0.95, "#111111")] },
    "getafe-cf": { forma: "escudo", cam: (d) => [fundo("#005999"), chevron("#ffffff", 0), borda(d, "#ffffff", 3), pill("GET", 40, 67, 17, "#005999", "#ffffff", "#ffffff")] },
    "levante-ud": { forma: "ponta", cam: (d) => [listrasV(["#0050a4", "#b51f2b"], 4), borda(d, "#ffffff", 3), pill("LUD", 40, 48, 21, "#ffffff", "#0050a4", "#0050a4")] },
    malaga: { forma: "tabua", cam: (d) => [fundo("#00a3e0"), borda(d, "#ffffff", 3.5), simbolo("torre", 40, 34, 1.2, "#ffffff", "#00a3e0"), texto("MCF", 40, 66, 18, "#ffffff")] },
    "racing-de-santander": { forma: "ponta", cam: (d) => [listrasD(["#00843d", "#ffffff"], 12), borda(d, "#00843d", 3), pill("RAC", 40, 48, 22, "#00843d", "#ffffff", "#ffffff")] },
    "rayo-vallecano": { forma: "escudo", cam: (d) => [fundo("#ffffff"), borda(d, "#e30613", 4), simbolo("raio", 40, 40, 1.65, "#e30613"), texto("RAYO", 40, 69, 13, "#e30613", { contorno: "#ffffffaa" })] },
    "rcd-espanyol": { forma: "ponta", cam: (d) => [listrasV(["#007fc8", "#ffffff"], 6), borda(d, "#007fc8", 3), disco(40, 22, 12, "#007fc8"), simbolo("coroa", 40, 22, 0.62, "#f2c14e"), pill("RCDE", 40, 52, 19, "#007fc8", "#ffffff", "#ffffff")] },
    "real-betis": { forma: "tabua", cam: (d) => [listrasV(["#00954c", "#ffffff"], 6), borda(d, "#d4af37", 3), disco(40, 22, 12, "#00954c"), simbolo("coroa", 40, 22, 0.62, "#f2c14e"), pill("RBB", 40, 52, 22, "#00954c", "#ffffff", "#d4af37")] },
    "real-madrid": { forma: "tabua", cam: (d) => [fundo("#ffffff"), borda(d, "#febd11", 4.5), simbolo("coroa", 40, 24, 1.15, "#febd11"), faixa(40, 43, "#febd11"), texto("RMCF", 40, 59, 20, "#1a3a8f", { contorno: "#ffffffaa" })] },
    "real-sociedad": { forma: "ponta", cam: (d) => [fundo("#ffffff"), metade("#0067b1"), borda(d, "#0067b1", 3), disco(40, 25, 13, "#ffffff", "#0067b1"), simbolo("coroa", 40, 25, 0.62, "#e30613"), pill("RSO", 40, 56, 21, "#0067b1", "#ffffff", "#ffffff")] },
    "sevilla-fc": { forma: "escudo", cam: (d) => [fundo("#ffffff"), faixa(6, 28, "#d71920"), borda(d, "#d71920", 3.5), simbolo("coroa", 40, 17, 0.62, "#ffffff"), pill("SFC", 40, 52, 22, "#d71920", "#ffffff", "#d71920")] },
    "valencia-cf": { forma: "tabua", cam: (d) => [fundo("#ffffff"), faixa(62, 90, "#ff8200"), borda(d, "#111111", 3), simbolo("morcego", 40, 36, 1.45, "#111111"), texto("VCF", 40, 72, 15, "#111111", { contorno: "#ff820000" })] },
    "villarreal-cf": { forma: "ponta", cam: (d) => [fundo("#005187"), borda(d, "#ffe600", 3.5), simbolo("submarino", 38, 40, 1.35, "#ffe600", "#005187"), texto("VCF", 40, 70, 15, "#ffe600")] },
    // Itália
    "as-roma": { forma: "tabua", cam: (d) => [fundo("#8e1f2d"), borda(d, "#f0bc42", 4), texto("SPQR", 40, 20, 14, "#f0bc42"), faixa(28, 31, "#f0bc42"), texto("ROMA", 40, 55, 20, "#ffffff")] },
    atalanta: { forma: "tabua", cam: (d) => [listrasV(["#0057b8", "#111111"], 6), borda(d, "#ffffff", 3), estrelas(1, 15, 5.5, "#ffffff"), pill("ATA", 40, 52, 22, "#ffffff", "#0057b8", "#0057b8")] },
    bologna: { forma: "escudo", cam: (d) => [listrasV(["#b51f2b", "#1a2f5a"], 6), borda(d, "#ffffff", 3), pill("BFC", 40, 50, 22, "#ffffff", "#1a2f5a", "#b51f2b")] },
    cagliari: { forma: "ponta", cam: (d) => [fundo("#1a2f5a"), ret(0, 0, 40, 45, "#b51f2b"), ret(40, 45, 40, 45, "#b51f2b"), borda(d, "#ffffff", 3), pill("CAG", 40, 48, 21, "#ffffff", "#1a2f5a", "#1a2f5a")] },
    como: { forma: "escudo", cam: (d) => [fundo("#005bac"), cruz("#ffffff", 10, 40, 45), borda(d, "#ffffff", 3), pill("COM", 40, 45, 18, "#005bac", "#ffffff", "#ffffff")] },
    fiorentina: { forma: "tabua", cam: (d) => [fundo("#5b2c83"), borda(d, "#ffffff", 3.5), simbolo("flordelis", 40, 34, 1.4, "#ffffff"), texto("ACF", 40, 69, 16, "#ffffff")] },
    frosinone: { forma: "escudo", cam: (d) => [fundo("#ffd100"), ret(28, 0, 24, H, "#005bac"), borda(d, "#005bac", 3.5), pill("FRO", 40, 50, 19, "#005bac", "#ffd100", "#ffd100")] },
    genoa: { forma: "ponta", cam: (d) => [fundo("#b51f2b"), metade("#1a2f5a"), borda(d, "#ffffff", 3), pill("GEN", 40, 48, 21, "#ffffff", "#b51f2b", "#1a2f5a")] },
    "inter-de-milao": { forma: "redondo", cam: () => [listrasV(["#0068a8", "#111111"], 6), anel(32, "#d4af37", 4), disco(40, 45, 18, "#ffffff"), texto("FCIM", 40, 45, 15, "#111111", { contorno: "#ffffff00" })] },
    juventus: { forma: "ponta", cam: (d) => [listrasV(["#ffffff", "#111111"], 6), borda(d, "#111111", 3), estrelas(2, 14, 5, "#ffd200"), pill("JUVE", 40, 50, 20, "#111111", "#ffffff", "#ffffff")] },
    lazio: { forma: "escudo", cam: (d) => [fundo("#87ceeb"), borda(d, "#ffffff", 4), simbolo("estrela", 40, 37, 1.05, "#ffffff"), pill("SSL", 40, 66, 16, "#ffffff", "#2a7aa8", "#ffffff")] },
    lecce: { forma: "tabua", cam: (d) => [listrasV(["#ffd100", "#d71920"], 6), borda(d, "#111111", 3), pill("LEC", 40, 50, 22, "#111111", "#ffd100", "#ffd100")] },
    milan: { forma: "escudo", cam: (d) => [listrasV(["#d71920", "#111111"], 6), borda(d, "#ffffff", 3), pill("ACM", 40, 50, 22, "#ffffff", "#d71920", "#d71920")] },
    monza: { forma: "tabua", cam: (d) => [fundo("#d71920"), diag("#ffffff", 11), borda(d, "#ffffff", 3), pill("MON", 40, 50, 21, "#d71920", "#ffffff", "#ffffff")] },
    parma: { forma: "escudo", cam: (d) => [fundo("#ffd100"), cruz("#005bac", 14, 40, 45), borda(d, "#005bac", 3.5), pill("PAR", 40, 45, 17, "#005bac", "#ffd100", "#ffd100")] },
    sassuolo: { forma: "ponta", cam: (d) => [listrasV(["#00a651", "#111111"], 6), borda(d, "#ffffff", 3), pill("SAS", 40, 48, 21, "#ffffff", "#00a651", "#00a651")] },
    "ssc-napoli": { forma: "tabua", cam: (d) => [fundo("#12a0d8"), borda(d, "#ffffff", 4), texto("N", 40, 43, 56, "#ffffff"), texto("SSCN", 40, 72, 12, "#ffffff")] },
    torino: { forma: "escudo", cam: (d) => [fundo("#7a263a"), borda(d, "#f0bc42", 3.5), simbolo("touro", 40, 38, 1.5, "#ffffff", "#7a263a"), texto("TFC", 40, 69, 15, "#f0bc42")] },
    udinese: { forma: "tabua", cam: (d) => [listrasV(["#ffffff", "#111111"], 8), borda(d, "#111111", 3), pill("UDI", 40, 50, 22, "#111111", "#ffffff", "#ffffff")] },
    venezia: { forma: "escudo", cam: (d) => [fundo("#111111"), pol([[80, 0], [80, 90], [0, 90]], "#f58220"), borda(d, "#00843d", 3.5), pill("VEN", 40, 48, 21, "#111111", "#ffffff", "#ffffff")] },
    // Alemanha
    "1-fc-koln": { forma: "tabua", cam: (d) => [fundo("#ffffff"), faixa(6, 28, "#e30613"), borda(d, "#e30613", 3.5), texto("1.FC", 40, 17, 14, "#ffffff"), texto("KÖLN", 40, 52, 24, "#e30613", { contorno: "#ffffffaa" })] },
    "1-fsv-mainz-05": { forma: "ponta", cam: (d) => [fundo("#e30613"), borda(d, "#ffffff", 3.5), texto("05", 40, 42, 44, "#ffffff"), texto("FSV", 40, 69, 15, "#ffffff")] },
    "bayer-leverkusen": { forma: "ponta", cam: (d) => [listrasV(["#e32221", "#111111"], 6), borda(d, "#ffffff", 3), disco(40, 44, 21, "#ffffff", "#111111"), texto("04", 40, 45, 26, "#e32221", { contorno: "#ffffff00" })] },
    "borussia-dortmund": { forma: "escudo", cam: (d) => [fundo("#fde100"), borda(d, "#111111", 4.5), texto("BVB", 40, 36, 27, "#111111", { contorno: "#fde10000" }), texto("09", 40, 64, 22, "#111111", { contorno: "#fde10000" })] },
    "borussia-monchengladbach": { forma: "tabua", cam: (d) => [fundo("#ffffff"), faixa(6, 26, "#00954c"), borda(d, "#00954c", 3.5), texto("1900", 40, 16, 13, "#ffffff"), texto("BMG", 40, 50, 24, "#111111", { contorno: "#ffffffaa" }), faixa(64, 70, "#111111")] },
    "eintracht-frankfurt": { forma: "escudo", cam: (d) => [fundo("#e1000f"), faixa(36, 52, "#111111"), borda(d, "#ffffff", 3.5), texto("SGE", 40, 24, 24, "#ffffff"), texto("EINTRACHT", 40, 44, 9.5, "#ffffff"), texto("1899", 40, 66, 15, "#ffffff")] },
    elversberg: { forma: "tabua", cam: (d) => [fundo("#111111"), diag("#ffffff", 6), borda(d, "#ffffff", 3.5), pill("SVE", 40, 50, 22, "#111111", "#ffffff", "#ffffff")] },
    "fc-augsburg": { forma: "escudo", cam: (d) => [listrasV(["#ba3733", "#ffffff", "#2e7d32"], 3), borda(d, "#ba3733", 3), pill("FCA", 40, 50, 22, "#ba3733", "#ffffff", "#ffffff")] },
    "fc-bayern-munchen": { forma: "redondo", cam: () => [fundo("#0066b2"), anel(32, "#dc052d", 6), disco(40, 45, 22, "#ffffff"), losangos("#0066b2", 40, 45, 6, 2)] },
    "hamburger-sv": { forma: "escudo", cam: (d) => [fundo("#ffffff"), pol([[40, 10], [72, 45], [40, 80], [8, 45]], "#005aaa"), borda(d, "#111111", 3.5), texto("HSV", 40, 46, 22, "#ffffff")] },
    paderborn: { forma: "ponta", cam: (d) => [fundo("#1f3c88"), metade("#111111"), borda(d, "#ffffff", 3), pill("SCP", 40, 44, 21, "#ffffff", "#1f3c88", "#1f3c88"), texto("07", 40, 70, 13, "#ffffff")] },
    "rb-leipzig": { forma: "escudo", cam: (d) => [fundo("#ffffff"), borda(d, "#d71920", 3.5), disco(40, 38, 24, "#d71920"), texto("RB", 40, 38, 28, "#ffffff"), texto("LEIPZIG", 40, 72, 9, "#d71920", { contorno: "#ffffff00" })] },
    "sc-freiburg": { forma: "tabua", cam: (d) => [fundo("#e30613"), borda(d, "#ffffff", 3.5), texto("SC", 40, 20, 19, "#ffffff"), faixa(31, 34, "#ffffff"), texto("FREIBURG", 40, 46, 10.5, "#ffffff"), texto("1904", 40, 66, 15, "#ffffff")] },
    "schalke-04": { forma: "ponta", cam: (d) => [fundo("#004d9d"), borda(d, "#ffffff", 3.5), texto("S04", 40, 42, 28, "#ffffff"), faixa(60, 64, "#ffffff")] },
    "sv-werder-bremen": { forma: "redondo", cam: () => [fundo("#008557"), anel(32, "#ffffff", 3), texto("W", 40, 46, 50, "#ffffff")] },
    "tsg-hoffenheim": { forma: "tabua", cam: (d) => [fundo("#005bac"), borda(d, "#ffffff", 3.5), texto("TSG", 40, 32, 29, "#ffffff"), faixa(46, 49, "#ffffff"), texto("1899", 40, 64, 17, "#ffffff")] },
    "union-berlin": { forma: "escudo", cam: (d) => [fundo("#e30613"), faixa(6, 24, "#ffffff"), borda(d, "#ffffff", 3.5), texto("1.FC", 40, 15, 13, "#e30613", { contorno: "#ffffff00" }), texto("UNION", 40, 48, 18, "#ffffff"), texto("BERLIN", 40, 64, 11, "#ffffff")] },
    "vfb-stuttgart": { forma: "escudo", cam: (d) => [fundo("#ffffff"), chevron("#e30613", 0), borda(d, "#e30613", 3), texto("VfB", 40, 68, 18, "#e30613", { contorno: "#ffffffaa" })] },
    // França
    "aj-auxerre": { forma: "tabua", cam: (d) => [fundo("#ffffff"), faixa(6, 48, "#005bac"), borda(d, "#005bac", 3), pill("AJA", 40, 48, 22, "#005bac", "#ffffff", "#ffffff")] },
    "angers-sco": { forma: "ponta", cam: (d) => [fundo("#111111"), borda(d, "#ffffff", 3.5), estrelas(1, 17, 6, "#ffffff"), texto("SCO", 40, 48, 32, "#ffffff")] },
    "as-monaco": { forma: "escudo", cam: (d) => [fundo("#ffffff"), pol([[0, 0], [80, 0], [0, 90]], "#e30613"), borda(d, "#e30613", 3), simbolo("coroa", 38, 22, 0.8, "#f2c14e"), pill("ASM", 40, 54, 22, "#ffffff", "#e30613", "#e30613")] },
    "fc-lorient": { forma: "tabua", cam: (d) => [fundo("#f58220"), borda(d, "#111111", 3.5), simbolo("ancora", 40, 38, 1.3, "#111111"), texto("FCL", 40, 70, 16, "#111111", { contorno: "#f5822000" })] },
    "havre-ac": { forma: "escudo", cam: (d) => [listrasH(["#6bb7d6", "#1a2f5a"], 15), borda(d, "#ffffff", 3), pill("HAC", 40, 48, 22, "#1a2f5a", "#ffffff", "#ffffff")] },
    "le-mans-fc": { forma: "ponta", cam: (d) => [fundo("#d71920"), metade("#ffd100"), borda(d, "#111111", 3), pill("LEM", 40, 48, 21, "#111111", "#ffffff", "#ffffff")] },
    "losc-lille": { forma: "tabua", cam: (d) => [fundo("#d71920"), borda(d, "#1a2f5a", 4), simbolo("flordelis", 40, 38, 1.4, "#ffffff"), texto("LOSC", 40, 70, 15, "#ffffff")] },
    lyon: { forma: "escudo", cam: (d) => [fundo("#ffffff"), faixa(6, 26, "#005bac"), faixa(26, 30, "#d71920"), borda(d, "#005bac", 3.5), texto("OL", 40, 17, 17, "#ffffff"), texto("LYON", 40, 54, 21, "#005bac", { contorno: "#ffffffaa" })] },
    "ogc-nice": { forma: "ponta", cam: (d) => [fundo("#d71920"), metade("#111111"), borda(d, "#ffffff", 3), pill("OGCN", 40, 46, 19, "#ffffff", "#d71920", "#111111")] },
    "olympique-de-marseille": { forma: "escudo", cam: (d) => [fundo("#ffffff"), borda(d, "#00a9e0", 4), texto("OM", 40, 40, 34, "#00a9e0", { contorno: "#ffffffaa" }), estrela(40, 68, 6, "#ffd200")] },
    "paris-fc": { forma: "tabua", cam: (d) => [fundo("#1a2f5a"), ret(30, 0, 20, H, "#6bb7d6"), borda(d, "#ffffff", 3.5), pill("PFC", 40, 48, 22, "#1a2f5a", "#ffffff", "#ffffff")] },
    "paris-saint-germain": { forma: "redondo", cam: () => [fundo("#004170"), anel(32, "#ffffff", 3.5), faixa(63, 84, "#da291c"), simbolo("eiffel", 40, 36, 1.25, "#ffffff"), texto("PSG", 40, 72, 12, "#ffffff")] },
    "rc-lens": { forma: "escudo", cam: (d) => [listrasH(["#d71920", "#ffd100"], 15), borda(d, "#111111", 3.5), pill("RCL", 40, 46, 22, "#111111", "#ffd100", "#ffd100")] },
    "stade-brestois-29": { forma: "tabua", cam: (d) => [fundo("#d71920"), borda(d, "#ffffff", 3.5), texto("29", 40, 40, 46, "#ffffff"), texto("SB", 40, 72, 16, "#ffffff")] },
    "stade-rennais-fc": { forma: "ponta", cam: (d) => [fundo("#d71920"), diag("#111111", 11), borda(d, "#ffffff", 3), pill("SRFC", 40, 48, 19, "#ffffff", "#d71920", "#111111")] },
    strasbourg: { forma: "escudo", cam: (d) => [listrasH(["#005bac", "#ffffff"], 12), borda(d, "#005bac", 3), pill("RCSA", 40, 48, 19, "#005bac", "#ffffff", "#ffffff")] },
    "toulouse-fc": { forma: "tabua", cam: (d) => [fundo("#6f2c91"), borda(d, "#ffffff", 3.5), simbolo("flor", 40, 36, 1.35, "#ffffff", "#6f2c91"), texto("TFC", 40, 70, 17, "#ffffff")] },
    troyes: { forma: "ponta", cam: (d) => [fundo("#005bac"), diag("#ffffff", 8), borda(d, "#ffffff", 3), pill("ESTAC", 40, 48, 16, "#005bac", "#ffffff", "#ffffff")] },
  });

  // ---------- os outros clubes: a receita da base ----------
  // as 7 maneiras de usar as duas cores de um escudo simples (fundo + borda + letras)
  const JEITOS = [
    (f, b, d) => [fundo(f), faixa(6, 30, b), borda(d, b, 3), estrelas(1, 18, 6, OURO)],
    (f, b, d) => [fundo(f), ret(40, 0, 40, H, b), borda(d, b, 3)],
    (f, b, d) => [fundo(f), faixa(34, 58, b), borda(d, b, 3)],
    (f, b, d) => [fundo(f), pol([[-5, -6], [40, 32], [85, -6], [85, 16], [40, 54], [-5, 16]], b), borda(d, b, 3)],
    (f, b, d) => [fundo(f), pol([[80, 0], [80, 90], [0, 90]], b), borda(d, b, 3)],
    (f, b, d) => [listrasV([f, b], 5), borda(d, b, 3)],
    (f, b, d) => [fundo(f), ret(40, 0, 40, 45, b), ret(0, 45, 40, 45, b), borda(d, b, 3)],
  ];
  const FORMAS_SORTEIO = ["escudo", "tabua", "ponta"];
  function receita(c) {
    const e = c.escudo || {}, f = e.fundo || c.cores[0], b = e.borda || e.faixa || c.cores[1] || "#ffffff", h = hash(c.id);
    const letras = e.texto || c.curto || c.nome.slice(0, 3);
    const simples = !e.listras && !e.diagonal && !e.anel && !e.simbolo && !e.faixa && !e.faixaMeio;
    const forma = e.forma === "redondo" ? "redondo" : e.forma === "triangulo" ? "triangulo" : FORMAS_SORTEIO[h % FORMAS_SORTEIO.length];
    return { forma, cam: (d) => {
      const cam = [];
      if (simples) { cam.push(...JEITOS[(h >>> 3) % JEITOS.length](f, b, d)); if (forma === "redondo") cam.push(anel(32, b, 3.5)); }
      else {
        cam.push(fundo(f));
        if (e.listras) {
          const [tipo, ...resto] = e.listras, cores = resto.filter((v) => typeof v === "string"), alt = resto.find((v) => typeof v === "number") || 2;
          if (tipo === "v") cam.push(listrasV(cores, cores.length === 3 ? 3 : 6));
          else if (tipo === "h") cam.push(listrasH(cores, alt * 5));
          else if (tipo === "h-baixo") cam.push(listrasH(cores, 10, 50));
          else if (tipo === "v-topo") cam.push(listrasV(cores, 6, 0, 32));
          else if (tipo === "d") cam.push(listrasD(cores, 15));
        }
        if (e.faixa) cam.push(faixa(30, 50, e.faixa));
        if (e.faixaMeio) cam.push(faixa(40, 50, e.faixaMeio));
        if (e.diagonal) cam.push(diag(e.diagonal, 11));
        if (e.anel) cam.push(anel(32, e.anel, 5));
        if (e.borda && forma !== "redondo") cam.push(borda(d, e.borda, 3));
      }
      if (e.estrelasTopo) cam.push(estrelas(e.estrelasTopo, 14, 5.5, e.corEstrelas || OURO));
      const nomeSimbolo = e.simbolo === "cruz" ? "cruzeiro" : e.simbolo;
      if (nomeSimbolo && SIMBOLOS[nomeSimbolo]) cam.push(simbolo(nomeSimbolo, 40, e.texto ? 36 : 46, e.texto ? 0.95 : 1.2, e.corSimbolo || "#ffffff"));
      const y = e.simbolo ? 68 : e.estrelasTopo ? 54 : 47;
      // a pílula das letras: o fundo do escudo se der leitura; senão, a outra cor, o branco ou o preto
      const tx = e.corTexto || b;
      const fundoPill = [f, b, "#ffffff", "#111111"].find((x) => contraste(x, tx) >= 3.2) || (luz(tx) > 0.4 ? "#111111" : "#ffffff");
      const aro = contraste(fundoPill, b) < 1.4 ? (luz(fundoPill) > 0.4 ? "#111111" : "#ffffff") : b;
      cam.push(pill(letras, 40, e.textoY != null ? e.textoY * 5 + 12 : y, e.simbolo ? 16 : 22, fundoPill, tx, aro));
      return cam;
    } };
  }

  // ---------- o desenho ----------
  let contador = 0;
  const cache = new Map();
  function modelo(c) {
    const r = ESPECIAIS[c.id] || receita(c), d = FORMAS[r.forma] || FORMAS.escudo;
    const camadas = r.cam(d).join("");
    // @@ vira um número diferente a cada escudo na página (cada <svg> traz as suas próprias definições)
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false"><defs><clipPath id="ec@@"><path d="${d}"/></clipPath>`
      + `<linearGradient id="eg@@" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".48" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient></defs>`
      + `<g clip-path="url(#ec@@)">${camadas}<path d="${d}" fill="url(#eg@@)"/></g>`
      + `<path d="${d}" fill="none" stroke="${CONTORNO}" stroke-width="3.2" stroke-linejoin="round"/></svg>`;
  }
  function svg(c) {
    if (!cache.has(c.id)) cache.set(c.id, modelo(c));
    return cache.get(c.id).replace(/@@/g, String(++contador));
  }
  return { svg, W, H, FORMAS, ESPECIAIS, CONTORNO };
});
