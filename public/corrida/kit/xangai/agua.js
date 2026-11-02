// Xangai — os lagos e os canais em volta do circuito (peça só desta pista). O circuito foi feito num brejo de Jiading e é cortado por água de
// todo lado: o lago do paddock atrás do prédio dos boxes (onde ficam os pavilhões de folha de lótus), um lago no miolo da volta, o do caracol
// da curva 1 e os canais que correm junto da reta de trás e da reta dos boxes.
// 1. `planoDaAgua(tr)`: onde está a água, como um campo contínuo `campo(x, z)` (positivo dentro da água, em unidades do mundo; as bordas ondulam por
//    ruído) feito de elipses (os lagos) e de linhas quebradas que acompanham a pista (os canais). Guardado em `tr.aguaXangai`;
// 2. `terreno`: a configuração `terreno` do GP (`altura` afunda o chão onde há água, com a margem em rampa, e `cor` pinta o gramado por vértice);
// 3. `lamina(tr, add, aguaTex)`: a lâmina d'água, um quadrilátero só, abaixo do chão de todo lugar menos das bacias; `tr.ocupado` passa a dizer "é água"
//    (as árvores, a torcida e as peças não entram) e cada lago reserva o miolo em `tr.reservado` para os enfeites soltos de pista.js.
import * as THREE from "three";
import { M } from "../../cena.js";
import { ponto, ruido, passo01, lim } from "./lugar.js";

export const NIVEL = -2.4; // o chão longe da pista fica em -1,5 (pista.js): a água só aparece onde o terreno foi afundado

// ---- onde está a água ----
function montar(tr) {
  const { W } = tr, elems = [];
  // um lago: elipse em torno de (cx, cz), com o eixo longo `ang`, e as bordas ondulando
  const lago = (nome, c, a, b, ang, o = {}) => elems.push({ nome, tipo: "lago", cx: c.x, cz: c.z, a, b, ca: Math.cos(ang), sa: Math.sin(ang), sem: o.sem ?? 3, raio: Math.max(a, b) * 1.2 });
  // um canal: linha quebrada de pontos {x, z}, com a meia largura variando
  const canal = (nome, pts, hw, o = {}) => {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const q of pts) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); }
    elems.push({ nome, tipo: "canal", pts, hw, sem: o.sem ?? 5, x0: x0 - hw * 2 - 60, x1: x1 + hw * 2 + 60, z0: z0 - hw * 2 - 60, z1: z1 + hw * 2 + 60 });
  };
  const ang = (f) => { const p = tr.pts[Math.floor(((f % 1) + 1) % 1 * tr.n) % tr.n]; return Math.atan2(p.ty, p.tx); };
  const lado = tr.t.boxes?.lado ?? -1, Z = W / 2 + 88, F = 44;
  // o lago do paddock: atrás do prédio dos boxes, do lado das garagens (as folhas de lótus ficam sobre ele), com dois braços
  const L1 = ponto(tr, 0, lado * (Z + F + 430), 80);
  lago("paddock", L1, 560, 280, ang(0));
  lago("paddock-leste", ponto(tr, 0, lado * (Z + F + 330), -560), 260, 150, ang(0));
  lago("paddock-oeste", ponto(tr, 0, lado * (Z + F + 340), 760), 300, 140, ang(0.96));
  // o lago do miolo da volta, do outro lado da reta dos boxes
  lago("miolo", ponto(tr, 0.93, -lado * 360, 40), 520, 140, ang(0.93));
  // o lago do caracol, fora da curva 1 (por fora das arquibancadas)
  lago("caracol", ponto(tr, 0.06, lado * 760, -180), 220, 140, ang(0.06));
  // os canais: um por fora da reta de trás (a mão esquerda, o lado de fora) e outro atrás do paddock, ao longo da reta dos boxes
  const trilha = (f0, f1, lat, onda, passo = 3) => {
    const pts = [], i0 = Math.floor(f0 * tr.n), i1 = Math.floor(f1 * tr.n);
    for (let i = i0; i <= i1; i += passo) { const p = tr.pts[i % tr.n], l = lat + onda * Math.sin(i * 0.011) + onda * 0.5 * Math.sin(i * 0.037 + 1); pts.push({ x: p.x + p.nx * l, z: p.y + p.ny * l }); }
    return pts;
  };
  canal("reta-de-tras", trilha(0.5, 0.775, -(W / 2 + 230), 38), 26);
  canal("reta-de-tras-2", trilha(0.775, 0.8, -(W / 2 + 330), 10), 24);
  canal("reta-dos-boxes", trilha(0.835, 0.955, lado * (Z + F + 280), 34), 24);
  return { elems, L1, lado, Z, F };
}
export function planoDaAgua(tr) {
  if (tr.aguaXangai) return tr.aguaXangai;
  const plano = tr.aguaXangai = montar(tr);
  const { elems } = plano;
  // a distância (em unidades) até a borda da água: positiva dentro
  const dentro = (e, x, z) => {
    if (e.tipo === "lago") {
      const dx = x - e.cx, dz = z - e.cz;
      if (Math.abs(dx) > e.raio || Math.abs(dz) > e.raio) return -1e9;
      const u = dx * e.ca + dz * e.sa, v = -dx * e.sa + dz * e.ca, r = Math.hypot(u / e.a, v / e.b) * (1 + 0.16 * (ruido(x / 170, z / 170, e.sem) - 0.5) + 0.08 * (ruido(x / 62, z / 62, e.sem + 7) - 0.5));
      return (1 - r) * Math.min(e.a, e.b);
    }
    if (x < e.x0 || x > e.x1 || z < e.z0 || z > e.z1) return -1e9;
    let m = 1e18; const P = e.pts;
    for (let i = 0; i + 1 < P.length; i++) {
      const ax = P[i].x, az = P[i].z, bx = P[i + 1].x - ax, bz = P[i + 1].z - az, t = lim(((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz || 1)), d = (x - ax - bx * t) ** 2 + (z - az - bz * t) ** 2;
      if (d < m) m = d;
    }
    return e.hw * (1 + 0.28 * (ruido(x / 140, z / 140, e.sem) - 0.5)) - Math.sqrt(m);
  };
  plano.campo = (x, z) => { let s = -1e9; for (const e of elems) { const v = dentro(e, x, z); if (v > s) s = v; } return s; };
  plano.elemento = (x, z) => { let s = -1e9, q = null; for (const e of elems) { const v = dentro(e, x, z); if (v > s) { s = v; q = e; } } return q ? { e: q, s } : null; };
  // o retângulo que a lâmina cobre
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const e of elems) {
    if (e.tipo === "lago") { x0 = Math.min(x0, e.cx - e.raio); x1 = Math.max(x1, e.cx + e.raio); z0 = Math.min(z0, e.cz - e.raio); z1 = Math.max(z1, e.cz + e.raio); }
    else { x0 = Math.min(x0, e.x0); x1 = Math.max(x1, e.x1); z0 = Math.min(z0, e.z0); z1 = Math.max(z1, e.z1); }
  }
  plano.caixa = { x0, x1, z0, z1 };
  return plano;
}

