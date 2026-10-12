// Corrida de Digitação — as frases e as contas (UMD): o servidor confere o que cada um digitou e o navegador usa as
// mesmas contas para pintar o texto. Acento e maiúscula contam: a frase tem que sair igualzinha.
(function (root) {
  const FRASES = [
    "O rato roeu a roupa do rei de Roma.",
    "Quem não arrisca não petisca, mas quem arrisca demais fica sem lanche.",
    "A galera combinou de jogar a noite inteira e ninguém quis dormir cedo.",
    "Água mole em pedra dura, tanto bate até que fura.",
    "O pastel da feira de domingo é o melhor da cidade inteira.",
    "Cachorro que late muito costuma morder pouco, dizia a minha avó.",
    "Três pratos de trigo para três tigres tristes.",
    "Amanhã eu começo a dieta, mas hoje tem pizza com a turma.",
    "O jabuti subiu na árvore e todo mundo ficou sem entender nada.",
    "Quem ri por último ri melhor, principalmente se for no truco.",
    "A bola rolou mansa, bateu na trave e entrou devagarinho no gol.",
    "Não adianta chorar o leite derramado, é melhor pegar o pano.",
    "O sábio já dizia que a pressa é inimiga da perfeição.",
    "Domingo de sol, churrasco no quintal e a família toda reunida.",
    "O gato subiu no telhado e fingiu que não tinha derrubado o vaso.",
    "A vida é como andar de bicicleta: para ficar em pé, é preciso se mover.",
    "Chuva de verão molhou a rua, o cachorro e o meu guarda-chuva furado.",
    "Pão quente com manteiga derretida resolve qualquer manhã difícil.",
    "Era uma vez um programador que só testava o código em produção.",
    "O café esfriou enquanto eu procurava a tampa da caneca preferida.",
    "Cada macaco no seu galho, cada abacaxi no seu pé de abacaxi.",
    "Se a vida te der limões, faça uma limonada bem gelada para o time.",
    "O trem partiu da estação às seis horas e ninguém avisou o maquinista.",
    "Mais vale um pássaro na mão do que dois voando lá no céu.",
    "A professora pediu silêncio, mas o último a falar foi o mais barulhento.",
    "De grão em grão a galinha enche o papo e ainda põe um ovo.",
    "O fusquinha azul subiu a ladeira devagar, mas chegou antes de todo mundo.",
    "Comer brigadeiro de colher é um direito de qualquer pessoa feliz.",
    "O vento levou o chapéu do vovô até a praça da igreja.",
    "A pipa subiu tão alto que parecia um pontinho colorido no céu.",
    "Quem tem boca vai a Roma, e quem tem celular chega pelo mapa.",
    "O Brasil é o país do futebol, do samba, do pão de queijo e do feriadão.",
    "Pisei na poça sem querer e o meu tênis novo virou uma esponja.",
    "O bolo de cenoura com cobertura de chocolate sumiu em cinco minutos.",
    "Na dúvida entre o doce e o salgado, a resposta sempre é os dois.",
    "A tartaruga venceu a corrida porque a lebre dormiu embaixo da árvore.",
    "O jogo estava empatado e o juiz resolveu dar mais cinco minutos.",
    "Nada como um domingo à tarde sem compromisso e com o sofá livre.",
    "A bicicleta caiu na curva, mas o ciclista levantou rindo da própria cara.",
    "Quem parte e reparte fica com a melhor parte do pastel.",
    "O sorvete derreteu antes que eu pudesse terminar a primeira bola.",
    "Uma andorinha só não faz verão, mas faz bastante barulho de manhã.",
    "O relógio da torre marcou meia-noite e a festa só estava começando.",
    "Todo mundo gritou gol, até quem estava distraído olhando o celular.",
    "O carteiro tocou duas vezes, deixou a encomenda e saiu assobiando.",
    "A lua cheia clareou o quintal e o cachorro resolveu uivar para ela.",
    "A pamonha quentinha com café é o lanche perfeito de uma tarde fria.",
    "O sapo não lava o pé, não lava porque não quer, mora lá na lagoa.",
    "Fim de semana na praia, protetor solar e muita água de coco gelada.",
    "O bonde passou na esquina e levou meu guarda-chuva embora.",
  ];
  const prefixoCerto = (frase, texto) => { let i = 0; const n = Math.min(frase.length, texto.length); while (i < n && frase[i] === texto[i]) i++; return i; };
  const wpm = (chars, segundos) => (segundos > 0 ? Math.round((chars / 5) / (segundos / 60)) : 0); // palavras de 5 letras por minuto
  const PONTOS = [10, 7, 5, 3, 2, 1];
  const pontosDoLugar = (i) => (i < PONTOS.length ? PONTOS[i] : 1);
  const api = { FRASES, prefixoCerto, wpm, PONTOS, pontosDoLugar };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Digita = api;
})(typeof window !== "undefined" ? window : globalThis);
