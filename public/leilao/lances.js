// Leilão da Galera — os replays dos gols em pixel-art (8 bits), no campeonato ao vivo. Cada gol ganha um telão que toca
// na hora do gol: o jogador, com o rosto e a camisa da carta dele (rostos.js), chuta, o goleiro voa, a rede balança e,
// em close, vem a comemoração. Craque conhecido comemora do jeito dele: o soco no ar do Pelé, o "siu" do Cristiano, o
// Haaland meditando, o Bebeto embalando o nenê...
// Tudo é desenhado num canvas de 160x90 e ampliado sem borrar (image-rendering: pixelated). O lance de cada gol é
// sorteado pelo jogo, pelo minuto e pelo nome: todo mundo vê o mesmo.
// Lances.criar(gol, jogo, { nome, hat, auto }) devolve o telão (um elemento): com auto, toca o replay na hora (o lance,
// o corte e a comemoração, em 3,4 segundos) e depois fica parado na comemoração; um toque toca de novo.
(function () {
  const W = 160, H = 90;
  // os tempos do lance (ms): o chute, a bola na rede e o corte para o close da comemoração
  const T_CHUTE = 780, T_GOL = 1120, T_CORTE = 1760;
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
  // as letras das placas de propaganda (3x5); espelho: escreve ao contrário (o telão do time B é virado)
  const LETRA = { G: "011100101101011", A: "010101111101101", L: "100100100100111", E: "111100110100111", R: "110101110101101" };
  function escreve(g, txt, x, y, espelho) {
    for (const ch of txt) {
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
  const Q = 48, PE = 46;
  const spr = document.createElement("canvas"); spr.width = spr.height = Q;
  const sg = spr.getContext("2d", { willReadFrequently: true });
  const vetor = (a) => [Math.sin((a * Math.PI) / 180), Math.cos((a * Math.PI) / 180)];
  function boneco(b, p) {
    const g = sg, u = b.u, ag = Math.round(p.ag || 0), tr = Math.round(p.tr || 0), topo = 24 + ag, qy = 35 + ag;
    g.globalAlpha = 1; g.clearRect(0, 0, Q, Q);
    // pernas: a coxa sai do calção, o meião e a chuteira
    const perna = (hx, [a1, a2], lado) => {
      const [x1, y1] = vetor(a1), [x2, y2] = vetor(a2), kx = hx + x1 * 4.5, ky = qy + y1 * 4.5, fx = kx + x2 * 4.5, fy = ky + y2 * 4.5;
      cor(g, b.pele); reta(g, hx, qy, kx, ky, 2);
      cor(g, u.meiao); reta(g, kx + x2 * 1.5, ky + y2 * 1.5, fx, fy, 2);
      cor(g, u.chuteira); px(g, p.pes === "fora" && lado < 0 ? fx - 1 : fx, fy + 1, 3, 2);
    };
    perna(21, p.pE || [0, 0], -1); perna(25, p.pD || [0, 0], 1);
    // o calção
    cor(g, u.calcao); g.fillRect(20, qy - 2, 8, 3); g.fillRect(20, qy + 1, 3, 1); g.fillRect(25, qy + 1, 3, 1);
    cor(g, "#000", 0.2); g.fillRect(27, qy - 2, 1, 4);
    // a camisa, com o desenho do clube (o mesmo da carta), e a sombra do lado direito
    for (let r = 0; r <= 8; r++) {
      const y = topo + r, d = Math.round((tr * (8 - r)) / 8), x0 = r >= 7 ? 20 : 19, x1 = r >= 7 ? 27 : 28;
      for (let x = x0; x <= x1; x++) { cor(g, !b.goleiro && Rostos.listra(u.desenho, x - 18, r + 12) ? u.det : u.cam); g.fillRect(x + d, y, 1, 1); }
      cor(g, "#000", 0.2); g.fillRect(x1 + d, y, 1, 1);
    }
    if (!u.desenho || b.goleiro) { cor(g, u.det); g.fillRect(23 + tr, topo + 1, 2, 1); } // a gola
    Rostos.cabeca(g, b.nome, 16 + tr, 12 + ag, p.ol || 0);
    if (p.nene) { cor(g, "#f4f4f4"); g.fillRect(20 + tr, topo + 4, 7, 3); cor(g, "#9fd3ff"); g.fillRect(20 + tr, topo + 6, 7, 1); cor(g, b.pele); g.fillRect(25 + tr, topo + 4, 2, 2); } // o nenê no colo
    // braços: a manga, o braço e a mão (o goleiro, de manga comprida e luva)
    const braco = (ox, [a1, a2]) => {
      const [x1, y1] = vetor(a1), [x2, y2] = vetor(a2), oy = topo + 1, ex = ox + x1 * 4, ey = oy + y1 * 4, mx = ex + x2 * 3.5, my = ey + y2 * 3.5;
      cor(g, u.cam); reta(g, ox, oy, ox + x1 * 1.5, oy + y1 * 1.5, 2);
      cor(g, b.goleiro ? u.cam : b.pele); reta(g, ox + x1 * 2, oy + y1 * 2, ex, ey, 2); reta(g, ex, ey, mx, my, 2);
      cor(g, b.goleiro ? u.luva : b.pele); px(g, mx + x2, my + y2, 2, 2);
      if (p.dedo) px(g, mx + x2 * 3 + 0.5, my + y2 * 3, 1, 1); // o dedo apontando
    };
    braco(17 + tr, p.bE || [0, 0]); braco(29 + tr, p.bD || [0, 0]);
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
  // do meio do corpo); vira: espelhado (correndo para a esquerda)
  function poe(g, b, p, x, y, esc = 1, rot = 0, vira = false) {
    const s = boneco(b, p);
    g.save(); g.globalAlpha = 1; g.imageSmoothingEnabled = false;
    g.translate(Math.round(x), Math.round(y - (p.sobe || 0) * esc));
    if (rot) { g.translate(0, -16 * esc); g.rotate((rot * Math.PI) / 180); g.translate(0, 16 * esc); }
    if (vira) g.scale(-1, 1);
    g.drawImage(s, -24 * esc, -PE * esc, Q * esc, Q * esc);
    g.restore();
  }
  function sombra(g, x, y, alto, esc = 1) {
    cor(g, "#000", Math.max(0.12, 0.3 - alto * 0.015));
    elipse(g, x, y, Math.max(3, 6 - alto * 0.2) * esc, esc);
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
      o[k] = Array.isArray(x) ? x.map((v, i) => mix(v, y[i], f)) : typeof x === "number" ? mix(x, y, f) : f < 0.5 ? x : y;
    }
    return o;
  }
  // a pose no tempo t de uma lista de quadros [[ms, pose], ...]; com volta, o último emenda no primeiro
  function quadros(t, lista, volta) {
    const fim = lista[lista.length - 1][0];
    t = volta ? ((t % fim) + fim) % fim : prende(t, 0, fim);
    for (let i = 1; i < lista.length; i++) if (t <= lista[i][0]) {
      const [t0, a] = lista[i - 1], [t1, b] = lista[i];
      return entre(a, b, suave((t - t0) / (t1 - t0 || 1)));
    }
    return entre(lista[lista.length - 1][1], lista[lista.length - 1][1], 1);
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
  };
  const GOLEIRO = {
    base: { pE: [-18, -8], pD: [18, 8], bE: [-55, -25], bD: [55, 25], ag: 2, ol: -1 },
    voa: { pE: [-8, -14], pD: [8, 14], bE: [-172, -178], bD: [172, 178], ol: -1 }, // esticado (a cena gira 90 graus)
    chao: { pE: [-6, -12], pD: [6, 12], bE: [-160, -172], bD: [160, 172], ol: -1 },
  };

  // ---------- as comemorações (de frente, no close) ----------
  // Cada uma devolve { p: a pose, dx: andando para o lado, rot, vira, fx: um efeito ("brilho", "coracao", "aura",
  // "grama") } no tempo t desde o começo do close.
  const F = (o) => ({ pes: "fora", ...o });
  const EM_V = { bE: [-150, -160], bD: [150, 160] }; // os braços para cima, em V
  const COMEMORA = {
    // o soco no ar (o Pelé em 1970)
    soco: (t) => ({ p: quadros(t, [
      [0, F({ ag: 2, bE: [-25, 15], bD: [25, -15], pE: [-14, 6], pD: [14, -6] })],
      [260, F({ sobe: 5, bE: [-45, -20], bD: [150, 172], pE: [-10, 10], pD: [30, -10] })],
      [470, F({ sobe: 7, bE: [-60, -35], bD: [178, 180], pE: [-14, 6], pD: [45, -30] })],
      [720, F({ ag: 2, bE: [-25, 15], bD: [165, 178], pE: [-14, 6], pD: [14, -6] })],
      [1000, F({ ag: 2, bE: [-25, 15], bD: [25, -15], pE: [-14, 6], pD: [14, -6] })]], true) }),
    // o "siu" do Cristiano: pula girando e cai de pernas abertas, braços para baixo
    siu: (t) => ({ vira: t > 380 && t < 560, p: quadros(t, [
      [0, F({ ...marcha(t), bE: [-30, -10], bD: [30, 10] })],
      [300, F({ ag: 3, bE: [-40, -20], bD: [40, 20], pE: [-12, 8], pD: [12, -8] })],
      [520, F({ sobe: 8, ...EM_V, pE: [-4, -2], pD: [4, 2] })],
      [760, F({ ag: 4, bE: [-38, -42], bD: [38, 42], pE: [-30, -30], pD: [30, 30] })],
      [1100, F({ ag: 3, bE: [-36, -40], bD: [36, 40], pE: [-30, -30], pD: [30, 30] })]]) }),
    // os dois dedos para o céu (Messi, Kaká)
    ceu: (t) => ({ fx: "brilho", p: F({ ...marcha(t, 520), dedo: true, bE: [-160 - 4 * Math.sin(t / 200), -176], bD: [160 + 4 * Math.sin(t / 200), 176] }) }),
    // embalando o nenê (o Bebeto em 1994)
    nene: (t) => {
      const s = Math.sin(t / 130);
      return { dx: 3 * s, p: F({ nene: true, bE: [-25 + 12 * s, 62 + 12 * s], bD: [25 + 12 * s, -62 + 12 * s], tr: 2 * s, pE: [-8 + 5 * s, -4], pD: [8 + 5 * s, 4] }) };
    },
    // o aviãozinho: braços abertos, inclinando de um lado para o outro
    aviao: (t) => {
      const s = Math.sin(t / 170);
      return { dx: 7 * Math.sin(t / 420), p: F({ ...marcha(t, 260), tr: 3 * s, bE: [-90 + 18 * s, -95 + 18 * s], bD: [90 + 18 * s, 95 + 18 * s] }) };
    },
    // de joelhos, deslizando na grama, de braços para cima
    joelhos: (t) => {
      const f = fase(t, 0, 600), b = Math.sin(t / 110) * 8 * (f >= 1 ? 1 : 0);
      return { dx: -38 * (1 - suave(f)), fx: f < 1 ? "grama" : "", p: F({ ag: 5, pE: [-10, -95], pD: [10, 95], bE: [-150 - b, -160 - b], bD: [150 + b, 160 + b] }) };
    },
    // sentado de pernas cruzadas, meditando (o Haaland)
    zen: (t) => ({ fx: "aura", p: F({ ag: 8, pE: [-78, 62], pD: [78, -62], bE: [-5, 5], bD: [5, -5], sobe: Math.sin(t / 500) > 0.6 ? 1 : 0 }) }),
    // de braços cruzados (o Mbappé)
    cruzado: (t) => ({ p: F({ pE: [-12, -10], pD: [12, 10], bE: [20, 85], bD: [-25, -80], sobe: Math.sin(t / 400) > 0.7 ? 1 : 0 }) }),
    // tremendo de frio, abraçado (o Cole Palmer)
    frio: (t) => { const s = Math.floor(t / 60) % 2 ? 1 : -1; return { dx: s * 0.5, p: F({ pE: [-8, -6], pD: [8, 6], bE: [20 + 4 * s, 85], bD: [-25 + 4 * s, -80], tr: s * 0.6 }) }; },
    // dancinha (Roger Milla, Vini Jr., Ronaldinho, Griezmann)
    danca: (t) => ({ dx: 3 * Math.sin((t / 600) * Math.PI * 2), p: quadros(t, [
      [0, F({ tr: -2, bE: [-150, -120], bD: [45, 85], pE: [-16, 8], pD: [6, 2] })],
      [300, F({ tr: 2, bE: [-45, -85], bD: [150, 120], pE: [-6, -2], pD: [16, -8] })],
      [600, F({ tr: -2, bE: [-150, -120], bD: [45, 85], pE: [-16, 8], pD: [6, 2] })]], true) }),
    // a cambalhota (o Klose)
    cambalhota: (t) => {
      if (t < 300) return { dx: mix(-34, -14, t / 300), p: F({ ...marcha(t, 160), bE: [-40, -20], bD: [40, 20] }) };
      const f = fase(t, 300, 900);
      if (f < 1) return { dx: mix(-14, 4, f), rot: Math.floor(f * 4) * 90, p: F({ sobe: 9 * Math.sin(Math.PI * f), ag: 2, pE: [-70, 20], pD: [70, -20], bE: [-40, 40], bD: [40, -40] }) };
      return { dx: 4, p: F({ ...EM_V, pE: [-10, -8], pD: [10, 8], sobe: Math.abs(Math.sin(t / 160)) * 1.5 }) };
    },
    // a mão na orelha, como quem fala ao telefone (o Gabriel Jesus)
    alo: (t) => ({ p: F({ ...marcha(t, 450), bE: [-15, -5], bD: [118, -160] }) }),
    // as mãos nas orelhas, provocando a torcida
    orelha: (t) => ({ p: F({ ...marcha(t, 450), tr: Math.sin(t / 300) > 0 ? 1 : -1, bE: [-118, 160], bD: [118, -160] }) }),
    // de braços bem abertos, parado (o Bellingham)
    abre: (t) => ({ p: F({ pE: [-14, -12], pD: [14, 12], bE: [-95, -100], bD: [95, 100], sobe: Math.sin(t / 380) > 0.75 ? 1 : 0 }) }),
    // o coraçãozinho com as mãos (o Neymar)
    coracao: (t) => ({ fx: "coracao", p: F({ ...marcha(t, 600), bE: [15, 120], bD: [-15, -120] }) }),
  };
  const ASSINATURA = {
    "Pelé": "soco", "Cristiano Ronaldo": "siu", "Lionel Messi": "ceu", "Kaká": "ceu", "Bebeto": "nene", "Erling Haaland": "zen",
    "Kylian Mbappé": "cruzado", "Cole Palmer": "frio", "Roger Milla": "danca", "Vinícius Júnior": "danca", "Ronaldinho Gaúcho": "danca",
    "Antoine Griezmann": "danca", "Miroslav Klose": "cambalhota", "Gabriel Jesus": "alo", "Jude Bellingham": "abre", "Neymar": "coracao",
    "Ronaldo Fenômeno": "aviao",
  };
  const COMUNS = ["soco", "aviao", "joelhos", "orelha", "ceu", "danca", "abre"];

  // ---------- o cenário ----------
  // A quadra vista de lado, em perspectiva: X ao longo da quadra (o gol fica à direita), D a profundidade (para o fundo,
  // a tela sobe e anda um pouco para a direita) e A a altura.
  const tela = (X, D, A = 0) => [X + D * 0.35, 80 - D * 0.5 - A];
  const GOL_X = 134, GOL_ALTO = 24, GOL_FUNDO = 9;
  const GOL = (() => {
    const nb = tela(GOL_X, 4), fb = tela(GOL_X, 40), bnb = tela(GOL_X + GOL_FUNDO, 4), bfb = tela(GOL_X + GOL_FUNDO, 40);
    return { nb, fb, nt: [nb[0], nb[1] - GOL_ALTO], ft: [fb[0], fb[1] - GOL_ALTO], bnb, bfb, bnt: [bnb[0], bnb[1] - 16], bft: [bfb[0], bfb[1] - 16] };
  })();
  // a arquibancada, as placas e o chão (gramado listrado ou a quadra do futsal), com as linhas; pula: a torcida pulando
  function fundoAberto(L, pula) {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d"), img = g.createImageData(W, H), d = img.data, sorte = sorteio(L.semente + "torcida");
    const poe = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
    const piso = (L.futsal ? ["#2f6db4", "#2b66aa"] : ["#3f8f3a", "#4a9c43"]).map(rgb);
    const arq = rgb(L.futsal ? "#121b29" : "#0b1611"), degrau = rgb(L.futsal ? "#1c2a3d" : "#132219");
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (y < 27) poe(x, y, y % 5 === 4 ? degrau : arq);
      else if (y >= 35) { const D = (80 - y) / 0.5; poe(x, y, piso[Math.floor((x - D * 0.35 + 200) / 12) & 1]); }
    }
    // a torcida: a cabecinha e a camisa (as cores do time que marcou, branco e o verde-limão)
    const peles = ["#f6d3b5", "#e6b48a", "#c68b5e", "#9c6640", "#5f3a24"].map(rgb);
    const camisas = [L.art.u.cam, L.art.u.det, L.art.u.cam, "#d8dcd9", "#a6d63a", "#1a1a1a"].map((c) => rgb(c).map((v) => Math.round(v * 0.78)));
    for (let fil = 0; fil < 5; fil++) for (let x = fil & 1; x < W; x += 3) {
      const vazio = sorte() < 0.12, pe = peles[Math.floor(sorte() * 5)], c = camisas[Math.floor(sorte() * camisas.length)];
      if (vazio) continue;
      const y = fil * 5 + 1 - (pula && (x + fil) % 2 === 0 ? 1 : 0);
      poe(x, y, pe); poe(x, y + 1, c); poe(x + 1, y + 1, c); poe(x, y + 2, c); poe(x + 1, y + 2, c);
    }
    g.putImageData(img, 0, 0);
    // as placas de propaganda
    const [r, gg, bb] = rgb(L.art.u.cam), letra = 0.3 * r + 0.59 * gg + 0.11 * bb > 150 ? "#1a1a1a" : "#f4f4f4";
    for (let k = 0; k * 40 < W; k++) {
      const lima = k % 2 === 0, x0 = k * 40;
      cor(g, lima ? "#c6ff3a" : L.art.u.cam); g.fillRect(x0, 27, 40, 8);
      cor(g, lima ? "#0b1604" : letra); escreve(g, "GALERA", x0 + 8, 29, L.espelho);
      cor(g, "#000", 0.3); g.fillRect(x0 + 39, 27, 1, 8);
    }
    cor(g, "#000", 0.35); g.fillRect(0, 35, W, 1);
    // as linhas
    cor(g, "#ffffff", 0.75);
    const linha = (X1, D1, X2, D2) => { const [a, b] = tela(X1, D1), [c, e] = tela(X2, D2); reta(g, a, b, c, e); };
    linha(GOL_X, -20, GOL_X, 90); // a linha de fundo
    if (L.futsal) { // a área do futsal (o arco em volta do gol) e a marca do pênalti
      let ant = null;
      for (let k = 0; k <= 24; k++) {
        const th = ((-90 + k * 7.5) * Math.PI) / 180, p = tela(GOL_X - 30 * Math.cos(th), 22 + 32 * Math.sin(th));
        if (ant) reta(g, ant[0], ant[1], p[0], p[1]);
        ant = p;
      }
      const m = tela(GOL_X - 40, 22); g.fillRect(Math.round(m[0]), Math.round(m[1]), 2, 1);
    } else { // a grande área, a pequena área e a marca do pênalti
      linha(GOL_X - 34, -20, GOL_X - 34, 64); linha(GOL_X - 34, 64, GOL_X, 64);
      linha(GOL_X - 12, -2, GOL_X - 12, 46); linha(GOL_X - 12, 46, GOL_X, 46); linha(GOL_X - 12, -2, GOL_X, -2);
      const m = tela(GOL_X - 24, 22); g.fillRect(Math.round(m[0]), Math.round(m[1]), 2, 1);
    }
    g.globalAlpha = 1;
    return cv;
  }
  // o fundo do close: a torcida desfocada lá atrás, as placas e o chão (como as ilustrações de 8 bits, chão liso)
  function fundoClose(L) {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d"), sorte = sorteio(L.semente + "close");
    cor(g, L.futsal ? "#121b29" : "#0b1611"); g.fillRect(0, 0, W, 18);
    const camisas = [L.art.u.cam, L.art.u.det, "#f4f4f4", "#c6ff3a", "#e6b48a"];
    for (let k = 0; k < 90; k++) { cor(g, camisas[Math.floor(sorte() * camisas.length)], 0.35); g.fillRect(Math.floor(sorte() * W), Math.floor(sorte() * 16), 3, 2); }
    for (let k = 0; k * 40 < W; k++) { cor(g, k % 2 ? L.art.u.cam : "#c6ff3a", 0.85); g.fillRect(k * 40, 18, 40, 6); }
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
  function traves(g, frente) {
    const { nb, fb, nt, ft, bnb, bfb, bnt, bft } = GOL, r = (a, b, e = 1) => reta(g, a[0], a[1], b[0], b[1], e);
    if (!frente) {
      cor(g, "#b8c2bc"); r(bnt, bft); r(bft, bfb); r(bfb, bnb); r(ft, bft); r(nt, bnt); r(bnt, bnb);
      cor(g, "#ffffff"); r(fb, ft, 2); r(nt, ft, 2);
    } else {
      cor(g, "#ffffff"); r(nb, nt, 2); cor(g, "#000", 0.25); r([nb[0] + 2, nb[1]], [nt[0] + 2, nt[1] + 1]);
    }
    g.globalAlpha = 1;
  }

  // ---------- o lance ----------
  // o tipo de gol, pela posição e pela nota de quem marcou
  function escolheTipo(sorte, pos, ovr, futsal) {
    const p = { chute: 3, angulo: 2.5, voleio: 1.5, cabeca: 1.5, cavadinha: 1.2 };
    if (pos === "DEF") Object.assign(p, { cabeca: 5, chute: 2, angulo: 1, voleio: 1, cavadinha: 0.3 });
    else if (pos === "VOL") Object.assign(p, { chute: 4, angulo: 3 });
    else if (pos === "MEI") Object.assign(p, { angulo: 3, cavadinha: 2 });
    else if (pos === "ATT") Object.assign(p, { voleio: 2, cabeca: 2, cavadinha: 2 });
    if (ovr >= 88) { p.angulo += 1.5; p.voleio += 1; p.cavadinha += 0.5; }
    if (futsal) p.cabeca *= 0.5;
    let r = sorte() * Object.values(p).reduce((a, b) => a + b, 0);
    for (const [k, v] of Object.entries(p)) if ((r -= v) <= 0) return k;
    return "chute";
  }
  // para onde vai a bola dentro do gol: D (de 4, a trave de perto, a 40, a de longe) e a altura
  function alvoDe(tipo, sorte) {
    const canto = () => (sorte() < 0.5 ? 8 + sorte() * 5 : 31 + sorte() * 6);
    if (tipo === "angulo") return { D: sorte() < 0.6 ? 34 + sorte() * 3 : 7 + sorte() * 3, A: 18 + sorte() * 3 };
    if (tipo === "voleio") return { D: canto(), A: 7 + sorte() * 9 };
    if (tipo === "cabeca") return { D: canto(), A: sorte() < 0.6 ? 2 + sorte() * 4 : 15 + sorte() * 4 };
    if (tipo === "cavadinha") return { D: 16 + sorte() * 10, A: 5 + sorte() * 4 };
    return { D: canto(), A: 1 + sorte() * 2 };
  }
  // onde está quem marcou (X, D) e com que pose, no tempo t
  function artilheiro(L, t) {
    const d0 = L.d0, tipo = L.tipo, depois = (x) => {
      // depois do chute: olha a bola; com o gol, corre para a torcida de braços para cima
      const f = fase(t, T_GOL + 60, T_CORTE);
      if (t < T_GOL) return { X: x, D: d0, p: t < T_CHUTE + 300 ? null : CHUTE.olha };
      return { X: x + 14 * f, D: d0 - 16 * f, p: corre(t, "alto", 240) };
    };
    if (tipo === "voleio" || tipo === "cabeca") {
      const [x0, x1, pulo, fim] = tipo === "voleio" ? [66, 96, 640, 980] : [72, 106, 600, 960];
      if (t < pulo) return { X: mix(x0, x1, t / pulo), D: d0, p: corre(t) };
      if (t < fim) {
        const f = fase(t, pulo, fim), sobe = (tipo === "voleio" ? 6.5 : 7.5) * Math.sin(Math.PI * f);
        const p = tipo === "voleio" ? (t < T_CHUTE ? entre(CHUTE.arma, CHUTE.voleio, fase(t, pulo, T_CHUTE)) : entre(CHUTE.voleio, CHUTE.segue, fase(t, T_CHUTE, fim)))
          : { ...CHUTE.cabeca, tr: t < T_CHUTE + 40 ? -1 : 3 };
        return { X: x1 + 6 * f, D: d0, p: { ...p, sobe } };
      }
      const r = depois(x1 + 6); if (!r.p) r.p = entre(CHUTE.segue, CHUTE.olha, fase(t, fim, fim + 120)); return r;
    }
    const xc = tipo === "cavadinha" ? 104 : 99;
    if (t < T_CHUTE - 80) return { X: mix(42, xc, t / (T_CHUTE - 80)), D: d0, p: corre(t) };
    const bate = tipo === "cavadinha" ? CHUTE.cavada : CHUTE.bate;
    if (t < T_CHUTE) return { X: xc + 2 * fase(t, T_CHUTE - 80, T_CHUTE), D: d0, p: entre(CHUTE.arma, bate, fase(t, T_CHUTE - 80, T_CHUTE)) };
    if (t < T_CHUTE + 180) return { X: xc + 2 + 3 * fase(t, T_CHUTE, T_CHUTE + 180), D: d0, p: entre(bate, CHUTE.segue, fase(t, T_CHUTE, T_CHUTE + 180)) };
    const r = depois(xc + 5); if (!r.p) r.p = entre(CHUTE.segue, CHUTE.olha, fase(t, T_CHUTE + 180, T_CHUTE + 300)); return r;
  }
  // a bola (X, D, A) no tempo t: conduzida, cruzada, chutada e dentro da rede
  function bolaEm(L, t, art) {
    const { alvo, tipo, d0 } = L, gx = GOL_X + 3;
    if (t >= T_GOL) { // na rede: estufa, cai e quica
      const f = fase(t, T_GOL, T_GOL + 300);
      return { X: mix(gx, GOL_X + GOL_FUNDO - 1, fase(t, T_GOL, T_GOL + 90)), D: alvo.D, A: Math.max(0, alvo.A * (1 - f)) + 2 * Math.sin(Math.PI * fase(t, T_GOL + 300, T_GOL + 420)) };
    }
    if (tipo === "voleio" || tipo === "cabeca") {
      const tb = tipo === "voleio" ? T_CHUTE : T_CHUTE + 40, toque = artilheiro(L, tb);
      const pt = tipo === "voleio" ? { X: toque.X + 6, D: d0, A: 8 + toque.p.sobe } : { X: toque.X + 3, D: d0, A: 29 + toque.p.sobe };
      if (t < tb) { const f = t / tb; return { X: mix(4, pt.X, f), D: mix(d0 + 16, pt.D, f), A: mix(16, pt.A, f) + 14 * Math.sin(Math.PI * f) }; } // o cruzamento, da ponta esquerda
      const f = fase(t, tb, T_GOL);
      return { X: mix(pt.X, gx, f), D: mix(pt.D, alvo.D, f), A: mix(pt.A, alvo.A, f) };
    }
    if (t < T_CHUTE) return { X: art.X + 6, D: d0 - 1, A: Math.abs(Math.sin((t / 140) * Math.PI)) * 2 }; // conduzindo
    const f = fase(t, T_CHUTE, T_GOL), arco = { chute: 2, angulo: 9, cavadinha: 22 }[tipo] || 2, x0 = artilheiro(L, T_CHUTE).X + 6;
    return { X: mix(x0, gx, f), D: mix(d0 - 1, alvo.D, f), A: mix(1, alvo.A, f) + arco * Math.sin(Math.PI * f) };
  }
  // o goleiro: espera, voa atrasado para o lado da bola e fica no chão; na cavadinha, sai do gol antes
  function goleiro(L, t) {
    const { alvo, d0, tipo } = L, D0 = 22 + (d0 - 22) * 0.25 * suave(fase(t, 0, T_CHUTE));
    const saida = tipo === "cavadinha" ? fase(t, 450, T_CHUTE + 60) : 0, X0 = 127 - 14 * suave(saida);
    const voo0 = T_CHUTE + 90, voo1 = T_GOL + 60;
    if (t < voo0) return { X: X0, D: D0, p: saida > 0 && saida < 1 ? corre(t, "balanca", 220) :{ ...GOLEIRO.base, sobe: Math.abs(Math.sin(t / 160)) }, vira: saida > 0 && saida < 1 };
    const Dd = tipo === "cavadinha" ? D0 : alvo.D + (alvo.D > 22 ? -7 : 7), f = fase(t, voo0, voo1);
    const D = mix(D0, Dd, suave(f)), alto = (alvo.A > 10 && tipo !== "cavadinha" ? 9 : 4) * Math.sin(Math.PI * Math.min(1, f));
    if (f < 0.15) return { X: X0, D, p: entre(GOLEIRO.base, GOLEIRO.voa, f / 0.15) };
    return { X: X0 - (tipo === "cavadinha" ? 6 * f : 0), D, deitado: true, p: { ...(f < 1 ? GOLEIRO.voa : GOLEIRO.chao), sobe: alto } };
  }
  function cenaAberta(g, L, t) {
    if (!L.fundoA) { L.fundoA = fundoAberto(L, false); L.fundoB = fundoAberto(L, true); }
    const gol = t >= T_GOL;
    g.drawImage(gol && Math.floor((t - T_GOL) / 140) % 2 === 0 ? L.fundoB : L.fundoA, 0, 0);
    if (gol) { const s = sorteio(L.semente + Math.floor(t / 90)); cor(g, "#ffffff"); for (let k = 0; k < 6; k++) g.fillRect(Math.floor(s() * W), Math.floor(s() * 26), 1, 1); g.globalAlpha = 1; } // os flashes
    const forca = gol ? Math.max(0, 1 - (t - T_GOL) / 450) * (1 + Math.sin((t - T_GOL) / 35)) : 0;
    const { nt, ft, bft, bfb, bnb, nb, bnt } = GOL;
    rede(g, [nt, ft, bft, bfb, bnb, nb], L.impacto, forca, 0.36); traves(g, false);
    const a = artilheiro(L, t), k = goleiro(L, t), b = bolaEm(L, t, a);
    for (const c of [a, k]) { const [x, y] = tela(c.X, c.D); sombra(g, x, y, c.p.sobe || 0); }
    { const [x, y] = tela(b.X, b.D); cor(g, "#000", 0.28); g.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); g.globalAlpha = 1; }
    const coisas = [
      { D: a.D, faz: () => { const [x, y] = tela(a.X, a.D); poe(g, L.art, a.p, x, y); } },
      { D: k.D, faz: () => { const [x, y] = tela(k.X, k.D); if (k.deitado) poe(g, L.gol, k.p, x, y + 12, 1, -90); else poe(g, L.gol, k.p, x, y, 1, 0, k.vira); } },
      { D: b.D - 0.5, faz: () => { const [x, y] = tela(b.X, b.D, b.A); bola(g, x, y, t / 60); } },
    ].sort((p, q) => q.D - p.D);
    coisas.forEach((c) => c.faz());
    rede(g, [nt, bnt, bnb, nb], L.impacto, 0, 0.22); traves(g, true); // a rede do lado de cá e a trave da frente
    if (gol && t < T_GOL + 140) { cor(g, "#ffffff", 0.4 * (1 - (t - T_GOL) / 140)); g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }
  // o close da comemoração (tc: ms desde o começo do close)
  function cenaClose(g, L, tc) {
    g.drawImage(L.fundoClose, 0, 0);
    const c = COMEMORA[L.comemora](tc), x = 80 + (c.dx || 0) * 2, chao = 85;
    sombra(g, x, chao, c.p.sobe || 0, 2);
    if (c.fx === "aura") { // o brilho dourado em volta de quem medita
      const r = 25 + Math.round(2 * Math.sin(tc / 300));
      cor(g, "#f6c64e", 0.5); for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2; g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(chao - 26 + Math.sin(a) * r * 0.9), 1, 1); }
      g.globalAlpha = 1;
    }
    if (c.fx === "grama") { // a grama voando atrás do joelho
      const s = sorteio(L.semente + Math.floor(tc / 50));
      for (let k = 0; k < 7; k++) { cor(g, k % 3 ? (L.futsal ? "#9fc2ea" : "#8fd16a") : "#ffffff"); g.fillRect(Math.round(x - 22 - s() * 26), Math.round(chao - 2 - s() * 10), 2, 1); }
      g.globalAlpha = 1;
    }
    poe(g, L.art, c.p, x, chao, 2, c.rot || 0, c.vira);
    if (c.fx === "brilho") { // as estrelinhas em cima dos dedos
      cor(g, "#fff6c8");
      for (let k = 0; k < 4; k++) { const on = Math.floor(tc / 120 + k * 1.7) % 3 === 0; if (on) { const sx = x + [-24, -14, 14, 24][k], sy = 10 + ((k * 7) % 12); g.fillRect(sx, sy - 1, 1, 3); g.fillRect(sx - 1, sy, 3, 1); } }
      g.globalAlpha = 1;
    }
    if (c.fx === "coracao") { // os coraçõezinhos subindo das mãos
      for (let k = 0; k < 2; k++) { const f = ((tc + k * 450) % 900) / 900; cor(g, "#ff4f8b", 1 - f * f); desenho(g, CORACAO, x - 5 + (k ? 1 : -1) * (6 + 22 * f), chao - 46 - f * 30, 2); }
      g.globalAlpha = 1;
    }
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
  // tudo o que o lance de um gol precisa: quem marcou, o goleiro, o tipo de gol, a comemoração e o fundo do close
  function monta(g, j) {
    const semente = `${j.id}|${g.min}|${g.nome}|${g.lado}`, sorte = sorteio(semente);
    const art = { nome: g.nome, u: Rostos.uniformeDe(g.nome), pele: Rostos.pele(g.nome) };
    const corGol = ["#f7d417", "#3ad37a", "#ff7a2f", "#8a8f98", "#b06cff", "#25b4c9"].sort((a, b) => distCor(b, art.u.cam) - distCor(a, art.u.cam))[0];
    const nomeGol = "goleiro " + Math.floor(sorte() * 99999);
    const gol = { nome: nomeGol, goleiro: true, pele: Rostos.pele(nomeGol), u: { cam: corGol, det: "#1a1a1a", desenho: "", calcao: "#1a1a1a", meiao: corGol, chuteira: "#1a1a1a", luva: "#f4f4f4" } };
    const futsal = j.mins === 40, tipo = escolheTipo(sorte, g.pos, g.ovr || 80, futsal), alvo = alvoDe(tipo, sorte);
    const comemora = ASSINATURA[g.nome] || COMUNS[Math.floor(sorte() * COMUNS.length)];
    const L = { semente, futsal, espelho: g.lado === "B", art, gol, tipo, alvo, comemora, d0: 8 + sorte() * 16, impacto: tela(GOL_X + GOL_FUNDO - 1, alvo.D, alvo.A) };
    L.fundoClose = fundoClose(L); // os fundos do lance (fundoA e fundoB) só são desenhados quando o replay toca
    return L;
  }
  // um quadro do telão no tempo t (ms)
  function desenha(ctx, L, t) {
    if (t < T_CORTE) cenaAberta(ctx, L, t); else cenaClose(ctx, L, t - T_CORTE);
    const f = fase(t, T_CORTE - 130, T_CORTE + 130);
    if (f > 0 && f < 1) cortina(ctx, f);
  }
  // o telão de um gol: toca o replay (auto) ou já mostra o último quadro, parado na comemoração (quem chega depois, ou
  // pediu "menos movimento"). Um toque no telão toca de novo.
  function criar(g, j, { nome, hat, ms = 3400, auto = true }) {
    const L = monta(g, j);
    const el = document.createElement("div"), icone = (n) => (window.Icones ? Icones.ic(n) : "");
    el.className = `telao lado${g.lado}${hat ? " hat" : ""}`;
    el.setAttribute("role", "button"); el.tabIndex = 0;
    el.setAttribute("aria-label", `Ver o gol de ${nome || g.nome} aos ${g.min} minutos`);
    el.innerHTML = `<canvas width="${W}" height="${H}" aria-hidden="true"></canvas><span class="lcTag"><i></i><span>Replay</span></span>
      <b class="lcGrito" aria-hidden="true">${L.comemora === "siu" ? "Siuuu!" : "Gol!"}</b><span class="lcPlay" aria-hidden="true">${icone("play")}</span>
      <div class="lcFaixa">${icone(hat ? "cartola" : "bola")}<span>${hat ? "Hat-trick" : "Gol"}</span><b>${escapa(nome || g.nome)}</b><span>${g.min}'</span></div>`;
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
        el.classList.toggle("gol", t >= T_GOL);
        el.classList.toggle("close", t >= T_CORTE);
        requestAnimationFrame(anda);
      };
      requestAnimationFrame(anda);
    };
    el.addEventListener("click", toca);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toca(); } });
    if (auto && !quieto()) toca(); else parado();
    return el;
  }
  window.Lances = { criar, monta, desenha, COMEMORA }; // monta e desenha: para conferir quadro a quadro (#debug)
})();
