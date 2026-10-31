// Corrida da Galera — teclado, botões na tela, câmeras e controle (Gamepad API).
import { $, store, toast } from "./estado.js";
import { race, keys, respawn } from "./jogo.js";
import { useItem } from "./itens.js";
import { alternarPedido, escolherComposto } from "./box.js";
import { E, carOf, me, act } from "./estado.js";
import { rotacao, NUM } from "./cambio.js";
import { Sound } from "./sons.js";
import { ORDEM, NOMES, usavel, camEstado } from "./cameras.js";
import { mfdTecla, mfdPad, mfdAtivo, acoes, teclaBox, digitoPneu } from "./mfd.js";
import { acoesDaTecla, botoesDe, ui } from "./teclas.js";
import "./teclas-ui.js";

// câmbio manual: Shift sobe, Ctrl direito desce (redução que estouraria o giro não entra)
export function trocarMarcha(d) {
  if (!race || !E.S || E.S.config.cambio !== "manual" || !me()) return;
  const g = Math.max(1, Math.min(NUM, (race.marcha || 1) + d));
  if (g === race.marcha) return;
  if (d < 0 && rotacao(race.car.v, carOf(me()).vmax, g) > 1.04) { Sound.pop(); return; }
  race.marcha = g; if (E.S.config.regras !== "f1") Sound.troca(d);
}

// teclado: o que cada tecla faz vem de teclas.js (padrão e o que o jogador remapeou na tela Controles). Os padrões: W A S D pilotam e as setas são
// do MFD (mfd.js). Fora do HUD de F1 (arcade, classificação) não há MFD e as setas seguem esterçando, como sempre.
const SETAS = { ArrowUp: "gas", ArrowDown: "freio", ArrowLeft: "esq", ArrowRight: "dir" };
const PILOTO = { gas: "gas", freio: "brake", esq: "left", dir: "right" };
const PNEUS = { pneu1: "macio", pneu2: "medio", pneu3: "duro", pneu4: "chuva" };
document.addEventListener("keydown", (e) => {
  if (!race || e.target.tagName === "INPUT" || ui.aberto) return;
  if (mfdTecla(e)) return; // as ações do MFD (páginas, linhas, valor, abrir, confirmar)
  const ids = acoesDaTecla(e.code).slice(); if (!mfdAtivo() && SETAS[e.code] && !ids.includes(SETAS[e.code])) ids.push(SETAS[e.code]);
  for (const id of ids) {
    if (PILOTO[id]) { keys[PILOTO[id]] = true; e.preventDefault(); }
    else if (e.repeat) continue;
    else if (id === "marchaMais") { e.preventDefault(); trocarMarcha(1); }
    else if (id === "marchaMenos") { e.preventDefault(); trocarMarcha(-1); }
    else if (id === "respawn") respawn();
    else if (id === "box") teclaBox();
    else if (PNEUS[id]) { if (!digitoPneu(PNEUS[id])) escolherComposto(PNEUS[id]); }
    else if (id === "camera") nextCam();
    else if (id === "ers") { if (E.S?.config.regras === "f1") { keys.ers = true; e.preventDefault(); } else { e.preventDefault(); useItem(keys.brake); } }
    else if (id === "item") { e.preventDefault(); useItem(keys.brake); }
  }
});
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
document.addEventListener("keyup", (e) => {
  for (const id of acoesDaTecla(e.code)) { if (PILOTO[id]) keys[PILOTO[id]] = false; if (id === "ers") keys.ers = false; }
  if (SETAS[e.code]) keys[PILOTO[SETAS[e.code]]] = false; // (as setas do esterço antigo, se estavam apertadas)
});
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
  const um = (id) => botoesDe(id).some(b), bate = (id) => botoesDe(id).some(hit); // botões de cada ação (teclas.js: padrão ou remapeados)
  if (ui.aberto) { pad.prev = gp.buttons.map((_, i) => b(i)); return; } // a tela de Controles está aberta: o controle só serve para remapear
  mfdPad(bate); // o MFD: páginas, linhas, valor, abrir e confirmar
  let x = gp.axes[0] || 0; if (um("esq")) x = -1; if (um("dir")) x = 1;
  const dz = 0.15; x = Math.abs(x) < dz ? 0 : Math.sign(x) * ((Math.abs(x) - dz) / (1 - dz)) ** 1.4;
  const gas = um("gas"), brake = um("freio");
  if (gas || brake || x || pad.on) { pad.on = true; pad.steer = x; keys.gas = gas; keys.brake = brake && !gas; }
  if (bate("camera")) nextCam();
  if (bate("respawn")) respawn();
  if (!mfdAtivo() && bate("item")) useItem(brake);
  if (E.S && E.S.config.cambio === "manual") { if (bate("marchaMais")) trocarMarcha(1); if (bate("marchaMenos") && !b(6)) trocarMarcha(-1); } // manual: X sobe, B desce
  if (um("ers") && E.S?.config.regras === "f1") keys.ers = true; else if (pad.ersPad) keys.ers = false;
  pad.ersPad = um("ers");
  pad.prev = gp.buttons.map((_, i) => b(i));
}
window.addEventListener("gamepaddisconnected", () => { pad.on = false; pad.steer = 0; keys.gas = keys.brake = false; });
window.addEventListener("gamepadconnected", () => toast("🎮 Controle conectado: RT acelera, LT freia, analógico vira", 2600));
$("bRespawn").onclick = () => respawn();
$("bCam").onclick = () => nextCam();
$("hItem").onclick = () => useItem(keys.brake);
$("bBox").onclick = () => teclaBox();
const bErs = $("bErs");
for (const ev of ["pointerdown", "pointerup", "pointercancel", "lostpointercapture"]) bErs.addEventListener(ev, (e) => {
  e.preventDefault(); keys.ers = ev === "pointerdown";
  bErs.classList.toggle("on", keys.ers);
  if (keys.ers) bErs.setPointerCapture(e.pointerId);
});
$("bReiniciar").onclick = () => { if (confirm("Reiniciar a corrida do zero para todos?")) act("reiniciar"); };
$("bExit").onclick = () => { const destino = E.S?.temporada ? "/corrida/temporada/" + (E.S.salaTemporada ? "?sala=" + E.S.salaTemporada : "") : "/"; if (confirm(E.S?.temporada ? "Sair do GP e voltar à sede? Se não voltar à pista, será DNF." : "Sair da corrida e voltar para a vila?")) location.href = destino; };
