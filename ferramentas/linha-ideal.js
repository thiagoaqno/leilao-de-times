// Calcula a linha ideal de cada pista (offline) e grava public/corrida/linhas-ideais.js.
// Uso: node ferramentas/linha-ideal.js        (rode de novo sempre que mexer na geometria de uma pista)
// A linha é a de menor curvatura que cabe na largura toda: o deslocamento lateral de cada ponto (passo STEP) é ajustado por
// descida de gradiente da soma dos quadrados da segunda diferença, em escalas de 16 a 2 pontos, preso a +-(meia largura - MARGEM).
// Só o deslocamento lateral (em décimos de unidade, inteiro) é guardado, com a assinatura da geometria.
const fs = require("fs"), path = require("path");
const T = require("../public/corrida/pistas.js");
const STEP = 6, MARGEM = 16;
function assinatura(t, pts) { // hash FNV-1a da geometria amostrada e da largura
  let h = 2166136261 >>> 0; const mix = (v) => { h = Math.imul(h ^ (Math.round(v * 10) & 0xffffffff), 16777619) >>> 0; };
  mix(t.width); mix(pts.length); for (const p of pts) { mix(p.x); mix(p.y); } return h.toString(16);
}
function calcular(t) {
  const pts = T.pontos(t, STEP), n = pts.length, max = t.width / 2 - MARGEM;
  const lat = new Float64Array(n), X = new Float64Array(n), Y = new Float64Array(n), D = new Float64Array(n * 2);
  const pos = () => { for (let i = 0; i < n; i++) { X[i] = pts[i].x - pts[i].ty * lat[i]; Y[i] = pts[i].y + pts[i].tx * lat[i]; } };
  for (const [sp, its] of [[16, 1500], [8, 1500], [4, 1500], [2, 1500]]) for (let it = 0; it < its; it++) {
    pos();
    for (let i = 0; i < n; i++) { const a = (i - sp + n) % n, b = (i + sp) % n; D[2 * i] = (X[a] - 2 * X[i] + X[b]); D[2 * i + 1] = (Y[a] - 2 * Y[i] + Y[b]); }
    for (let j = 0; j < n; j++) {
      const a = (j - sp + n) % n, b = (j + sp) % n, nx = -pts[j].ty, ny = pts[j].tx;
      const g = (nx * (D[2 * a] - 2 * D[2 * j] + D[2 * b]) + ny * (D[2 * a + 1] - 2 * D[2 * j + 1] + D[2 * b + 1]));
      lat[j] = Math.max(-max, Math.min(max, lat[j] - 0.05 * g));
    }
  }
  for (let r = 0; r < 3; r++) { const c = Float64Array.from(lat); for (let i = 0; i < n; i++) lat[i] = (c[(i - 1 + n) % n] + 2 * c[i] + c[(i + 1) % n]) / 4; } // tira as quinas
  return { n, sig: assinatura(t, pts), lat: Array.from(lat, (v) => Math.round(v * 10)) };
}
if (require.main === module) {
  const out = {}; for (const id of Object.keys(T.PISTAS)) { out[id] = calcular(T.PISTAS[id]); console.log(id, out[id].n, "max", Math.max(...out[id].lat.map(Math.abs)) / 10); }
  const js = `// GERADO por ferramentas/linha-ideal.js (node ferramentas/linha-ideal.js): não editar. Por pista: deslocamento lateral da linha ideal em décimos de u, um por ponto de 6 u.\n(function (root) {\nconst LINHAS = ${JSON.stringify(out)};\nconst api = { LINHAS, STEP: ${STEP} };\nif (typeof module !== "undefined" && module.exports) module.exports = api; else root.LinhasIdeais = api;\n})(typeof window !== "undefined" ? window : globalThis);\n`;
  fs.writeFileSync(path.join(__dirname, "../public/corrida/linhas-ideais.js"), js);
}
module.exports = { calcular, assinatura, STEP, MARGEM };
