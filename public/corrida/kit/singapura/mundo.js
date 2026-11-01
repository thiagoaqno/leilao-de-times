// Singapura — o mundo real: os dados (kit/singapura/dados.js, gerados por ferramentas/singapura-dados.js a partir do OpenStreetMap) viram
// funções: a distância com sinal até a água (a baía de Marina Bay, o rio Singapura, o canal de Kallang), o que o chão faz perto dela
// (a pista é quase plana: a calçada fica uns metros acima da água, num paredão de concreto) e a cor do terreno por vértice (asfalto das
// ruas, calçada, gramados, mata). Peça só desta pista.
import DADOS from "./dados.js";

export const D = DADOS;
export const K = D.projecao.k; // unidades por metro
export const NIVEL_AGUA = 3; // a altura da água (a calçada da baía fica 1,3 a 6 m acima dela)
const suave = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export { suave };

// lon/lat -> mundo do jogo (a mesma conta do gerador)
export function noMundo(lon, lat) {
  const P = D.projecao;
  return [800 * P.scale + (lon - P.lon0) * P.kx * P.k - P.cx, 800 * P.scale - (lat - P.lat0) * P.ky * P.k - P.cy];
}
export const marco = (nome) => D.marcos[nome];

export function poligonoDentro(P, x, z) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; }
  return c;
}

// ---------- a água: a distância com sinal até a margem de OpenStreetMap (positivo dentro d'água), numa grade bilinear ----------
let sdf = null;
const CEL = 36, MARGEM = 1600;
function montarAgua() {
  const aneis = D.agua || [], mundo = D.projecao.mundo, x0 = -MARGEM, N = Math.ceil((mundo + MARGEM * 2) / CEL) + 1, g = new Float32Array(N * N).fill(-1e4);
  const segs = [];
  for (const P of aneis) { const caixa = [1e9, 1e9, -1e9, -1e9]; for (const [x, z] of P) { caixa[0] = Math.min(caixa[0], x); caixa[1] = Math.min(caixa[1], z); caixa[2] = Math.max(caixa[2], x); caixa[3] = Math.max(caixa[3], z); } segs.push({ P, caixa }); }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = x0 + i * CEL, z = x0 + j * CEL; let d2 = 1e18, dentro = false;
    for (const { P, caixa } of segs) {
      // longe demais do anel (mais de 360) e fora da caixa dele: não pesa
      if (x < caixa[0] - 360 || x > caixa[2] + 360 || z < caixa[1] - 360 || z > caixa[3] + 360) continue;
      for (let a = 0, n = P.length; a < n; a++) {
        const [x1, z1] = P[a], [x2, z2] = P[(a + 1) % n];
        if ((z1 > z) !== (z2 > z) && x < ((x2 - x1) * (z - z1)) / (z2 - z1) + x1) dentro = !dentro;
        const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / l2)), ex = x - x1 - dx * t, ez = z - z1 - dz * t, d = ex * ex + ez * ez;
        if (d < d2) d2 = d;
      }
    }
    g[j * N + i] = d2 > 1e17 ? -1e4 : dentro ? Math.sqrt(d2) : -Math.sqrt(d2);
  }
  sdf = { g, N, x0 };
}
// positivo dentro da água (em unidades do mundo), negativo em terra; contínuo
export function distanciaDaAgua(x, z) {
  if (!sdf) montarAgua();
  const { g, N, x0 } = sdf, u = Math.max(0, Math.min(N - 1.001, (x - x0) / CEL)), v = Math.max(0, Math.min(N - 1.001, (z - x0) / CEL)), i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
  const a = g[j * N + i], b = g[j * N + i + 1], c = g[(j + 1) * N + i], d = g[(j + 1) * N + i + 1];
  return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
}
export const naAgua = (x, z, folga = 0) => distanciaDaAgua(x, z) > folga;

// o chão: a terra segue a altura da pista (quase plana) e, na margem, desce em paredão até o fundo da água
export function alturaDoTerreno(tr, x, z, h) {
  const s = distanciaDaAgua(x, z);
  if (s < -60) return h; // longe da água
  if (s > 0) return Math.max(-40, NIVEL_AGUA - 9 - Math.min(s, 80) * 0.12); // dentro: o fundo
  return Math.min(h, NIVEL_AGUA + 1 + (suave(-s / 22) * (h - NIVEL_AGUA - 1))); // a margem: do nível da calçada, o chão desce nos últimos 22 até a água
}

// a cor do terreno por vértice (x, z, altura, normal y): gramado nos parques, mata, calçada de granito claro perto da pista, o resto cinza-concreto
export function corDoChao(tr) {
  const verde = (D.verde || []).map(([tipo, ...v]) => { const P = []; for (let i = 0; i + 1 < v.length; i += 2) P.push([v[i], v[i + 1]]); const c = [1e9, 1e9, -1e9, -1e9]; for (const [x, z] of P) { c[0] = Math.min(c[0], x); c[1] = Math.min(c[1], z); c[2] = Math.max(c[2], x); c[3] = Math.max(c[3], z); } return { tipo, P, c }; });
  const campos = (D.campos || []).map(([, ...v]) => { const P = []; for (let i = 0; i + 1 < v.length - 1; i += 2) P.push([v[i], v[i + 1]]); return P; });
  const CONCRETO = [0.62, 0.61, 0.6], CALCADA = [0.72, 0.7, 0.66], RELVA = [0.26, 0.42, 0.2], RELVA2 = [0.2, 0.34, 0.17], MATA = [0.13, 0.27, 0.12], AGUA = [0.1, 0.16, 0.2];
  return (x, z, h, ny) => {
    const s = distanciaDaAgua(x, z);
    if (s > -6) return AGUA;
    for (const q of campos) if (poligonoDentro(q, x, z)) return RELVA;
    for (const v of verde) { if (x < v.c[0] || x > v.c[2] || z < v.c[1] || z > v.c[3] || !poligonoDentro(v.P, x, z)) continue; return v.tipo === 2 ? MATA : (((x * 0.013) | 0) + ((z * 0.013) | 0)) % 2 ? RELVA : RELVA2; }
    const d = tr.distAt(x, z);
    if (d < tr.W / 2 + 70) return CALCADA;
    return d < 400 ? CALCADA : CONCRETO;
  };
}
