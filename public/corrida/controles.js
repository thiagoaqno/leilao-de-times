// Corrida da Galera — teclado, botões na tela, câmeras e controle (Gamepad API).
import { $, store, toast } from "./estado.js";
import { race, keys, respawn } from "./jogo.js";
import { useItem } from "./itens.js";
import { alternarPedido, escolherComposto } from "./box.js";
import { E, carOf, me, act } from "./estado.js";
import { rotacao, NUM } from "./cambio.js";
import { Sound } from "./sons.js";
import { ORDEM, NOMES, usavel, camEstado } from "./cameras.js";
import { mfdTecla, mfdPad, acoes, abrirBoxMfd } from "./mfd.js";

// câmbio manual: Shift sobe, Ctrl direito desce (redução que estouraria o giro não entra)
export function trocarMarcha(d) {
  if (!race || !E.S || E.S.config.cambio !== "manual" || !me()) return;
  const g = Math.max(1, Math.min(NUM, (race.marcha || 1) + d));
  if (g === race.marcha) return;
  if (d < 0 && rotacao(race.car.v, carOf(me()).vmax, g) > 1.04) { Sound.pop(); return; }
  race.marcha = g; if (E.S.config.regras !== "f1") Sound.troca(d);
}

// teclado e botões na tela
const KEYMAP = { ArrowUp: "gas", w: "gas", W: "gas", ArrowDown: "brake", s: "brake", S: "brake", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
document.addEventListener("keydown", (e) => { if (!race || e.target.tagName === "INPUT") return; if (mfdTecla(e)) return; /* M, N e Tab são do MFD; com o MFD em modo ajustar as setas também */ if (!e.repeat && (e.code === "ShiftLeft" || e.code === "ShiftRight")) { e.preventDefault(); trocarMarcha(1); } if (!e.repeat && e.code === "ControlRight") { e.preventDefault(); trocarMarcha(-1); } const k = KEYMAP[e.key]; if (k) { keys[k] = true; e.preventDefault(); } if (e.key === "r" || e.key === "R") respawn(); if ((e.key === "b" || e.key === "B") && !e.repeat) { alternarPedido(); abrirBoxMfd(); } if (!e.repeat && (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "4")) escolherComposto(["macio", "medio", "duro", "chuva"][+e.key - 1]); if ((e.key === "c" || e.key === "C") && !e.repeat) nextCam(); if (e.code === "KeyE" && E.S?.config.regras === "f1") { keys.ers = true; e.preventDefault(); } else if ((e.code === "Space" || e.code === "KeyE") && !e.repeat) { e.preventDefault(); useItem(keys.brake); } });
// câmeras (cameras.js): cockpit, onboard (T-cam), bico, perseguição próxima, perseguição afastada, aérea e TV. C (ou o botão 🎥,
// ou Y no controle) troca, mostra o nome da câmera e o jogo lembra a última escolhida (os ids antigos "perto", "longe", "cockpit" e "cima" seguem valendo).
export let camMode = ORDEM.includes(store.get("corrida:cam")) ? store.get("corrida:cam") : "perto";
function nextCam(d = 1) {
  // segue a partir da câmera que se vê (quem só assiste ou já recebeu a bandeirada está na TV sem ter escolhido), pulando as que quem só assiste não tem
  let i = ORDEM.indexOf(camEstado.modo || camMode);
  for (let k = 0; k < ORDEM.length; k++) { i = (i + (d < 0 ? ORDEM.length - 1 : 1)) % ORDEM.length; if (usavel(ORDEM[i], camEstado.assistindo)) break; }
  camMode = ORDEM[i]; camEstado.modo = camMode;
  try { store.set("corrida:cam", camMode); } catch (e) {}
  if (race) { race.cam.pos = null; race.cam.tvI = null; race.camTv = false; }
  toast("🎥 " + NOMES[camMode], 1600);
}
acoes.camera = (d) => nextCam(d); acoes.camNome = () => NOMES[camEstado.modo || camMode] || "";
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
  const foco = mfdPad(hit); // Start abre/fecha o modo ajustar do MFD, L3/R3 trocam a página; em ajustar o direcional navega no painel e não pilota
  let x = gp.axes[0] || 0; if (!foco && b(14)) x = -1; if (!foco && b(15)) x = 1;
  const dz = 0.15; x = Math.abs(x) < dz ? 0 : Math.sign(x) * ((Math.abs(x) - dz) / (1 - dz)) ** 1.4;
  const gas = b(7) || b(0) || (!foco && b(12)), brake = b(6) || b(1) || b(2) || (!foco && b(13));
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
$("bBox").onclick = () => { alternarPedido(); abrirBoxMfd(); };
const bErs = $("bErs");
for (const ev of ["pointerdown", "pointerup", "pointercancel", "lostpointercapture"]) bErs.addEventListener(ev, (e) => {
  e.preventDefault(); keys.ers = ev === "pointerdown";
  bErs.classList.toggle("on", keys.ers);
  if (keys.ers) bErs.setPointerCapture(e.pointerId);
});
$("bReiniciar").onclick = () => { if (confirm("Reiniciar a corrida do zero para todos?")) act("reiniciar"); };
$("bExit").onclick = () => { const destino = E.S?.temporada ? "/corrida/temporada/" + (E.S.salaTemporada ? "?sala=" + E.S.salaTemporada : "") : "/"; if (confirm(E.S?.temporada ? "Sair do GP e voltar à sede? Se não voltar à pista, será DNF." : "Sair da corrida e voltar para a vila?")) location.href = destino; };
