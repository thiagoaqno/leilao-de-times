// Corrida da Galera — a tela "Controles": o jogador remapeia cada ação (teclado e controle). Abre pelo botão da barra de cima da corrida
// (#bTeclas) e pelo da sala (#btnTeclas). "Mudar" espera a tecla (ou o botão do controle); se ela já é de outra ação, avisa e só troca
// se a pessoa apertar de novo; "Restaurar padrão" volta tudo. As trocas ficam em `corrida:teclas` (teclas.js). Esc cancela a captura.
import { $, toast } from "./estado.js";
import { ACOES, porId, ui, teclasDe, botoesDe, definir, tirar, restaurar, conflitosDe, nomeDaTecla, nomeDoBotao, temTrocas } from "./teclas.js";

let tela = null, aba = "k", cap = null; // cap: { id, tipo, pendente (valor em conflito esperando a confirmação), raf }

function montar() {
  if (tela) return;
  tela = document.createElement("div"); tela.id = "teclasTela"; tela.className = "tk hidden"; tela.setAttribute("role", "dialog"); tela.setAttribute("aria-modal", "true"); tela.setAttribute("aria-labelledby", "tkTit");
  tela.innerHTML = '<div class="tk-fundo" data-fechar></div><div class="tk-painel"><header><h2 id="tkTit">Controles</h2><div class="tk-abas" role="tablist"><button type="button" role="tab" data-aba="k">Teclado</button><button type="button" role="tab" data-aba="p">Controle</button></div><button type="button" class="tk-x" data-fechar aria-label="Fechar">✕</button></header><p class="tk-dica" id="tkDica"></p><div class="tk-lista" id="tkLista"></div><footer><button type="button" id="tkRestaurar" class="ghost">Restaurar padrão</button><button type="button" id="tkPronto" class="primary" data-fechar>Pronto</button></footer></div>';
  document.body.appendChild(tela);
  tela.addEventListener("click", (e) => {
    if (e.target.closest("[data-fechar]")) return fechar();
    const ab = e.target.closest("[data-aba]"); if (ab) { cancelar(); aba = ab.dataset.aba; desenhar(); return; }
    if (e.target.closest("#tkRestaurar")) { cancelar(); restaurar(); toast("Controles restaurados ao padrão", 1600); desenhar(); return; }
    const m = e.target.closest("[data-mudar]"); if (m) { iniciar(m.dataset.mudar); return; }
    const t = e.target.closest("[data-tirar]"); if (t) { cancelar(); tirar(t.dataset.id, aba, aba === "k" ? t.dataset.tirar : +t.dataset.tirar); desenhar(); }
  });
  window.addEventListener("keydown", aoTeclar, true);
}
const chip = (tipo, v) => (tipo === "k" ? nomeDaTecla(v) : nomeDoBotao(v));
function desenhar() {
  if (!tela) return;
  for (const b of tela.querySelectorAll("[data-aba]")) { const on = b.dataset.aba === aba; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); }
  $("tkDica").textContent = aba === "k" ? "Clique em Mudar e aperte a tecla. As setas ficam com o MFD e W A S D pilotam, por padrão." : "Clique em Mudar e aperte o botão do controle. O analógico esquerdo sempre esterça.";
  let g = "", html = "";
  for (const a of ACOES) {
    if (a.g !== g) { g = a.g; html += `<h3>${g}</h3>`; }
    const lista = aba === "k" ? teclasDe(a.id) : botoesDe(a.id), esperando = cap && cap.id === a.id && cap.tipo === aba;
    const chips = lista.length ? lista.map((v) => `<span class="tk-c">${chip(aba, v)}<button type="button" data-id="${a.id}" data-tirar="${v}" aria-label="Tirar ${chip(aba, v)}">×</button></span>`).join("") : '<span class="tk-vazio">sem tecla</span>';
    html += `<div class="tk-l${esperando ? " esp" : ""}" data-id="${a.id}"><span class="tk-n">${a.nome}</span><span class="tk-v">${esperando ? `<em>${cap.aviso || (aba === "k" ? "Aperte a tecla…" : "Aperte o botão…")}</em>` : chips}</span><button type="button" data-mudar="${a.id}">${esperando ? "Cancelar" : "Mudar"}</button></div>`;
  }
  $("tkLista").innerHTML = html; $("tkRestaurar").disabled = !temTrocas();
}
export function abrirTeclas() { montar(); ui.aberto = true; desenhar(); tela.classList.remove("hidden"); const f = tela.querySelector("#tkPronto"); if (f) f.focus(); }
function fechar() { cancelar(); ui.aberto = false; if (tela) tela.classList.add("hidden"); }
function cancelar() { if (cap && cap.raf) cancelAnimationFrame(cap.raf); cap = null; ui.capturando = false; }

function iniciar(id) {
  if (cap && cap.id === id && cap.tipo === aba) { cancelar(); desenhar(); return; }
  cancelar(); cap = { id, tipo: aba, pendente: null, aviso: "" }; ui.capturando = true; desenhar();
  if (aba === "p") { // o controle: espera um botão NOVO (os que já estavam apertados não valem)
    const lido = () => { const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find((x) => x && x.connected); return gp ? gp.buttons.map((b) => !!(b.pressed || b.value > 0.5)) : []; };
    let antes = lido();
    const volta = () => {
      if (!cap || cap.tipo !== "p") return;
      const agora = lido(); const i = agora.findIndex((p, k) => p && !antes[k]); antes = agora;
      if (i >= 0) atribuir(i); if (cap) cap.raf = requestAnimationFrame(volta);
    };
    cap.raf = requestAnimationFrame(volta);
  }
}
function aoTeclar(e) {
  if (!ui.aberto) return;
  if (!cap || cap.tipo !== "k") { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fechar(); } return; }
  e.preventDefault(); e.stopPropagation();
  if (e.key === "Escape") { cancelar(); desenhar(); return; }
  if (e.repeat) return;
  atribuir(e.code);
}
// põe a tecla/botão na ação; em conflito avisa e espera a mesma tecla de novo (então tira das outras ações)
function atribuir(valor) {
  if (!cap) return; const { id, tipo } = cap, cs = conflitosDe(id, tipo, valor);
  if (cs.length && cap.pendente !== valor) { cap.pendente = valor; cap.aviso = `${chip(tipo, valor)} já é de «${cs.map((c) => porId[c].nome).join("», «")}». Aperte de novo para trocar (Esc cancela)`; desenhar(); return; }
  for (const c of cs) tirar(c, tipo, valor);
  definir(id, tipo, [valor]); // "Mudar" troca o que a ação tinha; o × de cada tecla tira uma só
  cancelar(); desenhar();
}

for (const sel of ["bTeclas", "btnTeclas"]) { const b = $(sel); if (b) b.addEventListener("click", abrirTeclas); }
