# Leilão: 20 tipos de gol e 45 comemorações nos replays

## Como fica
- **O craque não comemora mais sempre igual.** A comemoração própria (o soco do Pelé, o "siu" do Cristiano...) agora
  sai às vezes, mais ou menos 4 em cada 10 gols dele. Nos outros, ele sorteia qualquer uma das 45, como acontece de
  verdade (todo mundo imita o "siu").
- **15 tipos de gol novos**, somando 20. Alguns trazem gente nova para a cena: a barreira, o zagueiro, o companheiro de
  time e a bandeirinha de escanteio.
  - **bola parada:** falta (a barreira pula e a bola passa por cima com efeito, com a linha do spray no chão), pênalti
    (o goleiro pula para o outro lado), cavadinha no pênalti (a Panenka) e gol olímpico, direto do escanteio;
  - **do alto:** bicicleta (de costas para o gol, deitado no ar) e peixinho (o mergulho de cabeça num cruzamento
    rasteiro);
  - **de jogada:** de calcanhar (depois do passe do companheiro), chapéu no zagueiro, rebote (a bola bate na trave,
    com o estalo, e ele empurra para dentro), drible no goleiro, arrancada (pula o carrinho do zagueiro) e tabelinha;
  - **de pé:** trivela (a bola sai para um lado e volta), bomba de longe (com rastro, e a rede estufa mais) e de carrinho;
  - os cinco de antes continuam: chute, no ângulo, voleio, cabeçada e cavadinha.
- O tipo de gol continua dependendo da posição e da nota de quem marcou (o goleiro que faz gol bate falta e pênalti),
  e os craques têm os seus preferidos: o Maradona arranca, o Roberto Carlos bate falta e de trivela, o Rivaldo e o
  Ibrahimović fazem de bicicleta, o Pirlo e o Totti de cavadinha no pênalti, o Ronaldo dribla o goleiro...
- **30 comemorações novas**, somando 45:
  - chupeta, beijando o escudo, camisa na cabeça, sem camisa girando a camisa, mostrando o muque;
  - o robô, samba no pé, canguru, a dancinha do momento, tocando guitarra;
  - flexões, estrela, deitado fazendo anjo na grama, o peixinho de barriga (o do Klinsmann);
  - silêncio para a torcida, continência, batendo no peito, "calma, calma", as mãos na cabeça de quem não acredita,
    agradecendo de mãos juntas, os óculos com as mãos;
  - de costas apontando o nome e o número da camisa, o beijo na câmera (com a marca do batom na lente);
  - o abraço do companheiro que pula no colo, o montinho, socando a bandeirinha de escanteio;
  - sentado na cadeira do banco, de braços cruzados, o raio do Usain Bolt e o golpe de energia do desenho japonês;
  - a barriguinha (a bola debaixo da camisa, para o nenê que vem aí).

## Por dentro
- Os replays foram divididos em três arquivos, como os outros jogos maiores:
  - `public/leilao/lances.js`: o motor. O boneco ganhou enfeites (sem camisa, camisa na cabeça, de costas com o número,
    a barriguinha, os óculos, a guitarra, a camisa girando na mão, as pernas por cima do corpo), o cenário ganhou a
    bandeirinha, a linha do spray, o estalo na trave e a grama voando, e o close ganhou os companheiros e os efeitos
    novos. As peças para montar os tipos de gol e as comemorações ficam em `Lances.kit`;
  - `public/leilao/lances-gols.js` (novo): os 20 tipos de gol, cada um com o seu roteiro (quem está onde em cada
    instante), o peso no sorteio e os preferidos dos craques (`Lances.FINALIZACAO`);
  - `public/leilao/lances-comemoracoes.js` (novo): as 45 comemorações e as dos craques (`Lances.ASSINATURA`).
- Cada lance tem a sua duração: o rebote e a arrancada levam mais tempo do que a bomba de longe.
- `public/leilao/rostos.js`: a cor do cabelo (`Rostos.cabelo`), para o boneco de costas.
- O servidor não mudou.

## Conferido
- Os testes de navegador do Leilão passando (a página abre sem erro e outra pessoa entra pelo convite).
- No navegador: cada tipo de gol, quadro a quadro, e cada comemoração, no close.
- 2.000 gols sorteados com jogadores das listas, montados e desenhados em vários instantes, sem nenhum erro. Os 20
  tipos e as 45 comemorações aparecem; os tipos raros (gol olímpico, Panenka) saem perto de 1 a 2% das vezes.
- Um jogo ao vivo tocando os replays empilhados, com o console sem erros.
