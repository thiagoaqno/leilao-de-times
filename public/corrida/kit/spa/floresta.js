// Spa-Francorchamps — a floresta das Ardenas (peça só desta pista): os morros verdes em volta do vale, o abetal que fecha a
// pista dos dois lados e a mata de longe. O circuito de verdade corre no fundo de uma floresta de abetos (píceas plantadas em
// quadras escuras) com manchas de bétula e faia, clareiras de pasto e uns cortes marrons de madeira tirada. Aqui:
// 1. `colinas`: o relevo de baixa resolução (uma malha só, cor por vértice: pasto, mato e abetal), longe do chão da pista, que
//    continua sendo o de pista.js (o relevo da pista não muda). A altura do morro em qualquer ponto vem em `alturaEm`;
// 2. `bosqueDaBeira`: as árvores logo depois da cerca (abetos altos e escuros em maioria, bétulas brancas e faias), com a
//    densidade e a altura certas para a câmera passar por um corredor de mata, só onde `livre` e `ocupado` deixam;
// 3. `florestaDeLonge`: a mata em manchas por cima dos morros e da planície, até o horizonte.
// Tudo em InstancedMesh, sem sombra própria e sem luz nova.
import * as THREE from "three";
import { M } from "../../cena.js";
import { livre, ocupado, sorteio } from "../comum.js";

// ---- ruído de valor, suave, que repete sempre igual (a mesma pista sai sempre igual) ----
const hash = (i, j, s) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const suave = (t) => t * t * (3 - 2 * t);
function ruido(x, z, s) {
  const i = Math.floor(x), j = Math.floor(z), fx = suave(x - i), fz = suave(z - j), a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
export const relevo = (x, z, s = 11) => ruido(x / 1300, z / 1300, s) * 0.55 + ruido(x / 560, z / 560, s + 1) * 0.3 + ruido(x / 240, z / 240, s + 2) * 0.15; // 0 a 1
const lim = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const passo01 = (a, b, v) => suave(lim((v - a) / (b - a)));

// dentro da volta? (a linha central como polígono)
function dentroDaVolta(pts, x, z) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > z) !== (b.y > z) && x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x) d = !d; }
  return d;
}

/**
 * Os morros das Ardenas: começam a `inicio` do centro da pista (mais longe do que o chão da pista alcança) e sobem até `fim`.
 * A cor da malha mistura o pasto claro dos vales, o verde fechado das encostas de abetal e, aqui e ali, uma clareira de corte.
 * @param {object} o { inicio=470, fim=1300, altura=330, margem=1500, passo=110, vazio: [[x, z, raio]], miolo: quanto do relevo vale dentro da volta (0,2) }
 * @returns {{alturaEm:(x:number,z:number)=>number, malha:THREE.Mesh}}
 */
