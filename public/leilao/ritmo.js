// O ritmo do campeonato ao vivo (usado no servidor e no navegador): quanto dura cada pedaço de um jogo na tela.
// O navegador toca o placar com esses tempos; o servidor usa a mesma conta para só abrir os palpites da próxima
// parte depois que os jogos de agora terminam (senão os confrontos da próxima entregariam quem passou).
// Os pênaltis escolhidos pela galera também moram aqui: os 6 cantos do gol (vistos de quem bate) e os tempos do
// duelo. Enquanto o duelo está aberto, o relógio da parte para (o servidor guarda as pausas).
(function (root) {
  const RITMO = { REG: 16000, PRORR: 4500, PEN0: 900, PEN: 1100, FIM: 1400, TAB: 2400 }; // ms
  const duracaoJogo = (j) => RITMO.REG + (j.extra ? RITMO.PRORR : 0) + (j.pens ? RITMO.PEN0 + j.pens.cob.length * RITMO.PEN : 0);
  const duracaoParte = (live) => Math.max(...live.jogos.map(duracaoJogo)) + RITMO.FIM + (live.tabela ? RITMO.TAB : 0);
  // os cantos: e/m/d (esquerda, meio e direita de quem bate) e a/b (alto e baixo)
  const ZONAS = ["ea", "ma", "da", "eb", "mb", "db"];
  const ZONA_NOME = { ea: "no alto, à esquerda", ma: "no alto, no meio", da: "no alto, à direita", eb: "embaixo, à esquerda", mb: "embaixo, no meio", db: "embaixo, à direita" };
  // o duelo: o tempo para escolher (no jogo e em cada cobrança da disputa), o replay do resultado e a chance de isolar
  const DUELO = { JOGO: 15000, DISPUTA: 12000, REPLAY: 4400, REPLAY_DISPUTA: 3400, FORA: 0.05 };
  // em que ponto do jogo (ms de relógio, sem as pausas) fica o pênalti que a galera ainda vai decidir
  const tempoPendente = (j) => {
    const p = j.pendente; if (!p) return null;
    if (p.tipo === "jogo") return (RITMO.REG * p.min) / j.mins;
    return RITMO.REG + (j.extra ? RITMO.PRORR : 0) + RITMO.PEN0 + p.cob * RITMO.PEN;
  };
  // quanto tempo a parte ficou parada nos duelos até agora (pausas: [[de, ate], ...]; ate vazio = ainda parada)
  const pausado = (pausas, agora) => (pausas || []).reduce((s, [de, ate]) => s + Math.max(0, Math.min(ate || agora, agora) - de), 0);
  const api = { RITMO, duracaoJogo, duracaoParte, ZONAS, ZONA_NOME, DUELO, tempoPendente, pausado };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Ritmo = api;
})(typeof window !== "undefined" ? window : globalThis);
