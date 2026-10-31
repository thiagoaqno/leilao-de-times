// Corrida da Galera — o mapa de teclas e botões do controle (o que cada tecla faz), com os padrões e as trocas do jogador.
// controles.js (pilotagem) e mfd.js (o MFD) leem DAQUI em vez de ter tecla fixa; teclas-ui.js é a tela de remapear. As trocas ficam no
// navegador (`corrida:teclas`, só o que mudou do padrão). Tecla = `KeyboardEvent.code` (a posição, não a letra); botão = índice da Gamepad API.
//
// Padrões: W A S D pilotam; as SETAS são do MFD (↑↓ a linha, ←→ o valor), M e N trocam a página, Tab abre e fecha, Enter confirma o box.
// O analógico esquerdo do controle sempre esterça (não remapeia). Fora do HUD de F1 (arcade e classificação) as setas seguem esterçando
// (controles.js), porque lá não há MFD.
import { store } from "./estado.js";

export const CHAVE = "corrida:teclas";
// `ctx`: "todos", "mfd" (só no HUD de F1) ou "arcade": duas ações só conflitam se os contextos se encontram. `comp`: ações que repartem
// o mesmo botão de propósito (B e X freiam no automático e trocam a marcha no manual).
export const ACOES = [
  { id: "gas", g: "Pilotagem", nome: "Acelerar", k: ["KeyW"], p: [7, 0] },
  { id: "freio", g: "Pilotagem", nome: "Frear / ré", k: ["KeyS"], p: [6, 1, 2], comp: ["marchaMais", "marchaMenos"] },
  { id: "esq", g: "Pilotagem", nome: "Esquerda", k: ["KeyA"], p: [] },
  { id: "dir", g: "Pilotagem", nome: "Direita", k: ["KeyD"], p: [] },
  { id: "marchaMais", g: "Pilotagem", nome: "Marcha acima (câmbio manual)", k: ["ShiftLeft", "ShiftRight"], p: [2], comp: ["freio"] },
  { id: "marchaMenos", g: "Pilotagem", nome: "Marcha abaixo (câmbio manual)", k: ["ControlRight"], p: [1], comp: ["freio"] },
  { id: "ers", g: "Pilotagem", nome: "ERS / overtake (segurar)", k: ["KeyE"], p: [] },
  { id: "item", g: "Pilotagem", nome: "Usar item (arcade)", k: ["Space"], p: [5], ctx: "arcade" },
  { id: "respawn", g: "Pilotagem", nome: "Voltar para a pista", k: ["KeyR"], p: [8] },
  { id: "camera", g: "Câmera", nome: "Trocar a câmera", k: ["KeyC"], p: [3] },
  { id: "olharTras", g: "Câmera", nome: "Olhar para trás (segurar)", k: ["KeyV"], p: [10] },
  { id: "box", g: "Box", nome: "Box (abre o MFD; de novo pede, sem cancelar)", k: ["KeyB"], p: [] },
  { id: "pneu1", g: "Box", nome: "Pneu macio (escolhe e pede)", k: ["Digit1", "Numpad1"], p: [] },
  { id: "pneu2", g: "Box", nome: "Pneu médio (escolhe e pede)", k: ["Digit2", "Numpad2"], p: [] },
  { id: "pneu3", g: "Box", nome: "Pneu duro (escolhe e pede)", k: ["Digit3", "Numpad3"], p: [] },
  { id: "pneu4", g: "Box", nome: "Pneu de chuva (escolhe e pede)", k: ["Digit4", "Numpad4"], p: [] },
  { id: "cancelarBox", g: "Box", nome: "Cancelar o pedido de box", k: ["Backspace"], p: [] },
  { id: "mfdAbrir", g: "MFD", nome: "Abrir / fechar o MFD", k: ["Tab"], p: [11], ctx: "mfd" },
  { id: "mfdPagMais", g: "MFD", nome: "Página seguinte", k: ["KeyM"], p: [5], ctx: "mfd", comp: ["item"] },
  { id: "mfdPagMenos", g: "MFD", nome: "Página anterior", k: ["KeyN"], p: [4], ctx: "mfd" },
  { id: "mfdLinhaMenos", g: "MFD", nome: "Linha acima", k: ["ArrowUp"], p: [12], ctx: "mfd" },
  { id: "mfdLinhaMais", g: "MFD", nome: "Linha abaixo", k: ["ArrowDown"], p: [13], ctx: "mfd" },
  { id: "mfdValorMenos", g: "MFD", nome: "Valor anterior (ou página)", k: ["ArrowLeft"], p: [14], ctx: "mfd" },
  { id: "mfdValorMais", g: "MFD", nome: "Valor seguinte (ou página)", k: ["ArrowRight"], p: [15], ctx: "mfd" },
  { id: "confirmar", g: "MFD", nome: "Confirmar no MFD", k: ["Enter", "NumpadEnter"], p: [0], ctx: "mfd", comp: ["gas"] },
];
export const porId = Object.fromEntries(ACOES.map((a) => [a.id, a]));
export const ui = { aberto: false, capturando: false }; // a tela de teclas aberta: a pilotagem e o MFD ficam quietos

