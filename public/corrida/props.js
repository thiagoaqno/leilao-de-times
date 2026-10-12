// Enfeites do Racing Kit do Kenney (CC0, public/corrida/kenney/): a árvore e a arquibancada coberta das pistas.
// Abrem pela rede; até chegarem as pistas usam os enfeites de formas simples, e quando chegam `aoCarregar` refaz as pistas.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const PROPS = {};
const ouvintes = [];
export const aoCarregar = (f) => (PROPS.pronto ? f() : ouvintes.push(f));

// as peças do modelo (uma por material), com a origem no meio do pé e a escala de 1 = o tamanho do modelo
function pecas(cena) {
  cena.updateMatrixWorld(true);
  const caixa = new THREE.Box3().setFromObject(cena), c = caixa.getCenter(new THREE.Vector3()), out = [];
  cena.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); geo.translate(-c.x, -caixa.min.y, -c.z);
    const m = o.material, mat = new THREE.MeshStandardMaterial({ color: m.color, map: m.map || null, roughness: 0.85 });
    out.push({ geo, mat });
  });
  return { pecas: out, tam: caixa.getSize(new THREE.Vector3()) };
}
const gl = new GLTFLoader();
export const propsPronto = Promise.all([
  gl.loadAsync("/corrida/kenney/treeLarge.glb").then((g) => { PROPS.arvore = pecas(g.scene); }),
  gl.loadAsync("/corrida/kenney/grandStandCovered.glb").then((g) => { PROPS.arquibancada = pecas(g.scene); }),
]).then(() => { PROPS.pronto = true; for (const f of ouvintes.splice(0)) f(); }).catch(() => { /* ficam os enfeites simples */ });
