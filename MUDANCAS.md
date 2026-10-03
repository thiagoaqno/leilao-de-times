# Rumi da Galera (novo jogo)

O jogo de peças numeradas clássico, com as regras padrão, em `/rumi/`. Na vila é o **Clube do Rumi**, numa ruazinha
nova que desce da rua nova, entre o Clube de Tênis e a Arena da Batalha. O mapa cresceu 5 linhas para baixo.

- **Peças e mão:** 106 peças (1 a 13 em 4 cores, duas de cada, e 2 coringas ☺); cada um começa com 14.
- **Combinações:** sequência (3 ou mais números seguidos da mesma cor, sem dar a volta do 13 para o 1) ou grupo
  (3 ou 4 do mesmo número, cada um de uma cor). O coringa vale pela peça que substitui.
- **Primeira descida:** só com peças da mão, somando 30 pontos. Antes dela, não dá para mexer na mesa.
- **Na vez:** mexa na mesa inteira à vontade. No fim, toda peça que estava na mesa continua nela, e tudo tem que valer.
  Sem jogada, compre uma peça. Se o tempo acabar, a mesa volta a como estava e você compra.
- **Pontos:** quem bate ganha os pontos que ficaram na mão dos outros (o coringa vale 30), e os outros perdem os deles.
  Se o monte acabar e ninguém jogar, ganha a rodada quem tiver menos pontos na mão.
- **Sala:** de 2 a 4 pessoas, com 0 a 3 robôs. Tempo por vez: 1 min, 1,5 min, 2 min ou sem limite. Partida de 1, 3 ou
  5 rodadas.
- **Ao vivo:** enquanto um mexe na mesa, todo mundo vê o rascunho.
- **Tela:**
  - toque nas peças e depois numa combinação (ou em "nova combinação"); toque no suporte para devolver o que veio
    da sua mão;
  - cada combinação aparece verde (vale) ou vermelha (não vale), e o aviso mostra o motivo e a soma da primeira descida;
  - botões "Desfazer tudo", "Comprar e passar" e arrumar o suporte por número (777) ou por cor (789).
- **Robôs:** jogam da mão (com a primeira descida de 30), encaixam nas pontas, partem sequências para pôr uma peça no
  meio e pegam peça sobrando da mesa. Em simulação, batem em 29 de 30 rodadas.

## Arquivos
- `public/rumi/regras.js` (regras e robô), `rumi.js` (servidor, canal `/rumi`), `public/rumi/index.html` e `jogo.js`.
- `server.js`, `vila.js` e `public/index.html` (o clube, a ruazinha e o mapa maior).
- Testes: `tests/rumi.test.js` (novo); `/rumi` entrou no teste das salas e no de abrir as páginas.

## Ficou para depois
- Arrastar as peças com o mouse (hoje é tocar e tocar).

## Testes
- `npm test`: 34 passaram.
- Conferido no navegador: mesa com robôs, primeira descida, comprar, robôs jogando, combinação inválida em vermelho,
  "Desfazer tudo", e o clube na vila (a porta abre o "Entrar").
