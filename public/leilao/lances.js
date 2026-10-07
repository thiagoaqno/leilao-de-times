// Leilão da Galera — os replays dos gols em pixel-art (8 bits), no campeonato ao vivo: o motor. Cada gol ganha um telão
// que toca na hora do gol: o jogador, com o rosto e a camisa da carta dele (rostos.js), faz o lance (um dos tipos de gol
// de lances-gols.js), o goleiro voa, a rede balança e, em close, vem a comemoração (lances-comemoracoes.js).
// Tudo é desenhado num canvas de 160x90 e ampliado sem borrar (image-rendering: pixelated). O lance de cada gol é
// sorteado pelo jogo, pelo minuto e pelo nome: todo mundo vê o mesmo.
// Lances.criar(gol, jogo, { nome, hat, auto }) devolve o telão (um elemento): com auto, toca o replay na hora (o lance,
// o corte e a comemoração) e depois fica parado na comemoração; um toque toca de novo.
// Os tipos de gol entram em Lances.GOLS, as comemorações em Lances.COMEMORA, e as peças para montá-los ficam em
// Lances.kit.
(function () {
  const W = 160, H = 90, FESTA = 1640; // a comemoração em close dura FESTA ms
  const quieto = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- contas ----------
  const mix = (a, b, f) => a + (b - a) * f;
  const prende = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const fase = (t, a, b) => prende((t - a) / (b - a)); // de 0 a 1 dentro do pedaço [a, b] do tempo
  const suave = (f) => f * f * (3 - 2 * f);
  // sorteio com semente: o mesmo lance para todo mundo
  function sorteio(txt) {
    let a = 2166136261;
    for (const ch of String(txt)) a = Math.imul(a ^ ch.charCodeAt(0), 16777619);
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const distCor = (a, b) => { const p = rgb(a), q = rgb(b); return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]); };
  const claro = (hex) => { const [r, g, b] = rgb(hex); return 0.3 * r + 0.59 * g + 0.11 * b; };
  const escapa = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---------- pixel ----------
  const cor = (g, c, a = 1) => { g.fillStyle = c; g.globalAlpha = a; };
  const px = (g, x, y, w = 1, h = 1) => g.fillRect(Math.round(x), Math.round(y), w, h);
  // uma reta de pixels (Bresenham), com pincel quadrado de esp pixels
  function reta(g, x0, y0, x1, y1, esp = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      g.fillRect(x0, y0, esp, esp);
      if (x0 === x1 && y0 === y1) return;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function elipse(g, cx, cy, rx, ry) {
    for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y / (ry + 0.5)) ** 2)); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
  }
  // as letras das placas de propaganda e os números das camisas (3x5); espelho: escreve ao contrário (o telão do time B
  // é virado)
  const LETRA = { G: "011100101101011", A: "010101111101101", L: "100100100100111", E: "111100110100111", R: "110101110101101",
    0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001", 5: "111100111001111",
    6: "111100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001111" };
  function escreve(g, txt, x, y, espelho) {
    for (const ch of String(txt)) {
      const b = LETRA[ch];
      if (b) for (let i = 0; i < 15; i++) if (b[i] === "1") { const xx = x + (i % 3); g.fillRect(espelho ? W - 1 - xx : xx, y + Math.floor(i / 3), 1, 1); }
      x += 4;
    }
  }
  const CORACAO = ["01010", "11111", "01110", "00100"];
  function desenho(g, linhas, x, y, esc = 1) {
    linhas.forEach((l, j) => { for (let i = 0; i < l.length; i++) if (l[i] === "1") g.fillRect(Math.round(x) + i * esc, Math.round(y) + j * esc, esc, esc); });
  }

  // ---------- o boneco ----------
  // O quadro do boneco tem 48x48: a cabeça (o mesmo desenho do rosto da carta) em cima e o corpo de frente, cabeção de
  // 8 bits, com os pés na linha 46. Os membros andam por ângulos na tela: 0 = para baixo, 90 = para a frente (a direita,
  // para onde ele ataca), -90 = para trás e 180 = para cima. Cada braço e cada perna tem dois ângulos: [ombro, cotovelo]
  // e [quadril, joelho]. tr: o tronco inclinado (os ombros andam tr pixels), ag: agachado, ol: para onde olha,
  // pes: "fora" com as chuteiras para os lados (de frente) ou para a frente (de lado).
  // Os enfeites da pose: semCamisa, camisaNaCabeca, costas (de costas, com o número), barriga (a bola debaixo da camisa),
  // oculos, beijo, escudo (a camisa puxada até a boca), nene (no colo), guitarra, camisaNaMao (girando; giro: o ângulo),
  // dedo (apontando) e pernasPorCima (as pernas desenhadas na frente do corpo).
  const Q = 48, PE = 46;
  const spr = document.createElement("canvas"); spr.width = spr.height = Q;
  const sg = spr.getContext("2d", { willReadFrequently: true });
  const vetor = (a) => [Math.sin((a * Math.PI) / 180), Math.cos((a * Math.PI) / 180)];
  // a cabeça vista de trás: a nuca, as orelhas e o cabelo (pelo corte de cabelo do jogador, o mesmo do rosto da carta)
  function nuca(g, b, ox, oy) {
    const estilo = Rostos.tracosDe(b.nome)[1], P = b.pele, C = Rostos.cabelo(b.nome);
    const ret = (x0, y0, x1, y1, c, a = 1) => { cor(g, c, a); g.fillRect(ox + x0, oy + y0, x1 - x0 + 1, y1 - y0 + 1); };
    ret(6, 10, 9, 12, P); ret(5, 3, 10, 3, P); ret(4, 4, 11, 9, P); ret(5, 10, 10, 10, P); ret(3, 6, 3, 7, P); ret(12, 6, 12, 7, P);
    if (estilo === "k" || estilo === "f") ret(7, 4, 8, 4, "#ffffff", 0.3);
    else if (estilo === "r") ret(4, 2, 11, 8, C, 0.55);
    else if (estilo === "x") ret(4, 5, 11, 8, C);
    else if (estilo === "m") ret(7, 0, 8, 9, C);
    else if (estilo === "l") { ret(4, 1, 11, 10, C); ret(3, 2, 12, 11, C); }
    else if (estilo === "o") ret(3, 0, 12, 8, C);
    else if (estilo === "a") ret(2, 0, 13, 9, C);
    else ret(4, 1, 11, 8, C);
    g.globalAlpha = 1;
  }
  function boneco(b, p) {
    const g = sg, u = b.u, ag = Math.round(p.ag || 0), tr = Math.round(p.tr || 0), topo = 24 + ag, qy = 35 + ag, ox = 16 + tr, oy = 12 + ag;
    g.globalAlpha = 1; g.clearRect(0, 0, Q, Q);
    // pernas: a coxa sai do calção, o meião e a chuteira
    const perna = (hx, [a1, a2], lado) => {
      const [x1, y1] = vetor(a1), [x2, y2] = vetor(a2), kx = hx + x1 * 4.5, ky = qy + y1 * 4.5, fx = kx + x2 * 4.5, fy = ky + y2 * 4.5;
      cor(g, b.pele); reta(g, hx, qy, kx, ky, 2);
      cor(g, u.meiao); reta(g, kx + x2 * 1.5, ky + y2 * 1.5, fx, fy, 2);
      cor(g, u.chuteira); px(g, p.pes === "fora" && lado < 0 ? fx - 1 : fx, fy + 1, 3, 2);
    };
    if (!p.pernasPorCima) { perna(21, p.pE || [0, 0], -1); perna(25, p.pD || [0, 0], 1); }
    // o calção
    cor(g, u.calcao); g.fillRect(20, qy - 2, 8, 3); g.fillRect(20, qy + 1, 3, 1); g.fillRect(25, qy + 1, 3, 1);
    cor(g, "#000", 0.2); g.fillRect(27, qy - 2, 1, 4);
    // a camisa, com o desenho do clube (o mesmo da carta), e a sombra do lado direito. Sem camisa (ou com ela na cabeça),
    // aparece o peito; com a bola debaixo da camisa, a barriga cresce para os lados
    for (let r = 0; r <= 8; r++) {
      const y = topo + r, d = Math.round((tr * (8 - r)) / 8), bar = p.barriga ? [0, 0, 0, 0, 1, 2, 2, 1, 0][r] : 0, x0 = (r >= 7 ? 20 : 19) - bar, x1 = (r >= 7 ? 27 : 28) + bar;
      for (let x = x0; x <= x1; x++) {
        const pelada = p.semCamisa || (p.camisaNaCabeca && r >= 3);
        cor(g, pelada ? b.pele : !b.goleiro && Rostos.listra(u.desenho, x - 18, r + 12) ? u.det : u.cam); g.fillRect(x + d, y, 1, 1);
      }
      cor(g, "#000", 0.2); g.fillRect(x1 + d, y, 1, 1);
    }
    if (p.semCamisa || p.camisaNaCabeca) { cor(g, "#000", 0.16); g.fillRect(21 + tr, topo + 4, 2, 1); g.fillRect(25 + tr, topo + 4, 2, 1); g.fillRect(23 + tr, topo + 6, 2, 1); } // o peito e o umbigo
    else if (p.costas) { // o número nas costas (espelhado no telão virado, para ler direito depois de virar)
      const num = String(b.num || 10), x0 = 24 + tr - (num.length * 4 - 1) / 2;
      cor(g, claro(u.cam) > 150 ? "#1a1a1a" : "#f4f4f4");
      [...num].forEach((ch, k) => { const m = LETRA[ch]; for (let i = 0; i < 15; i++) if (m[i] === "1") { const x = Math.round(x0 + k * 4 + (i % 3)); g.fillRect(b.espelho ? 47 - x : x, topo + 2 + Math.floor(i / 3), 1, 1); } });
    }
    else if (!u.desenho || b.goleiro) { cor(g, u.det); g.fillRect(23 + tr, topo + 1, 2, 1); } // a gola
    // a cabeça: o rosto da carta, a nuca (de costas) ou coberta pela camisa
    if (p.costas) nuca(g, b, ox, oy);
    else Rostos.cabeca(g, b.nome, ox, oy, p.ol || 0);
    if (p.camisaNaCabeca) {
      for (let y = 0; y <= 10; y++) for (let x = 3; x <= 12; x++) {
        if (y < 2 && (x < 5 || x > 10)) continue;
        cor(g, Rostos.listra(u.desenho, x - 1, y + 12) ? u.det : u.cam); g.fillRect(ox + x, oy + y, 1, 1);
      }
      cor(g, "#000", 0.22); g.fillRect(ox + 3, oy + 10, 10, 1); g.fillRect(ox + 7, oy + 2, 1, 7);
    }
    if (p.pernasPorCima) { perna(21, p.pE || [0, 0], -1); perna(25, p.pD || [0, 0], 1); } // a perna que passa por cima do corpo (a bicicleta)
    if (p.oculos) { cor(g, "#16181a"); g.fillRect(ox + 5, oy + 5, 3, 3); g.fillRect(ox + 8, oy + 5, 3, 3); cor(g, "#9fe0ff"); g.fillRect(ox + 6, oy + 6, 1, 1); g.fillRect(ox + 9, oy + 6, 1, 1); }
    if (p.beijo) { cor(g, "#e8335a"); g.fillRect(ox + 7 + (p.ol || 0), oy + 8, 2, 2); }
    if (p.nene) { cor(g, "#f4f4f4"); g.fillRect(20 + tr, topo + 4, 7, 3); cor(g, "#9fd3ff"); g.fillRect(20 + tr, topo + 6, 7, 1); cor(g, b.pele); g.fillRect(25 + tr, topo + 4, 2, 2); } // o nenê no colo
    if (p.guitarra) { // a guitarra, na frente do corpo (as mãos vêm por cima): o braço comprido para a esquerda e o corpo vermelho
      cor(g, "#d9b273"); reta(g, 22 + tr, topo + 6, 8 + tr, topo + 1, 2); cor(g, "#3a2a1a"); g.fillRect(6 + tr, topo, 3, 3);
      cor(g, "#d62828"); g.fillRect(21 + tr, topo + 4, 8, 6); g.fillRect(20 + tr, topo + 5, 10, 4);
      cor(g, "#1a1a1a"); g.fillRect(24 + tr, topo + 6, 2, 2); cor(g, "#f4f4f4"); g.fillRect(22 + tr, topo + 8, 6, 1);
    }
    // braços: a manga, o braço e a mão (o goleiro, de manga comprida e luva)
    const maos = [];
    const braco = (bx, [a1, a2]) => {
      const [x1, y1] = vetor(a1), [x2, y2] = vetor(a2), by = topo + 1, ex = bx + x1 * 4, ey = by + y1 * 4, mx = ex + x2 * 3.5, my = ey + y2 * 3.5;
      cor(g, p.semCamisa ? b.pele : u.cam); reta(g, bx, by, bx + x1 * 1.5, by + y1 * 1.5, 2);
      cor(g, b.goleiro ? u.cam : b.pele); reta(g, bx + x1 * 2, by + y1 * 2, ex, ey, 2); reta(g, ex, ey, mx, my, 2);
      cor(g, b.goleiro ? u.luva : b.pele); px(g, mx + x2, my + y2, 2, 2);
      if (p.dedo) px(g, mx + x2 * 3 + 0.5, my + y2 * 3, 1, 1); // o dedo apontando
      maos.push([mx + x2 + 0.5, my + y2 + 0.5]);
    };
    braco(17 + tr, p.bE || [0, 0]); braco(29 + tr, p.bD || [0, 0]);
    if (p.escudo) { cor(g, u.cam); g.fillRect(ox + 6, oy + 8, 4, 3); cor(g, u.det); g.fillRect(ox + 7, oy + 9, 2, 1); } // a camisa puxada até a boca
    if (p.camisaNaMao) { // a camisa girando na mão
      const [hx, hy] = maos[1], a = ((p.giro || 0) * Math.PI) / 180, cx = hx + Math.cos(a) * 3.5, cy = hy + Math.sin(a) * 3.5;
      cor(g, u.cam); reta(g, hx, hy, cx, cy, 2); g.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 4, 3); cor(g, u.det); g.fillRect(Math.round(cx), Math.round(cy), 2, 1);
    }
    // o contorno escuro em volta, o jeito das ilustrações em pixel-art
    g.globalAlpha = 1;
    const img = g.getImageData(0, 0, Q, Q), d = img.data, borda = [], cheio = (i) => d[i * 4 + 3] > 60;
    for (let y = 0; y < Q; y++) for (let x = 0; x < Q; x++) {
      const i = y * Q + x;
      if (!cheio(i) && ((x > 0 && cheio(i - 1)) || (x < Q - 1 && cheio(i + 1)) || (y > 0 && cheio(i - Q)) || (y < Q - 1 && cheio(i + Q)))) borda.push(i);
    }
    for (const i of borda) { d[i * 4] = 14; d[i * 4 + 1] = 19; d[i * 4 + 2] = 16; d[i * 4 + 3] = 230; }
    g.putImageData(img, 0, 0);
    return spr;
  }
  // põe o boneco na cena com os pés em (x, y); esc: 1 no lance, 2 no close; rot: giro em passos de 90 graus (em volta
  // do meio do corpo); vira: espelhado (virado para a esquerda); deitado (-90 ou 90): o corpo no chão, na horizontal
  function poe(g, b, p, x, y, esc = 1, rot = 0, vira = false, deitado = 0) {
    const s = boneco(b, p);
    if (deitado) { rot = deitado; y += 12 * esc; }
    g.save(); g.globalAlpha = 1; g.imageSmoothingEnabled = false;
    g.translate(Math.round(x), Math.round(y - (p.sobe || 0) * esc));
    if (rot) { g.translate(0, -16 * esc); g.rotate((rot * Math.PI) / 180); g.translate(0, 16 * esc); }
    if (vira) g.scale(-1, 1);
    g.drawImage(s, -24 * esc, -PE * esc, Q * esc, Q * esc);
    g.restore();
  }
  function sombra(g, x, y, alto, esc = 1, larga = 0) {
    cor(g, "#000", Math.max(0.12, 0.3 - alto * 0.015));
    elipse(g, x, y, (Math.max(3, 6 - alto * 0.2) + larga) * esc, esc);
    g.globalAlpha = 1;
  }
  function bola(g, x, y, giro) {
    x = Math.round(x) - 1; y = Math.round(y) - 1;
    cor(g, "#121814", 0.9); g.fillRect(x, y - 1, 3, 1); g.fillRect(x - 1, y, 1, 3); g.fillRect(x + 3, y, 1, 3); g.fillRect(x, y + 3, 3, 1);
    cor(g, "#ffffff"); g.fillRect(x, y, 3, 3);
    cor(g, "#1d2420"); const k = ((Math.floor(giro) % 4) + 4) % 4; g.fillRect(x + [0, 2, 2, 0][k], y + [0, 0, 2, 2][k], 1, 1); g.fillRect(x + 1, y + 1, 1, 1);
    g.globalAlpha = 1;
  }

  // ---------- as poses ----------
  const P0 = { bE: [-12, -6], bD: [12, 6], pE: [-4, -2], pD: [4, 2], tr: 0, ag: 0, ol: 0, sobe: 0 };
  // mistura duas poses (ângulos e números), com f de 0 a 1
  function entre(a, b, f) {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const x = a[k] !== undefined ? a[k] : P0[k], y = b[k] !== undefined ? b[k] : P0[k];
      o[k] = Array.isArray(x) ? x.map((v, i) => mix(v, y[i], f)) : typeof x === "number" && typeof y === "number" ? mix(x, y, f) : f < 0.5 ? x : y;
    }
    return o;
  }
  // a pose no tempo t de uma lista de quadros [[ms, pose], ...]; com volta, o último emenda no primeiro; seco: sem
  // misturar (pula de uma pose para a outra, como um robô)
  function quadros(t, lista, volta, seco) {
    const fim = lista[lista.length - 1][0];
    t = volta ? ((t % fim) + fim) % fim : prende(t, 0, fim);
    for (let i = 1; i < lista.length; i++) if (t <= lista[i][0]) {
      const [t0, a] = lista[i - 1], [t1, b] = lista[i];
      return seco ? { ...a } : entre(a, b, suave((t - t0) / (t1 - t0 || 1)));
    }
    return { ...lista[lista.length - 1][1] };
  }
  // correndo de lado, para a direita; braços "balanca" (correndo) ou "alto" (comemorando, braços para cima)
  function corre(t, bracos = "balanca", passo = 280) {
    const s = Math.sin((t / passo) * Math.PI * 2), coxa = 34 * s, perna = (c) => [c, c > 0 ? c * 0.3 : c * 2.2];
    const b = bracos === "alto" ? [[-150 + 10 * s, -170 + 10 * s], [150 - 10 * s, 170 - 10 * s]] : [[-30 * s, -30 * s + 60], [30 * s, 30 * s + 60]];
    return { pE: perna(coxa), pD: perna(-coxa), bE: b[0], bD: b[1], tr: 1, ol: 1, sobe: Math.abs(Math.cos((t / passo) * Math.PI * 2)) * 1.5 };
  }
  // de frente, marcando passo (as pernas sobem para os lados)
  function marcha(t, passo = 320) {
    const s = Math.sin((t / passo) * Math.PI * 2);
    return { pE: [-6 - 6 * Math.max(0, s), -6 - 50 * Math.max(0, s)], pD: [6 + 6 * Math.max(0, -s), 6 + 50 * Math.max(0, -s)], sobe: Math.abs(s) * 1.2, pes: "fora" };
  }
  const CHUTE = {
    arma: { pE: [12, 2], pD: [-55, -115], bE: [-60, -30], bD: [60, 100], tr: -1, ol: 1 }, // a perna de trás armada
    bate: { pE: [8, 0], pD: [70, 80], bE: [-80, -60], bD: [40, 80], tr: 1, ol: 1 }, // o chute
    segue: { pE: [4, -2], pD: [100, 110], bE: [-95, -80], bD: [30, 70], tr: 2, ol: 1 }, // a perna lá em cima
    olha: { pE: [-5, -3], pD: [8, 4], bE: [-20, -10], bD: [20, 30], tr: 0, ol: 1 }, // parado, olhando a bola
    voleio: { pE: [-30, -80], pD: [92, 95], bE: [-120, -100], bD: [70, 40], tr: -3, ol: 1 }, // de voleio, no ar
    cabeca: { pE: [-25, -70], pD: [-10, -60], bE: [-110, -80], bD: [110, 80], tr: 0, ol: 1 }, // subindo para cabecear
    cavada: { pE: [8, 0], pD: [45, 40], bE: [-70, -50], bD: [40, 80], tr: 0, ol: 1 }, // a cavadinha
    trivela: { pE: [8, 0], pD: [55, 78], bE: [-85, -60], bD: [25, 70], tr: 2, ol: 1 }, // com o lado de fora do pé
    toque: { pE: [6, 0], pD: [35, 30], bE: [-40, -20], bD: [30, 60], tr: 0, ol: 1 }, // o passe, de leve
  };
  const GOLEIRO = {
    base: { pE: [-18, -8], pD: [18, 8], bE: [-55, -25], bD: [55, 25], ag: 2, ol: -1 },
    alto: { pE: [-18, -8], pD: [18, 8], bE: [-110, -150], bD: [110, 150], ag: 1, ol: -1 }, // de braços abertos (no pênalti)
    voa: { pE: [-8, -14], pD: [8, 14], bE: [-172, -178], bD: [172, 178], ol: -1 }, // esticado (a cena gira 90 graus)
    chao: { pE: [-6, -12], pD: [6, 12], bE: [-160, -172], bD: [160, 172], ol: -1 },
  };

  // ---------- o cenário ----------
  // A quadra vista de lado, em perspectiva: X ao longo da quadra (o gol fica à direita), D a profundidade (para o fundo,
  // a tela sobe e anda um pouco para a direita) e A a altura.
  const tela = (X, D, A = 0) => [X + D * 0.35, 80 - D * 0.5 - A];
  // o estádio (só na Carreira): g.estadio = { cores: [casa, casa2], visitante: [cam, det], curto: "FLA" }. A arquibancada, as
  // placas e a torcida vestem as cores do time da CASA, com um cantinho de visitantes; no Leilão não há estádio e fica
  // tudo como era (as cores de quem marcou).
  const mistura = (a, b, t) => { const x = rgb(a), y = rgb(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  const donoDoEstadio = (L) => (L.estadio && L.estadio.cores ? L.estadio : null);
  const GOL_X = 134, GOL_ALTO = 24, GOL_FUNDO = 9;
  const GOL = (() => {
    const nb = tela(GOL_X, 4), fb = tela(GOL_X, 40), bnb = tela(GOL_X + GOL_FUNDO, 4), bfb = tela(GOL_X + GOL_FUNDO, 40);
    return { nb, fb, nt: [nb[0], nb[1] - GOL_ALTO], ft: [fb[0], fb[1] - GOL_ALTO], bnb, bfb, bnt: [bnb[0], bnb[1] - 16], bft: [bfb[0], bfb[1] - 16] };
  })();
  // a marca do pênalti (no futsal, a de 6 metros) e a bandeirinha de escanteio, perto da trave de cá
  const marcaPenalti = (futsal) => GOL_X - (futsal ? 40 : 24);
  const ESCANTEIO = { X: GOL_X, D: -14 };
  // a arquibancada, as placas e o chão (gramado listrado ou a quadra do futsal), com as linhas; pula: a torcida pulando
  function fundoAberto(L, pula) {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d"), img = g.createImageData(W, H), d = img.data, sorte = sorteio(L.semente + "torcida");
    const poe = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
    const piso = (L.futsal ? ["#2f6db4", "#2b66aa"] : ["#3f8f3a", "#4a9c43"]).map(rgb);
    const est = donoDoEstadio(L);
    const arqBase = L.futsal ? "#121b29" : "#0b1611", degBase = L.futsal ? "#1c2a3d" : "#132219";
    const arq = rgb(est ? mistura(arqBase, est.cores[0], 0.22) : arqBase), degrau = rgb(est ? mistura(degBase, est.cores[0], 0.32) : degBase);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (y < 27) poe(x, y, y % 5 === 4 ? degrau : arq);
      else if (y >= 35) { const D = (80 - y) / 0.5; poe(x, y, piso[Math.floor((x - D * 0.35 + 200) / 12) & 1]); }
    }
    // a torcida: a cabecinha e a camisa (as cores do time que marcou, branco e o verde-limão)
    const peles = ["#f6d3b5", "#e6b48a", "#c68b5e", "#9c6640", "#5f3a24"].map(rgb);
    const escuro = (c) => rgb(c).map((v) => Math.round(v * 0.78));
    const camisas = (est ? [est.cores[0], est.cores[1] || "#d8dcd9", est.cores[0], est.cores[0], "#d8dcd9", "#1a1a1a"] : [L.art.u.cam, L.art.u.det, L.art.u.cam, "#d8dcd9", "#a6d63a", "#1a1a1a"]).map(escuro);
    const visitas = est && est.visitante ? [est.visitante[0], est.visitante[1] || est.visitante[0], est.visitante[0]].map(escuro) : null;
    for (let fil = 0; fil < 5; fil++) for (let x = fil & 1; x < W; x += 3) {
      const vazio = sorte() < 0.12, pe = peles[Math.floor(sorte() * 5)];
      const cantinho = visitas && x >= W - 27; // o setor dos visitantes, no canto
      const c = cantinho ? visitas[Math.floor(sorte() * visitas.length)] : camisas[Math.floor(sorte() * camisas.length)];
      if (vazio) continue;
      const y = fil * 5 + 1 - (pula && (x + fil) % 2 === 0 ? 1 : 0);
      poe(x, y, pe); poe(x, y + 1, c); poe(x + 1, y + 1, c); poe(x, y + 2, c); poe(x + 1, y + 2, c);
    }
    g.putImageData(img, 0, 0);
    // as placas de propaganda
    const camPlaca = est ? est.cores[0] : L.art.u.cam, letra = claro(camPlaca) > 150 ? "#1a1a1a" : "#f4f4f4";
    const txtPlaca = est && est.curto ? String(est.curto).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) : "GALERA";
    const corDois = est ? est.cores[1] || "#f4f4f4" : "#c6ff3a";
    for (let k = 0; k * 40 < W; k++) {
      const lima = k % 2 === 0, x0 = k * 40;
      cor(g, lima ? corDois : camPlaca); g.fillRect(x0, 27, 40, 8);
      cor(g, lima ? (claro(corDois) > 150 ? "#0b1604" : "#f4f4f4") : letra); escreve(g, txtPlaca, x0 + Math.max(2, Math.floor((40 - txtPlaca.length * 4) / 2)), 29, L.espelho);
      cor(g, "#000", 0.3); g.fillRect(x0 + 39, 27, 1, 8);
    }
    cor(g, "#000", 0.35); g.fillRect(0, 35, W, 1);
    // as linhas
    cor(g, "#ffffff", 0.75);
    const linha = (X1, D1, X2, D2) => { const [a, b] = tela(X1, D1), [c, e] = tela(X2, D2); reta(g, a, b, c, e); };
    linha(GOL_X, -20, GOL_X, 90); // a linha de fundo
    if (L.futsal) { // a área do futsal (o arco em volta do gol)
      let ant = null;
      for (let k = 0; k <= 24; k++) {
        const th = ((-90 + k * 7.5) * Math.PI) / 180, p = tela(GOL_X - 30 * Math.cos(th), 22 + 32 * Math.sin(th));
        if (ant) reta(g, ant[0], ant[1], p[0], p[1]);
        ant = p;
      }
    } else { // a grande área e a pequena área
      linha(GOL_X - 34, -20, GOL_X - 34, 64); linha(GOL_X - 34, 64, GOL_X, 64);
      linha(GOL_X - 12, -2, GOL_X - 12, 46); linha(GOL_X - 12, 46, GOL_X, 46); linha(GOL_X - 12, -2, GOL_X, -2);
    }
    const m = tela(marcaPenalti(L.futsal), 22); g.fillRect(Math.round(m[0]), Math.round(m[1]), 2, 1); // a marca do pênalti
    g.globalAlpha = 1;
    return cv;
  }
  // o fundo do close: a torcida desfocada lá atrás, as placas e o chão (como as ilustrações de 8 bits, chão liso)
  function fundoClose(L) {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d"), sorte = sorteio(L.semente + "close");
    const est = donoDoEstadio(L);
    cor(g, mistura(L.futsal ? "#121b29" : "#0b1611", est ? est.cores[0] : "#000000", est ? 0.22 : 0)); g.fillRect(0, 0, W, 18);
    const camisas = est ? [est.cores[0], est.cores[0], est.cores[1] || "#f4f4f4", "#f4f4f4", "#e6b48a"] : [L.art.u.cam, L.art.u.det, "#f4f4f4", "#c6ff3a", "#e6b48a"];
    for (let k = 0; k < 90; k++) { cor(g, camisas[Math.floor(sorte() * camisas.length)], 0.35); g.fillRect(Math.floor(sorte() * W), Math.floor(sorte() * 16), 3, 2); }
    for (let k = 0; k * 40 < W; k++) { cor(g, k % 2 ? (est ? est.cores[0] : L.art.u.cam) : (est ? est.cores[1] || "#f4f4f4" : "#c6ff3a"), 0.85); g.fillRect(k * 40, 18, 40, 6); }
    for (let y = 24; y < H; y++) { cor(g, L.futsal ? (Math.floor((y - 24) / 11) % 2 ? "#2b66aa" : "#2f6db4") : Math.floor((y - 24) / 11) % 2 ? "#5b8c3b" : "#659846"); g.fillRect(0, y, W, 1); }
    cor(g, "#000", 0.3); g.fillRect(0, 24, W, 1);
    if (L.futsal) { cor(g, "#ffffff", 0.6); g.fillRect(0, 70, W, 1); } // uma linha da quadra
    g.globalAlpha = 1;
    return cv;
  }
  const dentroDe = (pol, x, y) => {
    let s = false;
    for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
      const [xi, yi] = pol[i], [xj, yj] = pol[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) s = !s;
    }
    return s;
  };
  // a rede (um losango de fios), que se estufa em volta de onde a bola entrou
  function rede(g, pol, impacto, forca, alfa) {
    cor(g, "#ffffff", alfa);
    for (let y = 30; y <= 82; y++) for (let x = 126; x < W; x++) {
      if (!dentroDe(pol, x + 0.5, y + 0.5)) continue;
      let sx = x;
      if (forca > 0) { const dx = x - impacto[0], dy = y - impacto[1]; sx -= Math.round(forca * 3 * Math.exp(-(dx * dx + dy * dy) / 40)); }
      if ((sx + y) % 3 === 0 || (((sx - y) % 3) + 3) % 3 === 0) g.fillRect(x, y, 1, 1);
    }
    g.globalAlpha = 1;
  }
  // as traves (as do fundo e o travessão, ou a trave de cá); bate: a trave que a bola acertou brilha e treme
  function traves(g, frente, bate) {
    const { nb, fb, nt, ft, bnb, bfb, bnt, bft } = GOL, r = (a, b, e = 1) => reta(g, a[0], a[1], b[0], b[1], e);
    const treme = (lado) => (bate && bate.lado === lado ? bate.treme : 0);
    if (!frente) {
      cor(g, "#b8c2bc"); r(bnt, bft); r(bft, bfb); r(bfb, bnb); r(ft, bft); r(nt, bnt); r(bnt, bnb);
      const s = treme("longe");
      cor(g, s ? "#fff6b0" : "#ffffff"); r([fb[0] + s, fb[1]], [ft[0] + s, ft[1]], 2); r(nt, ft, 2);
    } else {
      const s = treme("perto");
      cor(g, s ? "#fff6b0" : "#ffffff"); r([nb[0] + s, nb[1]], [nt[0] + s, nt[1]], 2); cor(g, "#000", 0.25); r([nb[0] + 2, nb[1]], [nt[0] + 2, nt[1] + 1]);
    }
    g.globalAlpha = 1;
  }
  // a bandeirinha de escanteio, na beira da quadra
  function bandeirinha(g, x, y, alto = 9, esc = 1, onda = 0) {
    cor(g, "#f4f4f4"); g.fillRect(Math.round(x), Math.round(y - alto * esc), esc, alto * esc);
    cor(g, "#ff4f5e"); for (let k = 0; k < 4; k++) g.fillRect(Math.round(x + esc + k * esc), Math.round(y - alto * esc + (k % 2 ? onda : 0) * esc), esc, 3 * esc);
    cor(g, "#c6ff3a"); g.fillRect(Math.round(x + esc), Math.round(y - alto * esc + 3 * esc), 4 * esc, esc);
  }
  // a grama (ou o piso) voando onde alguém escorrega
  function poeira(g, L, x, y, t, lado = -1, esc = 1) {
    const s = sorteio(L.semente + Math.floor(t / 50));
    for (let k = 0; k < 7; k++) { cor(g, k % 3 ? (L.futsal ? "#9fc2ea" : "#8fd16a") : "#ffffff"); g.fillRect(Math.round(x + lado * (4 + s() * 13) * esc), Math.round(y - 1 - s() * 5 * esc), 2, 1); }
    g.globalAlpha = 1;
  }

  // ---------- peças dos roteiros dos gols (lances-gols.js) ----------
  // Cada tipo de gol diz onde cada um está no tempo t: { art, gol, bola, extras, spray, bate (a bola na trave), poeira }. art e gol são
  // quem marcou e o goleiro ({ X, D, p, vira, deitado }); extras, os outros (zagueiros, a barreira, o companheiro: { b,
  // X, D, p... }); bola, { X, D, A, rastro }.
  const naLinha = (L) => ({ X: GOL_X + 3, D: L.alvo.D, A: L.alvo.A }); // a bola cruzando a linha do gol
  // a bola voando de a até b (pontos { X, D, A }) entre t0 e t1, com arco (altura a mais no meio) e curva (de lado)
  function voo(t, t0, t1, a, b, arco = 0, curva = 0) {
    const f = fase(t, t0, t1);
    return { X: mix(a.X, b.X, f), D: mix(a.D, b.D, f) + curva * Math.sin(Math.PI * f), A: mix(a.A, b.A, f) + arco * Math.sin(Math.PI * f) };
  }
  // a bola em curva (Bézier): sai de a, puxada para c, e chega em b
  function curva(t, t0, t1, a, c, b) {
    const f = fase(t, t0, t1), m = (k) => (1 - f) * (1 - f) * a[k] + 2 * (1 - f) * f * c[k] + f * f * b[k];
    return { X: m("X"), D: m("D"), A: m("A") };
  }
  // a bola dentro do gol, depois de entrar: estufa a rede, cai e quica
  function naRede(L, t) {
    const { alvo, tGol } = L, f = fase(t, tGol, tGol + 300);
    return { X: mix(GOL_X + 3, GOL_X + GOL_FUNDO - 1, fase(t, tGol, tGol + 90)), D: alvo.D, A: Math.max(0, alvo.A * (1 - f)) + 2 * Math.sin(Math.PI * fase(t, tGol + 300, tGol + 420)) };
  }
  const conduz = (art, t) => ({ X: art.X + 6, D: art.D - 1, A: Math.abs(Math.sin((t / 140) * Math.PI)) * 2 }); // a bola no pé, correndo
  // o chute de quem marcou: arma a perna, bate (tc: a hora do toque), segue e fica olhando
  function chutando(t, tc, bate = CHUTE.bate) {
    if (t < tc) return entre(CHUTE.arma, bate, fase(t, tc - 80, tc));
    if (t < tc + 180) return entre(bate, CHUTE.segue, fase(t, tc, tc + 180));
    return entre(CHUTE.segue, CHUTE.olha, fase(t, tc + 180, tc + 300));
  }
  // depois do gol, quem marcou sai correndo para a torcida de braços para cima
  function festejando(L, t, x, d, dx = 14, dd = -16) {
    const f = fase(t, L.tGol + 60, L.tCorte);
    return { X: x + dx * f, D: d + dd * f, p: corre(t, "alto", 240), vira: dx < 0 };
  }
  // o goleiro: espera (chegando um pouco para o lado do chute), voa atrasado e fica no chão. reage: a hora do pulo;
  // para: até onde ele vai (D); alto: a altura do voo; sai: { t0, t1, X } sai do gol correndo antes; frente: pula para
  // a frente, nos pés de quem chuta; fim: quando ele termina de cair (normalmente, logo depois do gol); pose: a da espera
  function goleiroVoa(L, t, { reage, X0 = 127, D0 = null, para = null, alto = null, sai = null, frente = false, fim = null, pose = GOLEIRO.base } = {}) {
    const base = D0 !== null ? D0 : 22 + (L.d0 - 22) * 0.25 * suave(fase(t, 0, reage));
    let X = X0;
    if (sai) {
      const f = fase(t, sai.t0, sai.t1); X = mix(X0, sai.X, suave(f));
      if (f > 0 && f < 1 && t < reage) return { X, D: base, p: corre(t, "balanca", 220), vira: true };
    }
    if (t < reage) return { X, D: base, p: { ...pose, sobe: Math.abs(Math.sin(t / 160)) } };
    const f = fase(t, reage, fim || Math.max(L.tGol + 60, reage + 220)), alvo = para !== null ? para : L.alvo.D + (L.alvo.D > 22 ? -7 : 7);
    const D = frente ? base : mix(base, alvo, suave(f)), h = alto !== null ? alto : L.alvo.A > 10 ? 9 : 4;
    if (f < 0.15) return { X, D, p: entre(pose, GOLEIRO.voa, f / 0.15) };
    return { X: X - (frente ? 6 * f : 0), D, deitado: -90, p: { ...(f < 1 ? GOLEIRO.voa : GOLEIRO.chao), sobe: h * Math.sin(Math.PI * Math.min(1, f)) } };
  }

  // ---------- as cenas ----------
  function ator(g, a) {
    const [x, y] = tela(a.X, a.D);
    poe(g, a.b, a.p, x, y, 1, a.rot || 0, a.vira, a.deitado || 0);
  }
  function cenaAberta(g, L, t) {
    if (!L.fundoA) { L.fundoA = fundoAberto(L, false); L.fundoB = fundoAberto(L, true); }
    const gol = t >= L.tGol && L.resultado === "gol", c = L.tipo.cena(L, t);
    g.drawImage(gol && Math.floor((t - L.tGol) / 140) % 2 === 0 ? L.fundoB : L.fundoA, 0, 0);
    if (gol) { const s = sorteio(L.semente + Math.floor(t / 90)); cor(g, "#ffffff"); for (let k = 0; k < 6; k++) g.fillRect(Math.floor(s() * W), Math.floor(s() * 26), 1, 1); g.globalAlpha = 1; } // os flashes
    const forca = gol ? Math.max(0, 1 - (t - L.tGol) / 450) * (1 + Math.sin((t - L.tGol) / 35)) * (L.tipo.forcaRede || 1) : 0;
    const { nt, ft, bft, bfb, bnb, nb, bnt } = GOL;
    rede(g, [nt, ft, bft, bfb, bnb, nb], L.impacto, forca, 0.36); traves(g, false, c.bate);
    if (c.spray) { // a linha do spray na frente da barreira
      cor(g, "#ffffff", 0.7);
      for (let D = c.spray.D0; D <= c.spray.D1; D += 2) { const [x, y] = tela(c.spray.X, D); g.fillRect(Math.round(x), Math.round(y), 1, 1); }
      g.globalAlpha = 1;
    }
    if (L.tipo.escanteio) { const [x, y] = tela(ESCANTEIO.X, ESCANTEIO.D); bandeirinha(g, x, y, 9, 1, Math.floor(t / 120) % 2); }
    const atores = [{ b: L.art, ...c.art }, { b: L.gol, ...c.gol }, ...(c.extras || [])];
    for (const a of atores) { const [x, y] = tela(a.X, a.D); sombra(g, x, y, (a.p && a.p.sobe) || 0, 1, a.deitado ? 3 : 0); }
    const b = c.bola;
    { const [x, y] = tela(b.X, b.D); cor(g, "#000", 0.28); g.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); g.globalAlpha = 1; }
    const coisas = atores.map((a) => ({ D: a.D, faz: () => ator(g, a) }));
    coisas.push({ D: b.D - 0.5, faz: () => {
      const [x, y] = tela(b.X, b.D, b.A);
      if (b.rastro) { // o rastro da bola, nos chutes fortes
        const a = L.tipo.cena(L, t - 50).bola, [x0, y0] = tela(a.X, a.D, a.A);
        cor(g, "#ffffff", 0.35); reta(g, x0, y0, x, y, 2); cor(g, "#ffffff", 0.6); reta(g, mix(x0, x, 0.5), mix(y0, y, 0.5), x, y, 1); g.globalAlpha = 1;
      }
      bola(g, x, y, t / 60);
    } });
    coisas.sort((p, q) => q.D - p.D).forEach((k) => k.faz());
    rede(g, [nt, bnt, bnb, nb], L.impacto, 0, 0.22); traves(g, true, c.bate); // a rede do lado de cá e a trave da frente
    if (c.poeira) { const [x, y] = tela(c.poeira.X, c.poeira.D); poeira(g, L, x, y, t); }
    if (c.bate && c.bate.onde && c.bate.t < 140) { // o estalo da bola na trave
      const [x, y] = tela(c.bate.onde.X, c.bate.onde.D, c.bate.onde.A), r = 3 + c.bate.t / 30;
      cor(g, "#ffe14d"); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7]]) g.fillRect(Math.round(x + dx * r), Math.round(y + dy * r), 2, 1);
      g.globalAlpha = 1;
    }
    if (gol && t < L.tGol + 140) { cor(g, "#ffffff", 0.4 * (1 - (t - L.tGol) / 140)); g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }
  // o close da comemoração (tc: ms desde o começo do close). A comemoração devolve { p, dx, rot, vira, deitado, zoom,
  // chao, fx, extras }: zoom é o tamanho do boneco (2 normal, 3 bem perto da câmera); fx, os efeitos; extras, os
  // companheiros que entram na festa ({ b: "parceiro"/"parceiro2", p, dx, vira, deitado, frente }).
  function cenaClose(g, L, tc) {
    g.drawImage(L.fundoClose, 0, 0);
    const c = Lances.COMEMORA[L.comemora](tc, L), esc = c.zoom || 2, chao = c.chao || 85, x = 80 + (c.dx || 0) * 2, fx = c.fx || "";
    const pessoa = (e) => (e.b === "parceiro2" ? L.parceiros[1] : L.parceiros[0]);
    const extra = (e) => poe(g, pessoa(e), e.p, 80 + (e.dx || 0) * 2, chao, esc, e.rot || 0, e.vira, e.deitado || 0);
    if (fx === "aura") { // o brilho dourado em volta de quem medita
      const r = 25 + Math.round(2 * Math.sin(tc / 300));
      cor(g, "#f6c64e", 0.5); for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2; g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(chao - 26 + Math.sin(a) * r * 0.9), 1, 1); }
      g.globalAlpha = 1;
    }
    if (fx === "grama") poeira(g, L, x - 18, chao, tc, -1, 2); // a grama voando atrás de quem escorrega
    if (fx === "cadeira") { // a cadeira do banco de reservas, atrás dele
      cor(g, "#5b6470"); g.fillRect(x - 22, chao - 50, 4, 36); g.fillRect(x + 18, chao - 50, 4, 36);
      cor(g, "#2b6bd6"); g.fillRect(x - 22, chao - 54, 44, 9); g.fillRect(x - 24, chao - 16, 48, 5);
      cor(g, "#3c434c"); g.fillRect(x - 21, chao - 11, 3, 11); g.fillRect(x + 18, chao - 11, 3, 11);
    }
    if (fx === "bandeira") bandeirinha(g, x + 26, chao, 34, 2, Math.floor(tc / 90) % 2);
    for (const e of c.extras || []) if (!e.frente) extra(e);
    if (!c.deitado) sombra(g, x, chao, (c.p && c.p.sobe) || 0, esc);
    poe(g, L.estrela || L.art, c.p, x, chao, esc, c.rot || 0, c.vira, c.deitado || 0);
    for (const e of c.extras || []) if (e.frente) extra(e);
    if (fx === "brilho") { // as estrelinhas em cima dos dedos
      cor(g, "#fff6c8");
      for (let k = 0; k < 4; k++) { const on = Math.floor(tc / 120 + k * 1.7) % 3 === 0; if (on) { const sx = x + [-24, -14, 14, 24][k], sy = 10 + ((k * 7) % 12); g.fillRect(sx, sy - 1, 1, 3); g.fillRect(sx - 1, sy, 3, 1); } }
      g.globalAlpha = 1;
    }
    if (fx === "coracao") { // os coraçõezinhos subindo das mãos
      for (let k = 0; k < 2; k++) { const f = ((tc + k * 450) % 900) / 900; cor(g, "#ff4f8b", 1 - f * f); desenho(g, CORACAO, x - 5 + (k ? 1 : -1) * (6 + 22 * f), chao - 46 - f * 30, 2); }
      g.globalAlpha = 1;
    }
    if (fx === "raio") { // o raio no céu, para onde ele aponta
      if (Math.floor(tc / 110) % 3) { cor(g, "#ffe14d"); reta(g, x + 40, 2, x + 34, 10, 2); reta(g, x + 34, 10, x + 42, 12, 2); reta(g, x + 42, 12, x + 35, 22, 2); g.globalAlpha = 1; }
    }
    if (fx === "carga" || fx === "feixe") { // a bola de energia nas mãos e o raio saindo (o golpe do desenho japonês)
      const hx = x + 26, hy = chao - 36, r = fx === "carga" ? 2 + Math.floor(tc / 120) % 3 : 4;
      cor(g, "#bdf3ff", 0.9); elipse(g, hx, hy, r + 1, r); cor(g, "#ffffff"); elipse(g, hx, hy, Math.max(1, r - 1), Math.max(1, r - 2));
      if (fx === "feixe") { const al = 7 + (Math.floor(tc / 60) % 2); cor(g, "#7fe6ff", 0.85); g.fillRect(hx, hy - al / 2, W - hx, al); cor(g, "#ffffff"); g.fillRect(hx, hy - 1, W - hx, 3); }
      g.globalAlpha = 1;
    }
    if (fx === "marca") { cor(g, "#e8335a", 0.55); desenho(g, CORACAO, 46, 22, 9); g.globalAlpha = 1; } // o batom na lente
    // o papel picado caindo, nas cores do time
    const cores = [L.art.u.cam, L.art.u.det, "#ffffff", "#f6c64e", "#c6ff3a"], s = sorteio(L.semente + "papel");
    for (let k = 0; k < 26; k++) {
      const x0 = s() * W, v = 16 + s() * 22, fz = s() * 6, y = ((s() * H + (tc / 1000) * v) % (H + 8)) - 4;
      cor(g, cores[k % cores.length]); g.fillRect(Math.round(x0 + Math.sin(tc / 260 + fz) * 3), Math.round(y), Math.floor(tc / 140 + k) % 2 ? 2 : 1, 1);
    }
    g.globalAlpha = 1;
  }
  // a cortina verde-limão que passa entre o lance e o close (f: de 0 a 1; no meio cobre a tela toda)
  function cortina(g, f) {
    const x = mix(-150, W + 150, f);
    for (let y = 0; y < H; y++) {
      const sh = Math.round((H / 2 - y) * 0.5);
      cor(g, "#0b1604"); g.fillRect(Math.round(x - 112 + sh), y, 224, 1);
      cor(g, "#c6ff3a"); g.fillRect(Math.round(x - 110 + sh), y, 220, 1);
      cor(g, "#a9e01f"); g.fillRect(Math.round(x - 30 + sh), y, 6, 1);
    }
    bola(g, x + 10, H / 2, f * 40);
  }

  // ---------- o telão ----------
  const figura = (nome, u, extra) => ({ nome, u, pele: Rostos.pele(nome), ...extra });
  // o número nas costas: o famoso de cada craque; os outros, pela posição
  const NUMERO = { "Pelé": 10, "Diego Maradona": 10, "Zico": 10, "Lionel Messi": 10, "Cristiano Ronaldo": 7, "Ronaldo Fenômeno": 9, "Romário": 11,
    "Neymar": 10, "Ronaldinho Gaúcho": 10, "Kaká": 22, "Zinedine Zidane": 10, "Erling Haaland": 9, "Kylian Mbappé": 10, "Johan Cruyff": 14, "Rivaldo": 10 };
  const NUMERO_POS = { GK: [1], DEF: [3, 4, 2, 6], VOL: [5, 8], MEI: [10, 8, 7], ATT: [9, 11, 7] };
  const numeroDe = (nome, pos, sorte) => { const l = NUMERO_POS[pos] || [9, 10, 11], r = sorte(); return NUMERO[nome] || l[Math.floor(r * l.length)]; };
  // o tipo de gol, pela posição e pela nota de quem marcou (e pelo jeito de cada craque, em Lances.FINALIZACAO)
  function escolheTipo(sorte, pos, ovr, futsal, nome) {
    const extra = Lances.FINALIZACAO[nome] || {};
    const pesos = Object.entries(Lances.GOLS).map(([k, t]) => [k, Math.max(0, t.peso(pos, ovr, futsal) + (extra[k] || 0))]);
    let r = sorte() * pesos.reduce((a, [, v]) => a + v, 0);
    for (const [k, v] of pesos) if ((r -= v) <= 0) return k;
    return "chute";
  }
  // a comemoração: a do craque (quando ele tem) sai às vezes; no resto, qualquer uma das outras
  function escolheComemora(sorte, nome) {
    const propria = Lances.ASSINATURA[nome], r = sorte(), todas = Object.keys(Lances.COMEMORA);
    return propria && r < 0.4 ? propria : todas[Math.floor(sorte() * todas.length)];
  }
  // tudo o que o lance de um gol precisa: quem marcou, o goleiro, os outros em campo, o tipo de gol, a comemoração e o
  // fundo do close
  function monta(g, j, cobranca = null) {
    const semente = `${j.id}|${g.min}|${g.nome}|${g.lado}`, sorte = sorteio(semente), futsal = j.mins === 40;
    // o uniforme vem da carta (Leilão) ou do clube de quem marcou (g.uniforme, na Carreira de Treinador)
    const art = figura(g.nome, g.uniforme || Rostos.uniformeDe(g.nome), { num: numeroDe(g.nome, g.pos, sorte) });
    const paleta = ["#f7d417", "#3ad37a", "#ff7a2f", "#8a8f98", "#b06cff", "#25b4c9"];
    const corGol = paleta.slice().sort((a, b) => distCor(b, art.u.cam) - distCor(a, art.u.cam))[0];
    const nomeGol = (cobranca && cobranca.goleiro) || "goleiro " + Math.floor(sorte() * 99999); // no pênalti da galera, o goleiro de verdade
    const gol = figura(nomeGol, { cam: corGol, det: "#1a1a1a", desenho: "", calcao: "#1a1a1a", meiao: corGol, chuteira: "#1a1a1a", luva: "#f4f4f4" }, { goleiro: true });
    // os zagueiros do outro time: a camisa que mais se diferencia de quem marcou e do goleiro
    const cores = ["#e63946", "#1d4ed8", "#16a34a", "#f59e0b", "#7c3aed", "#0f172a", "#f4f4f4"];
    const camRival = cores.slice().sort((a, b) => Math.min(distCor(b, art.u.cam), distCor(b, corGol)) - Math.min(distCor(a, art.u.cam), distCor(a, corGol)))[0];
    const detRival = claro(camRival) > 150 ? "#1a1a1a" : "#f4f4f4";
    const rival = g.uniformeRival || { cam: camRival, det: detRival, desenho: "", calcao: detRival, meiao: camRival, chuteira: "#1a1a1a" };
    const rivais = [0, 1, 2].map((k) => figura(`zagueiro ${semente} ${k}`, rival));
    const parceiros = [0, 1].map((k) => figura(`parceiro ${semente} ${k}`, art.u, { num: [8, 11][k] }));
    const tipoNome = cobranca ? "penalti" : escolheTipo(sorte, g.pos, g.ovr || 80, futsal, g.nome), tipo = Lances.GOLS[tipoNome];
    const L = { semente, futsal, espelho: g.lado === "B", estadio: g.estadio || null, art, gol, rivais, parceiros, tipoNome, tipo, d0: 8 + sorte() * 16, cobranca,
      resultado: !cobranca || cobranca.gol ? "gol" : cobranca.fora ? "fora" : "defesa" };
    art.espelho = parceiros[0].espelho = parceiros[1].espelho = L.espelho;
    L.alvo = tipo.alvo(sorte, L);
    L.tGol = typeof tipo.tGol === "function" ? tipo.tGol(L) : tipo.tGol;
    L.tCorte = L.tGol + 640; L.total = L.tCorte + FESTA;
    L.impacto = tela(GOL_X + GOL_FUNDO - 1, L.alvo.D, L.alvo.A);
    if (tipo.prepara) tipo.prepara(L, sorte);
    L.comemora = escolheComemora(sorte, g.nome);
    // pênalti perdido: no close, o goleiro comemora a defesa, ou quem bateu põe as mãos na cabeça
    if (L.resultado === "defesa") { L.estrela = gol; L.comemora = ["soco", "abre", "batePeito", "orelha", "muque", "raio"][Math.floor(sorte() * 6)]; }
    if (L.resultado === "fora") L.comemora = "naoAcredita";
    L.fundoClose = fundoClose(L); // os fundos do lance (fundoA e fundoB) só são desenhados quando o replay toca
    return L;
  }
  // um quadro do telão no tempo t (ms)
  function desenha(ctx, L, t) {
    if (t < L.tCorte) cenaAberta(ctx, L, t); else cenaClose(ctx, L, t - L.tCorte);
    const f = fase(t, L.tCorte - 130, L.tCorte + 130);
    if (f > 0 && f < 1) cortina(ctx, f);
  }
  // o telão de um gol: toca o replay (auto) ou já mostra o último quadro, parado na comemoração (quem chega depois, ou
  // pediu "menos movimento"). Um toque no telão toca de novo.
  function criar(g, j, { nome, hat, auto = true, cobranca = null }) {
    const L = monta(g, j, cobranca), ms = L.total, res = L.resultado;
    const faixa = res === "defesa" ? ["luva", "Defendeu", cobranca.goleiro || ""] : res === "fora" ? ["bola", "Pra fora", nome || g.nome] : [hat ? "cartola" : "bola", hat ? "Hat-trick" : cobranca ? "Pênalti" : "Gol", nome || g.nome];
    const el = document.createElement("div"), icone = (n) => (window.Icones ? Icones.ic(n) : "");
    el.className = `telao lado${g.lado}${hat ? " hat" : ""}`;
    el.setAttribute("role", "button"); el.tabIndex = 0;
    el.setAttribute("aria-label", `Ver o gol de ${nome || g.nome} aos ${g.min} minutos`);
    el.innerHTML = `<canvas width="${W}" height="${H}" aria-hidden="true"></canvas><span class="lcTag"><i></i><span>Replay</span></span>
      <b class="lcGrito" aria-hidden="true">${res === "defesa" ? "Defendeu!" : res === "fora" ? "Pra fora!" : L.comemora === "siu" ? "Siuuu!" : "Gol!"}</b><span class="lcPlay" aria-hidden="true">${icone("play")}</span>
      <div class="lcFaixa">${icone(faixa[0])}<span>${faixa[1]}</span><b>${escapa(faixa[2])}</b><span>${g.min}'</span></div>`;
    const ctx = el.querySelector("canvas").getContext("2d");
    ctx.imageSmoothingEnabled = false;
    // parado, o telão fica num instante da comemoração que muda de gol para gol (o mesmo craque não repete a pose), e os
    // fundos do lance saem da memória até tocar de novo
    const instante = ms - Math.floor(sorteio(L.semente + "pose")() * 700);
    const parado = () => { desenha(ctx, L, instante); el.classList.remove("tocando", "gol"); el.classList.add("close", "fim"); L.fundoA = L.fundoB = null; };
    let vez = 0;
    const toca = () => {
      const esta = ++vez; let t0 = 0;
      el.classList.remove("fim", "close", "gol"); void el.offsetWidth; el.classList.add("tocando");
      const anda = (agora) => {
        if (esta !== vez) return;
        if (!t0) t0 = agora;
        const t = agora - t0;
        if (!el.isConnected && t > 300) return; // o telão saiu da tela
        if (t >= ms) return parado();
        desenha(ctx, L, t);
        el.classList.toggle("gol", t >= L.tGol);
        el.classList.toggle("close", t >= L.tCorte);
        requestAnimationFrame(anda);
      };
      requestAnimationFrame(anda);
    };
    el.addEventListener("click", toca);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toca(); } });
    if (auto && !quieto()) toca(); else parado();
    return el;
  }
  // monta e desenha também servem para conferir quadro a quadro (#debug)
  window.Lances = {
    criar, monta, desenha, GOLS: {}, COMEMORA: {}, ASSINATURA: {}, FINALIZACAO: {},
    kit: { W, H, mix, prende, fase, suave, sorteio, cor, px, reta, elipse, desenho, CORACAO, poe, entre, quadros, corre, marcha, P0, CHUTE, GOLEIRO,
      tela, GOL_X, GOL_ALTO, GOL_FUNDO, marcaPenalti, ESCANTEIO, naLinha, voo, curva, naRede, conduz, chutando, festejando, goleiroVoa },
  };
})();
