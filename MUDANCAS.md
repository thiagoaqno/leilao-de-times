# Modo Jogador: carreira mais longa, evolução mais rápida e começo em 75

## O que muda no jogo

- **Mais temporadas:** a carreira do jogador pode ter 1, 2, 3, 5, 8, 10 ou 15 temporadas (o limite de 5 vale só para a carreira de técnico). O jogador não se aposenta no meio: fica até a última temporada que você escolheu.
- **Começa com nota 75 ou mais:** a nota inicial vai de 75 (aos 17 anos) a 80 (aos 23), e o teto de potencial agora é de 84 a 95, para ter para onde crescer.
- **Evolução mais rápida:** o treino rende mais por jogo e cada nível custa menos. Um titular que joga bem sobe cerca de 3 a 5 pontos por temporada no começo, e o reserva cresce mais devagar. A tela de criação mostra a chance de jogar com a nota nova.

## Como

- `jogador.js`: `notaInicial`, `tetoDe`, `estrelas`, `xpPara` e o ganho de treino por jogo; `save.temporadasMax` vai até 15 depois de criar a carreira; `proximaTemporada` desfaz a aposentadoria do jogador. `public/jogador/jogador.js` usa a mesma nota inicial e as novas opções de temporadas.
- `tests/jogador.test.js` confere a nota inicial.
