## Limite de 2 jogos de cada composto por corrida (regras de F1)

O macio virou "meta" e o jogador trocava só para macio. Agora, em cada corrida, cada piloto tem no máximo 2 jogos de macio, 2 de médio e 2 de duro, contando o pneu da largada. O limite é fixo em 2 para qualquer número de voltas; a tabela de estratégia e o tempo de box não mudaram.

### O que mudou
- `public/corrida/f1-regras.js`: funções puras `jogosUsados`, `jogosRestantes`, `podeUsar` e `compostoParaParada` (mais a constante `JOGOS_POR_COMPOSTO`). A conta usa `p.pneu` (largada) e `p.paradas`.
- `corrida.js` (servidor autoritativo): `concluirParada` troca o composto esgotado por outro com jogo. Escolha: diferente do atual, e um ainda não usado se o piloto só usou um composto (mantém a regra dos dois compostos); entre os candidatos, o de mais jogos restantes. Se tudo estiver esgotado, repete o menos usado, então nunca fica sem opção. O estado público ganhou `jogos` por piloto.
- `corrida-robos.js`: `escolherComposto` e `decidirParada` só consideram compostos com jogo (o composto do plano também é conferido).
- Box/HUD (`box.js`, `hud.js`): B e as teclas 1, 2 e 3 pulam ou recusam o composto esgotado, e o aviso do box mostra os jogos (ex.: "M 1/2 · Md 2/2 · D 0/2").
- `menus.js`: só a linha das regras de F1 que explica os pneus.
- Teste novo: `tests/corrida-f1-limite-pneus.test.js` (conta largada + paradas, recusa o 3º macio, esgotado total, regra dos dois compostos, robô não escolhe esgotado).

### Testes
`tests/corrida-f1-limite-pneus.test.js` e `tests/corrida-f1-box.test.js` passam; `tests/corrida*.test.js` rodado no fim.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