let custom = {}, idxK = null;
try { const v = store.get(CHAVE); if (v && typeof v === "object" && !Array.isArray(v)) custom = v; } catch (e) { custom = {}; }
const salvar = () => { try { store.set(CHAVE, custom); } catch (e) {} };
const avisar = () => { idxK = null; try { window.dispatchEvent(new Event("teclas:mudou")); } catch (e) {} };
const lista = (id, tipo) => { const c = custom[id]; return c && Array.isArray(c[tipo]) ? c[tipo].filter((x) => (tipo === "k" ? typeof x === "string" : Number.isInteger(x))) : porId[id][tipo]; };
export const teclasDe = (id) => lista(id, "k");
export const botoesDe = (id) => lista(id, "p");
export function acoesDaTecla(code) {
  if (!idxK) { idxK = new Map(); for (const a of ACOES) for (const c of teclasDe(a.id)) { if (!idxK.has(c)) idxK.set(c, []); idxK.get(c).push(a.id); } }
  return idxK.get(code) || [];
}
export const temTecla = (id, code) => teclasDe(id).includes(code);

const encontra = (a, b) => (a || "todos") === (b || "todos") || (a || "todos") === "todos" || (b || "todos") === "todos";
// outras ações que já usam essa tecla (tipo "k") ou botão (tipo "p") e que o jogador usaria na mesma hora
export function conflitosDe(id, tipo, valor) {
  const eu = porId[id];
  return ACOES.filter((a) => a.id !== id && encontra(eu.ctx, a.ctx) && !(eu.comp || []).includes(a.id) && !(a.comp || []).includes(id) && lista(a.id, tipo).includes(valor)).map((a) => a.id);
}
export function definir(id, tipo, valores) { custom[id] = { ...(custom[id] || {}), [tipo]: valores }; salvar(); avisar(); }
export function tirar(id, tipo, valor) { definir(id, tipo, lista(id, tipo).filter((x) => x !== valor)); }
export function restaurar() { custom = {}; salvar(); avisar(); }
export const temTrocas = () => Object.keys(custom).length > 0;

const NOMES_TECLA = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", Space: "Espaço", Enter: "Enter", NumpadEnter: "Enter (num.)", Tab: "Tab", Escape: "Esc", ShiftLeft: "Shift esq.", ShiftRight: "Shift dir.", ControlLeft: "Ctrl esq.", ControlRight: "Ctrl dir.", AltLeft: "Alt esq.", AltRight: "Alt dir.", Backspace: "Backspace", Backquote: "`", Minus: "-", Equal: "=", Comma: ",", Period: ".", Slash: "/", Semicolon: ";", Quote: "'", BracketLeft: "[", BracketRight: "]", Backslash: "\\", CapsLock: "Caps" };
export function nomeDaTecla(code) {
  if (NOMES_TECLA[code]) return NOMES_TECLA[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return "Num " + code.slice(6);
  return code;
}
const NOMES_BOTAO = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "Back", "Start", "L3", "R3", "D-pad ↑", "D-pad ↓", "D-pad ←", "D-pad →"];
export const nomeDoBotao = (i) => NOMES_BOTAO[i] || "Botão " + i;
