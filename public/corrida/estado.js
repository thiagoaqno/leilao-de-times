// Corrida da Galera — o que os módulos dividem: pistas, o socket, o estado da sala (E.S) e as ajudinhas.
// Variável reatribuída por mais de um módulo fica dentro do E (um import não pode ser reatribuído).

export const { PISTAS, CARROS, sample, elevate, SECTORS, WORLD, checkpoint } = window.Pistas;
// O carro de um piloto: nas regras de F1, quem tem equipe anda com o carro dela (a montagem do chefe da equipe, ou a padrão;
// f1-equipes.js, as mesmas contas do servidor); senão, um dos cinco carros. Carro quebrado anda no modo de emergência.
const CARROS_F1 = new Map();
export const carOf = (p) => {
  const eq = p && p.equipe && E.S && E.S.config.regras === "f1" && window.F1Equipes && window.F1Equipes.EQUIPES[p.equipe] ? p.equipe : null;
  const base = eq ? specDaEquipe(eq) : (p && CARROS[p.car]) || CARROS.equilibrado;
  return p && p.quebrou ? emergencia(base) : base;
};
// a especificação do carro de uma equipe na sala de agora (guardada por montagem: não refaz a conta a cada quadro)
export function specDaEquipe(equipe) {
  const F = window.F1Equipes, m = (E.S && E.S.montagens && E.S.montagens[equipe]) || null, chave = equipe + ":" + (m ? F.ORDEM.map((k) => m[k]).join("-") : "padrao");
  if (!CARROS_F1.has(chave)) { if (CARROS_F1.size > 60) CARROS_F1.clear(); CARROS_F1.set(chave, F.specDaEquipe(equipe, m)); }
  return CARROS_F1.get(chave);
}
const emergencia = (s) => ({ ...s, vmax: s.vmax * window.F1Equipes.EMERGENCIA, acc: s.acc * 0.5 });
export const COLORS = ["#e63946", "#1e88e5", "#43a047", "#fdd835", "#8e24aa", "#fb8c00", "#00acc1", "#f06292"];
export const PAWNS = ["😎", "🤠", "👽", "🤖", "🐸", "🦊", "🐼", "🐯", "🦄", "🐙", "👻", "🤡", "🦁", "🐵", "🐧", "🏎️"];
export const socket = io("/corrida");
export const { $, h, store } = Comum;
export const relogio = Comum.relogio(), sNow = relogio.agora;
// O relógio do servidor para a REDE dos carros (pose.js): o offset vem das respostas de menor ida e volta (ver rede.js, sincronizarRelogio),
// em milissegundos com fração, e não do `now` de cada estado (que vem atrasado pela viagem do pacote e varia de um para o outro). É nele
// que o navegador diz ao servidor a hora de cada passo (`tt` do `inp`), que desenha os outros carros e que prevê a batida.
export const agoraLocal = () => performance.timeOrigin + performance.now();
export const relogioF1 = window.Pose.criarRelogio(agoraLocal);
export const tempoReal = relogioF1.agora;
export const me = () => (E.S && E.ME && E.ME.id ? E.S.players.find((p) => p.id === E.ME.id) : null);
export const P = (id) => E.S && E.S.players.find((p) => p.id === id);
const toastBase = Comum.criarToast(3200);
// regras de F1: na pista (corrida e classificação) o aviso vira uma faixa da fila de avisos (hud.js liga `E.avisarF1`); no resto, o toast de sempre
export const toast = (msg, ms) => { if (E.avisarF1 && E.S && E.S.config && E.S.config.regras === "f1" && (E.S.phase === "race" || E.S.phase === "quali")) E.avisarF1(msg, ms || 3200); else toastBase(msg, ms); };
export const act = Comum.criarAct(socket, toast);
export const fmt = (s) => s == null ? "—" : `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
export const rng = (seed) => { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };

// o que é reatribuído em mais de um módulo fica aqui dentro (um import não pode ser reatribuído)
export const E = {
  S: null,
  ME: null,
};
