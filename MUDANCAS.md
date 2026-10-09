# Carreira: vaga aberta depois da expulsão, campinho que acompanha a variação e cansaço em pontos de OVR

## Mais escolhas no jogo: a vaga aberta
- Quando alguém é expulso (ou se machuca sem troca), a vaga fica aberta na parada tática. Agora dá para **pôr outro jogador nela**: toque num jogador do campo
  (ele muda de posição para a vaga, e a vaga dele é que fica aberta: você escolhe qual setor sacrificar) ou num reserva (ele entra na vaga, gastando uma substituição) e depois na vaga.
  Exemplo: zagueiro expulso, um volante vai para a zaga e um reserva entra no meio. O jogador improvisado rende pelo encaixe da nova posição.
- A narração conta ("Pereira muda de posição para ocupar a vaga de zagueiro", "Entra X, na vaga que ficou aberta").

## O campinho acompanha a variação do meio
- As posições no campinho seguem a função: laterais e pontas colados na linha; o **único volante** fica no meio e mais recuado, entre dois meio-campistas; com
  **2 volantes + 1 meia**, o meia fica no meio, à frente dos volantes; o falso 9 joga atrás do centroavante; os alas do 3-5-2 ficam na linha lateral.

## Cansaço em pontos de OVR
- A energia tira de **0 a 3 pontos da nota**: 85% ou mais, nada; de 70 a 84%, −1; de 50 a 69%, −2; abaixo de 50%, −3. A conta vale no rendimento do time e nos atributos dos
  lances. No campinho aparece o OVR, o que sobra (ex.: 80 → 77) e uma etiqueta vermelha com o −1, −2 ou −3; a média da energia dos titulares fica embaixo da prancheta.

## Conferido
- `tests/carreira-taticas.test.js`: a tabela do cansaço, o desenho de cada variação (volante recuado, meia à frente, falso 9, alas na linha, tudo dentro do campo) e a vaga aberta depois
  de uma expulsão (um do campo muda de lugar, um reserva entra, vaga ocupada ou sem substituição é ignorada). O motor continua calibrado.
  Na tela: `planos/imagens/carreira-vaga-aberta.jpg`.