export function colinas(tr, add, { inicio = 470, fim = 1300, altura = 330, margem = 1500, passo = 110, vazio = [], miolo = 0.2 } = {}) {
  const { pts } = tr, mundo = tr.t.world, x0 = -margem, nn = Math.ceil((mundo + margem * 2) / passo), lado = nn + 1;
  const alt = new Float32Array(lado * lado);
  const pasto = new THREE.Color("#5f9a42"), mato = new THREE.Color("#3b6e35"), abetal = new THREE.Color("#244f2d"), corte = new THREE.Color("#7f7a4a"), clareira = new THREE.Color("#78ad4a"), cor = new THREE.Color();
  const pos = new Float32Array(lado * lado * 3), cores = new Float32Array(lado * lado * 3);
  for (let j = 0; j < lado; j++) for (let i = 0; i < lado; i++) {
    const x = x0 + i * passo, z = x0 + j * passo, d = tr.distAt(x, z);
    let m = passo01(inicio, fim, d);
    if (m > 0 && d < 2600 && dentroDaVolta(pts, x, z)) m *= miolo; // dentro da volta, só ondulações
    for (const [cx, cz, r] of vazio) m *= passo01(r * 0.75, r * 1.5, Math.hypot(x - cx, z - cz));
    const f = relevo(x, z), h = m * (30 + altura * f * f), k = j * lado + i;
    alt[k] = h; pos[k * 3] = x; pos[k * 3 + 1] = h - 3; pos[k * 3 + 2] = z;
    // a cor: pasto na baixada, mato e abetal escuro nas encostas, com manchas de clareira e de corte de madeira
    const t = lim(h / (altura * 0.6)), mancha = ruido(x / 210, z / 210, 37), quadra = ruido(x / 520, z / 520, 53);
    cor.copy(pasto).lerp(mato, passo01(0.02, 0.3, t)).lerp(abetal, passo01(0.25, 0.8, t) * (0.55 + 0.45 * quadra));
    if (mancha > 0.7 && t < 0.55) cor.lerp(clareira, (mancha - 0.7) * 2.4);
    else if (mancha < 0.16 && t > 0.15) cor.lerp(corte, (0.16 - mancha) * 3.2);
    else cor.multiplyScalar(0.9 + mancha * 0.2);
    cores[k * 3] = cor.r; cores[k * 3 + 1] = cor.g; cores[k * 3 + 2] = cor.b;
  }
  const idx = [];
  for (let j = 0; j < nn; j++) for (let i = 0; i < nn; i++) {
    const a = j * lado + i, b = a + 1, c = a + lado, d = c + 1;
    if (alt[a] + alt[b] + alt[c] + alt[d] < 0.5) continue; // onde não há morro nenhum não há triângulo
    if (Math.abs(alt[a] - alt[d]) < Math.abs(alt[b] - alt[c])) idx.push(a, c, d, a, d, b); else idx.push(a, c, b, b, c, d); // a diagonal acompanha o relevo
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(cores, 3)); g.setIndex(idx); g.computeVertexNormals();
  const malha = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
  malha.name = `${tr.id}-colinas`; malha.receiveShadow = false; malha.castShadow = false;
  const alturaEm = (x, z) => { // a altura do morro em qualquer ponto (bilinear na mesma grade da malha)
    const u = (x - x0) / passo, v = (z - x0) / passo; if (u < 0 || v < 0 || u >= nn || v >= nn) return 0;
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, a = alt[j * lado + i], b = alt[j * lado + i + 1], c = alt[(j + 1) * lado + i], d = alt[(j + 1) * lado + i + 1];
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
  };
  tr.colinasSpa = { alturaEm, triangulos: idx.length / 3 };
  return { alturaEm, malha };
}

// ---- as árvores ----
const colorir = (m, lista) => { if (m) { lista.forEach((o, k) => m.setColorAt(k, new THREE.Color(o.c))); if (m.instanceColor) m.instanceColor.needsUpdate = true; } return m; };
function instanciar(add, geo, mat, lista, nome) {
  if (!lista.length) return null;
  const m = add(new THREE.InstancedMesh(geo, mat, lista.length)), d = new THREE.Object3D();
  lista.forEach((o, k) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r || 0, 0); d.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1); d.updateMatrix(); m.setMatrixAt(k, d.matrix); });
  m.castShadow = false; m.receiveShadow = false; m.name = nome; colorir(m, lista); return m;
}
// junta geometrias numa só (sem depender do BufferGeometryUtils)
function juntar(gs) {
  const pos = [], nor = [], idx = []; let base = 0;
  for (const g0 of gs) { const g = g0.index ? g0.toNonIndexed() : g0; g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); idx.push(base + i); } base += p.count; }
  const r = new THREE.BufferGeometry(); r.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); r.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); r.setIndex(idx); return r;
}
// um abeto (pícea): cones abertos empilhados (três; `simples` tem menos lados, para a mata de longe), cada um mais fino que o de baixo, de 1 de altura e 1 de raio na base; os galhos de baixo
// quase tocam o chão, como no abetal plantado de lá
export function geoAbeto(simples = false) {
  const gs = [], lados = simples ? 4 : 6;
  [[1, 0.5, 0.02], [0.72, 0.44, 0.3], [0.44, 0.4, 0.6]].forEach(([r, h, y]) => { const c = new THREE.ConeGeometry(r, h * 1.2, lados, 1, true); c.translate(0, y + (h * 1.2) / 2, 0); gs.push(c); });
  return juntar(gs);
}
// a copa de folhosa (bétula e faia): duas esferas facetadas juntas, de ~1 de largura
const geoCopa = () => juntar([[0, 0.06, 0, 0.72], [0.34, -0.08, 0.12, 0.5]].map(([x, y, z, r]) => { const s = new THREE.IcosahedronGeometry(r, 0); s.translate(x, y, z); return s; }));

