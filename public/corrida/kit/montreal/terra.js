// Montreal — a terra e a água: a ilha Notre-Dame no meio do rio São Lourenço. O mundo todo é um plano de água; a terra é uma malha
// baixa de células (56 de lado) cuja altura depende de "quão dentro da terra" cada vértice está (positivo em terra, negativo na
// água): a linha de costa fica onde a malha cruza o nível da água, então sai suave, com praia de pedra, sem recortar nada.
//   - a ilha Notre-Dame: tudo a menos de RL da pista e o miolo da volta;
//   - a bacia olímpica de remo: o retângulo de água ao lado da reta oposta e da reta dos boxes, para o leste (o lado de fora da volta);
//     a faixa de terra entre a pista e a bacia, a margem de lá (com os choupos) e o canal da Voie maritime com a margem sul mais longe;
//   - a ilha Sainte-Hélène a noroeste (o Biosfera e a ponte Jacques-Cartier) e a margem da cidade a oeste (o skyline).
// A terra do jogo (o terreno de pista.js) já cobre uns 300 em volta da pista, numa rampa até -1,5; a malha daqui fica em -0,55 e
// só aparece onde o terreno é mais baixo, então as duas se emendam sem costura. tr.ocupado passa a dizer "é água" (os enfeites
// soltos e as peças do kit não nascem na água).
//   terraMontreal(tr, { add, aguaTex }) → { s(x, z), agua(x, z), bacia, quadro(x, z), NIVEL, ALTO }
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { sorteio } from "../comum.js";

export const NIVEL = -1.0; // a água
export const ALTO = -0.55; // a terra por cima dela
export const RL = 420; // quanto a ilha avança além da linha central da pista
export const BACIA = { D0: 470, LARGURA: 560, MARGEM: 280, CANAL: 1050 }; // da pista até a bacia, a água, a margem de lá e o canal

// o material do gramado (a mesma cor do terreno de pista.js, com o ruído suave): as plataformas dos boxes e da arquibancada usam
export function matRelva(look) {
  const ruido = canvasTex(128, 128, (x, w, h, rr) => { x.fillStyle = "#f2f2f2"; x.fillRect(0, 0, w, h); for (let q = 0; q < 2600; q++) { x.fillStyle = rr() < 0.5 ? "#dcdcdc" : "#ffffff"; x.fillRect(rr() * w, rr() * h, 3, 3); } });
  return new THREE.MeshStandardMaterial({ color: look.ground[0], map: ruido, roughness: 1 });
}

