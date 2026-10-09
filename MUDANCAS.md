# Carreira: a artilharia com os gols do computador e a chave do mata-mata de cada torneio

Corrige o que o PR anterior entendeu ao contrário: agora a artilharia conta os jogos do computador e as chaves aparecem.

## Artilharia com os gols de todos os jogos
- A artilharia da temporada soma os gols dos jogos de humanos e **os de todos os jogos do computador que já aconteceram**, inclusive
  computador contra computador. Os gols saem do mesmo jogo simulado do mundo, então o total bate com os placares da tabela.
- Os jogos de humanos não contam duas vezes. Jogo que ainda não aconteceu não conta (a artilharia anda com a temporada).
- Os jogos ao vivo voltam a mostrar o nome de quem fez o gol e os jogos de mata-mata (o que o PR anterior tinha escondido).

## A chave do mata-mata
- Na aba de cada torneio da Tabela (Libertadores, Champions, Copa do Brasil, Sul-Americana, Super Mundial e Mundial), abaixo dos
  grupos, aparece o **Mata-mata em chave**: uma coluna por fase (preliminar, oitavas, quartas, semifinais, final).
- Cada confronto mostra os dois clubes, o resultado de cada jogo (ida e volta), o agregado, os pênaltis quando houve e quem
  passou (quem caiu fica apagado; o seu clube fica em destaque).
- A chave vai aparecendo **conforme acontece**: a Copa do Brasil mostra o sorteio da fase preliminar desde o começo da
  temporada; o mata-mata das copas com grupos aparece quando os grupos acabam; cada fase nova aparece quando a anterior
  termina, já com os confrontos montados por quem passou. Nenhum resultado aparece antes de o jogo acontecer.

## Conferido
- `tests/carreira-chaves.test.js` (no `npm test`): a chave fase por fase (o sorteio no começo, as oitavas depois dos grupos, as quartas
  montadas só com quem passou, o vencedor coerente com o agregado e os pênaltis, sem resultado antes da hora) e a artilharia (cada
  gol dos jogos que já aconteceram entra uma vez, com os jogos só do computador, sem contar duas vezes os de humanos).
- `npm test`: 203 de 203. E2E: as duas rodadas da carreira (1280x800 e 375x812), que passam pela aba das copas.
- Na tela: a chave da Libertadores e da Copa do Brasil (`planos/imagens/carreira-chave-*.png`).
