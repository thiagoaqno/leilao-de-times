// Carreira de Treinador: os escudos dos clubes, desenhados por nós em SVG (nenhum é cópia de escudo de verdade).
// Cada escudo é uma forma (escudo, tábua, ponta, redondo ou triângulo) com camadas por dentro: o fundo, listras, faixas,
// diagonais, o anel, a borda, estrelas, um símbolo e as letras do clube, tudo recortado na forma, com um contorno escuro e
// um brilho suave por cima.
// - Os 20 do Brasileirão têm o desenho feito à mão (ESPECIAIS), com o jeito de cada clube: as listras do Flamengo, o
//   cruzeiro do Cruzeiro, a âncora do Corinthians, a cruz do Vasco, os remos do Remo...
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
