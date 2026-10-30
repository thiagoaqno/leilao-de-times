// Mônaco — o mundo real: os dados (kit/monaco/dados.js, gerados por ferramentas/monaco-dados.js a partir do OpenStreetMap e do
// relevo EU-DEM/SRTM) viram funções: a altitude do morro em qualquer ponto, a distância até o mar (a costa de verdade, com o porto,
// a Digue e o Rochedo) e o relevo do chão que o resto da pista usa. Peça só desta pista.
import DADOS from "./dados.js";

export const D = DADOS;
export const VK = D.projecao.vk; // unidades de altura por metro de altitude (a pista e o morro)
export const NIVEL_DO_MAR = -6; // a altura da água (vida-mais.js põe os barcos nela; o cais fica uns 2 m, ~5 unidades, acima da pista mais baixa)
const suave = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export { suave };

// ---------- a altitude do morro (EU-DEM e SRTM, bicúbica) ----------
const R = D.relevo, GN = R.n, GP = R.passo * D.projecao.k; // GP: o passo da grade no mundo do jogo
// a grade de altitude, suavizada (duas passadas de um borrão gaussiano 5×5: o MDE de 25 m tem degraus de terraço e de prédio que o morro de verdade não tem)
const GRADE = (() => {
  let a = Float32Array.from(R.z, (v) => v / 10);
  const kernel = [1, 4, 6, 4, 1], soma = 16;
  for (let passada = 0; passada < 2; passada++) {
    const b = new Float32Array(a.length), c = new Float32Array(a.length), at = (arr, i, j) => arr[Math.max(0, Math.min(GN - 1, j)) * GN + Math.max(0, Math.min(GN - 1, i))];
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { let s = 0; for (let k = -2; k <= 2; k++) s += at(a, i + k, j) * kernel[k + 2]; b[j * GN + i] = s / soma; }
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { let s = 0; for (let k = -2; k <= 2; k++) s += at(b, i, j + k) * kernel[k + 2]; c[j * GN + i] = s / soma; }
    a = c;
  }
  return a;
})();
const celula = (i, j) => GRADE[Math.max(0, Math.min(GN - 1, j)) * GN + Math.max(0, Math.min(GN - 1, i))]; // metros
const cubica = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
// a altitude, em unidades do jogo, num ponto do mundo
export function altitude(x, z) {
  const u = (x - R.x0) / GP, v = (z - R.z0) / GP, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
  const lin = (jj) => cubica(celula(i - 1, jj), celula(i, jj), celula(i + 1, jj), celula(i + 2, jj), fu);
  return Math.max(0, cubica(lin(j - 1), lin(j), lin(j + 1), lin(j + 2), fv)) * VK;
}

// ---------- o mar: a distância com sinal até a costa de OpenStreetMap (positivo na água) ----------
let sdf = null;
const CEL = 40, MARGEM = 1400;
function montarMar() {
  const P = D.mar, n = P.length, mundo = D.projecao.mundo, x0 = -MARGEM, N = Math.ceil((mundo + MARGEM * 2) / CEL) + 1, g = new Float32Array(N * N);
  const ax = new Float32Array(n), az = new Float32Array(n), bx = new Float32Array(n), bz = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; ax[i] = a[0]; az[i] = a[1]; bx[i] = b[0]; bz[i] = b[1]; }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = x0 + i * CEL, z = x0 + j * CEL; let d2 = 1e18, dentro = false;
    for (let k = 0; k < n; k++) {
      const x1 = ax[k], z1 = az[k], x2 = bx[k], z2 = bz[k];
      if ((z1 > z) !== (z2 > z) && x < ((x2 - x1) * (z - z1)) / (z2 - z1) + x1) dentro = !dentro;
      const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / l2)), ex = x - x1 - dx * t, ez = z - z1 - dz * t, d = ex * ex + ez * ez;
      if (d < d2) d2 = d;
    }
    g[j * N + i] = dentro ? Math.sqrt(d2) : -Math.sqrt(d2);
  }
  sdf = { g, N, x0 };
}
// positivo dentro da água (em unidades do mundo), negativo em terra; contínuo (bilinear na grade de 40)
export function distanciaDoMar(x, z) {
  if (!sdf) montarMar();
  const { g, N, x0 } = sdf, u = Math.max(0, Math.min(N - 1.001, (x - x0) / CEL)), v = Math.max(0, Math.min(N - 1.001, (z - x0) / CEL)), i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
  const a = g[j * N + i], b = g[j * N + i + 1], c = g[(j + 1) * N + i], d = g[(j + 1) * N + i + 1];
  return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
}
// o fundo de Mônaco: a água só começa a 40 do guard-rail (o cais da pista larga do jogo), em qualquer ponto da pista
export function fundoMonaco(tr, x, z) {
  const sMar = distanciaDoMar(x, z);
  if (sMar < -90) return sMar;
  const { pts, n } = tr, c = tr.indiceAt(x, z); let dr = Infinity;
  for (let k = c - 3; k <= c + 3; k++) { const p = pts[(k + n) % n]; dr = Math.min(dr, Math.hypot(p.x - x, p.y - z)); }
  return Math.min(sMar, dr - (tr.W / 2 + tr.t.wall + 40));
}
export const aguaMonaco = (tr, x, z) => fundoMonaco(tr, x, z) > 0;
// a beira do porto (o cais da Piscine, do Tabac e da chicane): aberta, sem prédio entre a pista e os iates
export const orlaMonaco = (tr, x, z) => fundoMonaco(tr, x, z) > -300 && distanciaDoMar(x, z) > -220;