// ---- o chão ----
const BANCO = 24; // a largura da margem em rampa
export function alturaDoTerreno(tr, x, z, h, lat) {
  if (lat > 1500) return h;
  const s = planoDaAgua(tr).campo(x, z);
  if (s < -BANCO) return h;
  if (s < 0) return Math.min(h, h + (NIVEL - 0.25 - h) * passo01(-BANCO, 0, s)); // a margem desce da altura do terreno até a linha d'água
  return Math.min(h, NIVEL - 0.25 - 3.4 * passo01(0, 36, s)); // dentro: o fundo
}
// a cor do gramado por vértice (multiplica a textura de grama do chão): manchas de três verdes, o mato seco, a lama da margem e o escuro do fundo
const GRAMA_A = [0.86, 1.0, 0.8], GRAMA_B = [0.7, 0.92, 0.66], GRAMA_C = [0.98, 0.98, 0.7], SECO = [1.1, 1.0, 0.72], LAMA = [0.62, 0.62, 0.46], FUNDO = [0.22, 0.28, 0.26], TERRA = [1.1, 0.95, 0.74];
export function corDoChao(tr) {
  const plano = planoDaAgua(tr), c = [0, 0, 0];
  return (x, z, h, ny) => {
    const s = plano.campo(x, z);
    if (s > -2) return FUNDO;
    const d = tr.distAt(x, z), a = ruido(x / 340, z / 340, 11), b = ruido(x / 120, z / 120, 12), seco = ruido(x / 520, z / 520, 13);
    for (let k = 0; k < 3; k++) {
      const base = GRAMA_A[k] + (GRAMA_B[k] - GRAMA_A[k]) * passo01(0.35, 0.7, a) + (GRAMA_C[k] - GRAMA_A[k]) * passo01(0.55, 0.85, b) * 0.6 + (SECO[k] - GRAMA_A[k]) * passo01(0.55, 0.9, seco) * 0.55;
      let v = base * (0.94 + 0.12 * ruido(x / 36, z / 36, 14));
      v += (LAMA[k] - v) * (1 - passo01(-BANCO, -3, s)) * 0.85; // a lama e o junco da margem
      if (ny < 0.9) v += (TERRA[k] - v) * passo01(0.9, 0.75, ny) * 0.8; // o barranco
      c[k] = v;
    }
    void d; void h;
    return [c[0], c[1], c[2]];
  };
}

// ---- a lâmina d'água ----
export function lamina(tr, { add, aguaTex }) {
  const plano = planoDaAgua(tr), { x0, x1, z0, z1 } = plano.caixa;
  const mat = new THREE.MeshStandardMaterial({ map: aguaTex("#5f7f78"), roughness: 0.16, metalness: 0.3, side: THREE.DoubleSide });
  tr.agua.push(mat);
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, NIVEL, (z0 + z1) / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / 300, uv.getY(i) * (z1 - z0) / 300); // a textura se repete a cada 300
  const m = add(new THREE.Mesh(g, mat)); m.name = `${tr.id}-agua`; m.receiveShadow = false;
  // onde é água não nasce nada: peças, torcida, árvores; os lagos reservam o miolo para os enfeites soltos de pista.js (que só olham `reservado`)
  const antes = tr.ocupado;
  tr.ocupado = (x, z, i) => !!antes?.(x, z, i) || plano.campo(x, z) > -22;
  for (const e of plano.elems) {
    if (e.tipo === "lago") for (let dx = -e.a; dx <= e.a; dx += 90) for (let dz = -e.b; dz <= e.b; dz += 90) {
      if ((dx / e.a) ** 2 + (dz / e.b) ** 2 > 1.05) continue;
      tr.reservado.push([e.cx + dx * e.ca - dz * e.sa, e.cz + dx * e.sa + dz * e.ca, 120]);
    }
    else for (let i = 0; i < e.pts.length; i += 5) tr.reservado.push([e.pts[i].x, e.pts[i].z, e.hw + 50]);
  }
  void M;
  return m;
}
