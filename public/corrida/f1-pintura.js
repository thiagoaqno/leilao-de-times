// Corrida da Galera — a pintura das equipes no carro de F1 (f1.js monta o carro e usa isto).
//
// O modelo (f1/f1.glb) é um F1 antigo com UV de máscara, então as pinturas de equipe não ficam em cima do UV: cada
// equipe tem UMA "folha" (um canvas de 1024x1152, feito uma vez e guardado: não é uma por carro) com o carro desenhado
// em cinco vistas, e o shader do corpo projeta a folha na carroceria pela posição de cada ponto (3 projeções misturadas
// pela normal). Quem pinta é a função `pintar` de cada equipe, em METROS do carro; o mesmo desenho vale nos dois lados.
//
//   folha (1024 x 1152 px, K = 232,7 px por metro):   s = distância desde a ponta do bico (0 a 4,4), y = altura, x = lateral
//     y    0 ..  256  lado A (quem olha de +x: a frente fica à DIREITA):  X = (4,4 - s) K        Y = (1,1 - y) K
//     y  256 ..  512  lado B (quem olha de -x: a frente fica à ESQUERDA): X = s K                Y = 256 + (1,1 - y) K
//     y  512 ..  896  de cima (a frente à esquerda; +x para cima):        X = s K                Y = 704 - x K
//     y  896 .. 1152  frente (x 0 .. 512, +x à esquerda) e traseira (x 512 .. 1024, +x à direita): Y = 896 + (1,1 - y) K
//
// Os patrocínios são decalques inventados no ESTILO dos de verdade (nada de marca registrada copiada); os logos das
// equipes vêm de logos/ (o projeto já os usa nos menus). O número do piloto é um decalque à parte (um atlas de dígitos
// compartilhado) porque muda de carro para carro; o composto do pneu vira uma faixa na lateral do pneu (shader do pneu).
import * as THREE from "three";

export const K = 1024 / 4.4, FW = 1024, FH = 1152;
const CARBONO = "#0b0c0f";

// ---------------------------------------------------------------- os logos (carregados uma vez só)
const LOGOS = new Map(); // id -> { img, ok }
export const logosProntos = (() => {
  const idx = (typeof window !== "undefined" && window.EQUIPES_F1) || {};
  return Promise.all(Object.entries(idx).map(([id, e]) => new Promise((res) => {
    const img = new Image(); img.onload = () => { LOGOS.set(id, { img, ok: true }); res(); }; img.onerror = () => res();
    img.src = "/corrida/logos/" + e.arquivo;
  })));
})();
// recorta as margens transparentes do logo (e guarda o resultado) e, se pedir, pinta o desenho de uma cor só
const RECORTES = new Map();
function logoRecortado(id, tinta) {
  const L = LOGOS.get(id); if (!L) return null;
  const chave = id + "|" + (tinta || "");
  if (RECORTES.has(chave)) return RECORTES.get(chave);
  const w = L.img.naturalWidth, h = L.img.naturalHeight, t = document.createElement("canvas"); t.width = w; t.height = h;
  const x = t.getContext("2d", { willReadFrequently: true }); x.drawImage(L.img, 0, 0);
  const d = x.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] > 24) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  if (x1 <= x0) return null;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const cx = c.getContext("2d"); cx.drawImage(L.img, x0, y0, cw, ch, 0, 0, cw, ch);
  if (tinta) { cx.globalCompositeOperation = "source-in"; cx.fillStyle = tinta; cx.fillRect(0, 0, cw, ch); }
  const r = { c, w: cw, h: ch }; RECORTES.set(chave, r); return r;
}

