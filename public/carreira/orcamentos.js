// Carreira de Treinador: o orçamento de cada clube no começo da carreira (servidor e navegador). São valores de jogo,
// pensados para cada clube ter um começo diferente: NÃO são dados oficiais. A situação mexe na temporada inteira:
//   rico        a TV e o patrocínio pagam 30% a mais
//   saf         o dono põe dinheiro na janela do meio do ano se o time estiver no G6
//   equilibrado nada de especial
//   endividado  paga uma parcela da dívida a cada rodada
//   pequeno     nada de especial (só tem pouco dinheiro)
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Orcamentos = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const M = 1e6;
  const SITUACOES = {
    rico: { nome: "Rico", texto: "Cofres cheios: dá para sonhar alto." },
    saf: { nome: "SAF", texto: "O dono novo quer resultado rápido (e põe dinheiro se o time brigar lá em cima)." },
    equilibrado: { nome: "Equilibrado", texto: "Dá para reforçar, sem loucura." },
    endividado: { nome: "Endividado", texto: "Dívida alta: uma parcela sai do caixa a cada rodada. Vender antes de comprar." },
    pequeno: { nome: "Pequeno", texto: "Cada real conta." },
  };
  const CLUBES = {
    flamengo: [120 * M, "rico"], palmeiras: [110 * M, "rico"], botafogo: [80 * M, "saf"], cruzeiro: [70 * M, "saf"],
    bahia: [60 * M, "saf"], atleticomg: [55 * M, "saf"], bragantino: [50 * M, "saf"], fluminense: [50 * M, "equilibrado"],
    gremio: [45 * M, "equilibrado"], internacional: [45 * M, "equilibrado"], athletico: [40 * M, "equilibrado"],
    corinthians: [35 * M, "endividado"], santos: [35 * M, "endividado"], saopaulo: [30 * M, "endividado"], vasco: [30 * M, "endividado"],
    coritiba: [20 * M, "pequeno"], vitoria: [18 * M, "pequeno"], remo: [15 * M, "pequeno"], mirassol: [12 * M, "pequeno"], chapecoense: [10 * M, "pequeno"],
  };
  // o orçamento de um clube (os de fora da tabela, como os da base de teste, ficam pelo tamanho)
  function de(clube) {
    const t = CLUBES[clube.id];
    if (t) return { caixa: t[0], situacao: t[1] };
    return { caixa: ({ 5: 60, 4: 35, 3: 20, 2: 12, 1: 8 }[clube.tamanho] || 15) * M, situacao: clube.tamanho >= 5 ? "equilibrado" : "pequeno" };
  }
  // a parcela da dívida por rodada (endividado) e o aporte do dono (SAF)
  const parcelaDivida = (clube) => Math.round(clube.tamanho * 2.5e5 / 1e4) * 1e4;
  const aporteDono = (clube) => clube.tamanho * 4 * M;
  return { SITUACOES, CLUBES, de, parcelaDivida, aporteDono };
});
