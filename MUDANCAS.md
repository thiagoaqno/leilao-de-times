# Carreira: Copa do Brasil, Sul-Americana, Super Mundial e dinheiro igual no começo

Três competições novas entram no calendário da carreira, e dá para começar com o mesmo dinheiro para todo mundo.

## Copa do Brasil
- Os 20 clubes do Brasileirão. Os 12 mais fortes entram direto nas oitavas; os 8 mais fracos jogam antes uma fase
  preliminar de jogo único (semana 4).
- Oitavas, quartas e semifinais são de ida e volta; a final é em jogo único. Empate decide nos pênaltis.
- O campeão leva a vaga na Libertadores do ano seguinte. Antes isso era um sorteio entre o 7º e o 12º do Brasileirão;
  se o campeão já estava entre os 6 primeiros, a vaga vai para o 7º.

## Sul-Americana
- 16 clubes em 4 grupos de 4 (ida e volta). Os 2 primeiros de cada grupo vão às quartas, e dali é ida e volta até a final.
- Entram os 8 terceiros colocados dos grupos da Libertadores e 8 de fora dela (os brasileiros mais bem colocados fora
  da Libertadores e o clube sul-americano que sobrou). Os grupos só começam depois da fase de grupos da Libertadores.

## Super Mundial de Clubes
- 16 clubes: os campeões da Sul-Americana e da Copa do Brasil e os que foram mais longe na Champions e na Libertadores.
- 4 grupos de 4, todos contra todos uma vez; quartas, semifinal e final em jogo único.
- O Mundial de Clubes de 4 times continua, agora depois do Super Mundial (semanas 82 e 83).

## Dinheiro igual no começo
- Na tela inicial e na sala em grupo, a opção **Dinheiro no começo**: cada clube o seu (como era), ou igual para todos
  com R$ 100 mi ou R$ 300 mi.
- O valor vale para todos os clubes do mundo, inclusive os do computador. Com o dinheiro igual, ninguém é rico nem
  endividado (a situação do clube fica "equilibrada"), e a lista de clubes mostra o mesmo caixa em todos.
- Na sala em grupo, só o anfitrião muda. O aporte do investidor continua somando por cima.

## Telas
- A aba de cada copa na Tabela mostra, além dos grupos, os confrontos do mata-mata fase por fase (com os pênaltis).
- Frases de campeão e eliminado concordam: "o Super Mundial", "a Sul-Americana". A notícia da última rodada do grupo
  vale para os grupos de 3 rodadas do Super Mundial.

## Carreiras que já existiam
- As carreiras no meio da temporada ficam com as copas de antes (senão jogos novos apareceriam no passado). As copas
  novas entram na virada para a próxima temporada.

## Conferido
- **Testes:** `tests/carreira-copas.test.js` (tamanhos, vagas, semanas sem conflito em várias sementes, resultado
  igual com a mesma semente, o campeão da Copa do Brasil na Libertadores e o dinheiro igual) e o dinheiro igual na sala.
- Dois testes antigos foram ajustados: a janela de transferências fecha na 4ª rodada da **liga** (jogo de copa não conta),
  e as opções da sala ganharam `caixaIgual`.
