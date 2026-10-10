# Carreira: premiação do campeonato até o G6

## Por quê
O caixa do pessoal estava secando (as compras da sala custam caro e a premiação por posição era pequena). Agora os seis primeiros da liga recebem uma premiação do campeonato por cima do que já existia.

## A premiação
| Posição | Prêmio (Brasileirão) |
| --- | --- |
| 1º | R$ 60 mi |
| 2º | R$ 45 mi |
| 3º | R$ 35 mi |
| 4º | R$ 28 mi |
| 5º | R$ 22 mi |
| 6º | R$ 18 mi |

- Vale o **fator da liga** (a Premier League paga 35% a mais, a Liga Argentina e os sul-americanos pagam menos), igual ao resto do dinheiro da carreira.
- **Fora do G6, não tem esse prêmio** (a premiação por posição e o bônus de campeão continuam como eram).
- É **somada** à premiação por posição (R$ 1 mi por posição, de R$ 20 mi para o 1º) e ao bônus de R$ 15 mi de campeão: o campeão do Brasileirão passa a levar R$ 95 mi na virada.
- **Adiantamento no turno:** quando o clube completa 19 jogos na liga, quem está no G6 naquele momento recebe 25% do prêmio da posição em que está (uma vez por temporada, com aviso na caixa de entrada). O resto sai no fim da temporada.
- Entra no extrato ("Premiação do turno" e "Premiação do campeonato") e na caixa de entrada, na carreira solo e na sala.

## Conferido
- `tests/carreira-premios.test.js` (2 testes): a tabela (seis posições, decrescente, fator da liga, nada fora do G6, 25% do turno) e uma temporada inteira (o adiantamento do turno uma vez só e o prêmio final só de quem fica no G6, igual à posição do histórico).
- Testes de temporada, diretoria, evolução, mercado e servidor da carreira continuam passando.