export const VERDES_ABETO = ["#1b4527", "#1f4f2c", "#235a31", "#183c24", "#2a6137", "#1d4a2a"];
const VERDES_BETULA = ["#7fae45", "#8cb84c", "#6f9f3c", "#9cc254", "#a6a53c"], VERDES_FAIA = ["#4d8a3a", "#3f7a33", "#5c9a40", "#6e9a35", "#8a8f2f"];
const material = () => new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });

/**
 * O abetal da beira: logo depois da cerca, árvores altas dos dois lados em toda a volta (menos onde há arquibancada, prédio ou outro trecho
 * da pista). A fileira da frente tem mais bétula e faia (a borda clara da mata); atrás vem o abetal escuro.
 * @param {object} cfg { recuo=70 (da borda da pista), fundo=300, passo=2 (pontos), densidade=1.6 (por ponto e por lado), alturas=[170, 300], semente,
 *   evitar: [{ f0, f1, lado, lat0, lat1 }] faixas (do centro da pista) onde não nasce árvore: a torcida nas encostas e o acampamento }
 */
export function bosqueDaBeira(tr, add, cfg = {}) {
  const { pts, n, W } = tr, r = sorteio(cfg.semente ?? 4242), d0 = W / 2 + (cfg.recuo ?? 70), fundo = cfg.fundo ?? 300, [aMin, aMax] = cfg.alturas || [170, 300];
  const densidade = cfg.densidade ?? 1.6, passo = cfg.passo ?? 2, ate = cfg.ate ?? 1, de = cfg.de ?? 0, evitar = cfg.evitar || [];
  const abetos = [], copas = [], troncos = [], bordas = [];
  for (let i = Math.floor(de * n); i < Math.floor(ate * n); i += passo) {
    const p = pts[((i % n) + n) % n];
    for (const lado of [-1, 1]) for (let k = 0, q = Math.floor(densidade) + (r() < densidade % 1 ? 1 : 0); k < q; k++) {
      const frente = r() < 0.34, d = d0 + (frente ? r() * 60 : 40 + r() * r() * fundo), x = p.x + p.nx * lado * d + (r() - 0.5) * 18, z = p.y + p.ny * lado * d + (r() - 0.5) * 18;
      const folhosa = frente ? r() < 0.3 : r() < 0.08, alt = aMin + r() * (aMax - aMin) * (folhosa ? 0.62 : 1), larg = alt * (folhosa ? 0.4 + r() * 0.12 : 0.2 + r() * 0.07);
      if (evitar.some((q) => q.lado === lado && i >= q.f0 * n && i <= q.f1 * n && d + larg > q.lat0 - 10 && d - larg < q.lat1 + 14)) continue; // a galera e o acampamento ficam descobertos
      if (!livre(tr, x, z, larg + 12) || ocupado(tr, x, z, i % n)) continue;
      const y = tr.chao(x, z) - 1.5;
      if (folhosa) {
        const branca = r() < 0.55, c = (branca ? VERDES_BETULA : VERDES_FAIA)[(r() * 5) | 0];
        copas.push({ x, y: y + alt * 0.66, z, sx: larg, sy: alt * 0.36, sz: larg, r: r() * 6, c });
        (branca ? bordas : troncos).push({ x, y: y + alt * 0.28, z, sx: alt * 0.022, sy: alt * 0.56, sz: alt * 0.022, c: branca ? "#e9e7df" : "#5b4a38" });
      } else abetos.push({ x, y, z, sx: larg, sy: alt, sz: larg, r: r() * 6, c: VERDES_ABETO[(r() * VERDES_ABETO.length) | 0] });
    }
  }
  const mat = material();
  instanciar(add, geoAbeto(), mat, abetos, `${tr.id}-abetos`);
  instanciar(add, geoCopa(), mat, copas, `${tr.id}-folhosas`);
  const tronco = new THREE.CylinderGeometry(0.8, 1, 1, 5);
  instanciar(add, tronco, M(0xffffff, { roughness: 1 }), troncos.concat(bordas), `${tr.id}-troncos`);
  tr.bosqueSpa = { abetos: abetos.length, folhosas: copas.length, troncos: troncos.length + bordas.length };
  return tr.bosqueSpa;
}

