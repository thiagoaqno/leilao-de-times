// Corrida da Galera — a pintura das equipes no carro de F1 (f1.js monta o carro e usa isto).
//
// (Serve aos dois carros: o de 2026, f1-2026.js, usa a mesma folha e o mesmo shader com `NOVO`; as medidas abaixo valem para os dois, porque
// todo modelo é posto no comprimento TAM de f1.js.)
// O modelo clássico (f1/f1.glb) é um F1 antigo com UV de máscara, então as pinturas de equipe não ficam em cima do UV: cada
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
// Os patrocínios usam nomes reais em representação tipográfica aproximada; os logos das
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
// Letra transversal ao carro, para ser lida do cockpit (a folha superior tem o eixo lateral na vertical).
function textoTopo(c, str, s, x, h, cor, { larg = 0, borda = null, estilo = "normal" } = {}) {
  const [px, py] = pt(c, s, x); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.translate(px, py); c.rotate(-Math.PI / 2);
  c.font = `${estilo} 900 ${Math.round(h * K)}px Arial, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
  if (borda) { c.strokeStyle = borda; c.lineWidth = Math.max(2, h * K * 0.14); c.lineJoin = "round"; c.strokeText(str, 0, 0, larg ? larg * K : undefined); }
  c.fillStyle = cor; c.fillText(str, 0, 0, larg ? larg * K : undefined); c.restore();
}
// o logo da equipe numa caixa (a0..a1 x b0..b1, em metros) sem deformar, centrado
function logo(c, id, a0, b0, a1, b1, tinta) {
  const r = logoRecortado(id, tinta); if (!r) return;
  const [x0, y0] = pt(c, a0, b0), [x1, y1] = pt(c, a1, b1), bx = Math.min(x0, x1), by = Math.min(y0, y1), bw = Math.abs(x1 - x0), bh = Math.abs(y1 - y0);
  const e = Math.min(bw / r.w, bh / r.h), w = r.w * e, h = r.h * e;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(r.c, bx + (bw - w) / 2, by + (bh - h) / 2, w, h); c.restore();
}
// nome de patrocinador em tipografia aproximada (não é o logotipo oficial)
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
    const PAP = "#ff8000", PRETO = "#101114";
    base(ctx, PAP);
    lados(ctx, (c) => {
      // tampa do motor / airbox preto, com a frente cortada em diagonal e a parte de baixo papaia
      poli(c, [[2.18, 1.1], [4.45, 1.1], [4.45, 0.42], [3.8, 0.44], [3.25, 0.53], [2.7, 0.7], [2.42, 0.56], [2.18, 0.58]], PRETO);
      // Sidepod escuro e faixa papaia da tampa, conforme a pintura MCL40.
      poli(c, [[1.05, 0.08], [3.85, 0.08], [3.85, 0.41], [3.45, 0.43], [2.75, 0.40], [1.55, 0.43], [1.05, 0.34]], PRETO);
      poli(c, [[2.65, 0.43], [3.65, 0.43], [3.85, 0.53], [3.30, 0.57], [2.75, 0.57]], PAP);
      // asa traseira: endplate papaia com a parte de baixo preta
      poli(c, [[3.88, 0.42], [4.4, 0.42], [4.4, 0.6], [3.88, 0.6]], PRETO);
      ret(c, 1.30, 0.41, 1.85, 0.51, "#15263d");
      c.beginPath(); c.arc(3.25, 0.29, 0.045, 0, Math.PI * 2); c.fillStyle = "#eb001b"; c.fill();
      c.beginPath(); c.arc(3.31, 0.29, 0.045, 0, Math.PI * 2); c.fillStyle = "#ff9f00"; c.fill();
      patro(c, "Gemini", 3.03, 0.72, 0.12, "#ffffff", { estilo: "normal", larg: 0.62 });
      patro(c, "VELO", 2.48, 0.55, 0.075, PRETO, { estilo: "normal", larg: 0.35 });
      patro(c, "DP WORLD", 1.55, 0.46, 0.065, "#ffffff", { esp: 0.008 });
      patro(c, "DELL", 3.50, 0.49, 0.08, PRETO, { estilo: "normal" });
      patro(c, "OKX", 2.85, 0.32, 0.075, "#ffffff");
      patro(c, "allwyn", 2.5, 0.90, 0.055, "#ffffff", { estilo: "normal" });
    });
    vista(ctx, "T", (c) => {
      // Ao lado do cockpit o preto e as faixas azul-escuras contrastam com o bico papaia.
      ret(c, 1.80, -0.30, 2.10, -0.12, PRETO); ret(c, 1.80, 0.12, 2.10, 0.30, PRETO);
      ret(c, 2.3, -0.3, 4.0, 0.3, PRETO); poli(c, [[2.3, 0.3], [2.3, -0.3], [2.0, -0.12], [2.0, 0.12]], PRETO);
      ret(c, 3.9, -0.5, 4.4, 0.5, PAP); ret(c, 4.32, -0.5, 4.4, 0.5, PRETO);
      textoTopo(c, "DHL", 4.10, 0, 0.11, PRETO, { larg: 0.65 });
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0.0, 0.8, 0.45, PAP); ret(c, -0.55, 0.0, 0.55, 0.15, PRETO); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0.0, 0.8, 1.0, PAP); ret(c, -0.5, 0.45, 0.5, 0.75, PRETO); patro(c, "DHL", 0, 0.8, 0.12, "#101114"); });
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
      patro(c, "Shell", 1.6, 0.42, 0.09, "#ffd200", { esp: 0.02 });
      patro(c, "HP", 3.3, 0.7, 0.1, "#1b3fb4", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
      patro(c, "UniCredit", 3.25, 0.24, 0.06, "#ffffff", { esp: 0.012 });
    });
    vista(ctx, "T", (c) => {
      ret(c, 2.5, -0.3, 4.0, 0.3, BRANCO); ret(c, 2.5, -0.012, 3.95, 0.012, VERM);
      ret(c, 0.05, -0.8, 0.5, 0.8, VERM); ret(c, 0.15, -0.015, 1.0, 0.015, BRANCO);
      // Nas imagens onboard, o cockpit e o bico imediato são brancos; as bordas continuam vermelhas.
      ret(c, 1.30, -0.28, 2.06, 0.28, BRANCO);
      ret(c, 3.9, -0.5, 4.4, 0.5, PRETO);
      logo(c, "ferrari", 0.78, -0.07, 1.0, 0.07);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0.0, 0.8, 0.45, VERM); ret(c, -0.75, 0.0, 0.75, 0.08, PRETO); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0.0, 0.8, 1.0, PRETO); ret(c, -0.45, 0.2, 0.45, 0.5, VERM); });
  },
};

// Mercedes W17: preto e prata, filetes Petronas e grafismos AMG.
DESENHOS.mercedes = {
  numero: "#00d7b6",
  pintar(ctx) {
    const PRETO = "#0a0b0e", PRATA = "#c8cdd3", VERDE = "#00bda9";
    base(ctx, PRETO);
    lados(ctx, (c) => {
      // Faixa estreita acompanha o contorno das caixas laterais.
      poli(c, [[1.95,0.40],[2.60,0.43],[3.60,0.55],[3.60,0.57],[2.60,0.46],[1.95,0.43]], VERDE);
      // Recortes prateados verticais do padrão AMG, sobre a parte superior do sidepod.
      for (let i = 0; i < 4; i++) {
        const s = 2.34 + i * 0.21;
        poli(c, [[s,0.46],[s+0.12,0.47],[s+0.16,0.61],[s+0.04,0.60]], PRATA);
      }
      poli(c, [[0,0.25],[1.05,0.25],[0.95,0.40],[0,0.40]], PRATA);
      poli(c, [[0,0.40],[0.95,0.40],[0.95,0.415],[0,0.415]], VERDE);
      // Estrelas de três pontas da tampa, em vez de pontos circulares.
      c.save(); c.strokeStyle = "rgba(210,216,220,0.65)"; c.lineWidth = 0.010;
      for (let row=0; row<3; row++) for (let col=0; col<6; col++) {
        const x=2.72+col*0.18+row*0.07, y=0.68+row*0.085-col*0.014, r=0.033;
        c.beginPath(); for (let k=0; k<3; k++) { const a=-Math.PI/2+k*2*Math.PI/3; c.moveTo(x,y); c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r); } c.stroke();
      }
      c.restore();
      patro(c,"PETRONAS",2.65,0.36,0.075,"#ffffff",{estilo:"normal",larg:0.58});
      patro(c,"TeamViewer",2.22,0.59,0.046,"#ffffff",{estilo:"normal"});
      patro(c,"Microsoft",2.44,0.83,0.046,"#ffffff",{estilo:"normal"});
      patro(c,"SOLERA",2.62,0.76,0.045,"#ffffff",{estilo:"normal"});
      patro(c,"INEOS",1.55,0.43,0.055,"#ffffff",{estilo:"normal"});
      patro(c,"IWC",0.40,0.23,0.045,"#ffffff",{estilo:"normal"});
      patro(c,"CROWDSTRIKE",4.04,0.75,0.045,"#ffffff",{estilo:"normal"});
    });
    vista(ctx, "T", (c) => {
      // Asas pretas, bico prateado estreito e contorno verde-água.
      ret(c, 0.10,-0.19,1.18,0.19,VERDE);
      ret(c, 0.10,-0.16,1.18,0.16,"#d9dde2");
      ret(c, 1.30,-0.28,2.08,0.28,PRATA);
      ret(c, 2.30,-0.30,4.00,0.30,"#121418");
      ret(c, 3.90,-0.50,4.40,0.50,"#181a1f");
      textoTopo(c,"PETRONAS",4.10,0,0.095,"#ffffff",{larg:0.65});
      textoTopo(c,"TeamViewer",0.25,-0.48,0.045,"#ffffff",{larg:0.35});
      textoTopo(c,"TeamViewer",0.25,0.48,0.045,"#ffffff",{larg:0.35});
    });
    vista(ctx, "F", (c) => { ret(c,-0.8,0,0.8,0.45,PRETO); ret(c,-0.18,0.2,0.18,0.45,PRATA); });
    vista(ctx, "R", (c) => { ret(c,-0.8,0,0.8,1.0,"#16181c"); patro(c,"PETRONAS",0,0.78,0.10,"#ffffff",{estilo:"normal",larg:0.8}); });
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
      patro(c, "Red Bull", 3.3, 0.66, 0.09, "#ffffff", { esp: 0.015 });
      patro(c, "Mobil 1", 1.5, 0.4, 0.07, "#ffffff", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
      patro(c, "ORACLE", 2.9, 0.23, 0.09, "#ffffff", { estilo: "normal", larg: 0.72 });
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.5, 0.75, VERM); ret(c, 0.0, -0.16, 0.7, 0.16, AMAR); ret(c, 0.7, -0.2, 1.1, 0.2, VERM);
      ret(c, 2.3, -0.3, 4.0, 0.3, "#102150"); ret(c, 2.3, -0.1, 2.9, 0.1, VERM);
      // Padrão azul discreto, como o acabamento da pintura, sem textura extra na GPU.
      const R = mulberry(22);
      for (let i = 0; i < 400; i++) {
        const s = 1.28 + R() * 0.88, x = -0.38 + R() * 0.76, w = 0.008 + R() * 0.023, h = 0.004 + R() * 0.013;
        ret(c, s, x, s + w, x + h, R() > 0.5 ? "#23366a55" : "#070f2b66");
      }
      // Detalhes visíveis do cockpit, inspirados na imagem onboard: a marca no bico e os parceiros junto ao piloto.
      // O símbolo dos touros é recortado do logo da equipe já incluído no jogo.
      const marca = LOGOS.get("red-bull")?.img;
      if (marca) {
        const [px, py] = pt(c, 1.48, 0); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.translate(px, py); c.rotate(-Math.PI / 2);
        c.drawImage(marca, marca.naturalWidth * 0.56, marca.naturalHeight * 0.41, marca.naturalWidth * 0.44, marca.naturalHeight * 0.20, -0.12 * K, -0.055 * K, 0.24 * K, 0.11 * K); c.restore();
      }
      textoTopo(c, "Red Bull", 1.60, 0, 0.11, "#e51a3a", { larg: 0.26, borda: "#ffffff" });
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
      patro(c, "VISA", 1.35, 0.42, 0.075, MAR, { esp: 0.015 });
      patro(c, "Cash App", 3.45, 0.2, 0.06, "#ffffff", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
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
      patro(c, "aramco", 3.3, 0.2, 0.08, "#ffffff", { esp: 0.01, estilo: "normal" });
      patro(c, "Cognizant", 1.4, 0.43, 0.06, "#cedc00", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
      patro(c, "BOSS", 2.7, 0.65, 0.09, "#cedc00");
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
      patro(c, "ATLASSIAN", 3.3, 0.2, 0.075, "#ffffff", { esp: 0.012 });
      patro(c, "KOMATSU", 1.3, 0.45, 0.055, "#ffffff", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.5, 0.75, CEU); ret(c, 0.15, -0.015, 1.15, 0.015, BRANCO);
      // Patrocínios visíveis no onboard oficial do FW48.
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
      patro(c, "REVOLUT", 3.25, 0.2, 0.09, "#ffffff", { peso: 800, estilo: "normal", fam: "Arial, sans-serif" });
      patro(c, "NINJAONE", 1.3, 0.42, 0.05, "#14161a", { esp: 0.01 });
      patro(c, "visitQATAR", 3.5, 0.25, 0.05, "#ffffff");
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.5, 0.75, ESC); ret(c, 0.1, -0.2, 1.05, 0.2, PRATA);
      // Patrocinadores visíveis ao redor do piloto na vista onboard do R26.
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
      patro(c, "BWT", 3.7, 0.24, 0.1, ROSA, { esp: 0.01 });
      patro(c, "Microsoft", 1.5, 0.43, 0.06, "#ffffff", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.5, 0.75, ROSA); ret(c, 0.0, -0.17, 1.0, 0.17, ROSA); ret(c, 1.0, -0.17, 1.9, 0.17, AZUL);
      ret(c, 1.30, -0.19, 1.75, 0.19, ROSA);
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
      patro(c, "TOYOTA", 3.3, 0.76, 0.09, "#ffffff", { esp: 0.012 });
      patro(c, "GR", 1.7, 0.45, 0.09, PRETO);
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
    lados(ctx, (c, lado) => {
      const direita = lado > 0;
      if (direita) ret(c, 0, 0, 4.4, 1.1, PRETO);
      poli(c, [[0.0, 0.0], [1.0, 0.0], [0.7, 0.3], [0.0, 0.3]], PRETO);
      pix(c, 2.1, 3.5, 0.05, 1.05, 1.8);
      poli(c, [[3.5, 1.1], [4.45, 1.1], [4.45, 0.35], [3.5, 0.35]], PRETO);
      poli(c, [[3.88, 0.4], [4.4, 0.4], [4.4, 0.97], [3.88, 0.97]], PRETO);
      logo(c, "cadillac", 1.1, 0.16, 2.0, 0.4, direita ? BRANCO : PRETO);
      patro(c, "TWG", 2.55, 0.5, 0.17, direita ? BRANCO : "#111111", { esp: 0.01 });
      patro(c, "Claro", 1.2, 0.43, 0.05, direita ? BRANCO : "#111111", { peso: 700, estilo: "normal", fam: "Arial, sans-serif" });
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.05, -0.75, 0.5, 0.75, PRETO); ret(c, 0.0, -0.17, 0.9, 0.17, PRETO); ret(c, 0.9, -0.17, 1.6, 0.17, BRANCO);
      // Pintura assimétrica do carro de Pérez: o lado direito é predominantemente preto.
      ret(c, 0.9, 0.13, 3.5, 0.8, PRETO);
      // Telcel aparece duas vezes no painel dianteiro, ao lado do pilar do halo.
      pix(c, 2.1, 3.5, -0.3, 0.3, 1.5); ret(c, 3.5, -0.3, 4.0, 0.3, PRETO); ret(c, 3.9, -0.5, 4.4, 0.5, PRETO);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 0.45, BRANCO); ret(c, -0.8, 0, 0.8, 0.12, PRETO); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.0, PRETO); ret(c, -0.45, 0.45, 0.45, 0.75, BRANCO); });
  },
};

// quais pinturas usam qual equipe: a chave é o `equipe` de MODS.pintura (pistas.js)
export const temDesenho = (equipe) => !!DESENHOS[equipe];
export const corDoNumero = (equipe) => DESENHOS[equipe]?.numero || "#ffffff";

// Marcas nos halos de 2026, inspiradas nas vistas onboard e nas parcerias de cada equipe.
// O atlas é compartilhado entre os carros da equipe; o shader o projeta só na barra do halo.
const HALOS = {
  mclaren: ["AIRWALLEX", "DP WORLD", "VELO.COM", "Gemini", "ECOLAB"],
  ferrari: ["Bitdefender", "Shell", "HP", "RICHARD MILLE", "Bitdefender"],
  mercedes: ["INEOS", "", "CROWDSTRIKE", "", "INEOS"],
  "red-bull": ["Hard Rock", "ORACLE", "TAG HEUER", "AT&T", "FORD"],
  "racing-bulls": ["HUGO", "VISA", "FORD", "Cash App", "HUGO"],
  "aston-martin": ["BOSS", "Valvoline", "VALHALLA", "aramco", "Cognizant"],
  williams: ["DURACELL", "kraken", "WILLIAMS", "kraken", "DURACELL"],
  audi: ["", "Castrol", "aneis", "QATAR", ""],
  alpine: ["", "eni", "BWT", "MSC", ""],
  haas: ["OAKBERRY", "HAAS", "TOYOTA", "TGR", "Pirelli"],
  cadillac: ["", "3M", "", "", ""],
};
const TEXTURAS_HALO = new Map();
export function texturaDoHalo(equipe) {
  if (!HALOS[equipe]) return null;
  if (TEXTURAS_HALO.has(equipe)) return TEXTURAS_HALO.get(equipe);
  const cv = document.createElement("canvas"); cv.width = 2048; cv.height = 256;
  const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  // Nos halos claros o branco some; as marcas usam o azul ou o preto da equipe.
  ctx.fillStyle = ({ alpine: "#182356", haas: "#151a21", audi: "#151a20" })[equipe] || "#fff";
  HALOS[equipe].forEach((nome, i) => {
    const x = equipe === "mclaren" ? [260, 600, 1024, 1448, 1788][i] : 180 + i * 422, central = i === 2;
    ctx.save(); ctx.translate(x, 128); ctx.scale(1, 0.9);
    if (central && equipe === "mercedes") {
      ctx.fillStyle = "#1ccfb7"; ctx.fillRect(-150, -100, 300, 18);
      ctx.fillStyle = "#fff"; ctx.font = "900 31px Arial, sans-serif"; ctx.fillText("CROWDSTRIKE", 0, -25, 275);
      ctx.font = "700 30px Arial, sans-serif"; ctx.fillText("Snapdragon", 0, 27, 245);
    } else if (central && equipe === "audi") {
      // Os quatro anéis laranja no topo e Revolut na face dianteira do arco.
      ctx.strokeStyle = "#f24d1d"; ctx.lineWidth = 7;
      for (const dx of [-57, -19, 19, 57]) { ctx.beginPath(); ctx.ellipse(dx, -26, 31, 22, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = "#ffffff"; ctx.font = "700 50px Arial, sans-serif"; ctx.fillText("Revolut", 0, 44, 205);
    } else if (central && equipe === "ferrari") {
      // Painel branco do HP sobre o arco escuro, como na vista onboard.
      ctx.fillStyle = "#f3f3f1"; ctx.fillRect(-160, -145, 320, 290);
      ctx.fillStyle = "#1674ba"; ctx.font = "italic 900 78px Arial, sans-serif"; ctx.fillText("hp", 0, 0);
    } else if (equipe === "ferrari" && nome === "Shell") {
      ctx.fillStyle = "#ffcf00"; ctx.strokeStyle = "#d91e26"; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(-46, -5); ctx.quadraticCurveTo(-40, -45, 0, -48); ctx.quadraticCurveTo(40, -45, 46, -5); ctx.lineTo(28, 25); ctx.lineTo(10, 33); ctx.lineTo(0, 25); ctx.lineTo(-10, 33); ctx.lineTo(-28, 25); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (equipe === "mclaren" && nome === "Gemini") {
      ctx.fillStyle = "#79c9ff"; ctx.beginPath(); ctx.moveTo(-144, -27); ctx.quadraticCurveTo(-125, -22, -119, -42); ctx.quadraticCurveTo(-113, -22, -94, -17); ctx.quadraticCurveTo(-113, -12, -119, 8); ctx.quadraticCurveTo(-125, -12, -144, -17); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "600 49px Arial, sans-serif"; ctx.fillText("Gemini", 12, 0, 235);
    } else if (central && equipe === "red-bull") {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(-122, -54); ctx.lineTo(122, -54); ctx.lineTo(122, 30); ctx.lineTo(0, 70); ctx.lineTo(-122, 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#087044"; ctx.fillRect(-110, -44, 220, 38); ctx.fillStyle = "#cf142b"; ctx.fillRect(-110, -4, 220, 31);
      ctx.fillStyle = "#fff"; ctx.font = "900 28px Arial, sans-serif"; ctx.fillText("TAG", 0, -25); ctx.fillText("HEUER", 0, 12);
    } else {
      ctx.font = equipe === "mclaren" ? `${central ? 700 : 600} ${central ? 57 : 48}px Arial, sans-serif` : `${central ? 900 : 800} ${central ? 65 : 64}px Arial, sans-serif`;
      ctx.fillText(nome, 0, 0, central ? 330 : 300);
    }
    ctx.restore();
  });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.userData.baseEscura = equipe === "cadillac" || equipe === "ferrari" || equipe === "mclaren" || equipe === "williams" || equipe === "mercedes" || equipe === "aston-martin" || equipe === "racing-bulls"; t.userData.faceAudi = equipe === "audi"; t.userData.baseRosa = equipe === "alpine"; TEXTURAS_HALO.set(equipe, t); return t;
}
export function aplicarHalo(sh, textura) {
  sh.uniforms.haloPatrocinios = { value: textura };
  sh.uniforms.haloBaseEscura = { value: textura.userData.baseEscura ? 1 : 0 };
  sh.uniforms.haloFaceAudi = { value: textura.userData.faceAudi ? 1 : 0 };
  sh.uniforms.haloBaseRosa = { value: textura.userData.baseRosa ? 1 : 0 };
  sh.fragmentShader = "uniform sampler2D haloPatrocinios;\nuniform float haloBaseEscura;\nuniform float haloFaceAudi;\nuniform float haloBaseRosa;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
  { // A barra curva do halo no modelo 2026; a folha acompanha a curva e não pinta a carroceria.
    float hx = vPc.x, hz = 1.925 + 0.60 * abs(hx) + 0.40 * hx * hx;
    float hy = 0.765 - 1.0 * hx * hx;
    vec2 huv = vec2((hx + 0.30) / 0.60, 0.5 + (vPc.y - hy) / 0.08);
    if (vPc.y > 0.68 && vPc.y < 0.84 && abs(hx) < 0.30 && abs(vPc.z - hz) < 0.08 && huv.y > 0.0 && huv.y < 1.0) {
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.012, 0.014, 0.018), haloBaseEscura);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.012, 0.014, 0.018), haloFaceAudi * (1.0 - smoothstep(0.28, 0.42, huv.y)));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.48, 0.72), haloBaseRosa);
      vec4 marca = texture2D(haloPatrocinios, huv);
      diffuseColor.rgb = mix(diffuseColor.rgb, marca.rgb, marca.a);
    }
  }`);
}

