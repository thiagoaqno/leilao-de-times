// Corrida da Galera — teclado, botões na tela, câmeras e controle (Gamepad API).
import { $, store, toast } from "./estado.js";
import { race, keys, respawn } from "./jogo.js";
import { useItem } from "./itens.js";
import { alternarPedido, escolherComposto } from "./box.js";
import { E, carOf, me } from "./estado.js";
import { rotacao, NUM } from "./cambio.js";
import { Sound } from "./sons.js";

// câmbio manual: Shift sobe, Ctrl direito desce (redução que estouraria o giro não entra)
export function trocarMarcha(d) {
  if (!race || !E.S || E.S.config.cambio !== "manual" || !me()) return;
  const g = Math.max(1, Math.min(NUM, (race.marcha || 1) + d));
  if (g === race.marcha) return;
  if (d < 0 && rotacao(race.car.v, carOf(me()).vmax, g) > 1.04) { Sound.pop(); return; }
  race.marcha = g; Sound.troca(d);
}

// teclado e botões na tela
const KEYMAP = { ArrowUp: "gas", w: "gas", W: "gas", ArrowDown: "brake", s: "brake", S: "brake", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
document.addEventListener("keydown", (e) => { if (!race || e.target.tagName === "INPUT") return; if (!e.repeat && (e.code === "ShiftLeft" || e.code === "ShiftRight")) { e.preventDefault(); trocarMarcha(1); } if (!e.repeat && e.code === "ControlRight") { e.preventDefault(); trocarMarcha(-1); } const k = KEYMAP[e.key]; if (k) { keys[k] = true; e.preventDefault(); } if (e.key === "r" || e.key === "R") respawn(); if ((e.key === "b" || e.key === "B") && !e.repeat) alternarPedido(); if (!e.repeat && (e.key === "1" || e.key === "2" || e.key === "3")) escolherComposto(["macio", "medio", "duro"][+e.key - 1]); if ((e.key === "c" || e.key === "C") && !e.repeat) nextCam(); if (e.code === "KeyE" && E.S?.config.regras === "f1") { keys.ers = true; e.preventDefault(); } else if ((e.code === "Space" || e.code === "KeyE") && !e.repeat) { e.preventDefault(); useItem(keys.brake); } });
// câmeras: perto do carro (padrão), primeira pessoa, longe e de cima (top down). C (ou o botão 🎥) troca, e o jogo lembra a escolha.
const CAMS = { perto: "🎥 Câmera perto", cockpit: "🎥 Primeira pessoa", longe: "🎥 Câmera longe", cima: "🎥 Câmera de cima" };
export let camMode = CAMS[store.get("corrida:cam")] ? store.get("corrida:cam") : "perto";
function nextCam() { const ks = Object.keys(CAMS); camMode = ks[(ks.indexOf(camMode) + 1) % ks.length]; store.set("corrida:cam", camMode); if (race) race.cam.pos = null; toast(CAMS[camMode], 1400); }
document.addEventListener("keyup", (e) => { const k = KEYMAP[e.key]; if (k) keys[k] = false; if (e.code === "KeyE") keys.ers = false; });
document.querySelectorAll(".pad button[data-marcha]").forEach((b) => b.addEventListener("pointerdown", (e) => { e.preventDefault(); trocarMarcha(+b.dataset.marcha); }));
document.querySelectorAll(".pad button[data-k]").forEach((b) => {
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
  if (hit(5)) useItem(brake);
  if (E.S && E.S.config.cambio === "manual") { if (hit(2)) trocarMarcha(1); if (hit(1) && !b(6)) trocarMarcha(-1); } // manual: X sobe, B desce
  pad.prev = gp.buttons.map((_, i) => b(i));
}
window.addEventListener("gamepaddisconnected", () => { pad.on = false; pad.steer = 0; keys.gas = keys.brake = false; });
window.addEventListener("gamepadconnected", () => toast("🎮 Controle conectado: RT acelera, LT freia, analógico vira", 2600));
$("bRespawn").onclick = () => respawn();
$("bCam").onclick = () => nextCam();
$("hItem").onclick = () => useItem(keys.brake);
$("bBox").onclick = () => alternarPedido();
const bErs = $("bErs");
for (const ev of ["pointerdown", "pointerup", "pointercancel", "lostpointercapture"]) bErs.addEventListener(ev, (e) => {
  e.preventDefault(); keys.ers = ev === "pointerdown";
  bErs.classList.toggle("on", keys.ers);
  if (keys.ers) bErs.setPointerCapture(e.pointerId);
});
$("bExit").onclick = () => { const destino = E.S?.temporada ? "/corrida/temporada/" + (E.S.salaTemporada ? "?sala=" + E.S.salaTemporada : "") : "/"; if (confirm(E.S?.temporada ? "Sair do GP e voltar à sede? Se não voltar à pista, será DNF." : "Sair da corrida e voltar para a vila?")) location.href = destino; };
