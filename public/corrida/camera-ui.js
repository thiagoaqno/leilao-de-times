// Corrida da Galera — a tela "Câmera": o jogador ajusta cada câmera da corrida (FOV, altura, avanço/distância, inclinação e tremor) e vê o efeito na
// hora, com a corrida rodando por trás do painel (meio transparente). Abre pelo botão da barra de cima (#bCamAjuste), pela linha "Ajuste da câmera" do
// MFD (página Ajustes) e pela tecla H. As trocas ficam em `corrida:camera` (camera-ajuste.js). Dá para pilotar enquanto a tela está aberta; só o MFD fica quieto.
//   Teclado: ↑↓ escolhem o ajuste, ←→ mudam (Shift = passo grande), Z/X (ou PgUp/PgDn) trocam a câmera, Delete restaura a câmera, Esc/H fecham.
//   Controle: direcional ↑↓ e ←→ (segurar repete), LB/RB trocam a câmera, R3 restaura a câmera, Start fecha. Toque e mouse: os controles na tela.
import { $, toast } from "./estado.js";
import { ui } from "./teclas.js";
import { acoes } from "./mfd.js";
import { camEstado, NOMES, usavel } from "./cameras.js";
import { EDITAVEIS, camposDe, ajusteDe, padraoDe, mudou, temTrocas, definir, restaurarCamera, restaurarTudo, dentroDoCarro } from "./camera-ajuste.js";

const ROTULO = { cockpit: "Cockpit", onboard: "T-cam", bico: "Bico", perto: "Perto", longe: "Longe" };
let tela = null, aba = "perto", sel = 0, raf = 0, antes = [], rep = null;

const fmt = (c, v) => (+v).toFixed(c.dec || 0) + c.un;
function montar() {
  if (tela) return;
  tela = document.createElement("div"); tela.id = "camTela"; tela.className = "cj hidden"; tela.setAttribute("role", "dialog"); tela.setAttribute("aria-labelledby", "cjTit");
  tela.innerHTML = '<div class="cj-painel"><header><h2 id="cjTit">Câmera</h2><button type="button" class="cj-x" data-fechar aria-label="Fechar">✕</button></header>'
    + '<div class="cj-abas" id="cjAbas" role="tablist"></div><p class="cj-dica" id="cjDica"></p><div class="cj-lista" id="cjLista"></div>'
    + '<footer><button type="button" id="cjRestCam" class="ghost">Restaurar esta câmera</button><button type="button" id="cjRestTudo" class="ghost">Restaurar tudo</button><button type="button" class="primary" data-fechar>Pronto</button></footer>'
    + '<p class="cj-teclas">↑↓ ajuste · ←→ valor · Z/X câmera · Del restaura · Esc fecha<br>Controle: direcional · LB/RB câmera · R3 restaura · Start fecha</p></div>';
  document.body.appendChild(tela);
  tela.addEventListener("click", (e) => {
    if (e.target.closest("[data-fechar]")) return fechar();
    const ab = e.target.closest("[data-cam]"); if (ab) return irPara(ab.dataset.cam);
    if (e.target.closest("#cjRestCam")) return restaurarEsta();
    if (e.target.closest("#cjRestTudo")) { restaurarTudo(); toast("Todas as câmeras voltaram ao padrão", 1600); desenhar(); return; }
    const l = e.target.closest("[data-campo]"); if (!l) return;
    sel = campos().findIndex((c) => c.id === l.dataset.campo);
    const p = e.target.closest("[data-passo]"); if (p) mexer(+p.dataset.passo, e.shiftKey);
    if (e.target.closest("[data-rest]")) { definir(aba, l.dataset.campo, padraoDe(aba, l.dataset.campo)); }
    marcarSel(); linhas();
  });
  tela.addEventListener("input", (e) => { const r = e.target.closest("input[data-campo]"); if (!r) return; sel = campos().findIndex((c) => c.id === r.dataset.campo); definir(aba, r.dataset.campo, +r.value); marcarSel(); linhas(false); });
  window.addEventListener("keydown", aoTeclar, true);
  window.addEventListener("camera:mudou", () => { if (aberta()) linhas(); });
}
const aberta = () => !!tela && !tela.classList.contains("hidden");
export const cameraAberta = aberta;
const campos = () => camposDe(aba);

function desenhar() {
  if (!tela) return;
  const assistindo = camEstado.assistindo;
  $("cjAbas").innerHTML = EDITAVEIS.map((id) => `<button type="button" role="tab" data-cam="${id}" class="${id === aba ? "on" : ""}${mudou(id) ? " mod" : ""}" aria-selected="${id === aba}" title="${NOMES[id]}"${usavel(id, assistindo) ? "" : " disabled"}>${ROTULO[id]}</button>`).join("");
  $("cjDica").textContent = dentroDoCarro(aba) ? NOMES[aba] + ": dentro do carro, a vista anda com ele." : NOMES[aba] + ": atrás do carro, perseguindo.";
  $("cjLista").innerHTML = campos().map((c) => `<div class="cj-l" data-campo="${c.id}"><span class="cj-n">${c.nome}<small>${c.dica}</small></span>`
    + `<span class="cj-c"><button type="button" data-passo="-1" aria-label="Diminuir ${c.nome}">−</button><input type="range" data-campo="${c.id}" min="${c.min}" max="${c.max}" step="${c.passo}" aria-label="${c.nome}"><button type="button" data-passo="1" aria-label="Aumentar ${c.nome}">+</button></span>`
    + `<b data-v></b><button type="button" class="cj-r" data-rest aria-label="Voltar ${c.nome} ao padrão" title="Padrão">↺</button></div>`).join("");
  marcarSel(); linhas();
}
// escreve os valores nas linhas (e quais estão fora do padrão); `ler`: false enquanto o dedo arrasta o controle (não mexe nele)
function linhas(ler = true) {
  if (!aberta()) return;
  const A = ajusteDe(aba);
  for (const l of $("cjLista").children) {
    const c = campos().find((x) => x.id === l.dataset.campo), v = A[c.id], fora = v !== padraoDe(aba, c.id);
    if (ler) l.querySelector("input").value = v;
    l.querySelector("[data-v]").textContent = fmt(c, v); l.classList.toggle("mod", fora); l.querySelector("[data-rest]").disabled = !fora;
  }
  $("cjRestCam").disabled = !mudou(aba); $("cjRestTudo").disabled = !temTrocas();
  for (const b of $("cjAbas").children) b.classList.toggle("mod", mudou(b.dataset.cam));
}
function marcarSel() { [...$("cjLista").children].forEach((l, i) => l.classList.toggle("sel", i === sel)); }

