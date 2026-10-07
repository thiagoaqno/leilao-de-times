// Carreira de Treinador: os escudos em pixel-art (16x18 pixels), desenhados por nós a partir de uma receita simples
// (forma, cores, listras, faixa, iniciais e um símbolo). Lembram os escudos de verdade sem copiar nenhum.
// Receita (clube.escudo): forma "escudo" | "redondo" | "triangulo"; fundo; listras ["h"|"v"|"v-topo"|"h-baixo"|"d", cores...,
// altura]; faixa (horizontal no meio); faixaMeio (no redondo); diagonal (faixa inclinada); anel (borda do redondo); borda;
// texto + corTexto (+ fundoTexto, textoY); simbolo "estrela"|"cruz"|"ancora"|"cruzeiro" + corSimbolo; estrelasTopo + corEstrelas.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Escudos = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const W = 16, H = 18, CONTORNO = "#0b1510";
  const FONTE = {
    A: [".#.", "#.#", "###", "#.#", "#.#"], B: ["##.", "#.#", "##.", "#.#", "##."], C: [".##", "#..", "#..", "#..", ".##"],
    F: ["###", "#..", "##.", "#..", "#.."], I: ["###", ".#.", ".#.", ".#.", "###"], L: ["#..", "#..", "#..", "#..", "###"],
    M: ["#.#", "###", "###", "#.#", "#.#"], P: ["##.", "#.#", "##.", "#..", "#.."], R: ["##.", "#.#", "##.", "#.#", "#.#"],
    S: [".##", "#..", ".#.", "..#", "##."], V: ["#.#", "#.#", "#.#", "#.#", ".#."], E: ["###", "#..", "##.", "#..", "###"],
    G: [".##", "#..", "#.#", "#.#", ".##"], N: ["#.#", "###", "###", "###", "#.#"], O: [".#.", "#.#", "#.#", "#.#", ".#."], T: ["###", ".#.", ".#.", ".#.", ".#."],
    U: ["#.#", "#.#", "#.#", "#.#", "###"], H: ["#.#", "#.#", "###", "#.#", "#.#"], D: ["##.", "#.#", "#.#", "#.#", "##."], K: ["#.#", "#.#", "##.", "#.#", "#.#"],
    Q: [".#.", "#.#", "#.#", "##.", ".##"], X: ["#.#", "#.#", ".#.", "#.#", "#.#"], Z: ["###", "..#", ".#.", "#..", "###"], J: ["..#", "..#", "..#", "#.#", ".#."],
    W: ["#.#", "#.#", "###", "###", "#.#"], Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
  };
  const SIMBOLOS = {
    estrela: ["...#...", "...#...", "#######", ".#####.", "..###..", ".##.##.", "##...##"],
    cruz: [".#...#.", "###.###", ".#####.", "..###..", ".#####.", "###.###", ".#...#."],
    ancora: ["..###..", "..#.#..", "..###..", "...#...", "#######", "...#...", "#..#..#", ".#####."],
    estrelinha: [".#.", "###", ".#."],
  };
  function mascara(forma, x, y) {
    const cx = (W - 1) / 2;
    if (forma === "redondo") return Math.hypot(x - cx, y - 8.5) <= 7.9;
    if (forma === "triangulo") { const meia = 8 * (1 - Math.pow(y / (H - 1), 1.7)); return y < H - 1 && Math.abs(x - cx) <= meia + 0.2; }
    if (y < 10) return true;
    const m = Math.floor((y - 9) * 1.15);
    return x >= m && x <= W - 1 - m && y < H - 1;
  }
  // a receita vira uma grade de cores
  function grade(c) {
    const e = c.escudo || { forma: "escudo", fundo: c.cores[0], faixa: c.cores[1], texto: c.curto, corTexto: c.cores[1], fundoTexto: c.cores[0] };
    const forma = e.forma || "escudo", g = [];
    for (let y = 0; y < H; y++) { g.push([]); for (let x = 0; x < W; x++) g[y].push(mascara(forma, x, y) ? e.fundo || c.cores[0] : null); }
    const pinta = (x, y, cor) => { if (y >= 0 && y < H && x >= 0 && x < W && g[y][x]) g[y][x] = cor; };
    if (e.listras) {
      const [tipo, ...resto] = e.listras, cores = resto.filter((v) => typeof v === "string"), alt = resto.find((v) => typeof v === "number") || 2;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (tipo === "h") pinta(x, y, cores[Math.floor(y / alt) % cores.length]);
        else if (tipo === "v") pinta(x, y, cores[Math.floor((x + 1) / 2) % cores.length]);
        else if (tipo === "v-topo" && y < 6) pinta(x, y, cores[Math.floor((x + 1) / 2) % cores.length]);
        else if (tipo === "h-baixo" && y >= 10) pinta(x, y, cores[Math.floor((y - 10) / 2) % cores.length]);
        else if (tipo === "d") pinta(x, y, cores[Math.floor((x + y) / 3) % cores.length]);
      }
    }
    if (e.faixa) for (let y = 6; y <= 9; y++) for (let x = 0; x < W; x++) pinta(x, y, e.faixa);
    if (e.faixaMeio) for (let y = 8; y <= 9; y++) for (let x = 0; x < W; x++) pinta(x, y, e.faixaMeio);
    if (e.diagonal) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.abs(x - y * 0.95) < 1.4) pinta(x, y, e.diagonal);
    if (e.anel) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - 7.5, y - 8.5); if (d > 6.2 && d <= 7.9) pinta(x, y, e.anel); }
    const desenho = (linhas, x0, y0, cor, escala = 1) => linhas.forEach((l, j) => [...l].forEach((ch, i) => {
      if (ch !== "#") return;
      for (let a = 0; a < escala; a++) for (let b = 0; b < escala; b++) pinta(x0 + i * escala + a, y0 + j * escala + b, cor);
    }));
    let topo = 2;
    if (e.estrelasTopo) {
      const n = e.estrelasTopo, larg = n * 3 + (n - 1);
      for (let k = 0; k < n; k++) desenho(SIMBOLOS.estrelinha, Math.round((W - larg) / 2) + k * 4, 1, e.corEstrelas || "#ffd200");
      topo = 5;
    }
    if (e.simbolo === "cruzeiro") { // cinco estrelas como a constelação
      for (const [x, y] of [[7, 2], [3, 7], [11, 6], [8, 12]]) desenho(SIMBOLOS.estrelinha, x, y, e.corSimbolo || "#fff");
      pinta(9, 9, e.corSimbolo || "#fff");
    } else if (e.simbolo) {
      const s = SIMBOLOS[e.simbolo];
      desenho(s, Math.round((W - s[0].length) / 2), Math.max(topo, Math.round((H - s.length) / 2) - 1), e.corSimbolo || "#fff");
    }
    if (e.texto) {
      const letras = [...e.texto.toUpperCase()].filter((l) => FONTE[l]), escala = letras.length === 1 ? 2 : 1;
      const larg = letras.length * 3 * escala + (letras.length - 1), alt = 5 * escala;
      const x0 = Math.round((W - larg) / 2), y0 = e.textoY ?? (e.simbolo ? 12 : Math.max(topo, Math.round((H - alt) / 2) - 1));
      if (e.fundoTexto) for (let y = y0 - 1; y <= y0 + alt; y++) for (let x = x0 - 1; x <= x0 + larg; x++) pinta(x, y, e.fundoTexto);
      letras.forEach((l, k) => desenho(FONTE[l], x0 + k * (3 * escala + 1), y0, e.corTexto || "#fff", escala));
    }
    // contorno: a borda escura (ou a cor de borda por dentro dela)
    const fora = (x, y) => y < 0 || y >= H || x < 0 || x >= W || !mascara(forma, x, y);
    const borda = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] && (fora(x - 1, y) || fora(x + 1, y) || fora(x, y - 1) || fora(x, y + 1))) borda.push([x, y]);
    for (const [x, y] of borda) g[y][x] = CONTORNO;
    if (e.borda) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] && g[y][x] !== CONTORNO && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => g[y + b]?.[x + a] === CONTORNO)) g[y][x] = e.borda;
    return g;
  }
  const cache = new Map();
  // o SVG (um retângulo por trecho da mesma cor em cada linha)
  function svg(c) {
    if (cache.has(c.id)) return cache.get(c.id);
    const g = grade(c), rects = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W;) {
      const cor = g[y][x]; let n = 1;
      while (x + n < W && g[y][x + n] === cor) n++;
      if (cor) rects.push(`<rect x="${x}" y="${y}" width="${n}" height="1" fill="${cor}"/>`);
      x += n;
    }
    const s = `<svg viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" aria-hidden="true">${rects.join("")}</svg>`;
    cache.set(c.id, s);
    return s;
  }
  return { svg, grade, W, H };
});