/**
 * A mata de longe, por cima dos morros e da planície: abetal em quadras (o ruído decide onde é mata e onde é pasto) com manchas de folhosa.
 * @param {object} rel o resultado de `colinas` · @param {object} o { passo=100, minDist=250, densidade=1, semente=5171, ext=1300 }
 */
export function florestaDeLonge(tr, add, rel, { passo = 100, minDist = 250, densidade = 1, semente = 5171, ext = 1300 } = {}) {
  const r = sorteio(semente), mundo = tr.t.world, abetos = [], copas = [], troncos = [];
  for (let x = -ext; x < mundo + ext; x += passo) for (let z = -ext; z < mundo + ext; z += passo) {
    const px = x + (r() - 0.5) * passo * 0.9, pz = z + (r() - 0.5) * passo * 0.9, d = tr.distAt(px, pz);
    if (d < minDist) continue;
    const mata = ruido(px / 460, pz / 460, 91), prob = lim((d - minDist) / 400, 0.15, 1) * densidade * passo01(0.28, 0.5, mata);
    if (r() > prob || ocupado(tr, px, pz)) continue;
    const y = Math.max(tr.chao(px, pz), rel.alturaEm(px, pz) - 3) - 1.5, alto = 150 + r() * 190;
    if (ruido(px / 260, pz / 260, 17) > 0.74 && r() < 0.7) { // mancha de folhosa
      const w = alto * 0.38; copas.push({ x: px, y: y + alto * 0.36, z: pz, sx: w, sy: alto * 0.3, sz: w, r: r() * 6, c: (r() < 0.5 ? VERDES_BETULA : VERDES_FAIA)[(r() * 5) | 0] });
      troncos.push({ x: px, y: y + alto * 0.15, z: pz, sx: alto * 0.02, sy: alto * 0.3, sz: alto * 0.02, c: "#6a5a45" });
    } else { const w = alto * (0.2 + r() * 0.07); abetos.push({ x: px, y, z: pz, sx: w, sy: alto, sz: w, r: r() * 6, c: VERDES_ABETO[(r() * VERDES_ABETO.length) | 0] }); }
  }
  const mat = material();
  instanciar(add, geoAbeto(true), mat, abetos, `${tr.id}-abetos-longe`);
  instanciar(add, geoCopa(), mat, copas, `${tr.id}-folhosas-longe`);
  instanciar(add, new THREE.CylinderGeometry(0.8, 1, 1, 5), M(0xffffff, { roughness: 1 }), troncos, `${tr.id}-troncos-longe`);
  tr.florestaSpa = { abetos: abetos.length, folhosas: copas.length };
  return tr.florestaSpa;
}
