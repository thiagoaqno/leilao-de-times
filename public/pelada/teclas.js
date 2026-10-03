// Pelada da Galera — remapear os controles do teclado e do mouse (a pé).
// O jogo continua lendo os códigos "de fábrica" (KeyK é o chute, KeyW é andar para a frente...). Este módulo só
// traduz: a tecla (ou botão do mouse) que a pessoa escolheu para uma ação vira o código de fábrica dessa ação.
// Mouse e rodinha viram códigos também: "Mouse0" (esquerdo), "Mouse1" (meio), "Mouse2" (direito) e "Wheel".
// O controle (gamepad) e os botões de toque mandam o código de fábrica direto e não passam por aqui.
// As escolhas ficam no navegador (localStorage "pelada:teclas"). No carro (Rocket), valem as teclas de fábrica.
import { $, h, store } from "./estado.js";

// cada ação: o código de fábrica (o que o jogo lê) e as teclas padrão (até duas)
export const ACOES = [
  { id: "frente", nome: "Correr para a frente", cod: "KeyW", padrao: ["KeyW"] },
  { id: "tras", nome: "Correr para trás", cod: "KeyS", padrao: ["KeyS"] },
  { id: "esq", nome: "Correr para a esquerda", cod: "KeyA", padrao: ["KeyA"] },
  { id: "dir", nome: "Correr para a direita", cod: "KeyD", padrao: ["KeyD"] },
  { id: "pique", nome: "Pique", cod: "ShiftLeft", padrao: ["ShiftLeft", "ShiftRight"] },
  { id: "chute", nome: "Chute (segure: força)", cod: "KeyK", padrao: ["KeyK", "Mouse0"] },
  { id: "passe", nome: "Passe (toque) · longo (segure 1 s) · sem a bola: pede a bola", cod: "KeyJ", padrao: ["KeyJ", "Mouse2"] },
  { id: "enfiada", nome: "Bola enfiada (em profundidade)", cod: "KeyL", padrao: ["KeyL", "Mouse1"] },
  { id: "cavadinha", nome: "Cavadinha", cod: "KeyZ", padrao: ["KeyZ"] },
  { id: "cruzar", nome: "Cruzamento alto", cod: "KeyU", padrao: ["KeyU"] },
  { id: "colocado", nome: "Colocado (segure + chute/passe)", cod: "KeyR", padrao: ["KeyR"] },
  { id: "efeitoE", nome: "Com a bola: arrastada para a esquerda · no chute: efeito para a esquerda", cod: "KeyQ", padrao: ["KeyQ"] },
  { id: "efeitoD", nome: "Com a bola: arrastada para a direita · no chute: efeito para a direita", cod: "KeyE", padrao: ["KeyE"] },
  { id: "corte", nome: "Corte seco (puxa a bola e muda de direção)", cod: "KeyV", padrao: ["KeyV"] },
  { id: "carrinho", nome: "Carrinho (sem a bola)", cod: "Wheel", padrao: ["Wheel", "KeyX"] },
  { id: "segurar", nome: "Com a bola: proteger · sem a bola: segurar a camisa", cod: "KeyF", padrao: ["KeyF"] },
  { id: "pular", nome: "Pular / cabecear (goleiro + lado: se jogar)", cod: "Space", padrao: ["Space"] },
  { id: "miraC", nome: "Mirar para cima", cod: "ArrowUp", padrao: ["ArrowUp"] },
  { id: "miraB", nome: "Mirar para baixo", cod: "ArrowDown", padrao: ["ArrowDown"] },
  { id: "miraE", nome: "Mirar para a esquerda", cod: "ArrowLeft", padrao: ["ArrowLeft"] },
  { id: "miraD", nome: "Mirar para a direita", cod: "ArrowRight", padrao: ["ArrowRight"] },
  { id: "trocar", nome: "Trocar de jogador (se a troca estiver ligada)", cod: "KeyT", padrao: ["KeyT"] },
  { id: "camera", nome: "Câmera", cod: "KeyC", padrao: ["KeyC"] },
];
const POR_ID = Object.fromEntries(ACOES.map((a) => [a.id, a]));
const FABRICA = new Set(ACOES.map((a) => a.cod)); // códigos que o jogo lê como ação
// teclas que não dá para usar (sistema e menus do jogo)
const PROIBIDAS = new Set(["Escape", "Tab", "MetaLeft", "MetaRight", "ContextMenu"]);

let escolhas = carregar(); // { idDaAcao: [código, código?] }
let mapa = montarMapa();
function carregar() {
  const s = store.get("pelada:teclas"), out = {};
  for (const a of ACOES) out[a.id] = Array.isArray(s && s[a.id]) ? s[a.id].filter((c) => typeof c === "string").slice(0, 2) : [...a.padrao];
  return out;
}
function montarMapa() { const m = new Map(); for (const a of ACOES) for (const c of escolhas[a.id]) m.set(c, a.cod); return m; }
function salvar() { store.set("pelada:teclas", escolhas); mapa = montarMapa(); }

