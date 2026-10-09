# Carreira: a partida com as informações do jogo e os resultados dos outros jogos ao vivo

Durante a partida, a tela agora mostra de que jogo se trata e o que acontece nos outros campos, no mesmo relógio.

## As informações do jogo
- **No topo da partida:** o campeonato, a rodada ou a fase, o estádio e o clima. Por exemplo, "Brasileirão Série A · Rodada
  5 de 38 · Maracanã · jogo à noite", ou "Libertadores · Fase de grupos · Grupo A · Rodada 3 de 6", ou "Copa do Brasil ·
  Oitavas de final · jogo de volta".
- **No painel da direita:** a classificação dos dois clubes (a posição e os pontos, **antes** do jogo: mesmo quando a partida
  acaba na hora, o painel não entrega o resultado), no mata-mata o resultado da ida e o **agregado ao vivo** (ele sobe quando
  sai um gol).

## Os outros jogos ao vivo
- Os outros jogos da mesma semana (do mesmo campeonato e, numa lista que abre, das outras competições) com o placar andando
  no relógio da partida: o gol aparece na hora, o placar do jogo pisca e entra na lista dos **últimos gols** (quem fez e o
  placar). No fim, cada um mostra "Fim" e o placar final, que é o mesmo da tabela.
- Os gols de cada jogo vêm do mesmo jogo simulado do mundo (a mesma semente), então nada é inventado para a tela.
- **Carreira em grupo:** os jogos dos outros técnicos entram primeiro ("Jogos da turma"), cada um com o relógio dele. Os
  outros jogos da semana também aparecem, e os jogos de humanos não se repetem entre eles.
- No celular, o painel desce para baixo da narração.

## Como funciona
- **Servidor:** `paralelosDaSemana` (carreira.js) devolve, para uma semana, cada jogo com os gols (minuto e lado). Vai em
  `estado.partida.paralelos` (solo), em `Rd.visao` (turma, calculado uma vez no começo da rodada) e, quando a partida
  acaba na hora (só o resultado), a tela pede ao servidor pelo evento `paralelos` (só para o jogo dela). Os jogos de
  ida e volta agora sabem qual perna são (`perna`).
- **Tela:** `public/carreira/aovivo.js`; só lê o estado e o relógio da partida.

## Também
- **Correção nos testes:** o `npm test` lista os arquivos de teste um a um, e os testes dos PRs das copas e de dispensar nunca
  entraram na lista. Agora entram (junto com os deste PR): 190 testes.

## Conferido
- Fotos: `planos/imagens/carreira-ao-vivo-solo.png`, `carreira-ao-vivo-turma.png` e `carreira-ao-vivo-celular.png`.
- `npm test`: 190 de 190 (`tests/carreira-ao-vivo.test.js` cobre os jogos paralelos no solo e na turma, o pedido à parte e as
  pernas de ida e volta). E2E: os dois testes da rodada (1280x800 e 375x812), com as verificações novas do painel.
- Na tela: solo (Brasileirão e Libertadores), jogo de volta com agregado, rodada da turma com dois navegadores e celular.
