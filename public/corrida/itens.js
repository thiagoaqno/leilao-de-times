// Caixas e perigos da corrida. O estado real vem da sala; estas malhas só representam os eventos.
import * as THREE from "three";
import { E, socket, sNow, $, me } from "./estado.js";
import { scene } from "./cena.js";
import { Sound } from "./sons.js";

export const ICON = { banana: "🍌", verde: "🟢", vermelho: "🔴", cogumelo: "🍄", estrela: "⭐", bomba: "💣" };
const palette = [0xff5a63, 0xffd43b, 0x54e59a, 0x54bfff, 0xb17bff];
let group = null, boxes = [], hazards = new Map(), nextHazards = [], asked = [];

function boxTexture() {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const x = cv.getContext("2d"), gradient = x.createLinearGradient(0, 0, 128, 128);
  ["#ff5f5f", "#ffd84a", "#5fff8f", "#5fc8ff", "#c45fff"].forEach((c, i) => gradient.addColorStop(i / 4, c));
  x.fillStyle = gradient; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = "#fff"; x.lineWidth = 8; x.strokeRect(4, 4, 120, 120);
  x.fillStyle = "#fff"; x.font = "bold 90px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.strokeStyle = "#0008"; x.lineWidth = 6; x.strokeText("?", 64, 70); x.fillText("?", 64, 70);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const material = new THREE.MeshStandardMaterial({ map: boxTexture(), color: 0xffffff, transparent: true, opacity: 0.88, emissive: 0x332244, roughness: 0.2 });

export function startItems(tr, enabled) {
  stopItems(); if (!enabled) return;
  group = new THREE.Group(); scene.add(group);
  boxes = window.Pistas.boxesFor(tr.id).map((b) => {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 16), material);
    cube.position.set(b.x, b.h + 18, b.y); cube.castShadow = true; group.add(cube);
    return { ...b, mesh: cube };
  });
  asked = boxes.map(() => 0);
}
export function stopItems() {
  if (group) { scene.remove(group); for (const h of hazards.values()) { h.mesh.geometry.dispose(); h.mesh.material.dispose(); } }
  group = null; boxes = []; hazards.clear(); nextHazards = []; asked = [];
}
export function setHazards(list) { nextHazards = Array.isArray(list) ? list : []; }
export function stepItems(race, dt) {
  if (!group || !race) return;
  const now = sNow(), ready = E.S?.boxReady || [], c = race.car;
  for (const b of boxes) {
    b.mesh.visible = (!ready[b.i] || ready[b.i] <= now) && (!b.hiddenUntil || b.hiddenUntil <= now);
    if (!b.mesh.visible) continue;
    b.mesh.rotation.y += dt * 1.5; b.mesh.rotation.x = Math.sin(now / 600 + b.i) * 0.16;
    b.mesh.position.y = b.h + 18 + Math.sin(now / 350 + b.i) * 2;
    if (me() && !me().item && now > race.startAt && asked[b.i] < now && Math.hypot(c.x - b.x, c.y - b.y) < 23 && Math.abs(c.z - b.h) < 20) {
      asked[b.i] = now + 650; socket.emit("item:pick", { i: b.i });
    }
  }
  const keep = new Set();
  for (const h of nextHazards) {
    keep.add(h.id);
    let obj = hazards.get(h.id);
    if (!obj) {
      const col = { banana: 0xffdd26, verde: 0x36ce56, vermelho: 0xf04446, bomba: 0x2b2d34 }[h.type] || palette[h.id % palette.length];
      const mesh = new THREE.Mesh(h.type === "banana" ? new THREE.ConeGeometry(8, 16, 6) : new THREE.SphereGeometry(h.type === "bomba" ? 12 : 10, 10, 8), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.22 }));
      mesh.position.set(h.x, h.h + 7, h.y); mesh.castShadow = true; group.add(mesh); obj = { mesh }; hazards.set(h.id, obj);
    }
    obj.tx = h.x; obj.ty = h.y; obj.th = h.h;
  }
  for (const [id, obj] of hazards) {
    if (!keep.has(id)) { group.remove(obj.mesh); obj.mesh.geometry.dispose(); obj.mesh.material.dispose(); hazards.delete(id); continue; }
    obj.mesh.position.lerp(new THREE.Vector3(obj.tx, obj.th + 7, obj.ty), 1 - Math.exp(-dt * 13)); obj.mesh.rotation.y += dt * 6;
  }
}
export function onBox(e) {
  const b = boxes[e.i]; if (!b) return;
  b.mesh.visible = false; b.hiddenUntil = sNow() + 500; Sound.pop();
}
export function onUse(e, race) {
  if (!race || e.id !== E.ME?.id) return;
  if (e.type === "cogumelo") { race.boostUntil = sNow() + 1500; Sound.sling(); }
  else if (e.type === "estrela") Sound.lap();
  else Sound.pop();
}
export function onHit(e, race) {
  if (!race || e.id !== E.ME?.id) return;
  race.spinUntil = sNow() + 1100; race.shake = 0.25;
  race.car.v *= 0.42; race.car.vx *= 0.42; race.car.vy *= 0.42; Sound.crash(130);
}
export function useItem(back = false) {
  const p = me(); if (!p || !p.item || p.rolling > sNow()) return;
  socket.emit("item:use", { back });
}
export function drawItemHud() {
  const p = me(), el = $("hItem");
  const enabled = !!E.S?.config.caixas && !!p; el.classList.toggle("hidden", !enabled);
  if (!enabled) return;
  el.textContent = p.item ? p.rolling > sNow() ? "🎁 ?" : `${ICON[p.item]}  ESPAÇO` : "🎁";
  el.disabled = !p.item || p.rolling > sNow();
  el.classList.toggle("ready", !!p.item && p.rolling <= sNow());
}
