# Carreira: o prêmio de campeão vira contratação paga de até 82, uma por título, e a cota de compras zera na virada

- **Antes**, ganhar qualquer campeonato dava o **vale de campeão**: um jogador de até 87, de graça, na temporada seguinte (só um vale, mesmo com dois ou três títulos), na carreira solo e na sala. Na sala, além do vale, a janela do começo ganhava vagas a mais na cota de compras, pagas, mas só para três títulos: Libertadores (até 85), Sul-Americana (até 83) e Brasileirão (até 82). Copa do Brasil, Champions, as ligas de fora e o Super Mundial não davam vaga.
- **Agora** não tem mais jogador de graça. Cada título da temporada anterior, de qualquer competição (liga ou copa), dá **uma contratação a mais na janela do começo, paga como qualquer outra, de um jogador de até 82**. Ganhou duas competições, leva duas a mais.
- Isso vale para a cota de compras da carreira em grupo. A carreira solo não tem cota (compra quantos couber no caixa), então lá o título continua rendendo o bônus em dinheiro, a reputação e a confiança, mas não uma vaga.
- **A cota zera na virada da temporada.** Na sala, a opção usada numa janela (3 de até 80, 2 de até 82 ou 1 de até 85) continua proibida na janela seguinte, mas só do começo para o meio. Antes, o que você usou no meio também ficava proibido no começo da temporada seguinte; agora o começo de cada temporada sempre tem as três opções.
- Quem já tinha um vale guardado perde o vale na próxima virada de temporada. Quem já trouxe jogador pelo vale continua sem poder vendê-lo nesta temporada.

## Como

- `carreira.js`: `PREMIOS_CAMPEAO` saiu; `premiosDaOrdem` dá um prêmio de `PREMIO_MAX` (82) para cada competição do `save.arquivo` em que o clube foi campeão. `usarVale` saiu.
- `carreira-clube.js`: `fechouTemporada` não cria mais o vale nem o aviso; a ação `vale` saiu; `virada` esvazia `gestao.vales`; o estado não manda mais `vales`.
- `public/carreira/cartas.js` e `tela-mercado.js`: saíram o botão "Usar o vale" da ficha e o aviso do vale no mercado.
- `carreira.js`: `proibidaNa` diz a opção proibida de uma janela; no começo da temporada (ordem par, e a entrada que vale no lugar dele) é sempre nenhuma.
- Testes: `tests/carreira-entrada-meio.test.js` (uma vaga de até 82 por título, de qualquer competição; a virada zera a opção proibida) e `tests/carreira-premios.test.js` (título não dá mais jogador de graça).
