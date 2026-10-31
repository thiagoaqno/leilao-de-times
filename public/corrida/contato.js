// Corrida da Galera — sombra de contato (oclusão ambiente falsa): escurece suave o chão em volta do pé de prédios, arquibancadas,
// barreiras e árvores, e a base das paredes deles, para nada parecer uma caixa solta sobre o chão. Duas peças:
//   1. O cenário parado: `colherCaixas(tr)` (chamada ANTES de juntar as malhas, kit/fundir.js) mede cada objeto que joga sombra
//      (a caixa orientada: centro, meia largura, meia profundidade, altura e giro) e `montarContato(tr, caixas, add)` (DEPOIS)
//      põe tudo em poucos InstancedMesh por região: cada instância é uma "bandeja" de 5 retângulos (o chão em volta e as 4 faces
//      de baixo da parede), com o degradê calculado no sombreador: nada de textura, nada de malha por objeto.
//   2. Os carros: `passoContato(race)` mantém UM InstancedMesh com a sombra de contato de cada carro, no formato dele (as quatro
//      rodas, mais fortes, e a barriga entre elas, bem suave), seguindo o grupo do carro: não é o oval preto de antes.
// Só preto com transparência (alfa) e neblina igual à do resto: sem luz, sem sombra, sem textura. 1 chamada por região na tela.
import * as THREE from "three";

const lim = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const CELULA = 1e7, MAX_CAIXAS = 3600; // uma malha só: 3600 instâncias × 20 vértices é pouco para a placa, e cada região a mais seria uma chamada de desenho (Mônaco está no teto de 380 malhas)

// ---------- o cenário parado ----------
const _m = new THREE.Matrix4(), _w = new THREE.Matrix4(), _c = new THREE.Vector3(), _bb = new THREE.Box3();
// as medidas de um objeto a partir da matriz de mundo e da caixa dele: null se não serve (inclinado, fino, baixo, no ar)
function medida(M, caixa, redondo, chao) {
  const e = M.elements, sx = Math.hypot(e[0], e[1], e[2]), sy = Math.hypot(e[4], e[5], e[6]), sz = Math.hypot(e[8], e[9], e[10]);
  if (sx < 1e-6 || sz < 1e-6 || Math.abs(e[1]) > 0.2 * sx || Math.abs(e[9]) > 0.2 * sz || e[5] < 0.7 * sy) return null; // só giro em torno do eixo vertical
  caixa.getCenter(_c).applyMatrix4(M);
  const hx = ((caixa.max.x - caixa.min.x) / 2) * sx, hz = ((caixa.max.z - caixa.min.z) / 2) * sz, h = (caixa.max.y - caixa.min.y) * sy;
  const base = _c.y - h / 2;
  if (Math.min(hx, hz) < 1.4 || h < 6 || Math.max(hx, hz) > 700) return null;
  const gy = chao(_c.x, _c.z);
  if (base - gy > 8) return null; // no ar (pórticos, passarelas, o teto de uma peça): não toca o chão
  return { x: _c.x, y: Math.max(base, gy), z: _c.z, hx, hz, h, yaw: Math.atan2(-e[8], e[0]), r: redondo ? Math.min(hx, hz) : Math.min(2.5, Math.min(hx, hz) * 0.25), redondo };
}
export function colherCaixas(tr) {
  const out = [], chao = (x, z) => tr.chao(x, z);
  tr.grp.updateMatrixWorld(true);
  tr.grp.traverse((o) => {
    if (!o.isMesh || !o.castShadow || !o.geometry || o.userData.semContato) return;
    const mats = [].concat(o.material || []); if (mats.some((m) => m.transparent && m.opacity < 0.9)) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
    const redondo = /Cylinder|Cone|Sphere|Circle/.test(g.type) || !!o.userData.arvore;
    if (o.isInstancedMesh) {
      const bs = g.boundingBox.getSize(new THREE.Vector3()); if (bs.y < 1e-6) return;
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, _m); _w.multiplyMatrices(o.matrixWorld, _m); const d = medida(_w, g.boundingBox, redondo, chao); if (d) out.push(d); }
    } else { const d = medida(o.matrixWorld, g.boundingBox, redondo, chao); if (d) out.push(d); }
  });
  if (out.length > MAX_CAIXAS) { // mais que isso, fica com as mais perto da pista
    const f = (d) => tr.distAprox(d.x, d.z); out.sort((a, b) => f(a) - f(b)); out.length = MAX_CAIXAS;
  }
  return out;
}