// ponto dentro do polígono [[x, z], ...]
export function dentroDe(poly, x, z) {
  let d = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) d = !d;
  }
  return d;
}
// distância com sinal até o polígono (positiva dentro)
function sdPoligono(poly, x, z) {
  let m = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    m = Math.min(m, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return dentroDe(poly, x, z) ? m : -m;
}

// a ilha Sainte-Hélène (a noroeste, do outro lado de um braço estreito): da ponta norte, sob a ponte, até o Biosfera e a Concorde
export const SAINTE_HELENE = [[1650, -1900], [2050, -1700], [2330, -1100], [2400, -300], [2380, 500], [2350, 1250], [2250, 1950], [1900, 2300], [1500, 2000], [1350, 1200], [1330, 300], [1420, -600], [1450, -1400]];
// o ponto da margem da cidade (a oeste, o centro de Montreal): a costa x = f(z)
const costaCidade = (z) => 800 + 150 * Math.sin(z / 760) + 70 * Math.sin(z / 210 + 1);

export function terraMontreal(tr, { add, aguaTex }) {
  const { pts, n, W } = tr, look = tr.look;
  // ---- o eixo da bacia: a reta oposta e a reta dos boxes, deslocadas D0 para o lado de fora (o leste), com a chicane retificada ----
  const f2i = (f) => Math.floor(f * n);
  const iDe = f2i(0.685), iAte = f2i(0.092) + n, base = [];
  const leste = (p) => (p.nx < 0 ? [-p.nx, -p.ny] : [p.nx, p.ny]); // o vetor unitário que aponta para o leste (+x)
  for (let i = iDe; i <= iAte; i += 6) {
    const p = pts[i % n], e = leste(p), s = e[0] * p.nx + e[1] * p.ny > 0 ? 1 : -1; // s: o leste é +n (1) ou -n (-1)
    base.push({ i, x: p.x + e[0] * BACIA.D0, z: p.y + e[1] * BACIA.D0, s });
  }
  // a chicane final (0,925 a 0,965): o eixo passa reto
  const iC0 = f2i(0.925), iC1 = f2i(0.965), kC0 = base.findIndex((q) => q.i >= iC0), kC1 = base.findIndex((q) => q.i >= iC1);
  if (kC0 > 0 && kC1 > kC0) for (let k = kC0 + 1; k < kC1; k++) { const t = (k - kC0) / (kC1 - kC0); base[k].x = base[kC0].x + (base[kC1].x - base[kC0].x) * t; base[k].z = base[kC0].z + (base[kC1].z - base[kC0].z) * t; }
  const A = base.map((q, k) => {
    const a = base[Math.max(0, k - 2)], b = base[Math.min(base.length - 1, k + 2)], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
    return { x: q.x, z: q.z, ux: dx / l, uz: dz / l, ex: dz / l, ez: -dx / l, S: 0, i: q.i };
  });
  for (let k = 1; k < A.length; k++) A[k].S = A[k - 1].S + Math.hypot(A[k].x - A[k - 1].x, A[k].z - A[k - 1].z);
  const ST = A[A.length - 1].S;
  // o quadro de um ponto no mundo: a distância lateral à pista (leste positivo) e a posição ao longo da bacia
  const quadro = (x, z) => {
    let m = Infinity, k = 0;
    for (let q = 0; q < A.length; q++) { const d = (A[q].x - x) ** 2 + (A[q].z - z) ** 2; if (d < m) { m = d; k = q; } }
    const a = A[k], dx = x - a.x, dz = z - a.z;
    return { q: BACIA.D0 + dx * a.ex + dz * a.ez, a: a.S + dx * a.ux + dz * a.uz, k };
  };
  // ---- o miolo da volta (para a terra de dentro) ----
  const poligono = []; for (let i = 0; i < n; i += 3) poligono.push([pts[i].x, pts[i].y]);
  // ---- quão dentro da terra: positivo é terra, negativo é água ----
  const costa = (z) => costaCidade(z);
  const campo = (x, z) => {
    const dT = tr.distAt(x, z);
    let s = RL - dT;
    if (dentroDe(poligono, x, z)) s = Math.max(s, 200);
    const f = quadro(x, z), D0 = BACIA.D0, D1 = D0 + BACIA.LARGURA, D2 = D1 + BACIA.MARGEM;
    s = Math.max(s, Math.min(f.q + 70, D2 - f.q, f.a + 170, ST + 170 - f.a)); // o bloco de terra: a faixa até a bacia, as pontas dela e a margem de lá (a bacia é cavada depois)
    s = Math.max(s, f.q - (D2 + BACIA.CANAL)); // a margem sul do canal
    s = Math.max(s, sdPoligono(SAINTE_HELENE, x, z), costa(z) - x);
    s += 38 * Math.sin(x / 330 + z / 210) * Math.cos(z / 270 - x / 500); // a costa não é uma régua
    const sd = Math.min(f.q - D0, D1 - f.q, f.a, ST - f.a); // dentro da bacia (positivo)
    if (sd > -60) s = Math.min(s, -sd);
    return s;
  };
  // ---- a grade: o campo em todos os vértices (56 de lado) ----
  const C = 56, X0 = -600, Z0 = -2000, NX = Math.ceil(7900 / C), NZ = Math.ceil(9000 / C), g = new Float32Array((NX + 1) * (NZ + 1));
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) g[j * (NX + 1) + i] = campo(X0 + i * C, Z0 + j * C);
  const amostra = (x, z) => {
    const u = (x - X0) / C, v = (z - Z0) / C, i = Math.floor(u), j = Math.floor(v);
    if (i < 0 || j < 0 || i >= NX || j >= NZ) return -999;
    const a = u - i, b = v - j, k = j * (NX + 1) + i;
    return (g[k] * (1 - a) + g[k + 1] * a) * (1 - b) + (g[k + NX + 1] * (1 - a) + g[k + NX + 2] * a) * b;
  };
  tr.ocupado = (x, z) => amostra(x, z) < 14; // água, ou a beira dela
  // ---- a malha da terra ----
  const S = 34, cor = (c) => new THREE.Color(c), grama = cor(look.ground[0]), pedra = cor("#8d897c"), seca = cor(look.ground[2]), clara = cor(look.ground[1]), r = sorteio(77);
  const vs = [], cs = [], uvs = [], idx = [], mapa = new Map();
  const vertice = (i, j) => {
    const k = j * (NX + 1) + i;
    if (mapa.has(k)) return mapa.get(k);
    const s = g[k], t = Math.max(-1, Math.min(1, s / S)), x = X0 + i * C, z = Z0 + j * C;
    vs.push(x, NIVEL + t * 0.45, z); uvs.push(x / 150, z / 150);
    const c = grama.clone().lerp(((i * 7 + j * 13) % 5 < 2 ? clara : seca), 0.45 * ((Math.sin(i * 1.7) * Math.cos(j * 2.3) + 1) / 2));
    if (s < 26) c.lerp(pedra, Math.min(1, (26 - s) / 22)); // a praia de pedra da margem
    cs.push(c.r, c.g, c.b); mapa.set(k, vs.length / 3 - 1); return mapa.get(k);
  };
  let celulas = 0;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * (NX + 1) + i, a = g[k], b = g[k + 1], c = g[k + NX + 1], d = g[k + NX + 2], max = Math.max(a, b, c, d), min = Math.min(a, b, c, d);
    if (max < -S) continue; // só água funda
    if (min > 120) { // bem dentro da terra, perto da pista: o terreno de pista.js já está acima daqui
      const x = X0 + (i + 0.5) * C, z = Z0 + (j + 0.5) * C; if (tr.distAt(x, z) < 200) continue;
    }
    const v00 = vertice(i, j), v10 = vertice(i + 1, j), v01 = vertice(i, j + 1), v11 = vertice(i + 1, j + 1);
    idx.push(v00, v01, v10, v10, v01, v11); celulas++;
  }
  void r;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const ruido = canvasTex(128, 128, (x, w, h, rr) => { x.fillStyle = "#f2f2f2"; x.fillRect(0, 0, w, h); for (let q = 0; q < 2600; q++) { x.fillStyle = rr() < 0.5 ? "#dcdcdc" : "#ffffff"; x.fillRect(rr() * w, rr() * h, 3, 3); } });
  const terra = add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: ruido, roughness: 1 }))); terra.receiveShadow = true; terra.name = `${tr.id}-terra`;
  // ---- a água: um plano só, enorme (o rio, o canal, a bacia) ----
  const mat = new THREE.MeshStandardMaterial({ map: aguaTex("#35718f"), roughness: 0.14, metalness: 0.3 }); mat.map.repeat.set(90, 90); tr.agua.push(mat);
  const plano = new THREE.Mesh(new THREE.PlaneGeometry(24000, 24000), mat); plano.rotation.x = -Math.PI / 2; plano.position.set(tr.t.world / 2, NIVEL, tr.t.world / 2); plano.receiveShadow = true; plano.name = `${tr.id}-agua`; add(plano);
  const info = { s: amostra, agua: (x, z) => amostra(x, z) < 0, bacia: { A, ST, ...BACIA }, quadro, NIVEL, ALTO, celulas, ilhaSH: SAINTE_HELENE, costaCidade: costa };
  tr.terraMontreal = info;
  return info;
}
