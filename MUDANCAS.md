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

## Conferido

- **Testes focados do motor e da evolução:** 15 testes passaram.
- **E2E focado:** o cenário novo confirmou os selos `+2` e `-1`, trocou um defensor com um atacante e verificou que
  as duas notas efetivas ficaram menores que as notas normais.
- **Foto:** `planos/imagens/carreira-rendimento-posicao.png`.
