# Carreira em grupo: regra de compras por janela (3 de até 80, 2 de até 82 ou 1 de até 85, sem repetir) e prêmios de campeão

## A regra de cada janela
- Em cada janela de transferências da turma (o começo da temporada, até a rodada 4 da liga, e o meio, rodadas 17 a 21), cada técnico leva **uma** opção:
  - **3 jogadores de até 80**; ou
  - **2 jogadores de até 82**; ou
  - **1 jogador de até 85**.
- **Sem repetir:** a opção usada numa janela não vale na janela seguinte. Pegou o de 85 no começo da temporada? No meio, é 3 de até 80 ou 2 de até 82.
  Vale também do meio para o começo da temporada seguinte. Quem não compra nada numa janela não proíbe nada na seguinte.
- A opção usada é a mais baixa em que as compras cabem (um jogador de 78 sozinho gasta a de 80; com um de 82, a de 82).
- Jogador de 86 ou mais não entra pelo leilão da turma.

## Prêmios de campeão
- Os campeões da temporada anterior ganham, **a mais**, na janela do começo da temporada seguinte:
  - campeão da **Libertadores**: 1 jogador de até 85;
  - campeão da **Sul-Americana**: 1 jogador de até 83;
  - campeão do **Brasileirão**: 1 jogador de até 82.
- Cada prêmio leva um jogador e não gasta a opção da janela (o campeão da Libertadores pode levar o de 85 do prêmio e ainda escolher a opção da janela).
  A conta escolhe sozinha a melhor divisão entre a opção e os prêmios, em qualquer ordem de compra.

## Quem entra no meio da carreira
- Com a janela fechada, ganha uma **janela de entrada** com as mesmas opções. Se entrou antes da janela do meio, a entrada vale até ela abrir (e a opção usada na
  entrada não vale no meio); se entrou depois, até o fim da temporada.

## Na tela
- O mercado mostra a regra, a opção proibida nesta janela, os prêmios de campeão, o que já foi levado e o que ainda dá ("3 jogadores de até 80", "2 jogadores de até 82"...).
  Quem não cabe fica apagado e a ficha explica por quê.
- A carreira solo e as trocas entre técnicos continuam sem essa regra.

## Conferido
- `tests/carreira-entrada-meio.test.js`: as três opções, a opção proibida na janela seguinte (inclusive entre temporadas), os prêmios (Libertadores e Brasileirão para um,
  Sul-Americana para outro, só na janela do começo, e o prêmio que não gasta a opção), o lance, a janela fechada e a janela de entrada (antes do meio, a entrada acaba quando o meio abre).
