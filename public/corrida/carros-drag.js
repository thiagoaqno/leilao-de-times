// Modelos do Drag na Corrida. Cada GLB baixa uma vez; só os carros escolhidos na sala entram no cache.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { MODELOS } from "./drag/modelos.js";

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const carregando = new Map(), prontos = new Map();
export const carroDragPronto = (id) => prontos.has(id);

export function prepararCarroDrag(id) {
  if (!MODELOS[id]) return Promise.reject(new Error("Carro do Drag inválido"));
  if (!carregando.has(id)) carregando.set(id, loader.loadAsync(`/corrida/drag/models/${id}.glb`)
    .then((gltf) => { prontos.set(id, gltf.scene); return gltf.scene; })
    .catch((e) => { carregando.delete(id); console.warn("Corrida: modelo do Drag não carregou", id, e); throw e; }));
  return carregando.get(id);
}

export function prepararCarrosDrag(jogadores) {
  return Promise.allSettled([...new Set(jogadores.map((p) => p.carDrag).filter(Boolean))].map(prepararCarroDrag));
}

// A frente dos GLBs fica em +z; a do F1 fica em -z. O encaixe conserva a escala e a pintura usadas na garagem do Drag.
export function montarCarroDrag(id, cor, leve = false) {
  const fonte = prontos.get(id); if (!fonte) return null;
  const modelo = MODELOS[id], carro = fonte.clone(true), copias = new Map();
  carro.rotation.y += modelo.giro || 0; carro.updateMatrixWorld(true);
  let caixa = new THREE.Box3().setFromObject(carro), tamanho = caixa.getSize(new THREE.Vector3());
  if (tamanho.x > tamanho.z * 1.1) {
    carro.rotation.y += Math.PI / 2; carro.updateMatrixWorld(true);
    caixa = new THREE.Box3().setFromObject(carro); tamanho = caixa.getSize(new THREE.Vector3());
  }
  const escala = Math.min(2.1 / tamanho.x, 4.6 / tamanho.z, 2.0 / tamanho.y);
  const centro = caixa.getCenter(new THREE.Vector3());
  carro.scale.multiplyScalar(escala);
  carro.position.set(-centro.x * escala, -caixa.min.y * escala, -centro.z * escala);
  carro.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = !leve; o.receiveShadow = false;
    const adaptar = (m) => {
      if (!modelo.pintura?.test(m.name) && !(m.transmission > 0)) return m;
      if (!copias.has(m)) {
        const c = m.clone();
        if (modelo.pintura?.test(m.name)) { c.map = null; c.color.set(cor); }
        if (c.transmission > 0) { c.transmission = 0; c.transparent = true; c.opacity = Math.min(c.opacity, 0.45); }
        copias.set(m, c);
      }
      return copias.get(m);
    };
    o.material = Array.isArray(o.material) ? o.material.map(adaptar) : adaptar(o.material);
  });
  const g = new THREE.Group(); g.rotation.y = Math.PI; g.add(carro);
  return { g, mats: [...copias.values()], pintura: [...copias.values()].find((m) => modelo.pintura?.test(m.name)),
    olho: { z: modelo.banco?.[2] || 0, y: modelo.banco?.[1] || 0.95 },
    escapamento: { z: tamanho.z * escala / 2, y: 0.45 } };
}
