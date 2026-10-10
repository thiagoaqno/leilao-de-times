# Carreira em grupo: o que um amigo ainda não jogou (resultados e transferências) não aparece antes da hora

## O bug
Na sala, cada técnico via o mundo até a semana do **próprio** próximo jogo. Quem já tinha passado da semana da final da Libertadores ou da Champions (por exemplo, um técnico eliminado, já jogando o Brasileirão) via o **campeão, a chave e o pop-up da festa do campeão** enquanto o amigo ainda não tinha jogado a final. Esse resultado era só a **previsão da simulação**, mostrada como se já tivesse acontecido: na prática, quando a final era jogada, o resultado saía diferente.

## Agora
- O mundo de cada técnico acompanha a **semana do jogo mais atrasado entre os técnicos da sala** (`semanaDosHumanos`, em `vistaDe`). Resultado, chave, campeão, artilharia, tabela, festa do campeão e as linhas do calendário só aparecem quando **todos** passaram daquela semana.
- Enquanto o amigo não joga a final, quem está na frente não vê o campeão; assim que o último técnico passa da semana, tudo aparece de uma vez, já com o resultado de verdade.
- A carreira solo não muda: vale a semana do próprio clube.

## O mesmo para as transferências
- A lista "Todas as movimentações" mostrava cada transferência com a **rodada pessoal** de quem a fez, e a rodada pessoal conta os jogos de copa. Resultado: a compra de quem tinha mais copas aparecia como "R27" para quem estava na rodada 23, e parecia notícia do futuro (reproduzido: o Liverpool via transferências "futuras" da rodada 24 a 28 durante a janela do meio do ano).
- Agora cada transferência leva o **carimbo de tempo do mundo**: a semana do último jogo de quem a fez e a **rodada da liga** (que é a que vale para a janela). A tela mostra a rodada da liga.
- E, como os resultados, **a transferência e a notícia dela só aparecem para quem já passou daquela semana** (a semana do próprio próximo jogo). Quem fez a compra a vê na hora.

## Conferido
- `tests/carreira-sem-spoiler.test.js` (4 testes): com a Ana na frente e a Bia ainda nas oitavas, a Ana não vê o campeão da Libertadores nem da Champions, nem a festa; quando a Bia passa da final, tudo aparece; o auxiliar não é copiado de volta para o save. Sem a correção, o primeiro teste falha (o bug reproduzido).
- Mais um teste: a transferência da Ana (16 jogos de liga e 11 de copa, rodada pessoal 27) sai com a rodada da liga, aparece na hora para ela, fica escondida para a Bia (ainda atrás da semana 31) e aparece quando a Bia passa dela.
- Os testes de rodada, trocas, campeões, chaves, copas, notícias iguais, ao vivo, calendário e sala continuam passando (35).