// ---------------------------------------------------------------- ferramentas de desenho (tudo em metros)
const pt = (c, a, b) => { const m = c.getTransform(); return [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f]; };
function poli(c, pts, cor) { c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.closePath(); c.fillStyle = cor; c.fill(); }
function ret(c, a0, b0, a1, b1, cor) { c.fillStyle = cor; c.fillRect(Math.min(a0, a1), Math.min(b0, b1), Math.abs(a1 - a0), Math.abs(b1 - b0)); }
function degrade(c, a0, b0, a1, b1, paradas) { const g = c.createLinearGradient(a0, b0, a1, b1); paradas.forEach(([p, cor]) => g.addColorStop(p, cor)); return g; }
// texto na vista (sempre de pé e lendo da esquerda para a direita, nos dois lados do carro); h = altura da letra em metros
function texto(c, str, a, b, h, cor, { peso = 800, estilo = "italic", fam = "'Arial Black', Arial, Helvetica, sans-serif", larg = 0, esp = 0, borda = null, align = "center" } = {}) {
  const [x, y] = pt(c, a, b); c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.font = `${estilo} ${peso} ${Math.round(h * K)}px ${fam}`; c.textAlign = align; c.textBaseline = "middle"; c.fillStyle = cor;
  if ("letterSpacing" in c) c.letterSpacing = esp ? Math.round(esp * K) + "px" : "0px";
  if (borda) { c.lineWidth = Math.max(1.5, h * K * 0.12); c.strokeStyle = borda; c.lineJoin = "round"; c.strokeText(str, x, y, larg ? larg * K : undefined); }
  c.fillText(str, x, y, larg ? larg * K : undefined); c.restore();
}
// o logo da equipe numa caixa (a0..a1 x b0..b1, em metros) sem deformar, centrado
function logo(c, id, a0, b0, a1, b1, tinta) {
  const r = logoRecortado(id, tinta); if (!r) return;
  const [x0, y0] = pt(c, a0, b0), [x1, y1] = pt(c, a1, b1), bx = Math.min(x0, x1), by = Math.min(y0, y1), bw = Math.abs(x1 - x0), bh = Math.abs(y1 - y0);
  const e = Math.min(bw / r.w, bh / r.h), w = r.w * e, h = r.h * e;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(r.c, bx + (bw - w) / 2, by + (bh - h) / 2, w, h); c.restore();
}
// um "patrocinador" inventado: nome em letra de marca, sem copiar nenhuma marca de verdade
function patro(c, nome, a, b, h, cor, opc = {}) { texto(c, nome, a, b, h, cor, opc); }
const mulberry = (seed) => () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- as vistas
// cada vista: prepara a transformação (metros -> pixels da folha), recorta no retângulo e chama o desenho
const VISTAS = {
  A: { r: [0, 0, 1024, 256], m: [-K, 0, 0, -K, 4.4 * K, 1.1 * K] },     // (s, y)
  B: { r: [0, 256, 1024, 256], m: [K, 0, 0, -K, 0, 256 + 1.1 * K] },     // (s, y)
  T: { r: [0, 512, 1024, 384], m: [K, 0, 0, -K, 0, 704] },               // (s, x)
  F: { r: [0, 896, 512, 256], m: [-K, 0, 0, -K, 256, 896 + 1.1 * K] },   // (x, y)
  R: { r: [512, 896, 512, 256], m: [K, 0, 0, -K, 768, 896 + 1.1 * K] },  // (x, y)
};
function vista(ctx, nome, fn) {
  const v = VISTAS[nome]; ctx.save(); ctx.beginPath(); ctx.rect(...v.r); ctx.clip(); ctx.setTransform(...v.m); fn(ctx); ctx.restore();
}
const lados = (ctx, fn) => { vista(ctx, "A", (c) => fn(c, 1)); vista(ctx, "B", (c) => fn(c, -1)); };

// ---------------------------------------------------------------- as equipes
// P = { ctx } ; cada desenho pinta o fundo e depois as vistas. Medidas do modelo (em metros, s = a partir do bico):
//   bico 0 .. 1,0 (y 0,1 .. 0,45) | asa dianteira s 0,1 .. 0,5 (x ± 0,73) | cockpit 1,3 .. 2,1 | airbox no 2,35 (y 0,97)
//   caixas laterais 2,05 .. 3,5 (y 0,1 .. 0,5) | tampa do motor 2,4 .. 3,9 | asa traseira 3,9 .. 4,4 (y 0,4 .. 0,96)
const DESENHOS = {};

// a base de qualquer carro: cor cheia em tudo e o carbono onde não aparece pintura (a barriga fica no material do assoalho)
function base(ctx, cor) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = cor; ctx.fillRect(0, 0, FW, FH); ctx.restore(); }

// McLaren: papaia, tampa do motor e airbox pretos com o corte em diagonal, faixa azul fina, asa traseira papaia e preta
DESENHOS.mclaren = {
  numero: "#ffffff",
  pintar(ctx) {
    const PAP = "#ff8000", PRETO = "#101114", AZUL = "#2a6bff";
    base(ctx, PAP);
    lados(ctx, (c) => {
      // tampa do motor / airbox preto, com a frente cortada em diagonal e a parte de baixo papaia
      poli(c, [[2.18, 1.1], [4.45, 1.1], [4.45, 0.42], [3.8, 0.44], [3.25, 0.53], [2.7, 0.7], [2.42, 0.56], [2.18, 0.58]], PRETO);
      // faixa azul acompanhando o corte
      poli(c, [[2.18, 0.58], [2.42, 0.56], [2.7, 0.7], [3.25, 0.53], [3.8, 0.44], [3.8, 0.47], [3.25, 0.56], [2.7, 0.74], [2.42, 0.6], [2.18, 0.62]], AZUL);
      // faixa azul no bico
      poli(c, [[0.1, 0.17], [0.95, 0.31], [0.95, 0.34], [0.1, 0.2]], AZUL);
      // asa traseira: endplate papaia com a parte de baixo preta
      poli(c, [[3.88, 0.42], [4.4, 0.42], [4.4, 0.6], [3.88, 0.6]], PRETO);
      logo(c, "mclaren", 2.45, 0.62, 3.2, 0.95, "#ff8000");
      patro(c, "KORVO", 3.0, 0.43, 0.075, "#ffffff", { esp: 0.01 });
      patro(c, "AURELIA", 1.5, 0.4, 0.07, "#101114", { esp: 0.012 });
      patro(c, "nexon", 3.25, 0.27, 0.09, "#101114", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
      patro(c, "OKTA·X", 1.05, 0.26, 0.06, "#101114");
    });
    vista(ctx, "T", (c) => {
      ret(c, 2.3, -0.3, 4.0, 0.3, PRETO); poli(c, [[2.3, 0.3], [2.3, -0.3], [2.0, -0.12], [2.0, 0.12]], PRETO);
      ret(c, 0.15, -0.025, 1.0, 0.025, AZUL);
      ret(c, 3.9, -0.5, 4.4, 0.5, PAP); ret(c, 4.0, -0.5, 4.2, 0.5, PRETO);
      logo(c, "mclaren", 3.9, -0.2, 4.35, 0.2, "#ffffff");
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0.0, 0.8, 0.45, PAP); ret(c, -0.55, 0.0, 0.55, 0.15, PRETO); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0.0, 0.8, 1.0, PAP); ret(c, -0.5, 0.45, 0.5, 0.75, PRETO); patro(c, "KORVO", 0, 0.8, 0.07, "#101114"); });
  },
};

