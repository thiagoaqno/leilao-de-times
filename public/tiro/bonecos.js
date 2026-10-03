// Tiro da Galera — armas e bonecos de caixinhas, e a arma na mão (primeira pessoa).
import * as THREE from "three";
import { scene, canvasTex } from "./cena.js";

// ======================================================================
// Armas e bonecos (feitos de caixinhas)
// ======================================================================
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const GM = { metal: M(0x2a2b2e, { metalness: 0.6, roughness: 0.4 }), metal2: M(0x3b3d42, { metalness: 0.5, roughness: 0.45 }), wood: M(0x8a4a22, { roughness: 0.55 }), wood2: M(0x6e3a1a), awp: M(0x56664a, { roughness: 0.7 }), black: M(0x151515, { roughness: 0.5 }), glass: M(0x1a2a3a, { metalness: 0.9, roughness: 0.1 }) };
function part(g, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; }
const BG = (w, hh, d) => new THREE.BoxGeometry(w, hh, d);
const CY = (r, len, n = 10) => { const g = new THREE.CylinderGeometry(r, r, len, n); g.rotateX(Math.PI / 2); return g; };
function makeAK() {
  const g = new THREE.Group();
  part(g, BG(0.06, 0.08, 0.42), GM.metal, 0, 0.03, -0.12);
  part(g, BG(0.056, 0.03, 0.36), GM.metal2, 0, 0.08, -0.1);
  part(g, BG(0.05, 0.09, 0.32), GM.wood, 0, 0.0, 0.24, -0.12);
  part(g, BG(0.045, 0.12, 0.05), GM.wood2, 0, -0.07, 0.03, 0.35);
  part(g, BG(0.066, 0.065, 0.22), GM.wood, 0, 0.02, -0.42);
  part(g, BG(0.05, 0.035, 0.18), GM.wood, 0, 0.07, -0.41);
  part(g, CY(0.012, 0.36), GM.metal, 0, 0.035, -0.68);
  part(g, BG(0.012, 0.05, 0.012), GM.metal, 0, 0.075, -0.8);
  part(g, CY(0.019, 0.05), GM.metal, 0, 0.035, -0.87);
  part(g, BG(0.045, 0.13, 0.07), GM.metal2, 0, -0.07, -0.2, 0.22);
  part(g, BG(0.045, 0.11, 0.07), GM.metal2, 0, -0.17, -0.16, 0.5);
  g.userData.muzzle = new THREE.Vector3(0, 0.035, -0.9);
  return g;
}
function makeAWP() {
  const g = new THREE.Group();
  part(g, BG(0.07, 0.1, 0.72), GM.awp, 0, 0, -0.16);
  part(g, BG(0.06, 0.14, 0.3), GM.awp, 0, -0.02, 0.33);
  part(g, BG(0.04, 0.11, 0.05), GM.black, 0, -0.08, 0.1, 0.3);
  part(g, CY(0.014, 0.62), GM.black, 0, 0.03, -0.8);
  part(g, CY(0.022, 0.09), GM.black, 0, 0.03, -1.13);
  part(g, CY(0.03, 0.34, 14), GM.black, 0, 0.11, -0.12);
  part(g, CY(0.042, 0.07, 14), GM.black, 0, 0.11, -0.31);
  part(g, CY(0.036, 0.06, 14), GM.black, 0, 0.11, 0.07);
  part(g, CY(0.034, 0.005, 14), GM.glass, 0, 0.11, -0.345);
  part(g, BG(0.02, 0.05, 0.03), GM.black, 0, 0.07, -0.22);
  part(g, BG(0.02, 0.05, 0.03), GM.black, 0, 0.07, -0.02);
  part(g, BG(0.07, 0.015, 0.015), GM.metal2, 0.05, 0.045, 0.06);
  part(g, BG(0.05, 0.07, 0.1), GM.black, 0, -0.08, -0.12);
  g.userData.muzzle = new THREE.Vector3(0, 0.03, -1.18);
  return g;
}
function makeDeagle() { // pistola grande: ferrolho prateado, cabo preto
  const g = new THREE.Group(), steel = M(0xb9bec4, { metalness: 0.8, roughness: 0.3 });
  part(g, BG(0.042, 0.05, 0.27), steel, 0, 0.045, -0.11);
  part(g, BG(0.036, 0.03, 0.22), GM.metal, 0, 0.005, -0.1);
  part(g, BG(0.036, 0.11, 0.055), GM.black, 0, -0.06, 0.02, 0.22);
  part(g, BG(0.012, 0.03, 0.04), GM.metal, 0, -0.02, -0.04);
  part(g, BG(0.01, 0.012, 0.012), GM.metal, 0, 0.076, -0.22);
  g.userData.muzzle = new THREE.Vector3(0, 0.045, -0.26);
  return g;
}
function makeKnife() { // faca: cabo preto, guarda e lâmina prateada
  const g = new THREE.Group(), blade = M(0xd7dbe0, { metalness: 0.9, roughness: 0.2 });
  part(g, BG(0.03, 0.032, 0.11), GM.black, 0, 0, 0.02);
  part(g, BG(0.055, 0.014, 0.014), GM.metal, 0, 0, -0.04);
  part(g, BG(0.008, 0.036, 0.19), blade, 0, 0.006, -0.14);
  part(g, BG(0.008, 0.02, 0.04), blade, 0, 0.014, -0.25, 0.5);
  g.userData.muzzle = new THREE.Vector3(0, 0, -0.27);
  return g;
}
const TEAMCOL = { A: 0x2f6fde, B: 0xe0742a }, TEAMDARK = { A: 0x1d3f7a, B: 0x8a3f12 };
function nameSprite(text, color) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d");
  x.font = "bold 34px Figtree, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 6; x.strokeStyle = "#000a"; x.strokeText(text, 128, 32); x.fillStyle = color; x.fillText(text, 128, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(1.2, 0.3, 1); s.renderOrder = 10; return s;
}
export function makePlayer(team, name, mate) {
  const g = new THREE.Group(), shirt = M(TEAMCOL[team] || 0x888888), dark = M(TEAMDARK[team] || 0x444444), pants = M(0x3a3f47), skin = M(0xd6a47a), boot = M(0x1e1e1e);
  const legs = [];
  for (const sx of [-0.11, 0.11]) { const l = new THREE.Group(); l.position.set(sx, 0.85, 0); part(l, BG(0.17, 0.75, 0.19), pants, 0, -0.38, 0); part(l, BG(0.18, 0.12, 0.26), boot, 0, -0.79, -0.03); g.add(l); legs.push(l); }
  part(g, BG(0.46, 0.62, 0.26), shirt, 0, 1.15, 0);
  part(g, BG(0.48, 0.4, 0.29), dark, 0, 1.2, 0);
  part(g, BG(0.5, 0.08, 0.3), M(0x2a2a2a), 0, 0.9, 0);
  const head = new THREE.Group(); head.position.set(0, 1.46, 0); g.add(head);
  part(head, BG(0.26, 0.28, 0.26), skin, 0, 0.15, 0);
  part(head, BG(0.29, 0.1, 0.29), dark, 0, 0.31, 0);
  part(head, BG(0.3, 0.03, 0.12), dark, 0, 0.27, -0.16);
  part(head, BG(0.2, 0.045, 0.02), M(0x111111), 0, 0.17, -0.135);
  const upper = new THREE.Group(); upper.position.set(0, 1.38, 0); g.add(upper);
  part(upper, BG(0.12, 0.12, 0.42), shirt, 0.21, -0.08, -0.17, 0, 0.05);
  part(upper, BG(0.12, 0.12, 0.42), shirt, -0.12, -0.08, -0.28, 0, -0.45);
  const gun = new THREE.Group(); gun.position.set(0.1, -0.08, -0.35); upper.add(gun);
  const guns = { ak: makeAK(), awp: makeAWP(), deagle: makeDeagle(), faca: makeKnife() }; gun.add(guns.ak, guns.awp, guns.deagle, guns.faca);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  let tag = null; if (mate) { tag = nameSprite(name, "#9be27a"); tag.position.y = 2.05; g.add(tag); }
  g.userData = { legs, head, upper, guns, gunGroup: gun, tag, mats: { head: skin, hair: dark, torso: shirt, upperArm: shirt, forearm: shirt, thigh: pants, shin: pants, boot } };
  return g;
}

