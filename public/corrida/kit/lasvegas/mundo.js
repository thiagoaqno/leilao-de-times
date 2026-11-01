// Las Vegas — o mundo real: os dados (kit/lasvegas/dados.js, gerados por ferramentas/lasvegas-dados.js a partir do OpenStreetMap e do relevo SRTM/EU-DEM)
// viram funções: a altitude do chão em qualquer ponto (o vale de Las Vegas é quase plano: ~15 m de desnível na volta), a classe de cada pedaço do chão
// (rua, estacionamento, gramado, campo de golfe, lago) e o relevo que pista.js usa (`mundo.relevo`). Peça só desta pista.
import DADOS from "./dados.js";

export const D = DADOS;
export const VK = D.projecao.vk; // unidades de altura por metro de altitude
export const K = D.projecao.k; // unidades do mundo por metro
export const ALT = 1.35; // o exagero vertical dos prédios (a pista do jogo é mais larga que a rua de verdade)
export const NIVEL_DO_MAR = -9999; // (não há mar: pista.js `mundoDe` espera o campo)
export const suave = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export const poligonoDentro = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };

// ---------- a altitude (SRTM de 30 m, bicúbica, em unidades do jogo; zero = a volta mais baixa) ----------
const R = D.relevo, GN = R.n, GP = R.passo * D.projecao.k;
const GRADE = (() => { // o MDE inclui telhados e copas: três passadas de um borrão 5×5 tiram os degraus de prédio que o chão de verdade não tem
  let a = Float32Array.from(R.z, (v) => v / 10);
  const kernel = [1, 4, 6, 4, 1], soma = 16;
  for (let passada = 0; passada < 3; passada++) {
    const b = new Float32Array(a.length), c = new Float32Array(a.length), at = (arr, i, j) => arr[Math.max(0, Math.min(GN - 1, j)) * GN + Math.max(0, Math.min(GN - 1, i))];
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { let s = 0; for (let k = -2; k <= 2; k++) s += at(a, i + k, j) * kernel[k + 2]; b[j * GN + i] = s / soma; }
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { let s = 0; for (let k = -2; k <= 2; k++) s += at(b, i, j + k) * kernel[k + 2]; c[j * GN + i] = s / soma; }
    a = c;
  }
  return a;
})();
const celula = (i, j) => GRADE[Math.max(0, Math.min(GN - 1, j)) * GN + Math.max(0, Math.min(GN - 1, i))];
const cubica = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
export function altitude(x, z) {
  const u = (x - R.x0) / GP, v = (z - R.z0) / GP, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
  const lin = (jj) => cubica(celula(i - 1, jj), celula(i, jj), celula(i + 1, jj), celula(i + 2, jj), fu);
  return (cubica(lin(j - 1), lin(j), lin(j + 1), lin(j + 2), fv) - D.projecao.mn) * VK;
}

// sem água no chão: os lagos (Bellagio, o Mirage, a Treasure Island) são placas de água por cima dele, e a pista nunca está dentro de um
export const fundoLV = () => -9999;
export const aguaLV = () => false;

// ---------- o relevo do chão para pista.js (groundH): a pista no nível dela e o terreno de verdade em volta ----------
// f = { h, lat } do ponto mais perto da pista, idx = o índice dele. Até a calçada vale a altura da pista; depois, a diferença do terreno real em
// relação ao ponto da pista entra aos poucos, e bem longe vale a altitude do mapa. O chão da malha fica sempre abaixo de qualquer trecho da pista.
export function relevoLV(tr) {
  const { pts, n } = tr, L = tr.W / 2 + 26, demPista = new Float32Array(n);
  for (let i = 0; i < n; i++) demPista[i] = altitude(pts[i].x, pts[i].y);
  const desvioPista = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0, w = 0; for (let k = -120; k <= 120; k += 6) { const q = (i + k + n) % n, p = 1 - Math.abs(k) / 126; s += (pts[q].h - demPista[q]) * p; w += p; } desvioPista[i] = s / w; }
  const plano = L + 30, rampa = 260, longe = 700, talude = 0.85, folga = 0.5, margem = 18, alcance = 260, C = 64, hash = new Map();
  pts.forEach((p, i) => { const k = Math.floor(p.x / C) * 100003 + Math.floor(p.y / C); (hash.get(k) || hash.set(k, []).get(k)).push(i); });
  const teto = (x, z) => {
    const r = Math.ceil((L + alcance) / C), cx = Math.floor(x / C), cz = Math.floor(z / C); let m = Infinity;
    for (let a = cx - r; a <= cx + r; a++) for (let b = cz - r; b <= cz + r; b++) for (const j of hash.get(a * 100003 + b) || []) {
      const p = pts[j], dx = p.x - x, dz = p.y - z, d2 = dx * dx + dz * dz; if (d2 > (L + alcance) ** 2) continue;
      const c = p.h - folga + talude * Math.max(0, Math.sqrt(d2) - L - margem); if (c < m) m = c;
    }
    return m;
  };
  const menor = (a, b, k = 14) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k / 4; };
  return (x, z, f, idx, malha = false) => {
    const d = Math.abs(f.lat), dem = altitude(x, z), desvio = desvioPista[idx];
    if (!malha && d < tr.W / 2 + 4) return f.h;
    const a = suave((d - plano) / rampa), b = suave((d - plano - rampa) / longe);
    const g = f.h * (1 - a) + (dem + desvio * (1 - b)) * a;
    return menor(g, teto(x, z));
  };
}

