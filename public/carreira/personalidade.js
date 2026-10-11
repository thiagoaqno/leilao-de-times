// Carreira de Treinador: a PERSONALIDADE dos jogadores. Cada um tem um jeito que não muda (sai do id do jogador, com a posição
// inclinando o sorteio) e aparece na ficha. O jeito vale de verdade: o líder segura o time quando a moral está baixa, o de pavio
// curto toma cartão com mais facilidade, e cada tipo abre os seus próprios eventos (carreira-personalidades.js).
// UMD: o servidor usa nas contas e nos eventos, o navegador na ficha e na prancheta.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./motor.js"));
  else root.Personalidade = factory(root.Motor);
})(typeof self !== "undefined" ? self : this, function (Motor) {
  const TIPOS = {
    lider: { nome: "Líder", icone: "coroa", texto: "Fala no vestiário e segura o time quando a moral cai." },
    profissional: { nome: "Profissional", icone: "prancheta", texto: "Cuida do corpo, chega cedo e ajuda os mais novos." },
    pavio: { nome: "Pavio curto", icone: "explosao", texto: "Reclama de tudo e toma cartão com facilidade (suspenso no 2º amarelo)." },
    vaidoso: { nome: "Vaidoso", icone: "estrela", texto: "Quer ser a estrela e reage mal ao banco e à crítica." },
    festeiro: { nome: "Festeiro", icone: "drink", texto: "Alma da turma, mas a noite às vezes passa do ponto." },
    guerreiro: { nome: "Guerreiro", icone: "escudo", texto: "Joga com dor e não pede para sair." },
    reservado: { nome: "Reservado", icone: "silencio", texto: "Fala pouco e precisa de atenção para se soltar." },
  };
  // os pesos de cada tipo por grupo de posição (a ordem é a de TIPOS)
  const PESOS = {
    GOL: [1, 3, 0.5, 0.6, 0.6, 1, 3], DEF: [3, 2, 2, 0.6, 0.8, 3, 1.2], MEI: [2, 2, 1.2, 1.4, 1.8, 1.4, 1.4], ATA: [1.2, 1.4, 1.6, 3, 2.4, 1.4, 1.2],
  };
  const GRUPO = { GOL: "GOL", ZAG: "DEF", LD: "DEF", LE: "DEF", VOL: "DEF", MC: "MEI", MEI: "MEI", PE: "ATA", PD: "ATA", ATA: "ATA" };
  const IDS = Object.keys(TIPOS);
  const cache = new Map();
  function tipoDe(j) {
    if (!j) return "reservado";
    const chave = `${j.id}:${j.pos}`; if (cache.has(chave)) return cache.get(chave);
    const w = PESOS[GRUPO[j.pos] || "MEI"], total = w.reduce((s, v) => s + v, 0);
    let x = Motor.sorteDe(`pers:${j.id}`)() * total, k = 0;
    for (; k < w.length - 1; k++) { x -= w[k]; if (x < 0) break; }
    cache.set(chave, IDS[k]); return IDS[k];
  }
  const de = (j) => { const id = tipoDe(j); return { id, ...TIPOS[id] }; };
  // o líder titular segura o time quando a moral está baixa: +1 na nota de todos
  const bonusDoLider = (titulares, moral) => (moral < 55 && titulares.some((j) => tipoDe(j) === "lider") ? 1 : 0);
  // o pavio curto é suspenso no segundo amarelo (os outros, no terceiro)
  const limiteDeAmarelos = (j) => (tipoDe(j) === "pavio" ? 2 : 3);
  return { TIPOS, IDS, tipoDe, de, bonusDoLider, limiteDeAmarelos };
});
