# Disputas mais próximas e colisão do muro em Mônaco

Os bots podem disputar em Mônaco em qualquer velocidade e também nas curvas, escolhendo os lados interno ou externo quando a faixa e o trecho seguinte estão livres. A folga lateral adicional entre carros foi reduzida à metade, preservando a largura considerada pela colisão. Depois de mudar de faixa, o bot pode acelerar para passar mesmo quando o adversário não está quase parado.

A colisão com o muro em Mônaco fica mais próxima do modelo visual: o centro agora para a 9 unidades da barreira, em vez de 14. A largura estimada do modelo 2026 dá cerca de 7,9 unidades de cada lado. O limite usado para calcular a linha dos bots foi mantido; durante uma disputa eles podem usar mais pista.

## Verificação

- Sintaxe e `git diff --check`; nenhum teste novo criado.
- Simulações no túnel com humano a 45 e 150 km/h: o bot completou as duas passagens sem contato.
- Três simulações de duas voltas com 19 bots: todos terminaram; houve 0–1 eventos de muro e 10–26 eventos entre carros, mais contatos entre carros do que antes em algumas sementes.
- A distância ao muro foi comparada com a caixa do modelo visual 2026; ainda falta conferência visual nas câmeras e nos outros modelos.
