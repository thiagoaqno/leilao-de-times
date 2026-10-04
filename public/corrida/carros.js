// Corrida da Galera — os carros esportivos 3D, a vitrine da garagem e a fumaça.
import * as THREE from "three";
import { scene } from "./cena.js";
import { montarKart, animarKart, soltarKart } from "../kart3d.js";

// ---------- os karts 3D ----------
// Cada "carro" (os 5 da garagem, com a física de cada um) é um kart com o piloto sentado, com a skin escolhida (as
// mesmas da Pelada): o kart vem de /kart3d.js, nas medidas do carro (L = comprimento, W = largura, em metros).
// Personalização: cor da pintura, cor das rodas, aerofólio (sem/baixo/alto) e faixas (sem/dupla no bico/lateral).
export const CARS3 = {
  equilibrado: { L: 4.4, W: 2.6 },
  foguete: { L: 4.8, W: 2.5 },
  formiga: { L: 4.1, W: 2.6 },
  drifteiro: { L: 4.4, W: 2.5 },
  tanque: { L: 4.6, W: 2.9 },
};
export const KS = 10; // metros do modelo -> unidades da pista
export const MODS3 = window.Pistas.MODS, MODS_PADRAO = window.Pistas.MODS_PADRAO;
const KART_L = 2.45; // comprimento do kart de /kart3d.js, em metros
export function makeKart(color, model, ghost = false, name = "", mods = MODS_PADRAO, target = scene, skin = "padrao") {
  const tipo = CARS3[model] ? model : "equilibrado", spec = CARS3[tipo], md = { ...MODS_PADRAO, ...(mods || {}) };
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const kt = montarKart({ cor: color, skin, tipo, aro: MODS3.rodas[md.rodas]?.c || "#c3c7cf", aero: md.aero, faixa: md.faixa });
  const sc = spec.L / KART_L; kt.g.scale.setScalar(sc * KS); body.add(kt.g);
  kt.g.traverse((o) => { if (o.isMesh) o.castShadow = !ghost; });
  if (ghost) for (const m of kt.mats) { m.transparent = true; m.opacity = 0.5; m.depthWrite = false; }
  if (name) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d");
    x.font = "bold 34px Figtree, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 7; x.strokeStyle = "#000c"; x.strokeText(name, 128, 32); x.fillStyle = color; x.fillText(name, 128, 32);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, opacity: ghost ? 0.8 : 1 })); sp.scale.set(30, 7.5, 1); sp.position.y = 30; sp.renderOrder = 5; g.add(sp);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: ghost ? 0.15 : 0.32, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(spec.W / 2 * KS, (spec.L / 2 + 0.2) * KS, 1); g.add(shadow);
  target.add(g);
  // primeira pessoa: o piloto some (é você) e a câmera fica no lugar dos olhos dele
  const eye = { u: spec.L / 2 - kt.olho.z * sc, h: kt.olho.y * sc };
  return { g, body, kt, shadow, mats: kt.mats, steerV: 0, target, sc, eye, roof: kt.piloto, cabin: new THREE.Object3D(), roofBits: [] };
}
export function poseKart(k, x, y, z, a, v, steer, ground, dt, lean = 0, pitch = 0) {
  k.g.position.set(x, z, y); k.g.rotation.set(0, -a - Math.PI / 2, 0);
  k.body.rotation.set(pitch, 0, lean);
  k.steerV += (steer - k.steerV) * 0.3;
  animarKart(k.kt, (v * dt) / (k.sc * KS), k.steerV);
  k.shadow.position.y = ground - z + 0.7;
}
export function dropKart(k) {
  if (!k) return; (k.target || scene).remove(k.g);
  soltarKart(k.kt); k.g.traverse((o) => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose(); } });
}

// prévia 3D do carro na garagem (um renderizador pequeno, só para as fotos)
const prevR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
prevR.setSize(240, 135, false); prevR.toneMapping = THREE.ACESFilmicToneMapping;
const prevScene = new THREE.Scene(), prevCam = new THREE.PerspectiveCamera(30, 240 / 135, 1, 500);
prevScene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
{ const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(-40, 60, -30); prevScene.add(d); }
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.9 })); fl.rotation.x = -Math.PI / 2; prevScene.add(fl); }
const PREV = new Map();
export function carPreview(cv, color, model, mods, skin) {
  const key = [color, model, JSON.stringify(mods || {}), skin].join("|");
  let url = PREV.get(key);
  if (!url) {
    const k = makeKart(color, model, false, "", mods, prevScene, skin);
    k.g.rotation.y = Math.PI * 0.78; // de três quartos, mostrando a frente
    prevCam.position.set(-58, 26, -52); prevCam.lookAt(0, 6, 0);
    prevR.render(prevScene, prevCam); url = prevR.domElement.toDataURL(); PREV.set(key, url);
    dropKart(k);
  }
  const img = new Image(); img.onload = () => { const c = cv.getContext("2d"); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(img, 0, 0, cv.width, cv.height); }; img.src = url;
}

// fumaça dos pneus e poeira da grama
const puffs = [], puffGeo = new THREE.SphereGeometry(1, 8, 6), puffMats = {};
export function puff(x, y, z, color = "#e6e6e6", s = 3) {
  if (puffs.length > 160) { const o = puffs.shift(); scene.remove(o.m); }
  const mat = (puffMats[color] ||= new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false }));
  const m = new THREE.Mesh(puffGeo, mat.clone()); m.position.set(x, y, z); m.scale.setScalar(s); scene.add(m);
  puffs.push({ m, t: 0.7, vy: 6 + Math.random() * 6 });
}
export function stepPuffs(dt) { for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.t -= dt; if (p.t <= 0) { scene.remove(p.m); p.m.material.dispose(); puffs.splice(i, 1); continue; } p.m.position.y += p.vy * dt; p.m.scale.multiplyScalar(1 + dt * 1.6); p.m.material.opacity = p.t * 0.8; } }
