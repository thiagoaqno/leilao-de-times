// Corrida da Galera — o ajuste de cada câmera (a tela "Câmera", camera-ui.js). Aqui ficam os padrões (no jeito do jogo oficial de F1) e o que o
// jogador mudou, guardado no navegador em `corrida:camera` ({ id: { campo: valor } }, só o que saiu do padrão). cameras.js lê `ajusteDe(id)` a cada
// quadro: o objeto já pronto (padrão + trocas), refeito só quando algo muda.
//   fov  campo de visão vertical de base, em graus (a velocidade ainda abre um pouco)
//   x    deslocamento lateral, em metros (positivo para a direita)
//   y    altura: sobe ou desce a câmera, em metros do carro
//   z    dentro do carro: avanço (+ para a frente); na perseguição: distância (+ afasta)
//   incl inclinação do olhar, em graus (+ olha para cima)
//   trem tremor da câmera, em % (0 desliga, 100 é o do jogo, até 200)
import { store } from "./estado.js";

export const CHAVE = "corrida:camera";
// as câmeras que têm ajuste (a aérea e a TV são automáticas)
export const EDITAVEIS = ["cockpit", "onboard", "bico", "perto", "longe"];
export const PADROES = {
  cockpit: { fov: 64, x: 0, y: 0, z: 0, incl: 0, trem: 100 },
  onboard: { fov: 62, x: 0, y: 0, z: 0, incl: -7, trem: 100 }, // (a T-cam olha para baixo: o halo, o bico e as rodas da frente entram no quadro)
  bico: { fov: 70, x: 0, y: 0, z: 0, incl: 0, trem: 100 },
  perto: { fov: 60, x: 0, y: 0, z: 0, incl: 0, trem: 100 },
  longe: { fov: 54, x: 0, y: 0, z: 0, incl: 0, trem: 100 },
};
const DENTRO = new Set(["cockpit", "onboard", "bico"]);
export const dentroDoCarro = (id) => DENTRO.has(id);
// os campos da tela: nome, dica, limites, passo e a unidade de cada um (a dica do avanço/distância muda conforme a câmera)
const CAMPOS = [
  { id: "fov", nome: "Campo de visão", un: "°", dica: "quanto cabe na tela: menor aproxima, maior abre", min: 40, max: 110, passo: 1 },
  { id: "x", nome: "Deslocamento lateral", un: " m", dica: "negativo para a esquerda; positivo para a direita", min: -1, max: 1, passo: 0.05, dec: 2 },
  { id: "y", nome: "Altura", un: " m", dica: "sobe ou desce a câmera", min: -1, max: 1, passo: 0.05, dec: 2 },
  { id: "z", nome: "Avanço", un: " m", dica: "leva a câmera para a frente ou para trás", min: -0.6, max: 1.2, passo: 0.05, dec: 2 },
  { id: "incl", nome: "Inclinação", un: "°", dica: "olha mais para cima ou para baixo", min: -15, max: 15, passo: 0.5, dec: 1 },
  { id: "trem", nome: "Tremor da câmera", un: "%", dica: "0 desliga; 100 é o do jogo", min: 0, max: 200, passo: 5 },
];
// (na perseguição a altura e a distância têm mais folga, porque a câmera anda muito mais longe do carro)
const FORA = { x: { min: -4, max: 4 }, y: { min: -2, max: 6 }, z: { nome: "Distância", dica: "afasta ou aproxima a câmera do carro", min: -3, max: 8 } };
export function camposDe(id) {
  return CAMPOS.map((c) => (DENTRO.has(id) ? c : { ...c, ...(FORA[c.id] || {}) }));
}
const campoPor = (id, campo) => camposDe(id).find((c) => c.id === campo);

let custom = {}; const prontos = new Map();
const limpar = (id, campo, v) => { const c = campoPor(id, campo); v = +v; return c && Number.isFinite(v) ? Math.max(c.min, Math.min(c.max, v)) : null; };
try {
  const v = store.get(CHAVE);
  if (v && typeof v === "object" && !Array.isArray(v)) for (const id of EDITAVEIS) {
    const o = v[id]; if (!o || typeof o !== "object") continue;
    for (const campo of Object.keys(PADROES[id])) { const n = limpar(id, campo, o[campo]); if (n != null && n !== PADROES[id][campo]) (custom[id] ||= {})[campo] = n; }
  }
} catch (e) { custom = {}; }
const salvar = () => { try { store.set(CHAVE, custom); } catch (e) {} };
const avisar = () => { prontos.clear(); try { window.dispatchEvent(new Event("camera:mudou")); } catch (e) {} };

// o ajuste pronto da câmera (as que não têm ajuste devolvem o padrão da perseguição afastada, que nunca é usado por elas)
export function ajusteDe(id) {
  let r = prontos.get(id);
  if (!r) { r = { ...(PADROES[id] || PADROES.longe), ...(custom[id] || {}) }; prontos.set(id, r); }
  return r;
}
export const padraoDe = (id, campo) => PADROES[id][campo];
export const mudou = (id) => !!custom[id] && Object.keys(custom[id]).length > 0;
export const temTrocas = () => EDITAVEIS.some(mudou);
export function definir(id, campo, valor) {
  const n = limpar(id, campo, valor); if (n == null || !PADROES[id]) return;
  const dec = campoPor(id, campo).dec || 0, v = +n.toFixed(dec);
  if (v === PADROES[id][campo]) { if (custom[id]) { delete custom[id][campo]; if (!Object.keys(custom[id]).length) delete custom[id]; } }
  else (custom[id] ||= {})[campo] = v;
  salvar(); avisar();
}
export function restaurarCamera(id) { delete custom[id]; salvar(); avisar(); }
export function restaurarTudo() { custom = {}; salvar(); avisar(); }
