# Carreira: o teste dos dilemas para de falhar às vezes

O teste `dilemas: cada resposta muda o jogo e a conta chega depois, como aviso` (`tests/carreira-clube.test.js`) falhava de vez em quando (umas 3 vezes em 40) na linha que espera a lista `gestao.depois` vazia.

- **A causa:** não era outro dilema agendando consequência. A sobra era a própria conta do patrocínio polêmico, que nunca chegava porque o técnico tinha sido **demitido**. A temporada que o teste joga antes sai de uma semente sorteada; às vezes ela termina em demissão, ou deixa a confiança da diretoria abaixo de 30, e aí os 8 empates do teste viram ultimato (4 pontos, faltava 1) e demissão. Demitido, `Clube.aposJogo` para de contar os jogos e a consequência fica parada na lista.
- **A correção (só no teste):** antes do dilema, o teste deixa a diretoria tranquila (`demitido` limpo, confiança 60, sem ultimato) e confere que o técnico seguiu no cargo. A regra do jogo não mudou.

Conferido: o teste passou 60 vezes seguidas (antes, com a demissão, falhava em laço) e os 27 testes de `tests/carreira-clube.test.js` passam.