// Ferrari: vermelho, tampa e traseira brancas, asa traseira e a parte de baixo pretas, escudo amarelo
DESENHOS.ferrari = {
  numero: "#ffffff",
  pintar(ctx) {
    const VERM = "#dc0000", BRANCO = "#f1efe9", AMAR = "#ffd200", PRETO = "#121214";
    base(ctx, VERM);
    lados(ctx, (c) => {
      // tampa e traseira brancas, com a frente em diagonal
      poli(c, [[2.3, 1.1], [4.45, 1.1], [4.45, 0.4], [3.4, 0.4], [3.0, 0.5], [2.75, 0.8], [2.55, 0.62], [2.3, 0.6]], BRANCO);
      poli(c, [[2.3, 0.6], [2.55, 0.62], [2.75, 0.8], [2.82, 0.8], [2.6, 0.58], [2.3, 0.56]], AMAR);
      // asa traseira preta
      poli(c, [[3.88, 0.4], [4.4, 0.4], [4.4, 0.97], [3.88, 0.97]], PRETO);
      // cockpit e rodas: linha branca no bico
      poli(c, [[0.05, 0.15], [1.2, 0.34], [1.2, 0.37], [0.05, 0.18]], BRANCO);
      logo(c, "ferrari", 2.55, 0.72, 2.95, 0.98);
      logo(c, "ferrari", 1.5, 0.16, 1.9, 0.4);
      patro(c, "SOLARA", 1.6, 0.42, 0.09, "#ffd200", { esp: 0.02 });
      patro(c, "vektra", 3.3, 0.7, 0.1, "#1b3fb4", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
      patro(c, "KAYMAN", 3.25, 0.24, 0.06, "#ffffff", { esp: 0.012 });
    });
    vista(ctx, "T", (c) => {
      ret(c, 2.5, -0.3, 4.0, 0.3, BRANCO); ret(c, 2.5, -0.012, 3.95, 0.012, VERM);
      ret(c, 0.05, -0.8, 0.5, 0.8, VERM); ret(c, 0.15, -0.015, 1.0, 0.015, BRANCO);
      ret(c, 3.9, -0.5, 4.4, 0.5, PRETO);
      logo(c, "ferrari", 0.78, -0.07, 1.0, 0.07);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0.0, 0.8, 0.45, VERM); ret(c, -0.75, 0.0, 0.75, 0.08, PRETO); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0.0, 0.8, 1.0, PRETO); ret(c, -0.45, 0.2, 0.45, 0.5, VERM); });
  },
};

// Mercedes: carro preto, faixa verde-água em diagonal na caixa lateral, asas e bico prateados
DESENHOS.mercedes = {
  numero: "#00d7b6",
  pintar(ctx) {
    const PRETO = "#0a0b0e", PRATA = "#c8cdd3", VERDE = "#00d7b6";
    base(ctx, PRETO);
    lados(ctx, (c) => {
      // faixa verde-água em diagonal na caixa lateral (do meio para a traseira) com a ponta prateada
      poli(c, [[1.95, 0.26], [2.5, 0.28], [3.45, 0.5], [3.45, 0.56], [2.55, 0.4], [1.95, 0.35]], VERDE);
      poli(c, [[1.95, 0.35], [2.55, 0.4], [3.45, 0.56], [3.45, 0.6], [2.5, 0.45], [1.95, 0.4]], PRATA);
      // bico prateado (a frente do carro, com o corte para o preto)
      poli(c, [[0.0, 0.0], [1.05, 0.0], [0.95, 0.4], [0.0, 0.4]], PRATA);
      poli(c, [[3.88, 0.4], [4.4, 0.4], [4.4, 0.97], [3.88, 0.97]], "#16181c");
      poli(c, [[0.95, 0.12], [2.05, 0.12], [2.05, 0.46], [0.95, 0.46]], "#2b2f35");
      poli(c, [[0.95, 0.12], [2.05, 0.12], [2.05, 0.15], [0.95, 0.15]], PRATA);
      // as estrelinhas da tampa do motor (pontos prateados sumindo para trás)
      const R = mulberry(7); for (let i = 0; i < 60; i++) { const s = 2.6 + R() * 1.2, y = 0.62 + R() * 0.3 - (s - 2.6) * 0.18; c.fillStyle = `rgba(200,205,211,${0.2 + R() * 0.5})`; c.beginPath(); c.arc(s, y, 0.008 + R() * 0.01, 0, 6.3); c.fill(); }
      logo(c, "mercedes", 1.1, 0.14, 2.0, 0.42);
      patro(c, "PETRAL", 3.2, 0.2, 0.05, "#00d7b6", { esp: 0.02 });
      patro(c, "kodiak", 1.55, 0.42, 0.06, "#c8cdd3", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.55, 0.75, PRATA); ret(c, 0.1, -0.2, 1.05, 0.2, "#d9dde2");
      ret(c, 2.3, -0.3, 4.0, 0.3, "#121418"); ret(c, 3.9, -0.5, 4.4, 0.5, "#181a1f");
      ret(c, 2.5, -0.1, 2.6, 0.1, VERDE);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 0.45, PRATA); ret(c, -0.55, 0, 0.55, 0.15, PRETO); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.0, "#16181c"); ret(c, -0.5, 0.45, 0.5, 0.75, VERDE); });
  },
};

