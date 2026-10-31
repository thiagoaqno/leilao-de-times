// Corrida da Galera — o MENU DO BOX (regras de F1): quem pede a parada sem escolher o pneu (o pedido "decidir") entra no corredor, para na garagem e
// escolhe aqui, num menu grande no centro da tela. O carro fica parado e o tempo conta na parada (sim.js, fase "escolha"); passados ESCOLHA_BOX_S
// segundos sem escolher, sai com o recomendado. A escolha viaja como o pedido de sempre (`race.pedidoBox`, empacotado a cada passo); aqui só há
// o desenho e a entrada: números 1 a 4 (e 5 = não trocar), setas e Enter, o mouse ou o toque, e o D-pad com A no controle.
import { E, $, me, toast } from "./estado.js";
import { race } from "./jogo.js";
import { set } from "./hud-painel.js";
import { jogosDe } from "./box.js";

const F = () => window.F1Regras;
const ITENS = ["macio", "medio", "duro", "chuva", "manter"]; // a ordem do menu e dos números 1 a 5
const menu = { sel: 0, visto: false, enviado: null };
const aberto = () => !!race && !!race.box && race.box.fase === "escolha";
export const menuDoBoxAberto = aberto;

let el = null, refs = null;
function montar() {
  if (el) return; el = $("hBoxMenu"); if (!el) return;
  el.innerHTML = `<div class="bm-cab"><small>BOX · ESCOLHA O PNEU</small><b class="bm-cont" data-r="cont">6</b></div>
    <div class="bm-linha">${ITENS.map((c, i) => c === "manter"
      ? `<button type="button" class="bm-btn bm-manter" data-c="manter"><kbd>5</kbd><b>NÃO TROCAR</b><span>sai com o pneu de agora</span></button>`
      : `<button type="button" class="bm-btn" data-c="${c}"><kbd>${i + 1}</kbd><i class="bx-pn"></i><b>${F().PNEUS[c].nome.toUpperCase()}</b><span data-r="j${c}"></span><em data-r="a${c}"></em><u class="bm-rec">RECOMENDADO</u></button>`).join("")}</div>
    <p class="bm-info" data-r="info"></p><p class="bm-dica"><kbd>1</kbd>–<kbd>5</kbd> escolhe · <kbd>←</kbd><kbd>→</kbd> + <kbd>Enter</kbd> · D-pad + <kbd>A</kbd> · toque</p><i class="bm-barra"><s data-r="barra"></s></i>`;
  refs = {}; for (const x of el.querySelectorAll("[data-r]")) refs[x.dataset.r] = x;
  el.addEventListener("click", (e) => { const b = e.target.closest(".bm-btn"); if (b) escolher(b.dataset.c); });
}
// manda a escolha: o pedido passa a ser o pneu (ou "manter"); o simulador lê na hora (sim.js) e o servidor, o mesmo pelo fio
function escolher(c) {
  if (!aberto()) return false;
  const j = jogosDe(me());
  if (c !== "manter" && j[c] <= 0 && !(me() && me().stopGo && race.pneu && c === race.pneu.composto)) { toast(F().PNEUS[c].nome + " esgotado", 1400); return true; }
  race.pedidoBox = c; menu.enviado = c; return true;
}
const mover = (d) => { menu.sel = (menu.sel + d + ITENS.length) % ITENS.length; };
// teclado: devolve true se a tecla é do menu (nada mais anda enquanto ele está aberto)
export function menuBoxTecla(e) {
  if (!aberto()) return false;
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const k = e.code, n = /^(Digit|Numpad)([1-5])$/.exec(k);
  if (n) { e.preventDefault(); if (!e.repeat) escolher(ITENS[+n[2] - 1]); return true; }
  if (k === "ArrowLeft" || k === "ArrowUp") { e.preventDefault(); if (!e.repeat) mover(-1); return true; }
  if (k === "ArrowRight" || k === "ArrowDown") { e.preventDefault(); if (!e.repeat) mover(1); return true; }
  if (k === "Enter" || k === "NumpadEnter") { e.preventDefault(); if (!e.repeat) escolher(ITENS[menu.sel]); return true; }
  return false;
}
// controle: D-pad (12 a 15) move, A (0) confirma; `hit(i)` é o botão que acabou de ser apertado. Devolve true com o menu aberto.
export function menuBoxPad(hit) {
  if (!aberto()) return false;
  if (hit(14) || hit(12)) mover(-1); if (hit(15) || hit(13)) mover(1); if (hit(0)) escolher(ITENS[menu.sel]);
  return true;
}
// a cada tick do HUD (~10x por segundo): abre, mostra a contagem e destaca o recomendado
export function atualizarMenuBox() {
  montar(); if (!el) return;
  const B = race && race.box, ab = aberto();
  if (el.classList.contains("on") !== ab) el.classList.toggle("on", ab);
  if (!ab) { menu.visto = false; menu.enviado = null; return; }
  const f = F(), j = jogosDe(me()), atual = race.pneu ? race.pneu.composto : null, rec = B.rec;
  if (!menu.visto) { menu.visto = true; const i = ITENS.indexOf(rec); menu.sel = i >= 0 ? i : 0; }
  const resta = Math.max(0, f.ESCOLHA_BOX_S - B.t);
  set(refs.cont, "t", menu.enviado ? "OK" : Math.ceil(resta)); set(refs.barra, "w", Math.round((resta / f.ESCOLHA_BOX_S) * 100) + "%");
  const maxPico = Math.max(...["macio", "medio", "duro", "chuva"].map((c) => f.PNEUS[c].pico));
  el.querySelectorAll(".bm-btn").forEach((b, i) => {
    const c = b.dataset.c;
    set(b, "c", "bm-btn" + (c === "manter" ? " bm-manter" : "") + (i === menu.sel ? " sel" : "") + (c === rec ? " rec" : "") + (menu.enviado === c ? " feito" : "") + (c !== "manter" && j[c] <= 0 ? " esgotado" : "") + (c === atual ? " atual" : ""));
    if (c === "manter") return;
    set(b, "style", `--c:${f.PNEUS[c].cor}`);
    set(refs["j" + c], "t", j[c] <= 0 ? "esgotado" : j[c] + (j[c] === 1 ? " jogo" : " jogos"));
    set(refs["a" + c], "t", `aderência ${Math.round((f.PNEUS[c].pico / maxPico) * 100)}% · ~${Math.floor(f.vidaEmVoltas(c))} voltas`);
  });
  const pn = race.pneu;
  set(refs.info, "t", pn ? `Pneu de agora: ${f.PNEUS[pn.composto].nome} · desgaste ${Math.round(pn.desgaste * 100)}%${B.stopGo ? " · stop-and-go: cumpre e troca junto" : ""}` : "");
}