// Decalques em alta resolução para a pequena área vista pelo piloto. A folha da carroceria
// cobre o carro inteiro; aqui cada pixel é dedicado ao cockpit, evitando letras borradas.
const COCKPIT_MARCAS = {
  "red-bull": { lado: ["Mobil 1", "Mobil 1"], cor: "#ffffff" },
  "aston-martin": { centro: ["CoreWeave", "CoreWeave"], lado: ["JCB", "JCB"], cor: "#ffffff" },
  "racing-bulls": { centro: ["Red", "Bull"], lado: ["TUDOR", "TUDOR"], cor: "#1c2231", corCentro: "#e21c40" },
  mercedes: { asa: ["nu", "nu"], lado: ["TeamViewer", "TeamViewer"], cor: "#25272b" },
  alpine: { centro: ["BWT", "BWT"], lado: ["ALPINE", "ALPINE"], cor: "#183865", corLado: "#ffffff" },
  mclaren: { lado: ["allwyn", "allwyn"], asa: ["FxPro", "FxPro"], anguloAsa: 0, posAsa: 1.84, tamanhoAsa: 24, cor: "#ffffff" },
  ferrari: { lado: ["ambipar", "ambipar"], asa: ["CEVA", "CEVA"], cor: "#111111" },
  williams: { centro: ["KOMATSU", "KOMATSU"], lado: ["BARCLAYS", "BARCLAYS"], cor: "#ffffff" },
  audi: { centro: ["NEXO", "NEXO"], asa: ["aleph", "aleph"], lado: ["WORLD OF HYATT", "WORLD OF HYATT"], cor: "#25272b" },
  cadillac: { centro: ["telcel", "telcel"], lado: ["TWG", "TWG"], cor: "#34383a", corDireita: "#ffffff" },
};
const TEXTURAS_COCKPIT = new Map();
export function texturaDoCockpit(equipe) {
  const dados = COCKPIT_MARCAS[equipe]; if (!dados) return null;
  if (TEXTURAS_COCKPIT.has(equipe)) return TEXTURAS_COCKPIT.get(equipe);
  const cv = document.createElement("canvas"); cv.width = cv.height = 1024; const ctx = cv.getContext("2d");
  const X = x => (x + 0.35) / 0.70 * 1024, Y = s => (s - 1.30) / 0.90 * 1024;
  const desenhar = (txt, s, x, h, largura, giro, cor) => {
    if (!txt) return; ctx.save(); ctx.translate(X(x), Y(s)); ctx.rotate(giro); ctx.fillStyle = cor;
    ctx.font = `800 ${h}px Arial, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, 0, 0, largura); ctx.restore();
  };
  for (let i = 0; i < 2; i++) {
    const lado = i ? 1 : -1, cor = i && dados.corDireita ? dados.corDireita : dados.cor;
    desenhar(dados.centro?.[i], 1.60, lado * 0.072, 48, 160, 0, dados.corCentro || cor);
    desenhar(dados.asa?.[i], dados.posAsa ?? 1.80, lado * 0.22, dados.tamanhoAsa ?? 40, 150, dados.anguloAsa ?? -Math.PI / 2, cor);
    desenhar(dados.lado?.[i], 1.94, lado * 0.18, 46, 250, -Math.PI / 2, dados.corLado || cor);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.userData.mclaren = equipe === "mclaren";
  t.userData.mercedes = equipe === "mercedes";
  if (t.userData.mclaren || t.userData.mercedes) {
    // Atlas separado para manter as marcas do bico legíveis sem afetar outras equipes.
    const nariz = document.createElement("canvas"); nariz.width = nariz.height = 1024;
    const nc = nariz.getContext("2d"); nc.fillStyle = "#151515"; nc.textAlign = "center"; nc.textBaseline = "middle";
    const marcas = t.userData.mclaren ? [["DELL", 0.84, 62], ["Deloitte", 0.73, 45], ["webex", 0.62, 49], ["DEWALT", 0.51, 48], ["PIRELLI", 0.40, 45]] : [["PETRONAS", 0.87, 45], ["Syntium", 0.78, 42], ["INEOS", 0.57, 42], ["SAP", 0.45, 42]];
    for (const [marca, s, tamanho] of marcas) {
      nc.font = `800 ${tamanho}px Arial, sans-serif`; nc.fillText(marca, 512, (s - 0.25) / 0.90 * 1024, 360);
    }
    const nt = new THREE.CanvasTexture(nariz); nt.colorSpace = THREE.SRGBColorSpace; nt.anisotropy = 8; nt.minFilter = THREE.LinearMipmapLinearFilter;
    t.userData.nariz = nt;
  }
  TEXTURAS_COCKPIT.set(equipe, t); return t;
}
export function aplicarCockpit(sh, textura) {
  sh.uniforms.cockpitMarcas = { value: textura };
  sh.uniforms.cockpitMclaren = { value: textura.userData.mclaren ? 1 : 0 };
  sh.uniforms.marcasNariz = { value: textura.userData.nariz || textura };
  sh.uniforms.temMarcasNariz = { value: textura.userData.nariz ? 1 : 0 };
  sh.fragmentShader = "uniform sampler2D cockpitMarcas;\nuniform sampler2D marcasNariz;\nuniform float temMarcasNariz;\nuniform float cockpitMclaren;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
  { // somente as superfícies superiores ao redor do piloto, sem pintar o halo
    vec2 uvCockpit = vec2((vPc.x + 0.35) / 0.70, 1.0 - (vPc.z - 1.30) / 0.90);
    if (abs(vPc.x) < 0.35 && vPc.z > 1.30 && vPc.z < 2.20 && vPc.y < 0.66 && vNc.y > 0.25) {
      vec4 marcaCockpit = texture2D(cockpitMarcas, uvCockpit);
      if (cockpitMclaren > 0.5 && vPc.y < 0.60 && vPc.z < 1.90 && abs(vPc.x) > 0.16) marcaCockpit.a = 0.0;
      diffuseColor.rgb = mix(diffuseColor.rgb, marcaCockpit.rgb, marcaCockpit.a);
    }
    if (temMarcasNariz > 0.5 && abs(vPc.x) < 0.18 && vPc.z > 0.25 && vPc.z < 1.15 && vPc.y < 0.60 && vNc.y > 0.25) {
      vec2 uvNariz = vec2((vPc.x + 0.18) / 0.36, 1.0 - (vPc.z - 0.25) / 0.90);
      vec4 marcaNariz = texture2D(marcasNariz, uvNariz);
      diffuseColor.rgb = mix(diffuseColor.rgb, marcaNariz.rgb, marcaNariz.a);
    }
  }`);
}

