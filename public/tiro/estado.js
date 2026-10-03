// Tiro da Galera — o estado que os módulos dividem: constantes, o socket, o estado da sala (E.S), o jogo (G) e as
// teclas. Variável reatribuída por mais de um módulo fica dentro do E (um import não pode ser reatribuído).

export const AR = window.Arena, WP = AR.WEAPONS;
export const { $, h, store } = Comum;
export const setH = (id, html) => { const e = $(id); if (e._h !== html) { e._h = html; e.innerHTML = html; } }; // só mexe no HTML quando muda
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const TEAM = { A: "Azul", B: "Laranja" };
export const INTERP = 100; // ms que os outros ficam "no passado"
export const toast = Comum.criarToast(3200);

export const socket = io("/tiro");
export const relogio = Comum.relogio(), sNow = relogio.agora;
export const myP = () => (E.S && E.ME && E.ME.id ? E.S.players.find((p) => p.id === E.ME.id) : null);
export const P = (id) => E.S && E.S.players.find((p) => p.id === id);
export const act = Comum.criarAct(socket, toast);
export const canvas = $("cv");
// ======================================================================
// Estado do jogo no navegador
// ======================================================================
export const G = {
  active: false, mode: null, // "online" | "treino"
  me: null, remotes: new Map(), bots: [], specIdx: 0, lastSend: 0, roundKey: null, kills: 0, hs: 0, shots: 0,
};
export const keys = new Set();
// me.w = arma na mão; me.prim = principal (AK ou AWP); me.inv guarda a munição das outras
export const now = () => performance.now() / 1000;
// no celular não tem "prender o mouse": jogando = depois de tocar em "Voltar pro jogo"
export const TOUCH = window.Toque && Toque.isTouch();
export const locked = () => document.pointerLockElement === canvas || (TOUCH && E.touchPlay && G.active);

// o que é reatribuído em mais de um módulo fica aqui dentro (um import não pode ser reatribuído)
export const E = {
  S: null,
  ME: null,
  urlCode: new URLSearchParams(location.search).get("sala"),
  mouseDown: false,
  triggerUp: true,
  jumpQueued: false,
  sens: store.get("tiro:sens") ?? 1.6,
  touchPlay: false,
};
