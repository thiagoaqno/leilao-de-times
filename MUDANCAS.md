# Carreira em grupo: a regra de compra do começo da temporada ficou mais precisa

## O que mudou
- Na janela do **começo da temporada**, cada técnico leva **uma** destas opções:
  - **1 jogador de 90 ou mais**; ou
  - **2 jogadores entre 84 e 87**; ou
  - **3 jogadores de 83 ou menos**.
- Antes a segunda opção era "2 de até 87". Agora os dois precisam estar entre 84 e 87: um de 84 a 87 não combina com um de 83 ou menos
  (nem com 90+), porque as opções não se misturam. Jogadores de 88 e 89 continuam fora da janela do começo.
- O meio da temporada (1 jogador de até 88) e a entrada de quem chega no meio (1 jogador de até 88) não mudaram.
- A tela do mercado mostra a regra nova e o que ainda dá para levar ("1 jogador entre 84 e 87", "1 jogador de 83 ou menos").

## Conferido
- `tests/carreira-entrada-meio.test.js` atualizado: as três opções, 84 a 87 com 84 a 87, e a mistura de 84 a 87 com 83 ou menos sendo recusada.
