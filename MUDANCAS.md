# PR 2 — A temporada com várias competições

## O que mudou

- A carreira solo nova passa a carregar o mundo de 2026: Brasileirão, Premier League, La Liga, Serie A, Bundesliga e Ligue 1. Também é possível começar por um clube europeu.
- `temporada.js` monta um calendário determinístico em semanas de jogo: ligas no fim de semana e Libertadores/Champions no meio de semana, sem um clube aparecer duas vezes na mesma semana.
- Libertadores e Champions têm oito grupos de quatro, turno e returno, oitavas, quartas e semifinais em ida e volta e final única. Empates eliminatórios são decididos nos pênaltis.
- A primeira Champions recebe os quatro clubes mais fortes de cada liga europeia e mais 12 por força. A Libertadores usa os 32 classificados do índice gerado no PR 1.
- O Mundial acontece depois das ligas: campeão da Libertadores contra vice da Champions e campeão da Champions contra vice da Libertadores, com semifinal e final únicas.
- Jogos sem o clube humano são simulados pelo `Motor.simularPartida`. O cache guarda apenas resultados determinísticos já calculados; um placar jogado ao vivo substitui a simulação e recalcula classificados e mata-matas.
- O save passa a guardar `competicoes`, com tipo, fase, grupos, jogos e resultados, além dos placares ao vivo que substituem a simulação. Saves antigos não são promovidos ao mundo novo e continuam apenas no Brasileirão.
- A tabela ganhou abas internas para todas as competições, sem criar navegação nova no topo. O calendário identifica competição, fase e semana de cada jogo.
- O feed publica resultados e os momentos de classificação, eliminação e título das copas.
- Mercado, salários e caixa inicial passam a considerar todos os clubes e o fator econômico de cada liga.
- `tests/carreira-temporada.test.js` cobre campeões determinísticos, composição do Mundial, conflitos de calendário e pênaltis. O E2E da Carreira também confere as abas e os jogos de copa.

## Compatibilidade

- Carreiras criadas antes deste PR mantêm a base e o calendário em que nasceram.
- A evolução e a criação da temporada seguinte continuam reservadas ao PR 3.

## Conferido de verdade

- Testes focados da Carreira: 36 casos cobertos; 30 passaram na primeira execução e os seis que apontaram uma incompatibilidade dos auxiliares antigos foram repetidos isoladamente depois da correção, com 6/6 passando.
- E2E da Carreira com as verificações novas: desktop 1280×800 passou (1/1, 25,3 s) e celular 375×812 passou após a correção da espera inicial (1/1, 16,0 s).
- A suíte geral do servidor e os E2Es dos outros jogos não foram executados, por decisão de testar apenas a área alterada neste PR.
- `node_modules/` permanece ignorado e não faz parte do commit.