// código físico (tecla ou mouse) -> código de fábrica da ação; null = não faz nada (a tecla foi tirada da ação)
export function traduzir(code) {
  if (mapa.has(code)) return mapa.get(code);
  if (FABRICA.has(code)) return null; // é o código de fábrica de alguma ação, mas essa tecla não está mais nela
  return code; // Tab, Esc e o resto: passam como vieram
}
export const teclasDe = (id) => escolhas[id] || [];
// nome amigável de um código (para a tela e as dicas)
export function nomeTecla(code) {
  if (!code) return "—";
  const fixos = { Mouse0: "Clique", Mouse1: "Botão do meio", Mouse2: "Botão direito", Mouse3: "Mouse 4", Mouse4: "Mouse 5", Wheel: "Rodinha", Space: "Espaço",
    ShiftLeft: "Shift", ShiftRight: "Shift dir.", ControlLeft: "Ctrl", ControlRight: "Ctrl dir.", AltLeft: "Alt", AltRight: "Alt dir.", Enter: "Enter", Backspace: "Backspace",
    ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", CapsLock: "Caps" };
  if (fixos[code]) return fixos[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "Num " + code.slice(6);
  return code;
}
// a primeira tecla de uma ação, pronta para as dicas: <kbd>K</kbd>
export const kbd = (id) => { const t = teclasDe(id); return t.length ? t.map((c) => `<kbd>${h(nomeTecla(c))}</kbd>`).join(" ou ") : "<kbd>—</kbd>"; };
export const nomeAcao = (id) => nomeTecla(teclasDe(id)[0]);

// ---------- tela de configurar (no menu de pausa e na sala) ----------
let ouvindo = null; // { id, slot } esperando a próxima tecla/botão
export function painelTeclas() {
  const linhas = ACOES.map((a) => `<div class="tecla"><span>${h(a.nome)}</span>${[0, 1].map((slot) => {
    const c = escolhas[a.id][slot], on = ouvindo && ouvindo.id === a.id && ouvindo.slot === slot;
    return `<button class="small ${on ? "on" : ""}" data-tecla="${a.id}" data-slot="${slot}">${on ? "aperte…" : c ? h(nomeTecla(c)) : "+"}</button>`;
  }).join("")}</div>`).join("");
  return `<div class="teclas">${linhas}</div><div class="row" style="margin-top:8px"><button class="small ghost" data-tecla-reset="1">Voltar ao padrão</button><span class="muted" style="font-size:12.5px">Clique num botão e aperte a tecla (ou clique com o mouse / gire a rodinha). <kbd>Esc</kbd> cancela, <kbd>Backspace</kbd> apaga.</span></div>`;
}
const redesenhar = () => document.querySelectorAll("[data-teclas]").forEach((e) => (e.innerHTML = painelTeclas()));
// escolhe: a tecla sai de onde estava (cada tecla faz uma ação só)
function escolher(code) {
  const { id, slot } = ouvindo; ouvindo = null;
  if (code !== null) {
    for (const a of ACOES) escolhas[a.id] = escolhas[a.id].filter((c) => c !== code);
    const lista = [...escolhas[id]]; if (code) lista[Math.min(slot, lista.length)] = code; else lista.splice(slot, 1);
    escolhas[id] = lista.filter(Boolean).slice(0, 2);
    salvar();
  }
  redesenhar();
}
export const esperandoTecla = () => !!ouvindo;
// captura antes do jogo (fase de captura): enquanto espera uma tecla, nada chega no jogo
document.addEventListener("keydown", (e) => {
  if (!ouvindo) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.code === "Escape") return escolher(null);
  if (e.code === "Backspace") return escolher("");
  if (PROIBIDAS.has(e.code)) return;
  escolher(e.code);
}, true);
document.addEventListener("mousedown", (e) => {
  if (!ouvindo || e.target.closest("[data-tecla]")) return;
  e.preventDefault(); e.stopImmediatePropagation(); escolher("Mouse" + e.button);
}, true);
document.addEventListener("wheel", (e) => { if (!ouvindo) return; e.preventDefault(); e.stopImmediatePropagation(); escolher("Wheel"); }, { capture: true, passive: false });
document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.tecla) {
    if (ouvindo && ouvindo.id === b.dataset.tecla && ouvindo.slot === +b.dataset.slot) { escolher("Mouse0"); return; } // clicou de novo no mesmo: é o clique esquerdo
    ouvindo = { id: b.dataset.tecla, slot: +b.dataset.slot }; redesenhar();
  } else if (b.dataset.teclaReset) { ouvindo = null; for (const a of ACOES) escolhas[a.id] = [...a.padrao]; salvar(); redesenhar(); }
});
document.addEventListener("contextmenu", (e) => { if (ouvindo) e.preventDefault(); });
export { POR_ID };