// ---------- o relevo do chão para pista.js (groundH): a pista no nível dela e o morro de verdade em volta ----------
// f = { h, lat } do ponto mais perto da pista, idx = o índice dele. Até a calçada, vale a altura da pista; depois, a diferença do
// morro real em relação ao ponto da pista entra aos poucos, e bem longe vale a altitude do mapa.
export function relevoMonaco(tr) {
  const { pts, n } = tr, L = tr.wallLat, demPista = new Float32Array(n);
  for (let i = 0; i < n; i++) demPista[i] = altitude(pts[i].x, pts[i].y);
  // o desvio da pista para o morro, suavizado ao longo da volta (±120 pontos): o chão em volta não ganha degrau onde o ponto mais perto da pista muda
  const desvioPista = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0, w = 0; for (let k = -120; k <= 120; k += 6) { const q = (i + k + n) % n, p = 1 - Math.abs(k) / 126; s += (pts[q].h - demPista[q]) * p; w += p; } desvioPista[i] = s / w; }
  // banda de segurança: até a pista, a calçada, a barreira e uma folga (L + 30) o chão fica sempre ABAIXO da pista; fora dela o morro só sobe com inclinação limitada (talude), nunca em degrau
  // banda de segurança: pista, calçada, barreira e uma folga: o chão fica sempre ABAIXO da pista de QUALQUER trecho (o grampo e o morro empilhado de Mônaco têm pista a poucas dezenas de metros de outra, mais alta);
  // fora dela o morro só sobe em talude (inclinação limitada), nunca em degrau. `teto(x, z)` é o mínimo, sobre os pontos da linha central, de (altura - folga + talude * distância além do muro + margem).
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
  const menor = (a, b, k = 14) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k / 4; }; // mínimo suave (sem quina)
  return (x, z, f, idx, malha = false) => { // malha: o chão da malha do terreno (sempre abaixo de qualquer pista); sem ela, sobre o asfalto vale a altura da própria pista
    const d = Math.abs(f.lat), dem = altitude(x, z), desvio = desvioPista[idx];
    if (!malha && d < tr.W / 2 + 4) return f.h; // sobre o asfalto o chão é o da própria pista (o carro se inclina por ele); o teto dos outros trechos só vale fora dessa faixa, e a malha do terreno afunda por baixo
    const a = suave((d - plano) / rampa), b = suave((d - plano - rampa) / longe);
    let g = f.h * (1 - a) + (dem + desvio * (1 - b)) * a; // (o desvio já leva a pista ao nível dela: a e b são suaves, sem escada)
    // (o túnel tem o teto e as paredes de tunel.js; o morro de verdade em volta já fica acima dele)
    return menor(g, teto(x, z));
  };
}

// ---------- ferramentas das peças ----------
export const poligonoDentro = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };

// O muro de Mônaco nos grampos e nas chicanes: a fita de dentro da curva cruza a pista (o raio da curva é menor que a distância do muro). Cada vértice é empurrado para fora até ficar a `raio`
// (o centro do carro mais a meia largura dele) de QUALQUER ponto da linha central do mesmo nível, então nenhum painel fica onde o corpo do carro chega. `i0`: o ponto de cada par de vértices.
export function afastarMuro(tr, geo, i0, raio) {
  const pos = geo.attributes.position, { pts, n } = tr;
  for (let k = 0; k < pos.count; k++) {
    const i = i0 + (k >> 1);
    for (let volta = 0; volta < 3; volta++) {
      let x = pos.getX(k), z = pos.getZ(k), mexeu = false;
      for (let j = i - 90; j <= i + 90; j++) {
        const q = pts[((j % n) + n) % n], dx = x - q.x, dz = z - q.y, d = Math.hypot(dx, dz);
        if (d < raio - 0.01 && Math.abs(q.h - (pos.getY(k) - 10)) < 40) { x = q.x + (dx / (d || 1)) * raio; z = q.y + (dz / (d || 1)) * raio; mexeu = true; }
      }
      if (!mexeu) break; pos.setX(k, x); pos.setZ(k, z);
    }
  }
  pos.needsUpdate = true; geo.computeVertexNormals();
}
