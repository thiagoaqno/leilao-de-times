// O ritmo do campeonato ao vivo (usado no servidor e no navegador): quanto dura cada pedaço de um jogo na tela.
// O navegador toca o placar com esses tempos; o servidor usa a mesma conta para só abrir os palpites da próxima
// parte depois que os jogos de agora terminam (senão os confrontos da próxima entregariam quem passou).
(function (root) {
  const RITMO = { REG: 16000, PRORR: 4500, PEN0: 900, PEN: 1100, FIM: 1400, TAB: 2400 }; // ms
  const duracaoJogo = (j) => RITMO.REG + (j.extra ? RITMO.PRORR : 0) + (j.pens ? RITMO.PEN0 + j.pens.cob.length * RITMO.PEN : 0);
  const duracaoParte = (live) => Math.max(...live.jogos.map(duracaoJogo)) + RITMO.FIM + (live.tabela ? RITMO.TAB : 0);
  const api = { RITMO, duracaoJogo, duracaoParte };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Ritmo = api;
})(typeof window !== "undefined" ? window : globalThis);
