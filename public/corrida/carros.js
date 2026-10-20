// Corrida da Galera — os carros de Fórmula 1 em 3D, a vitrine da garagem e a fumaça.
import * as THREE from "three";
import { scene } from "./cena.js";
import { montarF1, animarF1, soltarF1, f1Pronto, coresDa, TAM } from "./f1.js";
let kartChegou = false; f1Pronto.then(() => { kartChegou = true; }); // a foto da garagem é refeita quando o modelo 3D chega
import { faiscas } from "./efeitos.js";

// ---------- os carros 3D ----------
// Cada "carro" (os 5 da garagem, com a física de cada um) é o mesmo F1 de f1.js, no comprimento do carro
// (L = comprimento, W = largura, em metros). Personalização: a pintura (as cores de equipe ou a cor do piloto).
export const CARS3 = {
  equilibrado: { L: 4.4, W: 2.6 },
  foguete: { L: 4.8, W: 2.5 },
  formiga: { L: 4.1, W: 2.6 },
  drifteiro: { L: 4.4, W: 2.5 },
  tanque: { L: 4.6, W: 2.9 },
};
export const KS = 10; // metros do modelo -> unidades da pista
export const MODS3 = window.Pistas.MODS, MODS_PADRAO = window.Pistas.MODS_PADRAO;
export function makeKart(color, model, ghost = false, name = "", mods = MODS_PADRAO, target = scene) {
  const tipo = CARS3[model] ? model : "equilibrado", spec = CARS3[tipo], md = { ...MODS_PADRAO, ...(mods || {}) };
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const [cor1, cor2] = coresDa(md.pintura, color);
  const kt = montarF1({ cor: ghost ? "#ffd23f" : cor1, cor2: ghost ? "#ffffff" : cor2 });
  const sc = spec.L / TAM; kt.g.scale.setScalar(sc * KS); body.add(kt.g);
  if (name) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d");
    // etiqueta escura com a cor do piloto na ponta e o nome em branco, e o triangulinho apontando para o carro
    x.font = "700 28px Figtree, sans-serif"; const w = Math.min(236, x.measureText(name).width + 50), x0 = 128 - w / 2;
    x.fillStyle = "#0b1016d9"; x.beginPath(); x.roundRect(x0, 8, w, 40, 6); x.fill(); x.beginPath(); x.moveTo(120, 48); x.lineTo(136, 48); x.lineTo(128, 58); x.fill();
    x.fillStyle = color; x.beginPath(); x.roundRect(x0 + 8, 17, 22, 22, 4); x.fill();
    x.fillStyle = "#fff"; x.textAlign = "left"; x.textBaseline = "middle"; x.fillText(name, x0 + 38, 29, w - 44);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, opacity: ghost ? 0.8 : 1 })); sp.scale.set(30, 7.5, 1); sp.position.y = 30; sp.renderOrder = 5; g.add(sp);
  }
  // a chama do escapamento (cogumelo, estilingue e estrela), como na Batalha: dois cones, laranja por fora e amarelo no miolo
  const chamas = [];
  for (const s of [-1, 1]) {
    const f = new THREE.Group(); f.position.set(s * 0.16, 0.42, 2.2); f.visible = false; kt.g.add(f);
    for (const [r, l, c, o] of [[0.13, 0.9, 0xff7a1a, 0.75], [0.07, 0.6, 0xfff07a, 0.95]]) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, l, 10), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.x = Math.PI / 2; m.position.z = l / 2; f.add(m); }
    chamas.push(f);
  }
  // tontura: estrelinhas rodando em cima da cabeça de quem foi atingido
  const tontura = new THREE.Group(); tontura.position.y = 24; tontura.visible = false; body.add(tontura);
  const estrelaGeo = new THREE.OctahedronGeometry(1.6, 0), estrelaMat = new THREE.MeshBasicMaterial({ color: 0xffe14a });
  for (let i = 0; i < 4; i++) { const e = new THREE.Mesh(estrelaGeo, estrelaMat), a = (i / 4) * Math.PI * 2; e.position.set(Math.cos(a) * 7, 0, Math.sin(a) * 7); tontura.add(e); }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: ghost ? 0.15 : 0.32, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(spec.W / 2 * KS, (spec.L / 2 + 0.2) * KS, 1); g.add(shadow);
  target.add(g);
  // primeira pessoa: a câmera fica no capacete, atrás do volante; o fantasma fica meio transparente
  const k = { g, body, kt, shadow, chamas, tontura, tAt: 0, mats: kt.mats, steerV: 0, target, sc, eye: { u: 0, h: 0 }, roof: kt.piloto, cabin: new THREE.Object3D(), roofBits: [], pitch: 0, roll: 0, giro: 0, faisca: 0 };
  const pronto = () => {
    k.mats = kt.mats; k.eye.u = spec.L / 2 - kt.olho.z * sc; k.eye.h = kt.olho.y * sc;
    for (const f of chamas) f.position.z = kt.escapamento.z;
    kt.g.traverse((o) => { if (o.isMesh) o.castShadow = !ghost; });
    if (ghost) for (const m of kt.mats) { m.transparent = true; m.opacity = 0.5; m.depthWrite = false; }
  };
  kt.aoMontar = pronto; pronto();
  return k;
}
// pitch: o bico sobe na subida e desce na descida (o relevo vem de quem chama); lean/roll: inclina para o lado.
// fx: { turbo, estrela, rodando, derrapa } — a chama, o arco-íris da estrela, o giro de quem foi atingido e as faíscas.
const _cor = new THREE.Color();
export function poseKart(k, x, y, z, a, v, steer, ground, dt, lean = 0, pitch = 0, fx = {}) {
  const suave = 1 - Math.exp(-dt * 12);
  k.pitch += (pitch - k.pitch) * suave; k.roll += (lean - k.roll) * suave;
  // atingido: o kart dá um pulo, gira e fica com estrelinhas rodando na cabeça
  if (fx.rodando) { if (!k.rodava) k.tAt = 0; k.tAt += dt; }
  k.rodava = !!fx.rodando;
  k.body.position.y = fx.rodando && k.tAt < 0.6 ? Math.sin((k.tAt / 0.6) * Math.PI) * 14 : 0;
  k.tontura.visible = !!fx.rodando; if (fx.rodando) { k.tontura.rotation.y += dt * 7; k.tontura.position.y = 24 + Math.sin(k.tAt * 9) * 1.2; }
  if (fx.rodando) k.giro += dt * 13;
  else if (k.giro > 0) { const fim = Math.ceil(k.giro / (Math.PI * 2) - 1e-6) * Math.PI * 2; k.giro += dt * 9; if (k.giro >= fim) k.giro = 0; } // termina a volta inteira
  k.g.position.set(x, z, y); k.g.rotation.set(0, -a - Math.PI / 2, 0);
  k.body.rotation.set(k.pitch, k.giro, k.roll, "YXZ");
  k.steerV += (steer - k.steerV) * 0.3;
  animarF1(k.kt, (v * dt) / (k.sc * KS), k.steerV);
  k.shadow.position.y = ground - z + 0.7;
  for (const f of k.chamas) { f.visible = !!fx.turbo; if (f.visible) f.scale.set(1, 1, 0.7 + Math.random() * 0.7); }
  const tinta = k.kt.pintura;
  if (fx.estrela) { _cor.setHSL((performance.now() / 300) % 1, 1, 0.5); tinta.emissive.copy(_cor); tinta.emissiveIntensity = 0.9; }
  else if (tinta.emissiveIntensity) tinta.emissiveIntensity = 0;
  // faíscas atrás das rodas: azul na derrapagem, dourado com a estrela
  k.faisca -= dt;
  if ((fx.derrapa || fx.estrela) && k.faisca <= 0 && v > 60) {
    k.faisca = 0.05; const fx0 = Math.cos(a), fy0 = Math.sin(a);
    for (const s of [-1, 1]) faiscas(x - fx0 * 16 - fy0 * s * 9, z + 2, y - fy0 * 16 + fx0 * s * 9, fx.estrela ? "#ffd84a" : fx.derrapa > 1 ? "#ff9a20" : "#6cc8ff", 2, 22);
  }
}
export function dropKart(k) {
  if (!k) return; (k.target || scene).remove(k.g);
  soltarF1(k.kt); for (const f of k.chamas || []) f.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
}

