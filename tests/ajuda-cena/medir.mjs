// Mede o custo de desenhar a pista (sem WebGL): conta, como o renderer, uma chamada de desenho por malha visível (por grupo
// de material), os triângulos, os materiais, as texturas e as sombras. As medidas "da câmera" usam o frustum da câmera
// do jogo (68°, far 16000) atrás do carro em vários pontos da volta; a sombra conta quem cai nos 520 × 520 em volta do carro.
//   node tests/ajuda-cena/medir.mjs monaco interlagos ...
import { montar } from "./index.mjs";
import { pathToFileURL, fileURLToPath } from "node:url";

export function contar(THREE, raiz, { frustum = null, sombra = null } = {}) {
  const r = { chamadas: 0, triangulos: 0, malhas: 0, instanciadas: 0, instancias: 0, sombraChamadas: 0, sombraTriangulos: 0, materiais: new Set(), geometrias: new Set(), texturas: new Set(), luzes: 0, transparentes: 0 };
  const esfera = new THREE.Sphere(), caixa = new THREE.Box3();
  const visivel = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  raiz.updateMatrixWorld(true);
  raiz.traverse((o) => {
    if (o.isLight) { r.luzes++; return; }
    if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite) || !visivel(o)) return;
    const g = o.geometry; if (!g && !o.isSprite) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    let tri = 0;
    if (g) { const idx = g.index ? g.index.count : g.attributes.position.count; tri = Math.floor(idx / 3); }
    const n = o.isInstancedMesh ? o.count : 1;
    const calcEsfera = () => {
      if (o.isInstancedMesh) { if (!o.boundingSphere) o.computeBoundingSphere(); esfera.copy(o.boundingSphere).applyMatrix4(o.matrixWorld); }
      else { if (!g.boundingSphere) g.computeBoundingSphere(); esfera.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); }
      return esfera;
    };
    const naTela = !frustum || !o.frustumCulled || !g || frustum.intersectsSphere(calcEsfera());
    if (naTela) {
      const grupos = Array.isArray(o.material) && g.groups.length ? g.groups.length : 1;
      r.chamadas += grupos; r.triangulos += tri * n; r.malhas++; if (o.isInstancedMesh) { r.instanciadas++; r.instancias += n; }
      for (const m of mats) { r.materiais.add(m); if (m.transparent) r.transparentes++; for (const k of ["map", "emissiveMap", "normalMap", "roughnessMap", "alphaMap"]) if (m[k]) r.texturas.add(m[k]); }
      if (g) r.geometrias.add(g);
    }
    if (sombra && o.castShadow && (!g || sombra.intersectsSphere(calcEsfera()))) { r.sombraChamadas++; r.sombraTriangulos += tri * n; }
  });
  return r;
}
const tamanhoTex = (t) => { const i = t.image; return i && i.width ? i.width * i.height : 0; };
export async function medir(id, { pontos = 12 } = {}) {
  const { tr, THREE } = await montar(id);
  const total = contar(THREE, tr.grp);
  const cam = new THREE.PerspectiveCamera(68, 16 / 9, 2, 16000), fr = new THREE.Frustum(), m4 = new THREE.Matrix4();
  const med = { chamadas: 0, triangulos: 0, sombraChamadas: 0, sombraTriangulos: 0, materiaisNaTela: 0 }, picos = { chamadas: 0, triangulos: 0 };
  for (let k = 0; k < pontos; k++) {
    const i = Math.floor((k / pontos) * tr.n), p = tr.pts[i], q = tr.pts[(i + 12) % tr.n];
    cam.position.set(p.x - p.tx * 30, p.h + 14, p.y - p.ty * 30); cam.lookAt(q.x, q.h + 2, q.y); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    fr.setFromProjectionMatrix(m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const sb = new THREE.Sphere(new THREE.Vector3(p.x, p.h, p.y), 260 * Math.SQRT2);
    const sf = { intersectsSphere: (s) => sb.intersectsSphere(s) };
    const c = contar(THREE, tr.grp, { frustum: fr, sombra: sf });
    for (const kk of Object.keys(med)) med[kk] += (kk === "materiaisNaTela" ? c.materiais.size : c[kk]) / pontos;
    picos.chamadas = Math.max(picos.chamadas, c.chamadas + c.sombraChamadas); picos.triangulos = Math.max(picos.triangulos, c.triangulos + c.sombraTriangulos);
  }
  const tex = [...total.texturas].map(tamanhoTex);
  return {
    id, malhasNaCena: total.malhas, instanciadas: total.instanciadas, instancias: total.instancias, chamadasNaCena: total.chamadas, triangulosNaCena: total.triangulos,
    materiais: total.materiais.size, geometrias: total.geometrias.size, texturas: total.texturas.size, pixelsDeTextura: tex.reduce((a, b) => a + b, 0), maiorTextura: Math.max(0, ...tex),
    luzesNaPista: total.luzes, castShadowMalhas: (() => { let c = 0; tr.grp.traverse((o) => { if (o.isMesh && o.castShadow) c++; }); return c; })(),
    camera: { chamadas: Math.round(med.chamadas), triangulos: Math.round(med.triangulos), materiais: Math.round(med.materiaisNaTela), sombraChamadas: Math.round(med.sombraChamadas), sombraTriangulos: Math.round(med.sombraTriangulos), chamadasTotalComSombra: Math.round(med.chamadas + med.sombraChamadas), picoChamadas: picos.chamadas },
  };
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  for (const id of process.argv.slice(2).length ? process.argv.slice(2) : ["monaco"]) console.log(JSON.stringify(await medir(id)));
}
