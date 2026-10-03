// Corrida da Galera — o 3D básico: renderer, cena, câmera e luzes.
import * as THREE from "three";
import { $, rng } from "./estado.js";

// ---------- corrida em 3D (Three.js): pista com relevo, câmera atrás do kart ----------
// Mundo: o traçado continua em 2D (x, y de 0 a 1600, igual ao servidor), e cada ponto da pista tem uma altura h.
// No 3D, o "y" do traçado vira o z, e a altura vira o y. 1 unidade ≈ 10 cm (um kart tem ~18 de largura).
const cv = $("screen");
export const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
export const scene = new THREE.Scene();
export const cam = new THREE.PerspectiveCamera(68, 16 / 9, 2, 9000);
export const hemi = new THREE.HemisphereLight(0xdfeaff, 0x4a5a3a, 1.3); scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.5;
Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 10, far: 1600 });
scene.add(sun, sun.target);
const maxAniso = renderer.capabilities.getMaxAnisotropy();
export function canvasTex(w, hh, draw, repeat = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = hh; draw(c.getContext("2d"), w, hh, rng(w * 7 + hh * 3));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// cores e clima de cada pista
export const LOOK = {
  monaco: { sky: [0x4fa9f5, 0xd9f0ff], fog: 0xcfe6f2, fogN: 900, fogF: 3800, hemi: [0xe8f2ff, 0x6a6a5a, 1.35], sun: [0xfff3df, 2.3], ground: ["#cdbd9a", "#bfae8a", "#d9caa9"], road: "#5b5b61", kerb: ["#d62828", "#f4f4f4"] },
  interlagos: { sky: [0x3f97e0, 0xf3e6c8], fog: 0xdfe7d8, fogN: 1000, fogF: 4200, hemi: [0xe4efff, 0x4a6a3a, 1.3], sun: [0xfff1dc, 2.3], ground: ["#3f9a3a", "#47a542", "#378331"], road: "#4b4b50", kerb: ["#e53935", "#f4f4f4"] },
  losangeles: { sky: [0x3b2a6b, 0xff9a5a], fog: 0xe8a07a, fogN: 900, fogF: 4000, hemi: [0xffd2b0, 0x5a4a5a, 1.25], sun: [0xffb070, 2.4], ground: ["#9c8a6a", "#8f7d5e", "#a89677"], road: "#3f3f46", kerb: ["#e53935", "#f4f4f4"] },
  rio: { sky: [0x3f97e0, 0xd6f1ff], fog: 0xcfeaf2, fogN: 1000, fogF: 4200, hemi: [0xeaf6ff, 0x3f6a3a, 1.35], sun: [0xfff3df, 2.4], ground: ["#3f8a3a", "#4a9a42", "#367a31"], road: "#4a4a50", kerb: ["#ffd23f", "#1f8a3a"] },
  tokyo: { sky: [0x05061a, 0x3a1d5c], fog: 0x2a1a44, fogN: 700, fogF: 3400, hemi: [0xa89cff, 0x3a2f55, 1.9], sun: [0xc9d2ff, 1.3], ground: ["#2a2b38", "#30313f", "#252633"], road: "#3c3d48", kerb: ["#4fe3ff", "#1b1c26"] },
  luigi: { sky: [0x3f97e0, 0xeaf4ff], fog: 0xdfeee0, fogN: 1000, fogF: 4200, hemi: [0xe4efff, 0x4a6a3a, 1.3], sun: [0xfff1dc, 2.3], ground: ["#4aa43f", "#53b047", "#3f9236"], road: "#55555c", kerb: ["#f2c230", "#8e3fc6"] },
  sorvete: { sky: [0x8fc6f2, 0xf2f8ff], fog: 0xe8f2fa, fogN: 900, fogF: 3800, hemi: [0xf2f8ff, 0x9fb6c8, 1.5], sun: [0xffffff, 2.2], ground: ["#f2f6fa", "#e4edf5", "#d8e6f2"], road: "#9fc3dd", kerb: ["#2f7fd1", "#f4f4f4"] },
  arcoiris: { sky: [0x02020a, 0x1a0b3a], fog: 0x0a0618, fogN: 2500, fogF: 9000, hemi: [0xc8b8ff, 0x302050, 1.9], sun: [0xe8e0ff, 1.6], ground: ["#05040c", "#0b0a1a", "#ffffff"], road: "#ffffff", kerb: ["#ff4fd8", "#4fd8ff"] },
};