// a bandeja: o chão (retângulo -1..1 de cada lado) e 4 paredes (u de -1 a 1 ao longo, v de 0 a 1 para cima); aForma = (u, v, tipo)
function geoBandeja() {
  const f = [], idx = [], quad = (t) => { const o = f.length / 3; f.push(-1, -1, t, 1, -1, t, -1, 1, t, 1, 1, t); idx.push(o, o + 1, o + 2, o + 2, o + 1, o + 3); };
  for (let t = 0; t < 5; t++) quad(t); // (o chão usa u e w em -1..1; as paredes, u em -1..1 e v em -1..1 → o sombreador converte v para 0..1)
  const g = new THREE.BufferGeometry();
  g.setAttribute("aForma", new THREE.Float32BufferAttribute(f, 3)); g.setAttribute("position", new THREE.Float32BufferAttribute(f.map((v, i) => (i % 3 === 2 ? 0 : v * 0.5)), 3)); g.setIndex(idx);
  return g;
}
const VS = /* glsl */ `
attribute vec3 aForma; attribute vec4 aDim; attribute vec2 aPar;
varying vec3 vL; varying vec4 vD; varying vec2 vP; varying float vT;
#include <fog_pars_vertex>
void main() {
  float hx = aDim.x, hz = aDim.y, hg = aDim.z, sp = aPar.y, t = aForma.z, v = aForma.y * 0.5 + 0.5, u = aForma.x;
  vec3 p; vec2 loc = vec2(0.0);
  if (t < 0.5) { p = vec3(u * (hx + sp), 0.0, aForma.y * (hz + sp)); loc = p.xz; }
  else if (t < 1.5) p = vec3(hx + 0.3, v * hg, u * hz);
  else if (t < 2.5) p = vec3(-hx - 0.3, v * hg, u * hz);
  else if (t < 3.5) p = vec3(u * hx, v * hg, hz + 0.3);
  else p = vec3(u * hx, v * hg, -hz - 0.3);
  vL = vec3(loc, v); vD = aDim; vP = aPar; vT = t;
  vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FS = /* glsl */ `