// ---------- a classe do chão: uma grade com o que o OpenStreetMap diz que há em cada pedaço (rua, golfe, gramado, lago) ----------
// 0 deserto/cascalho, 1 rua (asfalto), 2 gramado, 3 campo de golfe, 4 mato, 5 lago
export const CEL_CLASSE = 14;
let _classes = null;
export function classes() {
  if (_classes) return _classes;
  const W = D.projecao.mundo + 2800, N = Math.ceil(W / CEL_CLASSE), x0 = -1400, g = new Uint8Array(N * N);
  const idx = (x, z) => { const i = Math.floor((x - x0) / CEL_CLASSE), j = Math.floor((z - x0) / CEL_CLASSE); return i >= 0 && j >= 0 && i < N && j < N ? j * N + i : -1; };
  const pintaPoli = (P, v, peso = 0) => {
    let a0 = 1e9, b0 = 1e9, a1 = -1e9, b1 = -1e9; for (const [x, z] of P) { a0 = Math.min(a0, x); a1 = Math.max(a1, x); b0 = Math.min(b0, z); b1 = Math.max(b1, z); }
    for (let z = b0; z <= b1; z += CEL_CLASSE) for (let x = a0; x <= a1; x += CEL_CLASSE) if (poligonoDentro(P, x, z)) { const k = idx(x, z); if (k >= 0 && g[k] >= peso) g[k] = v; }
  };
  for (const v of D.verde) { const P = []; for (let k = 1; k < v.length; k += 2) P.push([v[k], v[k + 1]]); pintaPoli(P, v[0] === 3 ? 3 : v[0] === 2 ? 4 : 2); }
  for (const P of D.lagos) pintaPoli(P, 5);
  for (const via of D.vias) { // a linha da rua com a largura de verdade (em unidades)
    const larg = (via[0] * K) / 2; const P = []; for (let k = 2; k < via.length; k += 2) P.push([via[k], via[k + 1]]);
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i], b = P[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), passos = Math.max(1, Math.ceil(l / (CEL_CLASSE * 0.5))), nx = -(b[1] - a[1]) / (l || 1), nz = (b[0] - a[0]) / (l || 1);
      for (let s = 0; s <= passos; s++) { const t = s / passos, px = a[0] + (b[0] - a[0]) * t, pz = a[1] + (b[1] - a[1]) * t; for (let o = -larg; o <= larg; o += CEL_CLASSE * 0.5) { const k = idx(px + nx * o, pz + nz * o); if (k >= 0 && g[k] !== 5) g[k] = 1; } }
    }
  }
  _classes = { g, N, x0, de: (x, z) => { const k = idx(x, z); return k < 0 ? 0 : g[k]; } };
  return _classes;
}

// ---------- lugares: pelo nome (a caixa orientada do OpenStreetMap, de dados.js) ou, se faltar, pela latitude e a longitude ----------
const PJ = D.projecao;
export const geoParaMundo = (lon, lat) => [800 * PJ.scale + (lon - PJ.lon0) * PJ.kx * K - PJ.cx, 800 * PJ.scale - (lat - PJ.lat0) * PJ.ky * K - PJ.cy];
// { cx, cz, ang, w, d, h }: o centro, o rumo do lado maior, as medidas (unidades) e a altura (m)
export function marco(chave, lat, lon, tam = [60, 60, 60]) {
  const m = (D.marcos || []).find((q) => q.chave === chave);
  if (m) return m;
  if (lat == null) return null;
  const [cx, cz] = geoParaMundo(lon, lat);
  return { chave, cx: Math.round(cx), cz: Math.round(cz), ang: 0, w: tam[0], d: tam[1], h: tam[2], fallback: true };
}
