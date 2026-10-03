// Pelada da Galera — o estado que todos os módulos dividem: constantes, o socket, o estado da sala (E.S), o jogo
// no navegador (G), as teclas, a bola (ballS e local) e as ajudinhas que todo mundo usa.
// Regra da divisão: objeto compartilhado é mutável (G, ballS, keys, PAD...); variável reatribuída por mais de um
// módulo fica dentro do E (um import não pode ser reatribuído), por exemplo E.charge = null.

export const C = window.Campo, KITS = C.KITS;
export const { $, h, store } = Comum;
export const setH = (id, html) => { const e = $(id); if (e._h !== html) { e._h = html; e.innerHTML = html; } }; // só mexe no HTML quando muda
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const angLerp = (a, b, k) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * k; };
export const SIDES = { A: "Mandante", B: "Visitante" };
export const FL = { sprint: 1, charge: 2, slide: 4, dive: 8, flip: 16, down: 32, boost: 64, grab: 128, pede: 2048 }; // grab: segurando alguém · pede: pedindo a bola (🙋)
// contra bots: velocidade (fração da sua), tempo de reação (s), erro na mira (rad) e vontade de dar carrinho
export const BOT_DIF = {
  facil: { nome: "Fácil", vel: 0.8, reac: 0.5, erro: 0.18, carrinho: 0.2 },
  medio: { nome: "Médio", vel: 0.9, reac: 0.3, erro: 0.1, carrinho: 0.45 },
  dificil: { nome: "Difícil", vel: 0.98, reac: 0.16, erro: 0.05, carrinho: 0.8 },
};
export const INTERP = 100; // ms que os outros ficam "no passado" (pacotes a cada 50 ms)
// a mesma página serve duas casas: /pelada/ (futebol a pé) e /rocket/ (futebol de carro, estilo Rocket League)
export const FIXO = location.pathname.startsWith("/rocket") ? "carros" : "pes", BASE = FIXO === "carros" ? "/rocket/" : "/pelada/";
export const toast = Comum.criarToast(3200);
export const kitOf = C.kitOf;
export function kitCss(k) {
  const K = kitOf(k), c = K.c;
  if (K.kind === "vstripes") return `repeating-linear-gradient(90deg,${c[0]} 0 5px,${c[1]} 5px 10px)`;
  if (K.kind === "hstripes") return `repeating-linear-gradient(0deg,${c[0]} 0 5px,${c[1]} 5px 10px)`;
  if (K.kind === "band") return `linear-gradient(${c[0]} 0 35%,${c[1]} 35% 55%,${c[2]} 55% 70%,${c[0]} 70%)`;
  return c[0];
}
export const socket = io("/pelada");
export const relogio = Comum.relogio(), sNow = relogio.agora;
export const myP = () => (E.S && E.ME && E.ME.id ? E.S.players.find((p) => p.id === E.ME.id) : null);
export const P = (id) => E.S && E.S.players.find((p) => p.id === id);
export const PN = (n) => E.S && E.S.players.find((p) => p.n === n);
export const act = Comum.criarAct(socket, toast);
export const molinhoLigado = () => (G.mode === "online" ? !!(E.S && E.S.config.molinho) : store.get("pelada:molinho") !== false);
export const canvas = $("cv");
// ======================================================================
// Estado do jogo no navegador
// ======================================================================
export const G = { active: false, mode: null, game: "pes", F: C.MODES.pes, me: null, remotes: new Map(), keeper: null, kickoffKey: null, lastSend: 0, feed: [],
  camYaw: 0, camPitch: 0.05, tv: false, ballCam: true, camCarYaw: 0, view: store.get("pelada:view") || "atras" };
// câmeras a pé: atrás do jogador (o mouse gira), TV (da lateral) e primeira pessoa. W/A/S/D sempre seguem a TELA:
// na TV, W é para cima da tela (e não para onde você mirou por último).
export const VIEWS = ["atras", "tv", "primeira"], VIEW_NAMES = { atras: "Câmera atrás do jogador", tv: "Câmera de TV", primeira: "Primeira pessoa" };
export const ctrlYaw = () => (G.view === "tv" ? 0 : G.camYaw);
export const keys = new Set();
export const now = () => performance.now() / 1000 + E.adiantado;
// no celular não tem "prender o mouse": jogando = depois de tocar em "Voltar pro jogo"
export const TOUCH = window.Toque && Toque.isTouch();
export const locked = () => document.pointerLockElement === canvas || (TOUCH && E.touchPlay && G.active) || (PAD.play && G.active);
export const ballS = { snap: null, view: C.newBall(), off: { x: 0, y: 0, z: 0 }, ignoreUntil: 0 };
export const local = { ball: null };
export const isCar = () => G.game === "carros";
export const offline = () => G.mode === "treino" || G.mode === "bots"; // bola e (contra bots) os outros jogadores rodam só aqui
export function myKit() { if (offline()) return store.get("pelada:kit") || "corinthians"; const m = myP(); return m && m.team ? E.S.kits[m.team] : "corinthians"; }
export function mySkin() { const m = myP(); return (G.mode === "online" && m && m.skin) || store.get("pelada:skin") || "padrao"; }
export const PAD = { on: false, play: false, prev: [], lx: 0, ly: 0, rx: 0, ry: 0, fontes: new Map() };
export function myAttackTeam() { if (offline()) return "A"; const m = myP(); return m && m.team ? m.team : null; }
// troca de jogador (estilo FIFA) é opcional e começa desligada: o padrão é o jogador fixo, como no Pro Clubs. Contra
// bots, vale a escolha da tela inicial; online, a do organizador (só no amistoso com bots).
export function trocaLigada() { return G.mode === "bots" ? store.get("pelada:troca") === true : G.mode === "online" && !!(E.S && E.S.config.bots && E.S.config.troca); }
export const CARRINHO_CD = 4; // segundos entre um carrinho e outro (você e os bots)
// o que é reatribuído em mais de um módulo fica aqui dentro (um import não pode ser reatribuído)
export const E = {
  S: null,
  ME: null,
  urlCode: new URLSearchParams(location.search).get("sala"),
  sens: store.get("pelada:sens") ?? 1.6,
  jumpQueued: false,
  charge: null,
  wheelQueued: false,
  adiantado: 0, // só para testes (#debug): tempo simulado de uma vez
  touchPlay: false,
};