// ---------------------------------------------------------------- as texturas (uma por equipe, guardada)
const FOLHAS = new Map();
export function folhaDaEquipe(equipe) {
  if (!DESENHOS[equipe]) return null;
  if (FOLHAS.has(equipe)) return FOLHAS.get(equipe);
  const cv = document.createElement("canvas"); cv.width = FW; cv.height = FH;
  const ctx = cv.getContext("2d"); DESENHOS[equipe].pintar(ctx);
  lados(ctx, (c) => ret(c, 2.1, 0.39, 2.35, 0.46, CARBONO)); // a entrada de ar das caixas laterais é escura em qualquer pintura
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
// (com NOVO, o carro de 2026: o atributo mcar diz quanto de cada ponto é pintura, 0 = carbono; ver f1-2026.js)
export const LIV_VERT_DECL = "attribute vec3 pcar;\nattribute vec3 ncar;\nvarying vec3 vPc;\nvarying vec3 vNc;\n#ifdef NOVO\nattribute float mcar;\nvarying float vMc;\n#endif\n";
export const LIV_VERT_MAIN = "\nvPc = pcar; vNc = ncar;\n#ifdef NOVO\nvMc = mcar;\n#endif";
// onde ficam os números (s, y, altura em metros) nos lados e (s, x, altura) em cima: ver NUM_* abaixo
export const LIV_FRAG_DECL = `
uniform sampler2D liv;
uniform sampler2D dig;
uniform vec2 numero;   // dígitos do número (dezena, unidade); unidade < 0: sem número
uniform vec3 corNum;
uniform vec4 numPos;   // onde ficam os números: (s, y) na lateral da tampa e (s, y) na asa traseira
varying vec3 vPc;
varying vec3 vNc;
#ifdef NOVO
varying float vMc;
#endif
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
    vec2 d1 = digito(us + (dir ? numPos.x : -numPos.x), p.y - numPos.y, 0.2) * a.x;
    vec2 d2 = digito(us + (dir ? numPos.z : -numPos.z), p.y - numPos.w, 0.17) * a.x;
    vec2 d3 = digito(p.x, 1.02 - p.z, 0.22) * a.y * step(0.0, n.y);
    vec2 d = max(max(d1, d2), d3);
    c = mix(c, vec3(0.015), clamp(d.g, 0.0, 1.0));
    c = mix(c, corNum, clamp(d.r, 0.0, 1.0));
  }
#ifdef FUNDO
  c = mix(c, mk, max(step(p.y, 0.2), step(n.y, -0.2))); // o assoalho e a barriga seguem de carbono
#endif
#ifdef NOVO
  c = mix(mk, c, vMc); // o assoalho e a barriga seguem de carbono (mk é a cor do carbono do material)
#endif
  diffuseColor.rgb = c;
}`;

// Sem equipe (a "Sua cor", o safety car, o fantasma) no carro de 2026: a cor principal em tudo, com a faixa do meio, a asa traseira e as pontas
// da asa dianteira na cor secundária (a máscara de cores do carro clássico não existe neste modelo).
export const SOL_FRAG_DECL = `
uniform vec3 cor1;
uniform vec3 cor2;
varying vec3 vPc;
varying vec3 vNc;
varying float vMc;
`;
export const SOL_FRAG_MAIN = `
{
  vec3 mk = diffuseColor.rgb, p = vPc, n = normalize(vNc);
  float faixa = step(abs(p.x), 0.07) * step(0.25, n.y) * step(p.y, 0.8);
  float asa = step(3.95, p.z) * step(0.3, p.y);
  float ponta = step(0.72, abs(p.x)) * step(p.z, 0.7);
  diffuseColor.rgb = mix(mk, mix(cor1, cor2, max(faixa, max(asa, ponta))), vMc);
}`;

// ---------------------------------------------------------------- o acabamento acetinado da pintura (só de dia)
// O corpo é um MeshPhysicalMaterial com `clearcoat` 1; quanto vale o acabamento é o uniforme compartilhado VERNIZ (0 à noite, 1 de dia; pos.js
// escreve por quadro, devagar na virada), vezes a parte do ponto que é pintura (o carbono, mcar = 0, fica fosco como estava). De dia a pintura
// fica semi-fosca, acetinada como as das equipes de hoje: rugosidade média (nada de espelho) e só uma camada leve de verniz, bem difusa, que
// deixa um brilho suave do céu nas curvas da carenagem (onde o ângulo é raso) e não deixa o painel chapado. Os brilhos diretos do sol têm teto:
// o carro reflete um pouco, não brilha (nada daqui chega ao limiar do bloom).
export const VERNIZ = { value: 1 };
// Limita a luz refletida pela carroceria antes do bloom, inclusive a soma da luz difusa,
// dos reflexos e do ambiente. A emissão fica livre para as luzes que devem brilhar.
export const TETO_CARRO = { value: 0 };
export function limitarBrilhoCarro(m) {
  if (!m || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return;
  const antes = m.onBeforeCompile, chave = m.customProgramCacheKey;
  m.onBeforeCompile = function (sh, renderer) {
    if (antes) antes.call(this, sh, renderer);
    sh.uniforms.tetoCarro = TETO_CARRO;
    sh.fragmentShader = 'uniform float tetoCarro;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `
if (tetoCarro > 0.0) {
  vec3 reflexoCarro = max(outgoingLight - totalEmissiveRadiance, vec3(0.0));
  float claridadeCarro = dot(reflexoCarro, vec3(0.2126, 0.7152, 0.0722));
  if (claridadeCarro > tetoCarro) outgoingLight = reflexoCarro * (tetoCarro / claridadeCarro) + totalEmissiveRadiance;
}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = function () { return (chave ? chave.call(this) : '') + '|teto-carro'; };
  m.needsUpdate = true;
}
const VERNIZ_DECL = "uniform float uVerniz;\n";
const VERNIZ_ASPERO = 0.52;    // a rugosidade da pintura de dia vira (no máximo) isso: acetinado
const VERNIZ_CAMADA = 0.28;    // a força da camada de verniz (baixa)
const VERNIZ_CAMADA_ASP = 0.38;// a rugosidade dela: alta, o reflexo do céu sai macio e não espelhado
const VERNIZ_CEU = 1.8;        // quanto a camada amplia o reflexo do céu
// (os tetos ficam bem abaixo do limiar do bloom: com 0,22 + 0,85 os pontinhos de brilho do sol passavam dele e o bloom os espalhava em
// "estrelas" piscando nos carros)
const VERNIZ_TETO_SOL = 0.06;  // o brilho direto do sol na camada não passa disso
const VERNIZ_TETO_BASE = 0.3;  // e o da tinta por baixo, de dia
export function aplicarVerniz(sh) {
  sh.uniforms.uVerniz = VERNIZ;
  sh.fragmentShader = VERNIZ_DECL + sh.fragmentShader
    .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
#ifdef NOVO
  float vern = uVerniz * vMc;
#else
  float vern = uVerniz;
#endif
  roughnessFactor = mix(roughnessFactor, max(roughnessFactor, ${VERNIZ_ASPERO.toFixed(2)}), vern);`)
    .replace("#include <lights_physical_fragment>", `#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
  material.clearcoat *= vern * ${VERNIZ_CAMADA.toFixed(2)};
  material.clearcoatRoughness = max(material.clearcoatRoughness, ${VERNIZ_CAMADA_ASP.toFixed(2)});
#endif`)
    .replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
#ifdef USE_CLEARCOAT
  clearcoatSpecularIndirect *= ${VERNIZ_CEU.toFixed(1)};
  clearcoatSpecularDirect = min(clearcoatSpecularDirect, vec3(${VERNIZ_TETO_SOL.toFixed(2)}));
#endif
  reflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(mix(64.0, ${VERNIZ_TETO_BASE.toFixed(2)}, vern)));`);
}

// a posição de cada ponto da roda em relação ao eixo, em raios (1 = a borda do pneu): a faixa do composto é um anel nesse
// espaço (o shader mede o comprimento do vetor em cada pixel, então o anel sai redondo mesmo com poucos vértices)
export function aroDaRoda(pos, idx) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let q = 0; q < idx.length; q++) { const x = pos.getX(idx[q]), y = pos.getY(idx[q]), z = pos.getZ(idx[q]); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  const cy = (y0 + y1) / 2, cz = (z0 + z1) / 2, R = Math.max((y1 - y0) / 2, 1e-6), cx = (x0 + x1) / 2, rx = Math.max((x1 - x0) / 2, 1e-6), a = new Float32Array(pos.count * 2), lat = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) { a[i * 2] = (pos.getY(i) - cy) / R; a[i * 2 + 1] = (pos.getZ(i) - cz) / R; lat[i] = (pos.getX(i) - cx) / rx; }
  return { aro: new THREE.BufferAttribute(a, 2), lat: new THREE.BufferAttribute(lat, 1) };
}

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
