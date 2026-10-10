# Carreira em grupo: o resultado de um jogo que um amigo ainda não jogou não aparece mais

## O bug
Na sala, cada técnico via o mundo até a semana do **próprio** próximo jogo. Quem já tinha passado da semana da final da Libertadores ou da Champions (por exemplo, um técnico eliminado, já jogando o Brasileirão) via o **campeão, a chave e o pop-up da festa do campeão** enquanto o amigo ainda não tinha jogado a final. Esse resultado era só a **previsão da simulação**, mostrada como se já tivesse acontecido: na prática, quando a final era jogada, o resultado saía diferente.

## Agora
- O mundo de cada técnico acompanha a **semana do jogo mais atrasado entre os técnicos da sala** (`semanaDosHumanos`, em `vistaDe`). Resultado, chave, campeão, artilharia, tabela, festa do campeão e as linhas do calendário só aparecem quando **todos** passaram daquela semana.
- Enquanto o amigo não joga a final, quem está na frente não vê o campeão; assim que o último técnico passa da semana, tudo aparece de uma vez, já com o resultado de verdade.
- A carreira solo não muda: vale a semana do próprio clube.

## Conferido
- `tests/carreira-sem-spoiler.test.js` (3 testes): com a Ana na frente e a Bia ainda nas oitavas, a Ana não vê o campeão da Libertadores nem da Champions, nem a festa; quando a Bia passa da final, tudo aparece; o auxiliar não é copiado de volta para o save. Sem a correção, o primeiro teste falha (o bug reproduzido).
- Os testes de rodada, trocas, campeões, chaves, copas, notícias iguais, ao vivo, calendário e sala continuam passando (35).
