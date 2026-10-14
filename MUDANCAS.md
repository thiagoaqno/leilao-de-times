# Road to Champions: decisão durante o jogo, fim da campanha de uma vez, narração e fotos

## O que muda

- **A decisão acontece durante o jogo.** Antes, a partida era simulada até cada momento antes de o jogo ao vivo
  começar, então todas as decisões apareciam antes de a bola rolar. Agora a sala tem um relógio só, que para no minuto
  do momento (25', intervalo, 70'). A decisão abre dentro do jogo ao vivo quando o relógio chega lá ("25' · parado"), e
  o jogo continua depois que todos respondem ou que o prazo acaba. Os lances até a parada já aparecem, e os seguintes
  chegam depois da resposta.
- **Eliminado não precisa jogar rodada por rodada.** Quem caiu não segura mais a rodada. Quando todos os protagonistas
  da sala estão fora, o anfitrião vê "Simular até o fim", e o resto da Champions é jogado de uma vez até o campeão.
- **Narração nos jogos.** O jogo ao vivo usa o narrador e a torcida da Carreira, com o botão de som no placar. Os nomes
  falados de clubes e jogadores só existem para o Brasileirão e a Série B. Para os clubes europeus, o narrador fala o
  lance sem o nome, até rodar `GERAR_NARRACAO.bat --ligas todas` e mandar os áudios.
- **O jogador aparece nos posts.** As fotos do feed são montadas com o protagonista na frente da arte, em seis
  jeitos: capa de revista, entrevista com a faixa da TV, lance com adesivo, polaroide, citação (só nas respostas da
  entrevista) e placar. O fundo também varia conforme o post e o resultado.
- **Os personagens têm rosto.** Rafa, Marcelo, Bia, Ventura, Nando, Léo, Duval, Helena, Clara, Laura, André e o
  repórter ganharam retratos ilustrados, cada um com a roupa do papel e o fundo do lugar. Nas cenas dubladas, quem fala
  aparece à esquerda e o protagonista (a foto) à direita, aceso quando fala e na hora da escolha.

## Arquivos

- `road-to-champions.js`: o relógio (`minutoAoVivo`, `tetoDe`, `rebasear`, `ajustarPrazos`), os lances parciais
  (`guardarLances`, `partidaDe`), `eliminado`, `todosEliminados`, `simularAteFim` e o canal `simularFim`.
- `public/jogador/road-partida.js`: o relógio do servidor, a decisão dentro do jogo (`#rtc-av-momento`) e a narração.
- `public/jogador/road.js`: "Simular até o fim", o momento só quando o relógio chega, a foto dos posts (`fotoDoPost`) e
  a foto do protagonista nas cenas dubladas.
- `public/jogador/retratos.js` (novo), `road-dublagem.js` e `road-dublagem.css`: os retratos em cena.
- `public/carreira/som-partida.js`: `SomPartida.configurar` para usar fora da Carreira (a Carreira continua igual).
- `public/jogador/road.css`, `road-feed.css`, `index.html` e `CLAUDE.md`.

## Testes

- `tests/road-champions-liga.test.js`: o relógio parado no momento com os lances até ali, e a sala toda eliminada
  simulando até o fim.
- `tests/e2e/road-champions.spec.js`: a decisão abre no jogo ao vivo só aos 25' e o jogo segue depois das respostas.
- `tests/e2e/road-dublagem.spec.js`: o retrato de quem fala e o protagonista aceso.
- Passando também: `road-to-champions.test.js`, `road-dublagem.test.js`, `salas.test.js`, `carreira-som.spec.js` e
  `carreira-mesa.spec.js`.
