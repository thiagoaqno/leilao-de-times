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
// Os patrocínios usam nomes reais em representação tipográfica aproximada ou desenhados no canvas (f1-marcas.js); os logos das
// equipes vêm de logos/ (o projeto já os usa nos menus). O número do piloto é um decalque à parte (um atlas de dígitos
// compartilhado) porque muda de carro para carro; o composto do pneu vira uma faixa na lateral do pneu (shader do pneu).
import * as THREE from "three";
import { desenharMarca } from "./f1-marcas.js";

export const K = 1024 / 4.4, FW = 1024, FH = 1152;
// A folha sai em 2× no carro do jogador (e na garagem) e em 1× nos outros, para um grid de 20 não pesar na memória: ESC vale durante a pintura.
// As contas continuam em "pixels lógicos" de 1024 x 1152 (o shader também): só o canvas é maior.
let ESC = 1;
const PX = () => K * ESC;
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
  c.font = `${estilo} ${peso} ${Math.round(h * PX())}px ${fam}`; c.textAlign = align; c.textBaseline = "middle"; c.fillStyle = cor;
  if ("letterSpacing" in c) c.letterSpacing = esp ? Math.round(esp * PX()) + "px" : "0px";
  if (borda) { c.lineWidth = Math.max(1.5, h * PX() * 0.12); c.strokeStyle = borda; c.lineJoin = "round"; c.strokeText(str, x, y, larg ? larg * PX() : undefined); }
  c.fillText(str, x, y, larg ? larg * PX() : undefined); c.restore();
}
// Letra transversal ao carro, para ser lida do cockpit (a folha superior tem o eixo lateral na vertical).
function textoTopo(c, str, s, x, h, cor, { larg = 0, borda = null, estilo = "normal" } = {}) {
  const [px, py] = pt(c, s, x); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.translate(px, py); c.rotate(-Math.PI / 2);
  c.font = `${estilo} 900 ${Math.round(h * PX())}px Arial, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
  if (borda) { c.strokeStyle = borda; c.lineWidth = Math.max(2, h * PX() * 0.14); c.lineJoin = "round"; c.strokeText(str, 0, 0, larg ? larg * PX() : undefined); }
  c.fillStyle = cor; c.fillText(str, 0, 0, larg ? larg * PX() : undefined); c.restore();
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
// a marca desenhada (f1-marcas.js) em (a, b), com altura h em metros; `giro` em radianos: em cima do carro, DE_FRENTE é o que quem vem de frente lê
const DE_FRENTE = Math.PI / 2;
function marca(c, id, a, b, h, { giro = 0, tinta, fundo } = {}) {
  const [x, y] = pt(c, a, b), e = h * PX(); c.save(); c.setTransform(1, 0, 0, 1, x, y); c.rotate(giro); c.scale(e, e); desenharMarca(c, id, { tinta, fundo }); c.restore();
}
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
  const v = VISTAS[nome]; ctx.save(); ctx.beginPath(); ctx.rect(...v.r.map((n) => n * ESC)); ctx.clip(); ctx.setTransform(...v.m.map((n) => n * ESC)); fn(ctx); ctx.restore();
}
const lados = (ctx, fn) => { vista(ctx, "A", (c) => fn(c, 1)); vista(ctx, "B", (c) => fn(c, -1)); };

// ---------------------------------------------------------------- as equipes
// P = { ctx } ; cada desenho pinta o fundo e depois as vistas. Medidas do modelo (em metros, s = a partir do bico):
//   bico 0 .. 1,0 (y 0,1 .. 0,45) | asa dianteira s 0,1 .. 0,5 (x ± 0,73) | cockpit 1,3 .. 2,1 | airbox no 2,35 (y 0,97)
//   caixas laterais 2,05 .. 3,5 (y 0,1 .. 0,5) | tampa do motor 2,4 .. 3,9 | asa traseira 3,9 .. 4,4 (y 0,4 .. 0,96)
const DESENHOS = {};

// a base de qualquer carro: cor cheia em tudo e o carbono onde não aparece pintura (a barriga fica no material do assoalho)
function base(ctx, cor) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = cor; ctx.fillRect(0, 0, FW * ESC, FH * ESC); ctx.restore(); }

// o preto de baixo (assoalho e parte de baixo das caixas, subindo para trás), a sombra pintada que dá volume às caixas e as asas vistas de cima
function baixo(c, cor) {
  c.fillStyle = degrade(c, 0, 0.5, 0, 0.1, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.3)"]]); c.fillRect(1.1, 0.1, 2.8, 0.4);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 0.09); c.lineTo(2.1, 0.09); c.quadraticCurveTo(2.7, 0.14, 3.15, 0.2); c.quadraticCurveTo(3.55, 0.24, 3.8, 0.34); c.lineTo(4.45, 0.34); c.lineTo(4.45, 0); c.closePath(); c.fillStyle = cor; c.fill();
}
function asasT(c, frente, tras, bico) { ret(c, 0, -0.82, 0.66, 0.82, frente); poli(c, [[0, -0.09], [0.66, -0.14], [0.66, 0.14], [0, 0.09]], bico); ret(c, 3.82, -0.62, 4.45, 0.62, tras); }
// os touros: o desenho que já vem no logo da equipe (só a parte de baixo dele, sem o letreiro)
function touros(c, a0, b0, a1, b1) {
  const L = LOGOS.get("red-bull")?.img; if (!L) return;
  const [x0, y0] = pt(c, a0, b0), [x1, y1] = pt(c, a1, b1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
  c.save(); c.setTransform(1, 0, 0, 1, Math.min(x0, x1), Math.min(y0, y1)); c.drawImage(L, L.naturalWidth * 0.5, L.naturalHeight * 0.3, L.naturalWidth * 0.5, L.naturalHeight * 0.2, 0, 0, w, h); c.restore();
}
// McLaren MCL40: papaia; a tampa e a barriga das caixas pretas, com o papaia em cunha no meio, e a asa traseira papaia e preta
DESENHOS.mclaren = {
  numero: "#ffffff", carbono: 1, numPos: [3.46, 0.7, 9, 9],
  pintar(ctx) {
    const PAP = "#f47600", PRETO = "#121316";
    base(ctx, PAP);
    lados(ctx, (c) => {
      // a tampa preta, que desce em diagonal até a asa
      c.beginPath(); c.moveTo(2.14, 1.1); c.lineTo(3.88, 1.1); c.lineTo(3.88, 0.42); c.quadraticCurveTo(3.1, 0.68, 2.62, 0.66); c.lineTo(2.14, 0.58); c.closePath(); c.fillStyle = PRETO; c.fill();
      // a barriga preta da entrada de ar até trás
      c.beginPath(); c.moveTo(1.05, 0); c.lineTo(1.05, 0.25); c.quadraticCurveTo(2.0, 0.4, 2.55, 0.38); c.quadraticCurveTo(3.1, 0.36, 3.88, 0.42); c.lineTo(3.88, 0); c.closePath(); c.fill();
      baixo(c, PRETO);
      poli(c, [[0, 0], [0.62, 0], [0.62, 0.11], [0, 0.11]], PRETO);
      ret(c, 3.86, 0.3, 4.45, 0.62, PRETO);
      marca(c, "gemini", 3.0, 0.76, 0.085); marca(c, "okx", 2.72, 0.27, 0.065); marca(c, "velo", 2.3, 0.53, 0.07, { tinta: PRETO }); marca(c, "dell", 3.08, 0.51, 0.05, { tinta: PRETO });
      marca(c, "mastercard", 3.05, 0.27, 0.075); marca(c, "dropbox", 4.15, 0.72, 0.05, { tinta: PRETO }); marca(c, "dpworld", 1.72, 0.48, 0.035, { tinta: PRETO }); marca(c, "allwyn", 2.3, 0.86, 0.04);
    });
    vista(ctx, "T", (c) => {
      ret(c, 1.8, -0.3, 3.9, 0.3, PRETO); poli(c, [[1.8, 0.3], [1.8, -0.3], [1.5, -0.1], [1.5, 0.1]], PRETO);
      asasT(c, PAP, PAP, PAP); ret(c, 4.3, -0.62, 4.45, 0.62, PRETO);
      const f = { giro: DE_FRENTE, tinta: PRETO };
      marca(c, "dhl", 4.12, 0, 0.1, { giro: DE_FRENTE }); marca(c, "dell", 0.72, 0, 0.05, f); marca(c, "dhl", 0.42, 0, 0.05, { giro: DE_FRENTE }); marca(c, "gemini", 2.9, 0, 0.09, { giro: DE_FRENTE }); marca(c, "okx", 1.2, 0, 0.05, f);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 1.1, PAP); ret(c, -0.55, 0, 0.55, 0.15, PRETO); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.1, PAP); ret(c, -0.5, 0.3, 0.5, 0.62, PRETO); marca(c, "dhl", 0, 0.8, 0.12); });
  },
};

// Ferrari SF-26 (as fotos oficiais do lançamento, ver halo-referencias.md): vermelho, os ombros da tampa brancos com o redondo da HP, o branco envolvendo o
// cockpit; assoalho, parte de baixo das caixas e as duas asas pretos; o bico leva a fileira de patrocinadores, lida por quem vem de frente.
DESENHOS.ferrari = {
  numero: "#ffffff",
  carbono: 1,
  numPos: [3.42, 0.62, 9, 9], // o número na barbatana, branco sobre o vermelho; a asa traseira não tem número
  pintar(ctx) {
    const VERM = "#b90d16", ESCURO = "#8e0a12", BRANCO = "#ecebe6", PRETO = "#101113";
    base(ctx, VERM);
    lados(ctx, (c) => {
      // o branco dos ombros: sobe em curva até a barbatana, que continua vermelha
      c.beginPath(); c.moveTo(2.2, 0.6); c.lineTo(2.2, 1.1); c.lineTo(3.3, 1.1); c.lineTo(3.3, 0.8); c.quadraticCurveTo(3.14, 0.54, 2.8, 0.5); c.quadraticCurveTo(2.45, 0.49, 2.2, 0.56); c.closePath(); c.fillStyle = BRANCO; c.fill();
      // a sombra pintada na barriga das caixas laterais, que dá volume sem custar nada
      c.fillStyle = degrade(c, 0, 0.5, 0, 0.1, [[0, "rgba(60,0,4,0)"], [1, "rgba(60,0,4,0.42)"]]); c.fillRect(1.1, 0.1, 2.8, 0.4);
      // o preto de baixo: o assoalho e a parte de baixo das caixas, subindo para trás
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 0.09); c.lineTo(2.1, 0.09); c.quadraticCurveTo(2.7, 0.14, 3.15, 0.2); c.quadraticCurveTo(3.55, 0.24, 3.8, 0.34); c.lineTo(4.45, 0.34); c.lineTo(4.45, 0); c.closePath(); c.fillStyle = PRETO; c.fill();
      // a asa dianteira preta e a traseira preta
      poli(c, [[0, 0], [0.62, 0], [0.62, 0.17], [0.34, 0.2], [0, 0.2]], PRETO);
      ret(c, 3.82, 0.3, 4.45, 1.1, PRETO);
      // as marcas, cada uma onde está no carro de verdade
      marca(c, "hp", 2.86, 0.61, 0.17);
      marca(c, "ibm", 2.56, 0.56, 0.048, { tinta: PRETO, fundo: BRANCO });
      marca(c, "zyn", 2.3, 0.63, 0.05, { tinta: PRETO });
      marca(c, "shell", 2.62, 0.3, 0.2);
      marca(c, "ceva", 2.98, 0.3, 0.075, { tinta: "#ffffff" });
      marca(c, "unicredit", 3.08, 0.44, 0.055, { tinta: "#ffffff" });
      marca(c, "richardmille", 1.42, 0.46, 0.036, { tinta: "#ffffff" });
      logo(c, "ferrari", 1.66, 0.42, 1.8, 0.56);
      marca(c, "ambipar", 1.9, 0.135, 0.045, { tinta: "#ffffff" });
      marca(c, "unicredit", 0.42, 0.14, 0.035, { tinta: "#ffffff" });
      marca(c, "bitdefender", 0.72, 0.31, 0.03, { tinta: "#ffffff" });
      marca(c, "vpower", 4.15, 0.74, 0.06, { tinta: "#ffffff" });
      marca(c, "peroni", 4.15, 0.655, 0.045, { tinta: "#ffffff" });
    });
    vista(ctx, "T", (c) => {
      // a pele do meio: branca em volta do cockpit e afinando até a barbatana
      const meio = [[1.34, 0.05], [1.6, 0.24], [2.1, 0.38], [2.6, 0.33], [3.0, 0.19], [3.32, 0.02]];
      c.beginPath(); c.moveTo(meio[0][0], meio[0][1]); for (let i = 1; i < meio.length; i++) { const [a0, b0] = meio[i - 1], [a1, b1] = meio[i]; c.quadraticCurveTo(a0, b0, (a0 + a1) / 2, (b0 + b1) / 2); } c.lineTo(3.32, 0.02);
      c.lineTo(3.32, -0.02); for (let i = meio.length - 2; i >= 0; i--) { const [a0, b0] = meio[i + 1], [a1, b1] = meio[i]; c.quadraticCurveTo(a0, -b0, (a0 + a1) / 2, -(b0 + b1) / 2); } c.lineTo(1.34, -0.05); c.closePath(); c.fillStyle = BRANCO; c.fill();
      // as duas asas pretas; o bico vermelho passa por cima da asa dianteira
      ret(c, 0, -0.82, 0.66, 0.82, PRETO); poli(c, [[0, -0.09], [0.66, -0.14], [0.66, 0.14], [0, 0.09]], VERM);
      ret(c, 3.82, -0.62, 4.45, 0.62, PRETO);
      // a fileira do bico, lida por quem vem de frente
      const f = { giro: DE_FRENTE, tinta: "#ffffff" };
      marca(c, "unicredit", 0.18, 0, 0.042, f); marca(c, "genesys", 0.3, 0, 0.034, f); marca(c, "pirelli", 0.4, 0, 0.038, f);
      marca(c, "whoop", 0.5, 0, 0.038, f); marca(c, "bingx", 0.6, 0, 0.052, f); marca(c, "ibm", 0.71, 0, 0.056, { giro: DE_FRENTE, tinta: "#ffffff", fundo: VERM });
      marca(c, "shell", 0.85, 0, 0.13, { giro: DE_FRENTE }); marca(c, "zyn", 1.17, 0, 0.06, f); marca(c, "bitdefender", 1.29, 0, 0.032, f);
      // a asa dianteira
      for (const l of [-1, 1]) { marca(c, "rayban", 0.2, l * 0.45, 0.07, f); marca(c, "vpower", 0.36, l * 0.42, 0.038, f); marca(c, "hp", 0.5, l * 0.32, 0.075, { giro: DE_FRENTE }); }
      // o redondo grande na tampa e a marca dos ombros
      marca(c, "hp", 2.96, 0, 0.17, { giro: DE_FRENTE });
      for (const l of [-1, 1]) { marca(c, "zyn", 2.12, l * 0.3, 0.035, { giro: DE_FRENTE, tinta: PRETO }); marca(c, "ibm", 2.48, l * 0.25, 0.04, { giro: DE_FRENTE, tinta: PRETO, fundo: BRANCO }); }
      // a asa traseira: dois redondos da HP
      for (const l of [-1, 1]) marca(c, "hp", 4.18, l * 0.3, 0.14, { giro: DE_FRENTE });
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 1.1, ESCURO); ret(c, -0.8, 0, 0.8, 0.24, PRETO); ret(c, -0.16, 0.06, 0.16, 0.5, VERM); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.1, PRETO); ret(c, -0.3, 0.36, 0.3, 0.72, VERM); });
  },
};

// Mercedes W17: preto, as lâminas prateadas na caixa lateral, o filete verde-água e as marcas em branco
DESENHOS.mercedes = {
  numero: "#00d7b6", carbono: 1, numPos: [3.42, 0.68, 9, 9],
  pintar(ctx) {
    const PRETO = "#0b0c0f", PRATA = "#c8cdd3", VERDE = "#00bda9", BRANCO = "#eceef0";
    base(ctx, PRETO);
    lados(ctx, (c) => {
      // as lâminas: um feixe em diagonal saindo do meio da caixa
      for (let i = 0; i < 5; i++) { const s = 2.36 + i * 0.2, t = 0.2 - i * 0.012; poli(c, [[s, 0.42], [s + t, 0.42], [s + t + 0.14, 0.58], [s + 0.14, 0.58]], i < 2 ? BRANCO : PRATA); }
      poli(c, [[2.05, 0.4], [3.35, 0.4], [3.35, 0.415], [2.05, 0.415]], VERDE);
      poli(c, [[0, 0.25], [1.05, 0.25], [0.95, 0.4], [0, 0.4]], PRATA); poli(c, [[0, 0.4], [0.95, 0.4], [0.95, 0.415], [0, 0.415]], VERDE);
      marca(c, "petronas", 2.72, 0.32, 0.09); marca(c, "microsoft", 2.82, 0.84, 0.05); marca(c, "solera", 3.18, 0.71, 0.036); marca(c, "teamviewer", 2.7, 0.64, 0.036); marca(c, "amg", 1.55, 0.5, 0.05, { tinta: PRATA });
      marca(c, "signify", 1.95, 0.2, 0.04); marca(c, "iwc", 0.42, 0.21, 0.05); marca(c, "snapdragon", 4.15, 0.73, 0.036); marca(c, "crowdstrike", 4.15, 0.64, 0.03); marca(c, "ineos", 1.3, 0.42, 0.036);
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.1, -0.19, 1.18, 0.19, VERDE); ret(c, 0.1, -0.16, 1.18, 0.16, "#d9dde2"); ret(c, 1.3, -0.28, 2.08, 0.28, PRATA); ret(c, 2.3, -0.3, 4, 0.3, "#121418");
      asasT(c, PRETO, "#181a1f", "#d9dde2");
      const f = { giro: DE_FRENTE, tinta: PRETO };
      marca(c, "petronas", 4.12, 0, 0.09, { giro: DE_FRENTE }); marca(c, "petronas", 0.84, 0, 0.04, f); marca(c, "ineos", 0.56, 0, 0.04, f);
      for (const l of [-1, 1]) marca(c, "teamviewer", 0.24, l * 0.47, 0.045, { giro: DE_FRENTE });
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 1.1, PRETO); ret(c, -0.18, 0.2, 0.18, 0.45, PRATA); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.1, "#16181c"); marca(c, "petronas", 0, 0.78, 0.09); });
  },
};

// Red Bull RB22: azul-marinho fosco, os touros vermelhos na tampa, a entrada de ar amarela e o bico com amarelo e vermelho
DESENHOS["red-bull"] = {
  numero: "#ffffff", carbono: 1, numPos: [3.5, 0.62, 9, 9],
  pintar(ctx) {
    const AZUL = "#141c42", ESC = "#0d1330", VERM = "#d3112f", AMAR = "#f7b500";
    base(ctx, AZUL);
    lados(ctx, (c) => {
      poli(c, [[2.2, 0.72], [2.2, 1.1], [2.66, 1.1], [2.66, 0.72]], AMAR); // a entrada de ar
      baixo(c, ESC);
      poli(c, [[0.04, 0.12], [0.62, 0.12], [0.5, 0.3], [0.04, 0.2]], AMAR); poli(c, [[0.28, 0.12], [0.9, 0.12], [0.74, 0.36], [0.28, 0.3]], VERM);
      ret(c, 3.86, 0.3, 4.45, 1.1, ESC);
      touros(c, 2.68, 0.66, 3.5, 0.98);
      marca(c, "redbull", 3.02, 0.56, 0.075, { tinta: VERM }); marca(c, "oracle", 2.78, 0.31, 0.105); marca(c, "rokt", 2.3, 0.62, 0.035); marca(c, "mobil1", 4.15, 0.72, 0.06); marca(c, "mobil1", 1.52, 0.42, 0.036);
    });
    vista(ctx, "T", (c) => {
      ret(c, 2.3, -0.3, 2.7, 0.3, AMAR); ret(c, 2.7, -0.1, 3.5, 0.1, VERM);
      asasT(c, ESC, ESC, AZUL); poli(c, [[0, -0.09], [0.32, -0.12], [0.32, 0.12], [0, 0.09]], AMAR); poli(c, [[0.32, -0.12], [0.7, -0.14], [0.7, 0.14], [0.32, 0.12]], VERM);
      for (const l of [-1, 1]) marca(c, "redbull", 0.3, l * 0.45, 0.05, { giro: DE_FRENTE, tinta: "#fff" });
      touros(c, 3.94, -0.3, 4.4, 0.3);
      textoTopo(c, "Red Bull", 1.6, 0, 0.11, "#e51a3a", { larg: 0.26, borda: "#ffffff" });
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 1.1, AZUL); ret(c, -0.2, 0.1, 0.2, 0.45, VERM); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.1, AZUL); touros(c, -0.45, 0.45, 0.45, 0.8); });
  },
};

// Racing Bulls: azul-marinho em cima e embaixo, a grande cunha branca com VISA, os touros e a entrada de ar amarela
DESENHOS["racing-bulls"] = {
  numero: "#d3112f", carbono: 1, numPos: [3.5, 0.72, 9, 9],
  pintar(ctx) {
    const BRANCO = "#eff1f6", MAR = "#14224f", AMAR = "#f9b000", VERM = "#d3112f", LARANJA = "#ff6a13";
    base(ctx, MAR);
    lados(ctx, (c) => {
      // a cunha branca, larga atrás e fina até o bico
      c.beginPath(); c.moveTo(3.55, 0.16); c.lineTo(3.1, 0.54); c.quadraticCurveTo(2.0, 0.64, 1.1, 0.5); c.lineTo(0.5, 0.26); c.lineTo(1.05, 0.28); c.quadraticCurveTo(2.0, 0.42, 2.3, 0.2); c.closePath(); c.fillStyle = BRANCO; c.fill();
      ret(c, 1.3, 0.45, 2.1, 0.6, BRANCO);
      poli(c, [[2.2, 0.72], [2.2, 1.1], [2.66, 1.1], [2.66, 0.72]], AMAR);
      baixo(c, MAR);
      poli(c, [[0.04, 0.12], [0.5, 0.12], [0.42, 0.28], [0.04, 0.2]], LARANJA); ret(c, 0.05, 0, 0.6, 0.16, BRANCO);
      ret(c, 3.86, 0.3, 4.45, 1.1, "#0e1021");
      touros(c, 2.68, 0.64, 3.46, 0.96);
      marca(c, "visa", 2.86, 0.31, 0.14, { tinta: MAR }); marca(c, "redbull", 3.05, 0.61, 0.055, { tinta: VERM }); marca(c, "cashapp", 2.42, 0.57, 0.045, { tinta: MAR }); marca(c, "hugo", 1.75, 0.53, 0.045, { tinta: VERM });
      marca(c, "ford", 3.5, 0.34, 0.075); marca(c, "cashapp", 0.33, 0.08, 0.042, { tinta: MAR }); marca(c, "visa", 4.15, 0.72, 0.055, { tinta: BRANCO });
    });
    vista(ctx, "T", (c) => {
      ret(c, 2.3, -0.3, 2.72, 0.3, AMAR); ret(c, 2.72, -0.3, 4, 0.3, MAR); ret(c, 1.3, -0.25, 2.1, 0.25, BRANCO);
      asasT(c, MAR, "#0e1021", MAR); poli(c, [[0, -0.09], [0.35, -0.12], [0.35, 0.12], [0, 0.09]], LARANJA);
      const f = { giro: DE_FRENTE, tinta: "#fff" }; marca(c, "visa", 0.86, 0, 0.09, f); marca(c, "hugo", 0.62, 0, 0.04, f); marca(c, "visa", 4.15, 0, 0.1, f);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 1.1, MAR); ret(c, -0.15, 0.1, 0.15, 0.45, LARANJA); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.1, MAR); ret(c, -0.5, 0.45, 0.5, 0.75, BRANCO); });
  },
};

// Aston Martin AMR26: verde de corrida bem escuro, filete limão e as marcas em branco
DESENHOS["aston-martin"] = {
  numero: "#d7e600", carbono: 1, numPos: [3.5, 0.66, 9, 9],
  pintar(ctx) {
    const VERDE = "#0a4a3f", ESC = "#062d27", LIMAO = "#cedc00", PRETO = "#0a1210";
    base(ctx, VERDE);
    lados(ctx, (c) => {
      c.beginPath(); c.moveTo(2.2, 0.66); c.lineTo(2.2, 1.1); c.lineTo(3.9, 1.1); c.lineTo(3.9, 0.56); c.quadraticCurveTo(3, 0.72, 2.2, 0.66); c.closePath(); c.fillStyle = ESC; c.fill();
      c.fillStyle = LIMAO; c.fillRect(2.05, 0.405, 1.5, 0.012);
      baixo(c, PRETO);
      poli(c, [[0, 0.18], [1.1, 0.37], [1.1, 0.385], [0, 0.195]], LIMAO);
      ret(c, 3.86, 0.3, 4.45, 1.1, PRETO);
      marca(c, "aramco", 2.8, 0.31, 0.125); marca(c, "astonmartin", 3.2, 0.74, 0.042); marca(c, "maaden", 3.1, 0.64, 0.042); marca(c, "boss", 2.15, 0.52, 0.042); marca(c, "valvoline", 3.2, 0.17, 0.036); marca(c, "honda", 3.32, 0.44, 0.036);
      marca(c, "coinbase", 4.15, 0.72, 0.065); marca(c, "cognizant", 1.72, 0.22, 0.036, { tinta: LIMAO }); marca(c, "coreweave", 2.56, 0.82, 0.03);
    });
    vista(ctx, "T", (c) => {
      ret(c, 2.3, -0.3, 4, 0.3, ESC); ret(c, 2.3, -0.012, 3.9, 0.012, LIMAO); ret(c, 0.15, -0.012, 1.1, 0.012, LIMAO);
      asasT(c, ESC, PRETO, VERDE);
      const f = { giro: DE_FRENTE, tinta: "#fff" }; marca(c, "aramco", 0.72, 0, 0.08, f); marca(c, "coinbase", 4.15, 0, 0.08, f); marca(c, "aramco", 2.9, 0, 0.09, f);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 1.1, VERDE); ret(c, -0.75, 0, 0.75, 0.1, ESC); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.1, PRETO); ret(c, -0.45, 0.45, 0.45, 0.75, VERDE); });
  },
};

// Williams FW48: azul-royal escuro em cima, azul-claro no meio da caixa, a cunha branca com KOMATSU e a asa traseira branca e azul
DESENHOS.williams = {
  numero: "#ffffff", carbono: 1, numPos: [3.5, 0.58, 9, 9],
  pintar(ctx) {
    const ROYAL = "#0f2f8f", ESC = "#08184f", CEU = "#3d7be0", BRANCO = "#f2f5fb";
    base(ctx, ROYAL);
    lados(ctx, (c) => {
      c.beginPath(); c.moveTo(1.1, 0.5); c.quadraticCurveTo(2.2, 0.56, 3.1, 0.46); c.lineTo(2.55, 0.34); c.lineTo(1.1, 0.34); c.closePath(); c.fillStyle = CEU; c.fill();
      c.beginPath(); c.moveTo(3.6, 0.14); c.lineTo(3.48, 0.44); c.lineTo(3.1, 0.46); c.lineTo(2.4, 0.3); c.lineTo(2.6, 0.14); c.closePath(); c.fillStyle = BRANCO; c.fill();
      baixo(c, ESC);
      poli(c, [[2.3, 0.72], [2.3, 0.98], [2.66, 0.98], [2.66, 0.72]], "#101114");
      ret(c, 3.86, 0.62, 4.45, 1.1, ESC); ret(c, 3.86, 0.3, 4.45, 0.62, BRANCO);
      marca(c, "komatsu", 3.1, 0.28, 0.09, { tinta: ROYAL }); marca(c, "atlassian", 2.92, 0.62, 0.065); marca(c, "barclays", 2.22, 0.43, 0.042); marca(c, "duracell", 2.48, 0.85, 0.04); marca(c, "gulf", 3.55, 0.3, 0.09);
      marca(c, "komatsu", 4.15, 0.73, 0.055); marca(c, "gulf", 4.15, 0.48, 0.1); marca(c, "keeper", 1.75, 0.22, 0.034);
    });
    vista(ctx, "T", (c) => {
      ret(c, 2.3, -0.3, 4, 0.3, ESC);
      asasT(c, ESC, ESC, ROYAL);
      const f = { giro: DE_FRENTE, tinta: "#fff" }; marca(c, "komatsu", 0.72, 0, 0.05, f); marca(c, "atlassian", 4.15, 0, 0.08, f); marca(c, "atlassian", 2.9, 0, 0.06, f); marca(c, "barclays", 0.5, 0, 0.038, f);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 1.1, ROYAL); ret(c, -0.55, 0, 0.55, 0.12, ESC); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.1, ESC); ret(c, -0.45, 0.3, 0.45, 0.6, BRANCO); });
  },
};

// Audi R26: titânio na frente, preto atrás e o bloco vermelho de corte reto na caixa lateral
DESENHOS.audi = {
  numero: "#ffffff", carbono: 1, numPos: [3.55, 0.68, 9, 9],
  pintar(ctx) {
    const PRATA = "#aeb3b8", ESC = "#3a3e45", VERM = "#e8391a", PRETO = "#0d0e11";
    base(ctx, PRATA);
    lados(ctx, (c) => {
      c.beginPath(); c.moveTo(2.42, 1.1); c.lineTo(3.9, 1.1); c.lineTo(3.9, 0.1); c.lineTo(3.3, 0.1); c.lineTo(3.3, 0.6); c.lineTo(2.7, 0.62); c.lineTo(2.42, 0.6); c.closePath(); c.fillStyle = PRETO; c.fill();
      poli(c, [[2.58, 0.14], [3.3, 0.14], [3.3, 0.6], [2.86, 0.6]], VERM); // o bloco vermelho
      baixo(c, PRETO);
      poli(c, [[0, 0], [0.9, 0], [0.8, 0.26], [0, 0.26]], ESC);
      ret(c, 3.86, 0.3, 4.45, 1.1, PRETO);
      marca(c, "aneis", 3.0, 0.76, 0.09); marca(c, "revolut", 2.58, 0.52, 0.058, { tinta: PRETO }); marca(c, "nexo", 1.42, 0.43, 0.04, { tinta: PRETO }); marca(c, "ninjaone", 1.75, 0.13, 0.036, { tinta: PRETO }); marca(c, "visitqatar", 0.42, 0.13, 0.036);
    });
    vista(ctx, "T", (c) => {
      ret(c, 2.3, -0.3, 4, 0.3, PRETO); c.fillStyle = VERM; c.fillRect(2.7, -0.3, 0.6, 0.08); c.fillRect(2.7, 0.22, 0.6, 0.08);
      asasT(c, ESC, PRETO, PRATA);
      const f = { giro: DE_FRENTE, tinta: PRETO }; marca(c, "aneis", 0.72, 0, 0.055, { giro: DE_FRENTE, tinta: VERM }); marca(c, "revolut", 0.5, 0, 0.05, f); marca(c, "aneis", 4.15, 0, 0.09, { giro: DE_FRENTE, tinta: VERM }); marca(c, "aneis", 2.9, 0, 0.09, { giro: DE_FRENTE, tinta: VERM });
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 1.1, PRATA); ret(c, -0.55, 0, 0.55, 0.12, ESC); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.1, PRETO); ret(c, -0.45, 0.45, 0.45, 0.75, VERM); });
  },
};

// Alpine A526: azul-marinho com degradê azul, rosa na asa dianteira, no bico, atrás da caixa e na asa traseira
DESENHOS.alpine = {
  numero: "#ffffff", carbono: 2, numPos: [3.45, 0.68, 9, 9],
  pintar(ctx) {
    const AZUL = "#0c1f5c", ESC = "#071338", ROSA = "#ff6fb1", CLARO = "#2a6fd6";
    base(ctx, AZUL);
    lados(ctx, (c) => {
      c.fillStyle = degrade(c, 1.4, 0, 3.2, 0, [[0, "rgba(42,111,214,0)"], [0.5, CLARO], [1, "rgba(42,111,214,0)"]]); c.fillRect(1.4, 0.14, 1.8, 0.4);
      poli(c, [[3.2, 0.44], [3.72, 0.3], [3.86, 0.3], [3.86, 0.62], [3.4, 0.64]], ROSA); // o bloco rosa atrás da caixa
      c.beginPath(); c.moveTo(0, 0.1); c.lineTo(1.05, 0.1); c.lineTo(0.85, 0.32); c.lineTo(0, 0.3); c.closePath(); c.fillStyle = ROSA; c.fill();
      baixo(c, ESC);
      ret(c, 3.86, 0.62, 4.45, 1.1, ROSA); ret(c, 3.86, 0.3, 4.45, 0.62, ESC);
      marca(c, "bwt", 2.72, 0.33, 0.13); marca(c, "eni", 3.02, 0.72, 0.075); marca(c, "msc", 2.1, 0.5, 0.05); marca(c, "alpine", 3.55, 0.47, 0.045, { tinta: AZUL }); marca(c, "eni", 4.15, 0.72, 0.08, { tinta: ESC });
    });
    vista(ctx, "T", (c) => {
      ret(c, 2.3, -0.3, 4, 0.3, AZUL); ret(c, 3, -0.3, 4, -0.14, ROSA); ret(c, 3, 0.14, 4, 0.3, ROSA);
      asasT(c, ROSA, ESC, ROSA); ret(c, 1, -0.17, 1.3, 0.17, AZUL);
      const f = { giro: DE_FRENTE, tinta: AZUL }; marca(c, "bwt", 0.7, 0, 0.08, f); marca(c, "alpine", 0.45, 0, 0.04, f); marca(c, "bwt", 4.15, 0, 0.1, { giro: DE_FRENTE }); marca(c, "eni", 2.9, 0, 0.07, { giro: DE_FRENTE });
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 1.1, AZUL); ret(c, -0.8, 0, 0.8, 0.14, ROSA); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.1, ESC); ret(c, -0.45, 0.45, 0.45, 0.75, ROSA); });
  },
};

// Haas VF-26: branco, o GR preto e vermelho na tampa, filete vermelho, barriga preta com HAAS na caixa e bico com vermelho
DESENHOS.haas = {
  numero: "#111111", carbono: 2, numPos: [3.55, 0.6, 9, 9],
  pintar(ctx) {
    const BRANCO = "#f0f0ee", VERM = "#e10a2b", PRETO = "#141416";
    base(ctx, BRANCO);
    lados(ctx, (c) => {
      c.fillStyle = VERM; c.beginPath(); c.moveTo(2.15, 0.54); c.lineTo(3.5, 0.54); c.lineTo(3.5, 0.5); c.lineTo(2.15, 0.5); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(1.2, 0.09); c.lineTo(1.2, 0.2); c.lineTo(2.25, 0.2); c.lineTo(2.3, 0.14); c.lineTo(3.86, 0.14); c.lineTo(3.86, 0); c.lineTo(1.2, 0); c.closePath(); c.fillStyle = PRETO; c.fill();
      baixo(c, PRETO);
      poli(c, [[0.04, 0.1], [1.05, 0.1], [0.95, 0.28], [0.04, 0.2]], VERM);
      poli(c, [[2.2, 0.72], [2.2, 1.1], [2.56, 1.1], [2.56, 0.72]], VERM);
      ret(c, 3.86, 0.3, 4.45, 0.46, PRETO); ret(c, 3.86, 0.86, 4.45, 1.1, VERM);
      marca(c, "gr", 3.02, 0.65, 0.17); marca(c, "haas", 2.82, 0.33, 0.14); marca(c, "zoomex", 2.05, 0.16, 0.036); marca(c, "toyota", 1.6, 0.46, 0.036, { tinta: PRETO }); marca(c, "toyota", 4.15, 0.64, 0.045, { tinta: PRETO });
    });
    vista(ctx, "T", (c) => {
      ret(c, 2.3, -0.3, 2.62, 0.3, VERM);
      asasT(c, VERM, PRETO, BRANCO);
      const f = { giro: DE_FRENTE, tinta: PRETO }; marca(c, "haas", 0.72, 0, 0.055, f); marca(c, "toyota", 0.5, 0, 0.03, f); marca(c, "gr", 3.0, 0, 0.13, { giro: DE_FRENTE }); marca(c, "toyota", 4.15, 0, 0.07, { giro: DE_FRENTE, tinta: "#fff" });
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 1.1, BRANCO); ret(c, -0.8, 0, 0.8, 0.12, VERM); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.1, PRETO); ret(c, -0.45, 0.45, 0.45, 0.75, VERM); });
  },
};

// Cadillac: preto de um lado e branco do outro (o carro é assimétrico), com a cunha da cor oposta com TWG e o detalhe verde-claro
DESENHOS.cadillac = {
  numero: "#ffffff", carbono: 1, numPos: [3.5, 0.68, 9, 9],
  pintar(ctx) {
    const BRANCO = "#eef0f2", PRETO = "#0e0f12";
    base(ctx, PRETO);
    lados(ctx, (c, lado) => {
      const preto = lado > 0, fundo = preto ? PRETO : BRANCO, tinta = preto ? BRANCO : PRETO;
      ret(c, 0.7, 0.1, 3.86, 1.1, fundo);
      // a cunha, que afina para a frente; a letra vai na cor do fundo
      c.beginPath(); c.moveTo(3.5, 0.12); c.lineTo(3.3, 0.5); c.quadraticCurveTo(2.4, 0.52, 1.5, 0.36); c.quadraticCurveTo(2.4, 0.3, 2.5, 0.12); c.closePath(); c.fillStyle = tinta; c.fill();
      baixo(c, PRETO);
      ret(c, 3.86, 0.3, 4.45, 1.1, PRETO);
      marca(c, "twg", 2.92, 0.31, 0.14, { tinta: fundo }); marca(c, "claro", 1.8, 0.3, 0.05); marca(c, "cadillac", 1.55, 0.52, 0.055, { tinta }); marca(c, "ifs", 4.15, 0.72, 0.075); marca(c, "cadillac", 3.1, 0.72, 0.05, { tinta });
    });
    vista(ctx, "T", (c) => {
      ret(c, 0.9, -0.8, 3.9, 0, BRANCO); ret(c, 0.9, 0, 3.9, 0.8, PRETO); // meio a meio, como dos lados
      asasT(c, PRETO, PRETO, PRETO);
      const f = { giro: DE_FRENTE, tinta: "#fff" }; marca(c, "twg", 0.72, 0, 0.06, f); marca(c, "cadillac", 0.48, 0, 0.04, f); marca(c, "ifs", 4.15, 0, 0.1, f);
    });
    vista(ctx, "F", (c) => { ret(c, -0.8, 0, 0.8, 1.1, PRETO); });
    vista(ctx, "R", (c) => { ret(c, -0.8, 0, 0.8, 1.1, PRETO); });
  },
};

// quais pinturas usam qual equipe: a chave é o `equipe` de MODS.pintura (pistas.js)
export const temDesenho = (equipe) => !!DESENHOS[equipe];
export const corDoNumero = (equipe) => DESENHOS[equipe]?.numero || "#ffffff";
export const numPosDe = (equipe) => DESENHOS[equipe]?.numPos || null;
// 1: as peças de lado da asa dianteira e a suspensão de trás de carbono; 2: só a suspensão (a asa da equipe é colorida)
export const carbonoDe = (equipe) => DESENHOS[equipe]?.carbono || 0;

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
export function folhaDaEquipe(equipe, alta = false) {
  if (!DESENHOS[equipe]) return null;
  const chave = equipe + (alta ? "|2" : "|1");
  if (FOLHAS.has(chave)) return FOLHAS.get(chave);
  ESC = alta ? 2 : 1;
  const cv = document.createElement("canvas"); cv.width = FW * ESC; cv.height = FH * ESC;
  const ctx = cv.getContext("2d"); DESENHOS[equipe].pintar(ctx);
  lados(ctx, (c) => ret(c, 2.1, 0.39, 2.35, 0.46, CARBONO)); // a entrada de ar das caixas laterais é escura em qualquer pintura
  ESC = 1;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = alta ? 8 : 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.userData.cv = cv; FOLHAS.set(chave, t); return t;
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
uniform float carb;    // ver carbonoDe
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
  // (de cima a asa continua com a pintura da folha, onde ficam as marcas)
  c = mix(c, vec3(0.012), max(step(0.5, carb) * step(carb, 1.5) * step(0.24, abs(p.x)) * step(p.z, 0.68) * (1.0 - a.y), step(0.5, carb) * step(0.42, abs(p.x)) * step(3.35, p.z) * step(p.y, 0.62)));
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
const VERNIZ_ASPERO = 0.64;    // a rugosidade da pintura de dia vira (no máximo) isso: acetinado
const VERNIZ_CAMADA = 0.14;    // a força da camada de verniz (baixa)
const VERNIZ_CAMADA_ASP = 0.5;// a rugosidade dela: alta, o reflexo do céu sai macio e não espelhado
const VERNIZ_CEU = 1.2;        // quanto a camada amplia o reflexo do céu
// (os tetos ficam bem abaixo do limiar do bloom: com 0,22 + 0,85 os pontinhos de brilho do sol passavam dele e o bloom os espalhava em
// "estrelas" piscando nos carros)
const VERNIZ_TETO_SOL = 0.03;  // o brilho direto do sol na camada não passa disso
const VERNIZ_TETO_BASE = 0.14;  // e o da tinta por baixo, de dia
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
export const FAIXAS = { macio: "#e8202a", medio: "#ffd100", duro: "#f4f4f4", chuva: "#1e7fd6", intermediario: "#39c85a" };
// Os secos são slicks; o de chuva recebe canais no piso. O padrão usa a posição local, então gira junto com a roda.
export const PNEU_VERT_DECL = "attribute vec2 aro;\nattribute float pneuLat;\nvarying vec2 vAro;\nvarying float vPneuLat;\n";
export const PNEU_VERT_MAIN = "\nvAro = aro; vPneuLat = pneuLat;";
export const PNEU_FRAG_DECL = "uniform vec3 faixa;\nuniform float faixaOn;\nuniform float pneuChuva;\nuniform float pneuTom;\nuniform sampler2D pneuLetras;\nvarying vec2 vAro;\nvarying float vPneuLat;\n";
// As letras da lateral do pneu, uma textura só para todos os carros: vermelho = a marca (branca), verde = o nome do composto (na cor da faixa).
let LETRAS_PNEU = null;
export function texturaDasLetrasDoPneu() {
  if (LETRAS_PNEU) return LETRAS_PNEU;
  const cv = document.createElement("canvas"); cv.width = 2048; cv.height = 96; const x = cv.getContext("2d");
  x.fillStyle = "#000"; x.fillRect(0, 0, 2048, 96); x.textBaseline = "middle"; x.textAlign = "center";
  for (const o of [0, 1024]) {
    x.font = "italic 900 74px Arial, sans-serif"; x.fillStyle = "#ff0000"; x.fillText("PIRELLI", o + 300, 50);
    x.font = "italic 900 80px Arial, sans-serif"; x.fillStyle = "#00ff00"; x.fillText("P ZERO", o + 760, 50);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  LETRAS_PNEU = t; return t;
}
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
  // A lateral: borracha mais fosca e escura, com as letras (lidas certo dos dois lados do carro).
  if (abs(vPneuLat) > 0.55 && rr > 0.8 && rr < 0.98) {
    vec2 uvL = vec2(-(atan(vAro.y, vAro.x) / 6.28318 + 0.5) * sign(vPneuLat), 1.0 - (rr - 0.815) / 0.135);
    if (uvL.y > 0.0 && uvL.y < 1.0) {
      vec2 l = texture2D(pneuLetras, uvL).rg;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86), l.r * 0.9);
      diffuseColor.rgb = mix(diffuseColor.rgb, faixa, l.g * max(faixaOn, 0.0));
    }
  }
}`;
