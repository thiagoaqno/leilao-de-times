# Carreira: suspensos e machucados voltam a jogar

## O que acontecia
- No calendário novo (Brasileirão + copas + Europa, do PR 2), cada jogo fecha numa função própria (`fecharJogoMundo`).
  Ela não descontava os jogos de suspensão e de lesão: quem era suspenso ou se machucava nunca mais voltava.
- Pelo mesmo motivo, os efeitos dos eventos (time +1 por 2 jogos etc.) e as dicas do olheiro não venciam.

## O que mudou
- `fecharJogoMundo` agora desconta um jogo de cada suspensão e lesão antes dos cartões novos (como o Brasileirão já
  fazia), e vence os efeitos e as dicas do olheiro depois do jogo.
- As carreiras que já estão em andamento se corrigem sozinhas a partir do próximo jogo.

## Conferido
- Teste novo em `tests/carreira-temporada.test.js`: o suspenso fica fora do jogo, cumpre 1 jogo e volta; a lesão de 2
  jogos acaba depois de 2 jogos.
- `npm test`: 120 de 120 passaram.