function mexer(dir, grande) {
  const c = campos()[sel]; if (!c) return;
  definir(aba, c.id, ajusteDe(aba)[c.id] + dir * c.passo * (grande ? 5 : 1)); linhas();
}
function irPara(id) {
  if (!EDITAVEIS.includes(id)) return;
  if (!usavel(id, camEstado.assistindo)) { toast("Só quem corre tem esta câmera", 1600); return; }
  aba = id; if (acoes.cameraIr && camEstado.modo !== id) acoes.cameraIr(id);
  desenhar();
}
function trocar(d) { const i = EDITAVEIS.indexOf(aba); for (let k = 1; k <= EDITAVEIS.length; k++) { const id = EDITAVEIS[(i + d * k + EDITAVEIS.length * k) % EDITAVEIS.length]; if (usavel(id, camEstado.assistindo)) return irPara(id); } }
function restaurarEsta() { if (!mudou(aba)) return; restaurarCamera(aba); toast(ROTULO[aba] + ": voltou ao padrão", 1400); desenhar(); }

export function abrirCamera() {
  montar(); if (aberta()) return;
  // abre na câmera que se está vendo; se ela é automática (aérea, TV), vai para a perseguição próxima (ou a primeira que o jogador tem) para o efeito aparecer
  const agora = camEstado.modo;
  if (EDITAVEIS.includes(agora) && usavel(agora, camEstado.assistindo)) aba = agora;
  else { aba = EDITAVEIS.find((id) => usavel(id, camEstado.assistindo) && id === "perto") || EDITAVEIS.find((id) => usavel(id, camEstado.assistindo)) || "perto"; if (acoes.cameraIr) acoes.cameraIr(aba); }
  ui.camera = true; sel = 0; desenhar(); tela.classList.remove("hidden");
  antes = []; cancelAnimationFrame(raf); raf = requestAnimationFrame(volta);
}
export function fecharCamera() { fechar(); }
function fechar() { ui.camera = false; if (tela) tela.classList.add("hidden"); cancelAnimationFrame(raf); rep = null; }

// acompanha a câmera (se o jogador apertou C, a aba segue) e lê o controle
function volta() {
  if (!aberta()) return;
  const m = camEstado.modo;
  if (m !== aba && EDITAVEIS.includes(m) && usavel(m, camEstado.assistindo)) { aba = m; desenhar(); }
  lerControle();
  raf = requestAnimationFrame(volta);
}
function lerControle() {
  const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find((g) => g && g.connected); if (!gp) { antes = []; return; }
  const b = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5)), hit = (i) => b(i) && !antes[i], agora = performance.now();
  if (hit(9)) { antes = gp.buttons.map((_, i) => b(i)); return fechar(); }
  if (hit(12)) { sel = (sel + campos().length - 1) % campos().length; marcarSel(); }
  if (hit(13)) { sel = (sel + 1) % campos().length; marcarSel(); }
  if (hit(4)) trocar(-1); if (hit(5)) trocar(1); if (hit(11)) restaurarEsta();
  // esquerda/direita repetem enquanto seguram (350 ms de espera, depois a cada 90 ms)
  const d = b(14) ? -1 : b(15) ? 1 : 0;
  if (!d) rep = null; else if (!rep || rep.d !== d) { rep = { d, t: agora + 350 }; mexer(d, false); } else if (agora >= rep.t) { rep.t = agora + 90; mexer(d, false); }
  antes = gp.buttons.map((_, i) => b(i));
}

function aoTeclar(e) {
  if (!aberta()) return;
  if (e.target && e.target.tagName === "INPUT" && e.target.type !== "range") return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tomar = () => { e.preventDefault(); e.stopPropagation(); };
  switch (e.code) {
    case "Escape": tomar(); return fechar();
    case "ArrowUp": tomar(); sel = (sel + campos().length - 1) % campos().length; marcarSel(); return;
    case "ArrowDown": tomar(); sel = (sel + 1) % campos().length; marcarSel(); return;
    case "ArrowLeft": tomar(); mexer(-1, e.shiftKey); return;
    case "ArrowRight": tomar(); mexer(1, e.shiftKey); return;
    case "KeyZ": case "PageUp": tomar(); if (!e.repeat) trocar(-1); return;
    case "KeyX": case "PageDown": tomar(); if (!e.repeat) trocar(1); return;
    case "Delete": tomar(); restaurarEsta(); return;
  }
  // (a tecla H, que abre e fecha, é tratada em controles.js; as de pilotagem passam direto: dá para correr com a tela aberta)
}

const bt = $("bCamAjuste"); if (bt) bt.addEventListener("click", () => (aberta() ? fechar() : abrirCamera()));
