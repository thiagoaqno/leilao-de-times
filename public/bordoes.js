// Frases usadas na narração dos jogos simulados: só memes e pérolas do futebol (sem piadas por apelido).
// Edite à vontade. Marcadores: {t} = o time/participante, {o} = o adversário.
(function (root) {
const BORDOES = {
  // Gritos de quem ganha de lavada (3 gols ou mais de diferença), como na arquibancada
  lavada: ["É GOLEADA!", "OLÉ! OLÉ! OLÉ!", "FREGUÊS!", "PODE IR PRO VESTIÁRIO!", "TÁ ACHANDO QUE É FÁCIL?", "É CAIXOTE!"],
  // Frases do narrador da mesa redonda
  narrador: {
    lavada: ["Que absurdo! Isso aqui não é futebol, é covardia!", "Pode desligar a TV, acabou!", "Zaga de várzea, meu amigo. DE VÁRZEA!", "O goleiro do {o} tem que devolver o salário!", "Chocolate! Aplicaram um chocolate no {o}!", "Vira o disco, que esse já tocou demais!"],
    apertado: ["Jogo de nervos! Ninguém respirou até o apito final.", "Decidido no detalhe. Isso é futebol!", "Que jogão, minha gente. QUE JOGÃO!", "Clássico é clássico, e vice-versa."],
    empate: ["Empate justo, ninguém mereceu ganhar.", "Ficou no empate e todo mundo saiu reclamando do juiz.", "Um ponto pra cada um e a culpa é do VAR."],
    zerado: ["0 a 0. Dá pra pedir o dinheiro do ingresso de volta?", "Nenhum gol. Os atacantes foram fazer o quê em campo?", "Jogo de xadrez… e ninguém deu xeque."],
    penaltis: ["Nos pênaltis é loteria, e hoje o bilhete premiado foi do {t}!", "Pênalti é detalhe? Pois o detalhe foi do {t}!"],
    hattrick: ["HAT-TRICK! Pede música no Fantástico!", "Três gols! Leva a bola pra casa!"],
  },
  // Pérolas do futebol: um jogador do time "solta" a frase na entrevista. [frase, de quem é a original]
  // Cada grupo é usado numa situação do jogo. Pode adicionar, tirar ou mudar de grupo.
  perolas: {
    gol: [["Meteli o goli.", "Vini Jr."], ["Não existe gol feio. Feio é não fazer gol.", "Dadá Maravilha"],
      ["Só três coisas param no ar: beija-flor, helicóptero e Dadá.", "Dadá Maravilha"], ["Ripa na chulipa e pimba na gorduchinha!", "Osmar Santos"],
      ["Foi, foi, foi, foi ele!", "Silvio Luiz"], ["Olha o que ele fez! Olha o que ele fez!", "Galvão Bueno"]],
    vitoria: [["Acho não, tenho a total dúvida que o time está de parabéns.", "Marcelo"], ["Pontuar pontos.", "Negueba"],
      ["As pessoas querem o Brasil vença e ganhe.", "Dunga"], ["Jogador tem que ser completo como o pato, que é um bicho aquático e gramático.", "Vicente Matheus"],
      ["Vocês vão ter que me engolir!", "Zagallo"], ["Aqui é trabalho, meu filho!", "Muricy Ramalho"], ["Haja o que hajar.", "Vicente Matheus"]],
    derrota: [["Jogo? Que jogo?!", "Fred"], ["Tomei ódio do juiz, apita toda hora.", "Galvão Bueno"], ["O VAR está virando bagunça.", "Galvão Bueno"],
      ["Quem está na chuva é pra se queimar.", "Vicente Matheus"], ["Pode isso, Arnaldo?", "Galvão Bueno"], ["A regra é clara.", "Arnaldo Cezar Coelho"],
      ["Eles fingem que me pagam e eu finjo que jogo.", "Vampeta"]],
    zebra: [["The football is a little box of surprise.", "Pelé"], ["Já combinaram com os russos?", "Garrincha"], ["Pelo amor dos meus filhinhos!", "Silvio Luiz"]],
    lavada: [["Virou passeio.", "Galvão Bueno"], ["Pra que tacar a bola na Mavi, pô? Pra quê? Arrogante!", "meme"], ["Olho no lance!", "Silvio Luiz"]],
    apertado: [["Haja coração!", "Galvão Bueno"], ["O gol é apenas um detalhe.", "Carlos Alberto Parreira"]],
    penaltiPerdido: [["Só bate quem erra.", "Mateus, do Caxias"], ["Só erra quem erra.", "Anderson"],
      ["Pênalti é uma coisa tão importante que quem devia bater é o presidente do clube.", "Neném Prancha"]],
    titulo: [["É tetra! É tetra! É tetra!", "Galvão Bueno"], ["Gostaria de mandar um grande abraço para todas as mães neste Dia das Páscoas.", "Gil Bala"],
      ["Vai que é tua, Taffarel!", "Galvão Bueno"]],
    abertura: [["Temos um amistoso. Espero que possamos fazer uma grande exibição e fazer os três pontos.", "Deivid"],
      ["Estou realizando meu sonho de ir jogar no futebol europeu.", "Váldson, indo para o México"],
      ["Já estou preparado para o frio. Estou acostumado. Morava em São Paulo.", "Vágner Love"],
      ["Bem, amigos da Rede Globo…", "Galvão Bueno"], ["Jogador tem que ir na bola como quem vai num prato de comida.", "Neném Prancha"]],
  },
  chancePerola: 0.6, // chance de ter uma pérola em cada jogo (0 a 1)
};
if (typeof module !== "undefined" && module.exports) module.exports = BORDOES; else root.BORDOES = BORDOES;
})(typeof window !== "undefined" ? window : globalThis);
