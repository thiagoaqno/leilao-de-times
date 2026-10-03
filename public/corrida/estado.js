// Corrida da Galera — o que os módulos dividem: pistas, o socket, o estado da sala (E.S) e as ajudinhas.
// Variável reatribuída por mais de um módulo fica dentro do E (um import não pode ser reatribuído).

export const { PISTAS, CARROS, sample, elevate, SECTORS, WORLD } = window.Pistas;
export const carOf = (p) => (p && CARROS[p.car]) || CARROS.equilibrado;
export const COLORS = ["#e63946", "#1e88e5", "#43a047", "#fdd835", "#8e24aa", "#fb8c00", "#00acc1", "#f06292"];
export const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "🏎️"];
export const socket = io("/corrida");
export const { $, h, store } = Comum;
export const relogio = Comum.relogio(), sNow = relogio.agora;
export const me = () => (E.S && E.ME && E.ME.id ? E.S.players.find((p) => p.id === E.ME.id) : null);
export const P = (id) => E.S && E.S.players.find((p) => p.id === id);
export const toast = Comum.criarToast(3200);
export const act = Comum.criarAct(socket, toast);
export const fmt = (s) => s == null ? "—" : `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
export const rng = (seed) => { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };

// o que é reatribuído em mais de um módulo fica aqui dentro (um import não pode ser reatribuído)
export const E = {
  S: null,
  ME: null,
};
