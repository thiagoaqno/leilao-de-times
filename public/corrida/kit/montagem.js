// Kit de pista — o que os assets de cenário do "kit 2" (box-equipe.js, coberturas.js, torres.js) usam por baixo: um
// montador que junta caixas e formas num punhado de malhas (uma por material, cor por vértice, então cores chapadas não
// custam material nem chamada de desenho a mais) e canvas pequenos só para letreiros. Não depende de cena.js: funciona
// numa página solta (kit/demo.html). Unidades do jogo: 1 ≈ 10 cm; os assets saem desenhados em escala de F1 (carro de ~56).
import * as THREE from "three";

// textura de canvas pequena (letreiros, ripas, frisos)
export function tex(w, h, desenhar, { repeat = false } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; desenhar(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// letreiro: texto em itálico grosso sobre uma cor (a faixa amarela "RACE", o pórtico, a mureta com o logo). `vezes` repete o texto.
export function letreiro(texto, { fundo = "#ffd400", cor = "#c8102e", w = 512, h = 96, vezes = 1, traco = true } = {}) {
  return tex(w, h, (x) => {
    x.fillStyle = fundo; x.fillRect(0, 0, w, h);
    const caber = w / vezes, tam = Math.min(h * 0.62, caber * 0.34);
    x.font = `italic 900 ${tam}px Arial Black, Impact, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = cor;
    for (let k = 0; k < vezes; k++) {
      const cx = caber * (k + 0.5);
      x.fillText(texto, cx, h / 2 + 2, caber * 0.72);
      if (traco) for (let j = 0; j < 3; j++) { x.fillRect(cx - caber * 0.46, h * 0.42 + j * h * 0.08, caber * 0.07, h * 0.035); x.fillRect(cx + caber * 0.39, h * 0.42 + j * h * 0.08, caber * 0.07, h * 0.035); }
    }
  });
}

let _solido = null, _vidro = null;
/** O material das cores chapadas (cor por vértice): um só para todos os assets. */
export const solido = () => (_solido ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
/** Vidro escuro e liso (janelas). */
export const vidro = () => (_vidro ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.15 }));
/** Material de uma textura (letreiro, ripas): só a textura, sem cor por vértice. */
export const comTextura = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.7, side: THREE.DoubleSide, ...o });

const CAIXA = new THREE.BoxGeometry(1, 1, 1), PLANO = new THREE.PlaneGeometry(1, 1), CIL = new THREE.CylinderGeometry(1, 1, 1, 12), CIL_ABERTO = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);
const _m = new THREE.Matrix4(), _n = new THREE.Matrix3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _c = new THREE.Color();

/**
 * Junta peças por material. Cada método devolve o próprio montador:
 *   caixa(mat, [x, y, z], [sx, sy, sz], { cor, ry, rx, rz })       — o centro da caixa
 *   plano(mat, [x, y, z], [w, h], { ry, rx, uv: [su, sv], cor })   — de frente para +z
 *   cilindro(mat, [x, y, z], [raio, alto], { cor, rx, rz, aberto, seg }) — eixo y (rx/rz tombam)
 *   geo(mat, geometria, { x, y, z, rx, ry, rz, sx, sy, sz, cor, uv })
 *   montar(nome) → THREE.Group com uma malha por material (sombra ligada)
 */
export class Montador {
  constructor() { this.lotes = new Map(); }
  geo(mat, g, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, cor = "#ffffff", uv = null } = {}) {
    if (!this.lotes.has(mat)) this.lotes.set(mat, { pos: [], nor: [], uv: [], col: [], idx: [] });
    const l = this.lotes.get(mat), base = l.pos.length / 3;
    _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, "YXZ")), new THREE.Vector3(sx, sy, sz)); _n.getNormalMatrix(_m);
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; _c.set(cor);
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(_m); l.pos.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(N, i).applyMatrix3(_n).normalize(); l.nor.push(_v.x, _v.y, _v.z);
      l.uv.push(U ? U.getX(i) * (uv ? uv[0] : 1) : 0, U ? U.getY(i) * (uv ? uv[1] : 1) : 0); l.col.push(_c.r, _c.g, _c.b);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) l.idx.push(base + g.index.getX(i)); else for (let i = 0; i < P.count; i++) l.idx.push(base + i);
    return this;
  }
  caixa(mat, [x, y, z], [sx, sy, sz], o = {}) { return this.geo(mat, CAIXA, { ...o, x, y, z, sx, sy, sz }); }
  plano(mat, [x, y, z], [sx, sy], o = {}) { return this.geo(mat, PLANO, { ...o, x, y, z, sx, sy }); }
  cilindro(mat, [x, y, z], [r, h], { aberto = false, seg, ...o } = {}) {
    let g = aberto ? CIL_ABERTO : CIL;
    if (seg && seg !== 12) g = new THREE.CylinderGeometry(1, 1, 1, seg, 1, aberto);
    return this.geo(mat, g, { ...o, x, y, z, sx: r, sy: h, sz: r });
  }
  montar(nome = "kit") {
    const grupo = new THREE.Group(); grupo.name = nome;
    for (const [mat, l] of this.lotes) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(l.pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(l.nor, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(l.uv, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(l.col, 3)); g.setIndex(l.idx);
      const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; grupo.add(m);
    }
    return grupo;
  }
}
/** Escurece (f < 1) ou clareia (f > 1) uma cor "#rrggbb", para os tons de um mesmo lote sem ter que listar tudo. */
export function tom(cor, f) { _c.set(cor); _c.multiplyScalar(f); return `#${_c.getHexString()}`; }
