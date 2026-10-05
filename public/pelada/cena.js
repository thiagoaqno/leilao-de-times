// Pelada da Galera — o 3D básico: renderer, cena, câmera, céu, luzes, a bola (malha), texturas desenhadas em canvas
// e as marcas no chão (mira, anel do passe, marca de quem eu controlo).
import * as THREE from "three";
import { clamp, canvas } from "./estado.js";

// ======================================================================
// 3D: céu, luz e a arena (montada de novo quando muda o modo)
// ======================================================================
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfdde8, 80, 260);
export const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 800);
import { rng, canvasTex, M, liberar, definirAniso } from "./tex.js";
export { rng, canvasTex, M, liberar };
definirAniso(renderer.capabilities.getMaxAnisotropy());
// céu: uma esfera com degradê (as cores mudam com a quadra; no ginásio fica escondida)
const skyGeo = new THREE.SphereGeometry(600, 32, 16);
export const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
scene.add(sky);
export function pintarCeu([topC, midC, lowC]) {
  const pos = skyGeo.attributes.position, col = [], top = new THREE.Color(topC), mid = new THREE.Color(midC), low = new THREE.Color(lowC);
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 600, c = y > 0.08 ? mid.clone().lerp(top, Math.min(1, (y - 0.08) / 0.6)) : low.clone().lerp(mid, clamp((y + 0.05) / 0.13, 0, 1)); col.push(c.r, c.g, c.b); }
  skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
}
export const hemiL = new THREE.HemisphereLight(0xd8e8ff, 0x4a6a3a, 1.4); scene.add(hemiL);
export const sunL = new THREE.DirectionalLight(0xfff0d8, 2.4);
sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.03;
scene.add(sunL, sunL.target);

// ---------- bola ----------
export const ballTex = canvasTex(512, 256, (x, w, hh) => {
  x.fillStyle = "#fafafa"; x.fillRect(0, 0, w, hh); x.fillStyle = "#1a1a1a";
  const spots = [[0.1, 0.5], [0.3, 0.5], [0.5, 0.5], [0.7, 0.5], [0.9, 0.5], [0.2, 0.18], [0.6, 0.18], [0.4, 0.82], [0.8, 0.82], [0, 0.04], [0.5, 0.96]];
  for (const [u, v] of spots) { x.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; const px = u * w + Math.cos(a) * 30 / Math.max(0.35, Math.sin(v * Math.PI)), py = v * hh + Math.sin(a) * 30; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.fill(); }
});
// bola de praia do Rocket: gomos coloridos com as tampinhas brancas
export const beachTex = canvasTex(512, 256, (x, w, hh) => {
  const cols = ["#e53935", "#fdd835", "#1e88e5", "#ffffff", "#43a047", "#fb8c00"];
  cols.forEach((c, i) => { x.fillStyle = c; x.fillRect((i * w) / 6, 0, w / 6 + 1, hh); });
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, hh * 0.1); x.fillRect(0, hh * 0.9, w, hh * 0.1);
});
export const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.45 }));
ballMesh.castShadow = true; scene.add(ballMesh);
export const blob = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; scene.add(blob);
export const landMark = new THREE.Mesh(new THREE.RingGeometry(0.55, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.6, depthWrite: false }));
landMark.rotation.x = -Math.PI / 2; landMark.visible = false; scene.add(landMark);

// mira no chão (a pé): setinha na frente do jogador mostrando para onde vai a bola
export const aim = new THREE.Mesh(new THREE.RingGeometry(0.0, 0.2, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
aim.rotation.x = -Math.PI / 2; scene.add(aim);
// anel embaixo do companheiro que vai receber o passe (assistência de passe)
export const passMark = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 32), new THREE.MeshBasicMaterial({ color: 0x7cf29a, transparent: true, opacity: 0.8, depthWrite: false }));
passMark.rotation.x = -Math.PI / 2; passMark.visible = false; scene.add(passMark);

// marca em cima de quem eu controlo (contra bots, para achar o seu jogador no meio dos companheiros)
export const meMark = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 4), new THREE.MeshBasicMaterial({ color: 0xffd84a }));
meMark.rotation.x = Math.PI; meMark.visible = false; scene.add(meMark);

// ---------- gráficos: alto, leve ou automático ----------
// Nível 0: resolução até 1,5x e sombra de 2048. Nível 1: resolução 1x e sombra de 1024. Nível 2: resolução 0,8x e sem
// sombra (só a sombrinha da bola). No automático, o jogo começa no 0 e desce um nível quando passa uns segundos abaixo
// de ~45 quadros por segundo (nunca sobe de novo sozinho, para não ficar piscando).
const lerModo = () => { try { return JSON.parse(localStorage.getItem("pelada:graficos")) || "auto"; } catch { return "auto"; } };
export const graficos = { modo: lerModo(), nivel: 0 };
export function aplicarGraficos(nivel) {
  graficos.nivel = nivel;
  const dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(nivel === 0 ? Math.min(dpr, 1.5) : nivel === 1 ? Math.min(dpr, 1) : Math.min(dpr, 0.8));
  const sombra = nivel < 2, tam = nivel === 0 ? 2048 : 1024;
  if (renderer.shadowMap.enabled !== sombra) { renderer.shadowMap.enabled = sombra; scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); }); }
  sunL.castShadow = sombra;
  if (sombra && sunL.shadow.mapSize.x !== tam) { sunL.shadow.mapSize.set(tam, tam); if (sunL.shadow.map) { sunL.shadow.map.dispose(); sunL.shadow.map = null; } }
  resize();
}
export function escolherGraficos(modo) {
  graficos.modo = modo; try { localStorage.setItem("pelada:graficos", JSON.stringify(modo)); } catch {}
  aplicarGraficos(modo === "leve" ? 2 : 0);
}
// o automático olha a média de tempo por quadro a cada ~3 s
const medida = { soma: 0, n: 0, t0: 0 };
export function medirQuadro(dtReal, agora) {
  if (graficos.modo !== "auto" || graficos.nivel >= 2 || dtReal > 0.25) return; // aba escondida/voltando: não conta
  medida.soma += dtReal; medida.n++;
  if (!medida.t0) medida.t0 = agora;
  if (agora - medida.t0 < 3) return;
  const media = medida.soma / medida.n; medida.soma = 0; medida.n = 0; medida.t0 = agora;
  if (media > 1 / 45) aplicarGraficos(graficos.nivel + 1);
}
export function resize() { const w = innerWidth, hh = innerHeight; renderer.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); }
window.addEventListener("resize", resize);