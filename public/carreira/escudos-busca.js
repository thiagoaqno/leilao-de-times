// Nomes alternativos dos clubes da Série B para atualizar os PNGs com ferramentas/baixar-escudos-locais.js.
// O jogo não carrega este arquivo nem consulta a TheSportsDB durante a partida.
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