// Red Bull: azul-marinho fosco, bico amarelo e vermelho, tampa do motor com os touros, "ORACLE" no estilo da lateral
DESENHOS["red-bull"] = {
  numero: "#ffffff",
  pintar(ctx) {
    const AZUL = "#14224a", VERM = "#d3112f", AMAR = "#ffcc00", PRETO = "#0c0f1a";
    base(ctx, AZUL);
    lados(ctx, (c) => {
      // bico: amarelo na ponta e vermelho depois, como na frente do carro
      poli(c, [[0, 0], [0.55, 0], [0.55, 0.5], [0, 0.5]], AMAR);
      poli(c, [[0.55, 0.0], [1.1, 0.0], [1.1, 0.5], [0.55, 0.5]], VERM);
      poli(c, [[2.2, 0.57], [2.5, 1.1], [2.9, 1.1], [3.0, 0.88], [2.7, 0.5]], VERM);   // airbox
      poli(c, [[3.0, 0.88], [4.45, 0.46], [4.45, 0.5], [3.1, 0.9]], VERM);
      poli(c, [[3.88, 0.4], [4.4, 0.4], [4.4, 0.97], [3.88, 0.97]], "#1c2b60");
      logo(c, "red-bull", 1.1, 0.14, 2.0, 0.4);
      patro(c, "ORBITA", 3.3, 0.66, 0.09, "#ffffff", { esp: 0.015 });
      patro(c, "Teklar", 1.5, 0.4, 0.07, "#ffffff", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
      patro(c, "GATE·7", 3.25, 0.22, 0.05, "#ffcc00");
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.5, 0.75, VERM); ret(c, 0.0, -0.16, 0.7, 0.16, AMAR); ret(c, 0.7, -0.2, 1.1, 0.2, VERM);
      ret(c, 2.3, -0.3, 4.0, 0.3, "#102150"); ret(c, 2.3, -0.1, 2.9, 0.1, VERM);
      ret(c, 3.9, -0.5, 4.4, 0.5, "#1c2b60"); logo(c, "red-bull", 3.92, -0.35, 4.38, 0.35);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 0.45, VERM); ret(c, -0.2, 0.1, 0.2, 0.45, AMAR); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.0, AZUL); ret(c, -0.5, 0.45, 0.5, 0.75, VERM); });
  },
};

// Racing Bulls: branco e azul-marinho, bico e airbox em amarelo, laranja e vermelho
DESENHOS["racing-bulls"] = {
  numero: "#14224a",
  pintar(ctx) {
    const BRANCO = "#f1f3f8", MAR = "#1a2c6b", AMAR = "#ffd21f", LARANJA = "#ff6a13", VERM = "#e4002b";
    base(ctx, BRANCO);
    lados(ctx, (c) => {
      poli(c, [[0, 0], [0.9, 0], [0.7, 0.5], [0, 0.5]], LARANJA); poli(c, [[0, 0], [0.45, 0], [0.35, 0.5], [0, 0.5]], AMAR);
      poli(c, [[2.2, 0.57], [2.5, 1.1], [3.0, 1.1], [3.2, 0.86], [2.8, 0.5]], AMAR);
      poli(c, [[2.6, 1.1], [2.95, 1.1], [3.1, 0.9], [2.8, 0.95]], VERM);
      // traseira azul-marinho em diagonal
      poli(c, [[3.1, 0.9], [4.45, 0.5], [4.45, 0.35], [3.3, 0.35], [3.0, 0.5]], MAR);
      poli(c, [[3.88, 0.4], [4.4, 0.4], [4.4, 0.97], [3.88, 0.97]], MAR);
      poli(c, [[2.95, 0.1], [3.5, 0.1], [3.3, 0.3], [2.95, 0.3]], MAR);
      logo(c, "racing-bulls", 1.1, 0.12, 2.0, 0.42, MAR);
      patro(c, "VANTO", 1.35, 0.42, 0.075, MAR, { esp: 0.015 });
      patro(c, "Cashly", 3.45, 0.2, 0.06, "#ffffff", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.5, 0.75, MAR); ret(c, 0.0, -0.17, 0.9, 0.17, LARANJA); ret(c, 0.0, -0.08, 0.45, 0.08, AMAR);
      ret(c, 2.3, -0.3, 3.0, 0.3, AMAR); ret(c, 3.0, -0.3, 4.0, 0.3, MAR); ret(c, 3.9, -0.5, 4.4, 0.5, MAR);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 0.45, BRANCO); ret(c, -0.55, 0, 0.55, 0.15, MAR); ret(c, -0.15, 0.1, 0.15, 0.45, LARANJA); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.0, MAR); ret(c, -0.5, 0.45, 0.5, 0.75, BRANCO); });
  },
};

