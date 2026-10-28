// Bahrein — as ferramentas das peças exclusivas de Sakhir (kit/bahrein/*.js): uma moldura que acompanha a reta (distância ao
// longo `s` e lado `v` a partir da linha central), um pintor que põe caixas, cilindros e velas nela, as regiões em que o
// cenário é dividido (uma malha por material e por região, para a câmera e a sombra cortarem o que está longe), o piso que
// segue o relevo e a luz da noite (as janelas, as lâmpadas e as poças de luz só acendem quando a pista está de noite).
// Nada daqui mexe na física: é só cenário, atrás do muro e da área de escape.
import * as THREE from "three";
import { Montador, solido } from "../montagem.js";
import { velaEm } from "../coberturas.js";
import { M } from "../../cena.js";

// ---- a moldura: o trecho i0..i1 da linha central, do lado `lado` (1 ou -1) ----
// at(s, v) → { x, z, h, ry }: o ponto a `s` unidades do começo e `v` para fora da linha central; ry gira uma peça para que o
// eixo z dela aponte para fora da pista e o x acompanhe o trecho (para lado = 1, é o sentido da volta).
export function moldura(tr, i0, i1, lado = 1) {
  const { pts, n } = tr, cum = [0];
  for (let i = i0; i < i1; i++) { const a = pts[i % n], b = pts[(i + 1) % n]; cum.push(cum[cum.length - 1] + Math.hypot(b.x - a.x, b.y - a.y)); }
  const comprimento = cum[cum.length - 1];
  const em = (s) => {
    s = Math.max(0, Math.min(comprimento, s));
    let a = 0, b = cum.length - 1; while (b - a > 1) { const m = (a + b) >> 1; if (cum[m] <= s) a = m; else b = m; }
    const t = (s - cum[a]) / ((cum[b] - cum[a]) || 1), p = pts[(i0 + a) % n], q = pts[(i0 + b) % n];
    let nx = p.nx + (q.nx - p.nx) * t, ny = p.ny + (q.ny - p.ny) * t; const k = Math.hypot(nx, ny) || 1; nx /= k; ny /= k;
    return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, h: p.h + (q.h - p.h) * t, nx, ny };
  };
  const at = (s, v) => { const q = em(s); return { x: q.x + q.nx * lado * v, z: q.y + q.ny * lado * v, h: q.h, ry: Math.atan2(lado * q.nx, lado * q.ny) }; };
  // a distância ao longo (s) de uma fração da volta
  const sDe = (f) => { const i = Math.round(f * n); let s = 0; for (let k = i0; k < Math.min(i, i1); k++) { const a = pts[k % n], b = pts[(k + 1) % n]; s += Math.hypot(b.x - a.x, b.y - a.y); } return s; };
  return { tr, i0, i1, lado, comprimento, at, sDe };
}

// ---- as regiões: um Montador por quadrado de `celula` unidades, para cada malha ter o seu lugar no mundo ----
export class Regiao {
  constructor(celula = 420) { this.celula = celula; this.mapa = new Map(); }
  de(x, z) { const k = `${Math.floor(x / this.celula)},${Math.floor(z / this.celula)}`; if (!this.mapa.has(k)) this.mapa.set(k, new Montador()); return this.mapa.get(k); }
  montar(add, nome, { sombra = true } = {}) {
    const grupos = [];
    for (const m of this.mapa.values()) { const g = m.montar(nome); g.traverse((o) => { if (o.isMesh) o.castShadow = sombra; }); add(g); grupos.push(g); }
    return grupos;
  }
}

// ---- o pintor: põe peças na moldura. `y0` é a base da peça; sx anda ao longo da moldura e sz para fora da pista ----
export function pintor(F, reg) {
  const S = solido();
  const p = {
    S,
    // caixa de tamanho [sx, sy, sz] com a base em y0 (a partir da altura da pista naquele ponto)
    caixa(mat, s, v, y0, [sx, sy, sz], cor, extra = {}) { const q = F.at(s, v); reg.de(q.x, q.z).caixa(mat, [q.x, q.h + y0 + sy / 2, q.z], [sx, sy, sz], { cor, ry: q.ry, ...extra }); return q; },
    cil(mat, s, v, y0, [r, h], cor, extra = {}) { const q = F.at(s, v); reg.de(q.x, q.z).cilindro(mat, [q.x, q.h + y0 + h / 2, q.z], [r, h], { cor, seg: 10, ...extra }); return q; },
    // uma vela (pirâmide de beirada côncava) com a base em y0
    vela(s, v, y0, { w, d, h, sag = 2.4, cor = "#f4f1ea" }) { const q = F.at(s, v); velaEm(reg.de(q.x, q.z), q.x, q.h + y0, q.z, { w, d, h, sag, cor, mastro: 0, ry: q.ry }); return q; },
    // o mastro de treliça (fino, cônico): da base y0 até y0 + h
    mastro(s, v, y0, h, cor = "#eef0f2", r = 1.5) { const q = F.at(s, v); reg.de(q.x, q.z).geo(S, MASTRO, { x: q.x, y: q.h + y0 + h / 2, z: q.z, sx: r, sy: h, sz: r, cor }); return q; },
  };
  return p;
}
const MASTRO = new THREE.CylinderGeometry(0.22, 1, 1, 6);

