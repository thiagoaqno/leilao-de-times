# Carreira: mata-mata sem spoiler e pênaltis visíveis

Este PR corrige dois problemas do calendário mundial: fases futuras da Libertadores, Champions e Mundial não entregam
mais o destino do clube antes da hora, e um empate eliminatório não escolhe mais o vencedor em pênaltis invisíveis.

## O que muda

- **Calendário sem spoiler:** jogos de liga e da fase de grupos continuam visíveis, mas o mata-mata mostra somente
  confrontos já disputados e o próximo jogo real. O caminho simulado até quartas, semifinal ou final fica no servidor.
- **Pênaltis persistidos:** o placar do desempate passa a fazer parte do resultado fixo. Recalcular o mundo ou reiniciar
  uma sala não sorteia outro campeão.
- **Saves já afetados:** ao abrir, o jogo recupera do chaveamento os pênaltis de uma final já concluída e corrige o
  último jogo, o pós-jogo e as notícias antigas.
- **Resultado coerente:** partida, último jogo, calendário, notícia e pós-jogo mostram o placar dos pênaltis. O cartão
  final diz explicitamente “Vitória nos pênaltis” ou “Derrota nos pênaltis”.
- **Multiplayer:** antes de produzir notícias para os técnicos, o servidor atualiza o chaveamento compartilhado com o
  resultado humano; todos recebem o mesmo vencedor.
- **Todos os eliminatórios:** a regra vale para final em jogo único e para empate agregado em oitavas, quartas ou
  semifinal.

## Conferido

- **Testes focados:** 18 testes passaram entre temporada mundial, relógio e canal multiplayer.
- **E2E focado:** o novo cenário passou em 21,2 s, confirmando o placar `1 × 1`, o desempate `4 × 5`, a derrota nos
  pênaltis e a ausência de confrontos futuros; a sala em grupo também passou novamente em 47,9 s.
- **Foto:** `planos/imagens/carreira-penaltis.png`.