// Aston Martin: verde de corrida escuro, filetes verde-limão, asa traseira e bico mais escuros
DESENHOS["aston-martin"] = {
  numero: "#d7e600",
  pintar(ctx) {
    const VERDE = "#0a5c4d", ESC = "#06352c", LIMAO = "#cedc00", PRETO = "#0a1210";
    base(ctx, VERDE);
    lados(ctx, (c) => {
      poli(c, [[2.3, 1.1], [4.45, 1.1], [4.45, 0.38], [3.4, 0.38], [2.9, 0.55], [2.3, 0.55]], ESC);
      // filetes limão em diagonal ao longo da tampa
      poli(c, [[2.3, 0.55], [2.9, 0.55], [3.4, 0.38], [4.45, 0.38], [4.45, 0.35], [3.4, 0.35], [2.9, 0.52], [2.3, 0.52]], LIMAO);
      poli(c, [[0.0, 0.18], [1.1, 0.37], [1.1, 0.4], [0.0, 0.21]], LIMAO);
      poli(c, [[3.88, 0.4], [4.4, 0.4], [4.4, 0.97], [3.88, 0.97]], PRETO);
      logo(c, "aston-martin", 1.1, 0.14, 2.0, 0.4, "#ffffff");
      patro(c, "ARAMEX", 3.3, 0.2, 0.08, "#ffffff", { esp: 0.01, estilo: "normal" });
      patro(c, "Cyntra", 1.4, 0.43, 0.06, "#cedc00", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
      patro(c, "ELM", 2.7, 0.65, 0.09, "#cedc00");
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.5, 0.75, ESC); ret(c, 0.15, -0.012, 1.1, 0.012, LIMAO);
      ret(c, 2.3, -0.3, 4.0, 0.3, ESC); ret(c, 2.3, -0.012, 3.9, 0.012, LIMAO); ret(c, 3.9, -0.5, 4.4, 0.5, PRETO);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 0.45, VERDE); ret(c, -0.75, 0, 0.75, 0.1, LIMAO); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.0, PRETO); ret(c, -0.45, 0.45, 0.45, 0.75, LIMAO); });
  },
};

// Williams: azul-celeste na frente, azul-marinho atrás, faixa branca, patrocinador grande na caixa lateral
DESENHOS.williams = {
  numero: "#ffffff",
  pintar(ctx) {
    const CEU = "#1f9fe0", MAR = "#0b2a6b", BRANCO = "#f4f6fa";
    base(ctx, CEU);
    lados(ctx, (c) => {
      // o azul-marinho começa na caixa lateral e cobre a tampa e a traseira, em diagonal
      poli(c, [[2.4, 1.1], [4.45, 1.1], [4.45, 0.3], [3.4, 0.3], [2.75, 0.3], [2.5, 0.55], [2.35, 0.6]], MAR);
      poli(c, [[2.35, 0.6], [2.5, 0.55], [2.75, 0.3], [2.85, 0.3], [2.6, 0.58], [2.35, 0.64]], BRANCO);
      poli(c, [[0, 0.17], [1.2, 0.36], [1.2, 0.39], [0, 0.2]], BRANCO);
      poli(c, [[3.88, 0.4], [4.4, 0.4], [4.4, 0.97], [3.88, 0.97]], "#0e3a8c");
      logo(c, "williams", 1.1, 0.14, 2.0, 0.4);
      patro(c, "KOMATIX", 3.3, 0.2, 0.075, "#ffffff", { esp: 0.012 });
      patro(c, "Barclane", 1.3, 0.45, 0.055, "#ffffff", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.5, 0.75, CEU); ret(c, 0.15, -0.015, 1.15, 0.015, BRANCO);
      ret(c, 2.5, -0.3, 4.0, 0.3, MAR); ret(c, 3.9, -0.5, 4.4, 0.5, "#0e3a8c");
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 0.45, CEU); ret(c, -0.55, 0, 0.55, 0.12, MAR); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.0, "#0e3a8c"); ret(c, -0.45, 0.45, 0.45, 0.75, BRANCO); });
  },
};

// Audi: prata titânio, caixa lateral e traseira com degradê vermelho-alaranjado, tampa do motor preta
DESENHOS.audi = {
  numero: "#ffffff",
  pintar(ctx) {
    const PRATA = "#b9bec4", ESC = "#4a4f57", VERM = "#ff3d0a", PRETO = "#0d0e11";
    base(ctx, PRATA);
    lados(ctx, (c) => {
      poli(c, [[2.3, 1.1], [4.45, 1.1], [4.45, 0.45], [3.6, 0.45], [3.0, 0.62], [2.7, 0.62], [2.3, 0.58]], PRETO);
      // degradê vermelho-alaranjado na caixa lateral, subindo para a traseira
      c.fillStyle = degrade(c, 2.1, 0.3, 3.9, 0.3, [[0, "rgba(255,61,10,0)"], [0.35, "rgba(255,61,10,0.9)"], [1, "#ff3d0a"]]);
      c.beginPath(); c.moveTo(2.05, 0.04); c.lineTo(3.95, 0.04); c.lineTo(3.95, 0.42); c.lineTo(3.4, 0.45); c.lineTo(2.9, 0.56); c.lineTo(2.05, 0.5); c.closePath(); c.fill();
      poli(c, [[0.0, 0.0], [1.0, 0.0], [0.9, 0.4], [0.0, 0.4]], ESC);
      poli(c, [[3.88, 0.4], [4.4, 0.4], [4.4, 0.97], [3.88, 0.97]], PRETO);
      logo(c, "audi", 2.2, 0.62, 3.2, 0.96, "#ff3d0a");
      patro(c, "Revona", 3.25, 0.2, 0.09, "#ffffff", { peso: 800, estilo: "normal", fam: "Arial, sans-serif" });
      patro(c, "NINJAONE", 1.3, 0.42, 0.05, "#14161a", { esp: 0.01 });
      patro(c, "VISIT·QA", 3.5, 0.25, 0.05, "#ffffff");
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.5, 0.75, ESC); ret(c, 0.1, -0.2, 1.05, 0.2, PRATA);
      ret(c, 2.3, -0.3, 4.0, 0.3, PRETO); ret(c, 3.9, -0.5, 4.4, 0.5, PRETO);
      c.fillStyle = degrade(c, 2.1, 0, 3.9, 0, [[0, "rgba(255,61,10,0)"], [1, "#ff3d0a"]]); c.fillRect(2.1, -0.3, 1.8, 0.1); c.fillRect(2.1, 0.2, 1.8, 0.1);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 0.45, PRATA); ret(c, -0.55, 0, 0.55, 0.12, ESC); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.0, PRETO); ret(c, -0.45, 0.45, 0.45, 0.75, VERM); });
  },
};

