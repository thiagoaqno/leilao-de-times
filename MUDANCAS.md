# Carreira: premiação do campeonato até o G6, bônus de título maior nas copas e o vale de campeão

## Por quê
O caixa do pessoal estava secando (as compras da sala custam caro e a premiação por posição era pequena). Agora os seis primeiros da liga recebem uma premiação do campeonato por cima do que já existia.

## A premiação
| Posição | Prêmio (Brasileirão) |
| --- | --- |
| 1º | R$ 75 mi |
| 2º | R$ 56,3 mi |
| 3º | R$ 43,8 mi |
| 4º | R$ 35 mi |
| 5º | R$ 27,5 mi |
| 6º | R$ 22,5 mi |

- Vale o **fator da liga** (a Premier League paga 35% a mais, a Liga Argentina e os sul-americanos pagam menos), igual ao resto do dinheiro da carreira.
- **Fora do G6, não tem esse prêmio** (a premiação por posição e o bônus de campeão continuam como eram).
- É **somada** à premiação por posição (R$ 1 mi por posição, de R$ 20 mi para o 1º) e ao bônus de R$ 15 mi de campeão: o campeão do Brasileirão passa a levar R$ 110 mi na virada.
- **Adiantamento no turno:** quando o clube completa 19 jogos na liga, quem está no G6 naquele momento recebe 25% do prêmio da posição em que está (uma vez por temporada, com aviso na caixa de entrada). O resto sai no fim da temporada.
- Entra no extrato ("Premiação do turno" e "Premiação do campeonato") e na caixa de entrada, na carreira solo e na sala.

## Bônus de título das copas
O bônus de campeão era R$ 15 mi para qualquer competição. Agora:

| Competição | Bônus de campeão |
| --- | --- |
| Libertadores | R$ 60 mi |
| Copa do Brasil | R$ 50 mi |
| Sul-Americana | R$ 40 mi |
| Brasileirão, Champions, Super Mundial, Mundial e as outras ligas | R$ 15 mi (como era) |

## Vale de campeão
- **Quem ganhou algum campeonato** (liga ou copa, qualquer uma) recebe um **vale de campeão**: leva **de graça um jogador de até 87 de nota** de um clube do computador. É **um vale por temporada**, não importa quantos títulos (o aviso diz de qual título veio).
- **Como usar:** em qualquer janela da temporada seguinte ao título, abra a ficha de um jogador de até 87 e toque em **"Usar o vale (de graça)"** (o mercado avisa que você tem o vale). Sem custo de transferência; o **salário continua**, o contrato é de 3 temporadas e o jogador entra no elenco na hora.
- **Na sala:** não conta na cota de compras da turma (é um prêmio, fora do leilão) e **não vale para jogador de outro técnico** (esse é pelo leilão).
- **Para não virar dinheiro de graça:** o jogador que chega pelo vale **não pode ser vendido, posto à venda, leiloado nem trocado na temporada em que chega** (propostas e disputas também o ignoram). Na virada ele fica livre.
- O vale não usado **vence no fim da temporada seguinte** ao título.

## Conferido
- `tests/carreira-premios.test.js` (7 testes: a tabela do G6, a temporada inteira, o bônus de título de cada competição e o vale de campeão: um por temporada, de graça e com salário, limite de 87, uma vez só, bloqueio de venda e troca, só com a janela aberta, vencimento e, na sala, jogador de amigo só pelo leilão): a tabela (seis posições, decrescente, fator da liga, nada fora do G6, 25% do turno) e uma temporada inteira (o adiantamento do turno uma vez só e o prêmio final só de quem fica no G6, igual à posição do histórico).
- Testes de temporada, diretoria, evolução, mercado e servidor da carreira continuam passando.
