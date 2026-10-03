// Corrida da Galera — teclado, botões na tela, câmeras e controle (Gamepad API).
import { $, store, toast } from "./estado.js";
import { race, keys, respawn } from "./jogo.js";

// teclado e botões na tela
const KEYMAP = { ArrowUp: "gas", w: "gas", W: "gas", ArrowDown: "brake", s: "brake", S: "brake", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
document.addEventListener("keydown", (e) => { if (!race || e.target.tagName === "INPUT") return; const k = KEYMAP[e.key]; if (k) { keys[k] = true; e.preventDefault(); } if (e.key === "r" || e.key === "R") respawn(); if ((e.key === "c" || e.key === "C") && !e.repeat) nextCam(); });
// câmeras: perto do carro (padrão), primeira pessoa e longe. C (ou o botão 🎥) troca, e o jogo lembra a escolha.
const CAMS = { perto: "🎥 Câmera perto", cockpit: "🎥 Primeira pessoa", longe: "🎥 Câmera longe" };
export let camMode = CAMS[store.get("corrida:cam")] ? store.get("corrida:cam") : "perto";
function nextCam() { const ks = Object.keys(CAMS); camMode = ks[(ks.indexOf(camMode) + 1) % ks.length]; store.set("corrida:cam", camMode); if (race) race.cam.pos = null; toast(CAMS[camMode], 1400); }
document.addEventListener("keyup", (e) => { const k = KEYMAP[e.key]; if (k) keys[k] = false; });
document.querySelectorAll(".pad button").forEach((b) => {
  const k = b.dataset.k, set = (v) => { keys[k] = v; b.classList.toggle("on", v); };
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); set(true); });
  b.addEventListener("pointerup", () => set(false)); b.addEventListener("pointercancel", () => set(false)); b.addEventListener("lostpointercapture", () => set(false));
});
// controle (Xbox/PlayStation): analógico esquerdo vira (com a força exata), RT acelera, LT freia/ré,
// A também acelera e B/X também freiam (para quem prefere botão), Y troca a câmera, Back/Select (ou LB) volta para a pista.
export const pad = { steer: 0, on: false, prev: [] };
export function pollPad() {
  const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find((g) => g && g.connected);
  if (!gp) { if (pad.on) { pad.on = false; keys.gas = keys.brake = false; } return; }
  const b = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.3)), hit = (i) => b(i) && !pad.prev[i];
  let x = gp.axes[0] || 0; if (b(14)) x = -1; if (b(15)) x = 1;
  const dz = 0.15; x = Math.abs(x) < dz ? 0 : Math.sign(x) * ((Math.abs(x) - dz) / (1 - dz)) ** 1.4;
  const gas = b(7) || b(0) || b(12), brake = b(6) || b(1) || b(2) || b(13);
  if (gas || brake || x || pad.on) { pad.on = true; pad.steer = x; keys.gas = gas; keys.brake = brake && !gas; }
  if (hit(3)) nextCam();
  if (hit(8) || hit(4)) respawn();
  pad.prev = gp.buttons.map((_, i) => b(i));
}
window.addEventListener("gamepaddisconnected", () => { pad.on = false; pad.steer = 0; keys.gas = keys.brake = false; });
window.addEventListener("gamepadconnected", () => toast("🎮 Controle conectado: RT acelera, LT freia, analógico vira", 2600));
$("bRespawn").onclick = () => respawn();
$("bCam").onclick = () => nextCam();
$("bExit").onclick = () => { if (confirm("Sair da corrida e voltar para a vila?")) location.href = "/"; };