// Alpine: azul-marinho, rosa no bico, nas laterais e na asa dianteira, branco em filetes
DESENHOS.alpine = {
  numero: "#ffffff",
  pintar(ctx) {
    const AZUL = "#0a2a6b", ROSA = "#ff7ab8", CLARO = "#2c6fe0", BRANCO = "#f4f6fa";
    base(ctx, AZUL);
    lados(ctx, (c) => {
      poli(c, [[0, 0], [1.0, 0], [0.8, 0.3], [0, 0.3]], ROSA);
      // faixa rosa na tampa do motor, descendo em diagonal
      poli(c, [[2.3, 0.62], [3.0, 0.62], [4.45, 0.46], [4.45, 0.7], [3.4, 0.84], [2.9, 0.88]], ROSA);
      poli(c, [[2.3, 0.62], [2.9, 0.88], [2.9, 0.92], [2.3, 0.66]], BRANCO);
      poli(c, [[2.0, 0.08], [3.4, 0.08], [3.2, 0.3], [2.0, 0.3]], CLARO);
      poli(c, [[3.88, 0.4], [4.4, 0.4], [4.4, 0.97], [3.88, 0.97]], "#081c4a");
      logo(c, "alpine", 1.1, 0.14, 2.0, 0.4, "#ffffff");
      patro(c, "BRIVA", 3.7, 0.24, 0.1, ROSA, { esp: 0.01 });
      patro(c, "Mercura", 1.5, 0.43, 0.06, "#ffffff", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.5, 0.75, ROSA); ret(c, 0.0, -0.17, 1.0, 0.17, ROSA); ret(c, 1.0, -0.17, 1.9, 0.17, AZUL);
      ret(c, 2.3, -0.3, 4.0, 0.3, AZUL); ret(c, 3.0, -0.3, 4.0, -0.12, ROSA); ret(c, 3.0, 0.12, 4.0, 0.3, ROSA);
      ret(c, 3.9, -0.5, 4.4, 0.5, "#081c4a");
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 0.45, AZUL); ret(c, -0.8, 0, 0.8, 0.14, ROSA); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.0, "#081c4a"); ret(c, -0.45, 0.45, 0.45, 0.75, ROSA); });
  },
};

// Haas: branco com faixas diagonais vermelhas e pretas, traseira preta
DESENHOS.haas = {
  numero: "#111111",
  pintar(ctx) {
    const BRANCO = "#f4f4f2", VERM = "#e10a2b", PRETO = "#141416";
    base(ctx, BRANCO);
    lados(ctx, (c) => {
      // faixas diagonais (subindo para a traseira): vermelha e preta
      poli(c, [[0.0, 0.0], [0.9, 0.0], [1.2, 0.38], [0.0, 0.38]], VERM);
      poli(c, [[2.95, 0.04], [3.35, 0.04], [3.95, 0.4], [3.55, 0.4]], VERM);
      poli(c, [[3.35, 0.04], [3.75, 0.04], [4.35, 0.4], [3.95, 0.4]], PRETO);
      poli(c, [[1.0, 0.04], [1.5, 0.04], [2.0, 0.3], [1.0, 0.3]], VERM);
      poli(c, [[2.9, 1.1], [4.45, 1.1], [4.45, 0.52], [3.7, 0.7], [3.3, 0.9]], PRETO);
      poli(c, [[3.88, 0.4], [4.4, 0.4], [4.4, 0.97], [3.88, 0.97]], PRETO);
      logo(c, "haas", 1.55, 0.3, 2.0, 0.45);
      patro(c, "TOREX", 3.3, 0.76, 0.09, "#ffffff", { esp: 0.012 });
      patro(c, "G·R", 1.7, 0.45, 0.09, PRETO);
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.5, 0.75, VERM); ret(c, 0.0, -0.17, 0.9, 0.17, BRANCO); ret(c, 0.4, -0.04, 1.0, 0.04, PRETO);
      ret(c, 3.0, -0.3, 4.0, 0.3, PRETO); ret(c, 3.9, -0.5, 4.4, 0.5, PRETO);
      ret(c, 2.3, -0.3, 3.0, -0.18, VERM); ret(c, 2.3, 0.18, 3.0, 0.3, VERM);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 0.45, BRANCO); ret(c, -0.8, 0, 0.8, 0.12, VERM); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.0, PRETO); ret(c, -0.45, 0.45, 0.45, 0.75, VERM); });
  },
};

