// Pelada da Galera — ajudantes de desenho sem efeito colateral (texturas desenhadas em canvas, material simples,
// sorteio com semente e "liberar" memória). Ficam separados de cena.js para outros jogos (o Tênis) poderem usar os
// bonecos da Pelada sem levar junto o renderizador e a cena dela.
import * as THREE from "three";

export const rng = (seed) => { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };
let aniso = 8;
export const definirAniso = (n) => (aniso = n); // cena.js passa o máximo da placa de vídeo
export function canvasTex(w, hh, draw, repeat = false, pixel = false) {
  const c = document.createElement("canvas"); c.width = w; c.height = hh; draw(c.getContext("2d"), w, hh, rng(w * 31 + hh));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  return t;
}
export function M(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o }); }
// solta da memória tudo o que um pedaço da cena criou (geometrias, materiais e texturas)
export function liberar(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose?.();
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
      for (const k of ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "alphaMap", "aoMap"]) m[k]?.dispose?.();
      m.dispose();
    }
    if (o.isLight && o.shadow?.map) o.shadow.map.dispose();
  });
}