// ---------- arma na mão (primeira pessoa): cena separada, desenhada por cima, para não atravessar paredes ----------
export const vScene = new THREE.Scene(), vCam = new THREE.PerspectiveCamera(54, 1, 0.01, 10);
vScene.add(new THREE.HemisphereLight(0xdfeaff, 0x806040, 1.6));
const vSun = new THREE.DirectionalLight(0xfff0d6, 2.2); vSun.position.set(0.5, 1, 0.3); vScene.add(vSun);
export const vm = new THREE.Group(); vScene.add(vm);
export const VM = { ak: makeAK(), awp: makeAWP(), deagle: makeDeagle(), faca: makeKnife() };
const glove = M(0x3a3a3a, { roughness: 0.8 }), sleeve = M(0x6b7f5a, { roughness: 0.9 });
for (const [k, gun] of Object.entries(VM)) {
  // luvas e antebraços curtos, saindo pela parte de baixo da tela
  const wrap = new THREE.Group(); wrap.add(gun);
  const gz = k === "awp" ? 0.1 : 0.03, oneHand = k === "deagle" || k === "faca";
  part(wrap, BG(0.06, 0.08, 0.09), glove, 0.005, k === "faca" ? -0.01 : -0.08, gz);
  part(wrap, BG(0.07, 0.07, 0.26), sleeve, 0.02, k === "faca" ? -0.1 : -0.17, gz + 0.14, 0.75, 0.08);
  if (!oneHand) { part(wrap, BG(0.07, 0.06, 0.1), glove, 0, -0.03, -0.42); part(wrap, BG(0.07, 0.07, 0.3), sleeve, -0.07, -0.13, -0.27, 0.6, -0.5); }
  wrap.scale.setScalar(0.85);
  wrap.visible = false; vm.add(wrap); VM[k] = wrap; wrap.userData.muzzle = gun.userData.muzzle;
}
// clarão do tiro
const flashTex = canvasTex(128, (x, s) => {
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, "#fffbe0"); g.addColorStop(0.25, "#ffd060"); g.addColorStop(0.6, "#ff800055"); g.addColorStop(1, "#ff800000");
  x.fillStyle = g; x.translate(s / 2, s / 2); for (let i = 0; i < 6; i++) { x.rotate(Math.PI / 3); x.beginPath(); x.moveTo(0, -4); x.lineTo(s / 2, 0); x.lineTo(0, 4); x.fill(); } x.beginPath(); x.arc(0, 0, s / 4, 0, 7); x.fill();
});
export const vFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); vFlash.visible = false; vScene.add(vFlash);
export const flashLight = new THREE.PointLight(0xffc060, 0, 8, 2); scene.add(flashLight);