// prévia 3D do carro na garagem (um renderizador pequeno, só para as fotos)
const prevR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
prevR.setSize(240, 135, false); prevR.toneMapping = THREE.ACESFilmicToneMapping;
const prevScene = new THREE.Scene(), prevCam = new THREE.PerspectiveCamera(30, 240 / 135, 1, 500);
prevScene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
{ const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(-40, 60, -30); prevScene.add(d); }
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.9 })); fl.rotation.x = -Math.PI / 2; prevScene.add(fl); }
const PREV = new Map();
export function carPreview(cv, color, model, mods) {
  const key = [color, model, JSON.stringify(mods || {}), kartChegou].join("|");
  let url = PREV.get(key);
  if (!url) {
    const k = makeKart(color, model, false, "", mods, prevScene);
    k.g.rotation.y = Math.PI * 0.78; // de três quartos, mostrando a frente
    prevCam.position.set(-40, 15, -36); prevCam.lookAt(0, 4, 0);
    prevR.render(prevScene, prevCam); url = prevR.domElement.toDataURL(); PREV.set(key, url);
    dropKart(k);
  }
  const img = new Image(); img.onload = () => { const c = cv.getContext("2d"); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(img, 0, 0, cv.width, cv.height); }; img.src = url;
}

// fumaça dos pneus e poeira da grama
const puffs = [], puffGeo = new THREE.IcosahedronGeometry(1, 2), puffMats = {};
// vida: quanto tempo a nuvem dura; cresce: quanto ela incha por segundo; op: quão densa começa
export function puff(x, y, z, color = "#e6e6e6", s = 3, vida = 0.7, cresce = 1.6, op = 0.56) {
  if (puffs.length > 220) { const o = puffs.shift(); scene.remove(o.m); o.m.material.dispose(); }
  const mat = (puffMats[color] ||= new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false }));
  const m = new THREE.Mesh(puffGeo, mat.clone()); m.position.set(x, y, z); m.scale.setScalar(s); scene.add(m);
  puffs.push({ m, t: vida, t0: vida, op, cresce, vy: 6 + Math.random() * 6, vx: (Math.random() - 0.5) * 8, vz: (Math.random() - 0.5) * 8 });
}
export function stepPuffs(dt) { for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.t -= dt; if (p.t <= 0) { scene.remove(p.m); p.m.material.dispose(); puffs.splice(i, 1); continue; } p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt; p.m.scale.multiplyScalar(1 + dt * p.cresce); p.m.material.opacity = (p.t / p.t0) * p.op; } }