uniform float uForca; varying vec3 vL; varying vec4 vD; varying vec2 vP; varying float vT;
#include <fog_pars_fragment>
void main() {
  float a;
  if (vT < 0.5) { // o chão: a distância até o retângulo arredondado (negativa dentro): o escuro vale na borda e some em sp (vP.y)
    vec2 q = abs(vL.xy) - vD.xy + vP.x; float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - vP.x;
    float k = 1.0 - smoothstep(0.0, vP.y, d); a = vD.w * k * k;
  } else { float k = 1.0 - vL.z; a = vD.w * 0.8 * k * k; } // a parede: escuro embaixo, some subindo
  a *= uForca; if (a < 0.003) discard;
  gl_FragColor = vec4(0.0, 0.0, 0.02, a);
  #include <fog_fragment>
}`;
function materialBandeja() {
  return new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uForca: { value: 1 } }]), fog: true,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
}
export function montarContato(tr, caixas, add) {
  if (!caixas || !caixas.length) return null;
  const celulas = new Map();
  for (const d of caixas) { const k = CELULA > 1e6 ? "0" : Math.floor(d.x / CELULA) + "," + Math.floor(d.z / CELULA); (celulas.get(k) || celulas.set(k, []).get(k)).push(d); }
  const mat = materialBandeja(), geo = geoBandeja(), meshes = [], q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), M = new THREE.Matrix4(), Y = new THREE.Vector3(0, 1, 0);
  for (const lista of celulas.values()) {
    const n = lista.length, dim = new Float32Array(n * 4), par = new Float32Array(n * 2), mesh = new THREE.InstancedMesh(geo, mat, n);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    lista.forEach((d, i) => {
      const sp = lim(d.h * 0.42, 5, 13), hg = lim(d.h * 0.6, 5, 15), f = 0.16 + 0.22 * lim(d.h / 40);
      dim.set([d.hx, d.hz, d.redondo ? 0 : hg, f * (d.redondo ? 0.8 : 1)], i * 4); par.set([d.r, d.redondo ? sp * 1.2 : sp], i * 2);
      p.set(d.x, d.y + 0.55, d.z); q.setFromAxisAngle(Y, d.yaw); M.compose(p, q, s); mesh.setMatrixAt(i, M);
      const R = Math.hypot(d.hx, d.hz) + sp + 1; x0 = Math.min(x0, d.x - R); x1 = Math.max(x1, d.x + R); z0 = Math.min(z0, d.z - R); z1 = Math.max(z1, d.z + R); y0 = Math.min(y0, d.y); y1 = Math.max(y1, d.y + d.h);
    });
    mesh.geometry = geo.clone(); // (cada região tem os seus atributos por instância; a geometria base é a mesma)
    mesh.geometry.setAttribute("aDim", new THREE.InstancedBufferAttribute(dim, 4)); mesh.geometry.setAttribute("aPar", new THREE.InstancedBufferAttribute(par, 2));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Math.hypot(x1 - x0, z1 - z0, y1 - y0) / 2);
    mesh.frustumCulled = true; mesh.castShadow = mesh.receiveShadow = false; mesh.renderOrder = 1; mesh.name = `${tr.id}-contato`; mesh.userData.semContato = true;
    add(mesh); meshes.push(mesh);
  }
  tr.contato = { malhas: meshes, caixas: caixas.length, material: mat };
  return tr.contato;
}

// ---------- os carros ----------
// o formato do carro no chão, no sistema do carro (a frente em −z, comprimento L): quatro manchas de pneu (mais escuras), a barriga entre
// elas (suave) e um halo bem fraco em volta. uL é o comprimento do carro em unidades da pista.
const VS_CARRO = /* glsl */ `
attribute float aFade; varying vec2 vQ; varying float vF; uniform float uL;
#include <fog_pars_vertex>
void main() {
  vQ = position.xz; vF = aFade;
  vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4(position.x * uL * 0.75, 0.0, position.z * uL * 0.75, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FS_CARRO = /* glsl */ `
uniform float uForca; varying vec2 vQ; varying float vF;
#include <fog_pars_fragment>
float cx(vec2 p, vec2 c, vec2 h, float r) { vec2 q = abs(p - c) - h + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 p = vQ * 0.75; // em comprimentos de carro (de -0,5 a 0,5 ao longo do corpo; a frente é −z)
  float rodas = min(min(cx(p, vec2(-0.155, -0.31), vec2(0.045, 0.06), 0.03), cx(p, vec2(0.155, -0.31), vec2(0.045, 0.06), 0.03)),
                    min(cx(p, vec2(-0.155, 0.27), vec2(0.055, 0.075), 0.035), cx(p, vec2(0.155, 0.27), vec2(0.055, 0.075), 0.035)));
  float corpo = cx(p, vec2(0.0, -0.02), vec2(0.075, 0.36), 0.05);
  float a = 0.34 * (1.0 - smoothstep(0.0, 0.06, rodas)) + 0.16 * (1.0 - smoothstep(0.0, 0.07, corpo)) + 0.05 * (1.0 - smoothstep(0.0, 0.2, corpo));
  a *= uForca * vF; if (a < 0.003) discard;
  gl_FragColor = vec4(0.0, 0.0, 0.02, a);
  #include <fog_fragment>
}`;
const MAX_CARROS = 26;
let carros = null, carrosLado = null;
function criarCarros(scene) {
  const g = new THREE.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS_CARRO, fragmentShader: FS_CARRO, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uForca: { value: 1 }, uL: { value: 56 } }]), fog: true,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
  g.setAttribute("aFade", new THREE.InstancedBufferAttribute(new Float32Array(MAX_CARROS).fill(1), 1));
  carros = new THREE.InstancedMesh(g, mat, MAX_CARROS); carros.frustumCulled = false; carros.count = 0; carros.renderOrder = 2; carros.name = "sombra-contato-carros"; carros.userData.semContato = true;
  carros.instanceMatrix.setUsage(THREE.DynamicDrawUsage); carrosLado = new THREE.Matrix4(); scene.add(carros);
}
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _Y = new THREE.Vector3(0, 1, 0);
// uma vez por quadro: um instância por carro à vista, no pé do grupo do carro e girada como ele. Sem chuva a sombra é a mesma (é contato).
export function passoContato(race, scene, ligado = true) {
  if (!race || !scene) return;
  if (!carros) criarCarros(scene);
  if (carros.parent !== scene) scene.add(carros);
  if (!ligado) { carros.visible = false; return; }
  let n = 0;
  const poe = (k) => {
    if (!k || !k.g || k.g.visible === false || n >= MAX_CARROS) return;
    const g = k.g; _p.set(g.position.x, g.position.y + 0.45, g.position.z); _q.setFromAxisAngle(_Y, g.rotation.y);
    if (k.L) carros.material.uniforms.uL.value = k.L;
    carrosLado.compose(_p, _q, _s); carros.setMatrixAt(n++, carrosLado);
  };
  poe(race.kart); if (race.ghosts) for (const gh of race.ghosts.values()) poe(gh.kart);
  carros.count = n; carros.visible = n > 0; carros.instanceMatrix.needsUpdate = true;
}
export function forcaContato(v) { // 0 a 1 (ver a qualidade em jogo.js/clima-visual.js)
  if (carros) carros.material.uniforms.uForca.value = v;
}