// Cadillac: branco com a parte de trás se desmanchando em quadradinhos pretos (pixels), bico preto
DESENHOS.cadillac = {
  numero: "#111111",
  pintar(ctx) {
    const BRANCO = "#f3f4f6", PRETO = "#0e0f12";
    base(ctx, BRANCO);
    const R = mulberry(11);
    // os pixels: quanto mais para trás (s grande), mais quadradinhos pretos
    const pix = (c, a0, a1, b0, b1, p) => { const q = 0.042; for (let a = a0; a < a1; a += q) for (let b = b0; b < b1; b += q) { const f = (a - a0) / (a1 - a0); if (R() < Math.pow(f, p) * 0.9) { c.fillStyle = PRETO; c.fillRect(a, b, q, q); } } };
    lados(ctx, (c) => {
      poli(c, [[0.0, 0.0], [1.0, 0.0], [0.7, 0.3], [0.0, 0.3]], PRETO);
      pix(c, 2.1, 3.5, 0.05, 1.05, 1.8);
      poli(c, [[3.5, 1.1], [4.45, 1.1], [4.45, 0.35], [3.5, 0.35]], PRETO);
      poli(c, [[3.88, 0.4], [4.4, 0.4], [4.4, 0.97], [3.88, 0.97]], PRETO);
      logo(c, "cadillac", 1.1, 0.16, 2.0, 0.4, PRETO);
      patro(c, "TWK", 2.55, 0.5, 0.17, "#111111", { esp: 0.01 });
      patro(c, "Claro·a", 1.2, 0.43, 0.05, "#111111", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.5, 0.75, PRETO); ret(c, 0.0, -0.17, 0.9, 0.17, PRETO); ret(c, 0.9, -0.17, 1.6, 0.17, BRANCO);
      pix(c, 2.1, 3.5, -0.3, 0.3, 1.5); ret(c, 3.5, -0.3, 4.0, 0.3, PRETO); ret(c, 3.9, -0.5, 4.4, 0.5, PRETO);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 0.45, BRANCO); ret(c, -0.8, 0, 0.8, 0.12, PRETO); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.0, PRETO); ret(c, -0.45, 0.45, 0.45, 0.75, BRANCO); });
  },
};

// quais pinturas usam qual equipe: a chave é o `equipe` de MODS.pintura (pistas.js)
export const temDesenho = (equipe) => !!DESENHOS[equipe];
export const corDoNumero = (equipe) => DESENHOS[equipe]?.numero || "#ffffff";

// ---------------------------------------------------------------- as texturas (uma por equipe, guardada)
const FOLHAS = new Map();
export function folhaDaEquipe(equipe) {
  if (!DESENHOS[equipe]) return null;
  if (FOLHAS.has(equipe)) return FOLHAS.get(equipe);
  const cv = document.createElement("canvas"); cv.width = FW; cv.height = FH;
  const ctx = cv.getContext("2d"); DESENHOS[equipe].pintar(ctx);
  lados(ctx, (c) => ret(c, 2.1, 0.12, 2.9, 0.46, CARBONO)); // a entrada de ar das caixas laterais é escura em qualquer pintura
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.userData.cv = cv; FOLHAS.set(equipe, t); return t;
}
// para quem quiser ver a folha pronta (a ferramenta de conferência)
export function desenharFolha(ctx, equipe) { DESENHOS[equipe]?.pintar(ctx); }

