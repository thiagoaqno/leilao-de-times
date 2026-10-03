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
# Pelada: condução definida pelo dono da sala · Tênis: golpe armado desarma em 1,9 s

## Pelada
- **Padrões novos da condução (o "meta"):**
  - tempo entre toques: **0,25 s** correndo, **0,18 s** no pique e 0,2 s protegendo;
  - bola na frente: **0,3 m** andando e correndo, **0,4 m** no pique;
  - pé alternado **0 m** e ímã desligado (raio **0** e força **0**): a bola só obedece ao toque.
- **Só o organizador muda, e vale para todos:** na sala de espera tem "⚙️ Condução e dribles (vale para todos)". O
  organizador mexe e cada valor vai para a configuração da sala (`config.cond`). O servidor e o navegador de cada um
  passam a usar os mesmos números, inclusive os robôs do amistoso. Os outros só veem. O que o organizador escolhe
  fica guardado e serve de ponto de partida quando ele abre a próxima sala.
- No jogo online, o painel do menu de pausa só mostra os valores da sala. No treino e contra bots ele continua
  editável, e os valores ficam guardados no navegador.
- **Correção junto:** com a bola mais perto (0,4 m do centro), ela encostava no corpo do jogador e o corpo mudava o
  rumo dela sem toque. Agora, enquanto o jogador conduz, só o toque mexe na bola, como pedido antes.
- O servidor confere os números que vêm da sala (cada um dentro de uma faixa, em `COND_FAIXA`).
- Arquivos: `public/pelada/campo.js` (`COND`, `COND_FAIXA`, `limparCond`, `usarCond`), `pelada.js`, `public/pelada/menus.js`,
  `jogo.js`, `rede.js` e `index.html`.

## Tênis
- Apertou o golpe e não bateu na bola em **1,9 s**? O golpe desarma e o jogador volta a andar normalmente (antes
  eram 2,6 s). Vale para todos, inclusive os robôs, no treino e online.
- Arquivos: `public/tenis/regras.js` (`ARMADO_MAX`) e `public/tenis/jogo.js`.

## Testes
- `npm test`: 29 passaram. No navegador (Pelada, Tênis e páginas): 28 passaram.
- Conferido no navegador com duas pessoas na mesma sala: o organizador mexe e o valor vale na hora; quem entrou depois
  vê o mesmo valor, sem poder mexer.
