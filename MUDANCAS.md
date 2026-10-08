# Carreira: rendimento visível na escalação

Este PR deixa claro o que acontece com a nota de cada jogador: a evolução continua sendo permanente, os eventos
continuam sendo temporários e jogar fora de posição continua reduzindo a força usada pelo motor. A mudança é de
leitura e transparência; a regra da partida não foi alterada.

## O que muda

- **Rendimento por posição:** a prancheta mostra a nota normal e, quando houver perda, a nota efetiva naquela faixa
  do campo (`78 → 70`). Qualquer encaixe abaixo de 100% passa a ser sinalizado, inclusive perdas leves de 5% ou 10%.
- **Resumo do time:** ao lado da média dos titulares aparece a média considerando as posições e a quantidade de
  improvisados.
- **Evolução permanente:** jogadores que ganharam ou perderam nota recebem um selo com seta e valor, como `+2` ou
  `-1`, tanto nas figurinhas quanto nas peças da formação.
- **Efeitos temporários:** bônus e punições válidos para o próximo jogo usam um selo amarelo separado, para não serem
  confundidos com a evolução definitiva.
- **Leitura visual:** peças improvisadas têm borda tracejada e brilho âmbar, mantendo as cores do clube e o visual da
  prancheta.
- **Notícia da fase de grupos:** classificação ou eliminação só é anunciada depois da sexta partida real do grupo. O
  sexto jogo geral da carreira não é mais confundido com a sexta rodada da Libertadores ou da Champions. Saves já
  afetados têm a notícia prematura removida ao serem carregados.
- **Velocidade da rodada em grupo:** durante os jogos multiplayer, o anfitrião pode alternar entre `1×` e `3×`. O
  servidor aplica o ritmo a todas as partidas e todos veem a mesma opção marcada, sem saltar o minuto atual ou reduzir
  o tempo das decisões.

## Conferido

- **Testes focados:** 28 testes passaram entre motor, evolução, temporada, relógio e canal multiplayer.
- **E2E focado:** o cenário de escalação confirmou os selos `+2` e `-1`, trocou um defensor com um atacante e
  verificou as notas efetivas menores; o cenário em grupo confirmou que só o anfitrião controla o ritmo, que o 3×
  aparece para os dois participantes e que a rodada chega ao fim normalmente.
- **Fotos:** `planos/imagens/carreira-rendimento-posicao.png` e `planos/imagens/carreira-grupo-3x.png`.