// ---- o piso que segue o relevo: uma grade de s × v (ou um disco) por cima do chão, com uma cor ou textura ----
export function piso(tr, add, F, [s0, s1, v0, v1], mat, { y = 0.35, passo = 44, uv = [1, 1], nome = "bahrein-piso" } = {}) {
  const ns = Math.max(1, Math.ceil((s1 - s0) / passo)), nv = Math.max(1, Math.ceil((v1 - v0) / passo)), pos = [], tc = [], idx = [];
  for (let a = 0; a <= ns; a++) for (let b = 0; b <= nv; b++) {
    const q = F.at(s0 + ((s1 - s0) * a) / ns, v0 + ((v1 - v0) * b) / nv);
    pos.push(q.x, tr.chao(q.x, q.z) + y, q.z); tc.push((a / ns) * uv[0], (b / nv) * uv[1]);
    if (a < ns && b < nv) { const k = a * (nv + 1) + b; idx.push(k, k + 1, k + nv + 1, k + 1, k + nv + 2, k + nv + 1); }
  }
  return grade(add, pos, tc, idx, mat, nome);
}
// um disco (ou polígono regular de `lados`) no chão, com `aneis` anéis para seguir o relevo
export function disco(tr, add, x, z, raio, mat, { y = 0.35, lados = 24, aneis = 3, rot = 0, nome = "bahrein-disco" } = {}) {
  const pos = [x, tr.chao(x, z) + y, z], tc = [0.5, 0.5], idx = [];
  for (let r = 1; r <= aneis; r++) for (let k = 0; k < lados; k++) {
    const a = rot + (k / lados) * Math.PI * 2, rr = (raio * r) / aneis, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
    pos.push(px, tr.chao(px, pz) + y, pz); tc.push(0.5 + (Math.cos(a) * r) / aneis / 2, 0.5 + (Math.sin(a) * r) / aneis / 2);
  }
  const at = (r, k) => (r === 0 ? 0 : 1 + (r - 1) * lados + (k % lados));
  for (let k = 0; k < lados; k++) idx.push(0, at(1, k + 1), at(1, k));
  for (let r = 1; r < aneis; r++) for (let k = 0; k < lados; k++) idx.push(at(r, k), at(r, k + 1), at(r + 1, k), at(r, k + 1), at(r + 1, k + 1), at(r + 1, k));
  return grade(add, pos, tc, idx, mat, nome);
}
function grade(add, pos, tc, idx, mat, nome) {
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(tc, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, mat)); m.receiveShadow = true; m.name = nome; return m;
}
// o material de um piso pintado (por cima do chão, sem brigar com ele na profundidade)
export const pisoMat = (cor, o = {}) => M(cor, { roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, ...o });

// ---- a luz da noite ----
// Janelas, lâmpadas e poças de luz mudam com `tr.noite` (o jogo troca dia e noite sem refazer a pista): cada item guarda a cor
// do dia e a da noite, e o laço da pista (tr.animarPista) confere uma vez por quadro, só trocando quando mudou.
export function luzDaNoite(tr) {
  return (tr.luzBahrein ||= { materiais: [], emissivos: [], objetos: [], quadro: [], ultimo: null });
}
// liga o laço da noite: tem que rodar DEPOIS de vidaGP (que define tr.animarPista), ou ele é trocado.
// `quadro` roda em todo quadro (as luzes dos refletores seguem o carro); o resto só quando o dia vira noite.
export function ligarNoite(tr) {
  const L = luzDaNoite(tr), antes = tr.animarPista;
  tr.animarPista = (dt, foco, t) => {
    antes?.(dt, foco, t);
    const noite = !!tr.noite;
    for (const f of L.quadro) f(noite, foco);
    if (noite === L.ultimo) return; L.ultimo = noite;
    for (const { mat, dia, noite: n } of L.materiais) mat.color.set(noite ? n : dia);
    for (const { mat, valores } of L.emissivos) mat.emissiveIntensity = noite ? valores[1] : valores[0];
    for (const o of L.objetos) o.visible = noite;
  };
}
// um material que troca de cor com a noite (as janelas e as lâmpadas)
export function materialDaNoite(tr, dia, noite, o = {}) {
  const mat = new THREE.MeshBasicMaterial({ color: tr.noite ? noite : dia, ...o });
  luzDaNoite(tr).materiais.push({ mat, dia, noite }); return mat;
}
// um material com mapa emissivo (as janelas acesas da torre) que só brilha de noite
export function emissivoDaNoite(tr, mat, dia = 0, noite = 1) {
  const L = luzDaNoite(tr); L.emissivos.push({ mat, valores: [dia, noite] }); mat.emissiveIntensity = tr.noite ? noite : dia; return mat;
}
// algo que só aparece de noite (os halos dos refletores)
export function soDeNoite(tr, obj) { obj.visible = !!tr.noite; luzDaNoite(tr).objetos.push(obj); return obj; }
