// Os clubes que ainda não estão em escudos-api.js (a Série B): o nome com que cada um é procurado na TheSportsDB (um ou mais,
// tentados em ordem). O servidor procura na primeira vez que alguém pede o escudo (GET /api/escudo/:id, server.js), só entre os
// times do Brasil, e guarda na memória; a página, quando o clube está aqui, pede o escudo ao servidor como os outros.
(function (root, fabrica) {
  const m = fabrica();
  if (typeof module === "object" && module.exports) module.exports = m; else root.ESCUDOS_BUSCA = m;
})(typeof self !== "undefined" ? self : this, () => ({
  fortaleza: ["Fortaleza"],
  ceara: ["Ceara"],
  sport: ["Sport Recife", "Sport"],
  juventude: ["Juventude"],
  goias: ["Goias"],
  americamg: ["America Mineiro", "America MG"],
  cuiaba: ["Cuiaba"],
  atleticogo: ["Atletico Goianiense", "Atletico GO"],
  novorizontino: ["Novorizontino", "Gremio Novorizontino"],
  criciuma: ["Criciuma"],
  avai: ["Avai"],
  crb: ["CRB"],
  vilanova: ["Vila Nova"],
  operario: ["Operario Ferroviario", "Operario PR"],
  nautico: ["Nautico"],
  pontepreta: ["Ponte Preta"],
  botafogosp: ["Botafogo SP", "Botafogo Ribeirao Preto"],
  londrina: ["Londrina"],
  saobernardo: ["Sao Bernardo", "Sao Bernardo FC"],
  athletic: ["Athletic Club", "Athletic MG"],
}));