// o atlas dos dígitos do número do piloto: 10 células de 64x128; vermelho = preenchimento, verde = contorno
let DIGITOS = null;
export function texturaDosDigitos() {
  if (DIGITOS) return DIGITOS;
  const cv = document.createElement("canvas"); cv.width = 640; cv.height = 128; const x = cv.getContext("2d");
  x.fillStyle = "#000"; x.fillRect(0, 0, 640, 128);
  x.font = "italic 900 104px 'Arial Black', Arial, Helvetica, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round";
  for (let d = 0; d < 10; d++) {
    x.lineWidth = 12; x.strokeStyle = "#00ff00"; x.strokeText(String(d), d * 64 + 32, 68, 54);
    x.fillStyle = "#ff0000"; x.fillText(String(d), d * 64 + 32, 68, 54);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  DIGITOS = t; return t;
}

// ---------------------------------------------------------------- o shader da pintura de equipe (corpo)
export const LIV_VERT_DECL = "attribute vec3 pcar;\nattribute vec3 ncar;\nvarying vec3 vPc;\nvarying vec3 vNc;\n";
export const LIV_VERT_MAIN = "\nvPc = pcar; vNc = ncar;";
// onde ficam os números (s, y, altura em metros) nos lados e (s, x, altura) em cima: ver NUM_* abaixo
export const LIV_FRAG_DECL = `
uniform sampler2D liv;
uniform sampler2D dig;
uniform vec2 numero;   // dígitos do número (dezena, unidade); unidade < 0: sem número
uniform vec3 corNum;
varying vec3 vPc;
varying vec3 vNc;
const float KK = 232.72727;
vec2 lv(vec2 px, vec4 r) { px = clamp(px, r.xy + 1.5, r.zw - 1.5); return vec2(px.x / 1024.0, 1.0 - px.y / 1152.0); }
// um número de 1 ou 2 dígitos centrado em (0,0) do plano do decalque; u para a direita, v para cima, h = altura em metros
vec2 digito(float u, float v, float h) {
  float cw = h * 0.62, tv = v / h + 0.5;
  if (tv <= 0.0 || tv >= 1.0) return vec2(0.0);
  float dois = step(0.0, numero.x), k = (u / (cw * (1.0 + dois)) + 0.5) * (1.0 + dois);
  if (k <= 0.0 || k >= 1.0 + dois) return vec2(0.0);
  float idx = (dois > 0.5 && k < 1.0) ? numero.x : numero.y, f = (dois > 0.5) ? fract(k) : k;
  return texture2D(dig, vec2((idx + f) / 10.0, tv)).rg;
}
`;
export const LIV_FRAG_MAIN = `
{
  vec3 mk = diffuseColor.rgb;
  vec3 p = vPc, n = normalize(vNc);
  vec3 a = pow(abs(n), vec3(6.0)); a /= (a.x + a.y + a.z);
  bool dir = n.x > 0.0;
  vec2 pS = dir ? vec2((4.4 - p.z) * KK, (1.1 - p.y) * KK) : vec2(p.z * KK, 256.0 + (1.1 - p.y) * KK);
  vec3 cS = texture2D(liv, lv(pS, dir ? vec4(0.0, 0.0, 1024.0, 256.0) : vec4(0.0, 256.0, 1024.0, 512.0))).rgb;
  vec3 cT = n.y > 0.0 ? texture2D(liv, lv(vec2(p.z * KK, 704.0 - p.x * KK), vec4(0.0, 512.0, 1024.0, 896.0))).rgb : vec3(0.012);
  bool fr = n.z < 0.0;
  vec2 pZ = vec2(fr ? 256.0 - p.x * KK : 768.0 + p.x * KK, 896.0 + (1.1 - p.y) * KK);
  vec3 cZ = texture2D(liv, lv(pZ, fr ? vec4(0.0, 896.0, 512.0, 1152.0) : vec4(512.0, 896.0, 1024.0, 1152.0))).rgb;
  vec3 c = cS * a.x + cT * a.y + cZ * a.z;
  if (numero.y >= 0.0) {
    // número na tampa do motor (os dois lados) e na asa traseira (os dois lados); em cima do bico, lido por quem vem atrás
    float us = dir ? -p.z : p.z;
    vec2 d1 = digito(us + (dir ? 3.2 : -3.2), p.y - 0.55, 0.2) * a.x;
    vec2 d2 = digito(us + (dir ? 4.275 : -4.275), p.y - 0.72, 0.17) * a.x;
    vec2 d3 = digito(p.x, 1.02 - p.z, 0.22) * a.y * step(0.0, n.y);
    vec2 d = max(max(d1, d2), d3);
    c = mix(c, vec3(0.015), clamp(d.g, 0.0, 1.0));
    c = mix(c, corNum, clamp(d.r, 0.0, 1.0));
  }
#ifdef FUNDO
  c = mix(c, mk, max(step(p.y, 0.2), step(n.y, -0.2))); // o assoalho e a barriga seguem de carbono
#endif
  diffuseColor.rgb = c;
}`;

// ---------------------------------------------------------------- o pneu: a faixa do composto (como as da Pirelli)
export const FAIXAS = { macio: "#e8202a", medio: "#ffd100", duro: "#f4f4f4", chuva: "#1e7fd6" };
// Os secos são slicks; o de chuva recebe canais no piso. O padrão usa a posição local, então gira junto com a roda.
export const PNEU_VERT_DECL = "attribute vec2 aro;\nattribute float pneuLat;\nvarying vec2 vAro;\nvarying float vPneuLat;\n";
export const PNEU_VERT_MAIN = "\nvAro = aro; vPneuLat = pneuLat;";
export const PNEU_FRAG_DECL = "uniform vec3 faixa;\nuniform float faixaOn;\nuniform float pneuChuva;\nuniform float pneuTom;\nvarying vec2 vAro;\nvarying float vPneuLat;\n";
export const PNEU_FRAG_MAIN = `
{
  float rr = length(vAro);
  float banda = smoothstep(0.725, 0.735, rr) * (1.0 - smoothstep(0.790, 0.800, rr)) * faixaOn;
  // Microvariação fosca na borracha; sem inventar sulcos nos compostos secos.
  if (rr > 0.83 && abs(vPneuLat) < 0.96) {
    float ang = atan(vAro.y, vAro.x);
    float grao = sin(ang * 73.0 + sin(vPneuLat * 47.0)) * sin(vPneuLat * 101.0 + ang * 17.0);
    float piso = smoothstep(0.83, 0.93, rr) * (1.0 - smoothstep(0.78, 0.96, abs(vPneuLat)));
    diffuseColor.rgb *= 1.0 + piso * (pneuTom + grao * 0.045);
    // Canais inclinados e canal central do pneu de chuva.
    float linhas = smoothstep(0.76, 0.91, cos(ang * 26.0 + abs(vPneuLat) * 13.0));
    float centro = 1.0 - smoothstep(0.035, 0.08, abs(vPneuLat));
    diffuseColor.rgb *= 1.0 - pneuChuva * piso * max(linhas * 0.34, centro * 0.4);
  }
  diffuseColor.rgb = mix(diffuseColor.rgb, faixa, banda);
}`;
