# Carreira: a Sede no jeito da central do FIFA 16, e a artilharia separada por competição

- **Antes**, a Central da Sede tinha três colunas: o Avançar com o próximo jogo e o desenvolvimento do jogador à esquerda, os blocos da gestão e as notícias no formato do Instagram (um post inteiro por vez) no meio e a caixa de entrada à direita.
- **Agora** ela segue a tela Central do FIFA 16, com as cores do clube:
  - **A faixa de cima** tem as abas (Central, Meu time, Temporada) e, logo depois delas, os atalhos da gestão (Elenco e tática, Mercado, Tabela, Calendário, Trocas, Clube, Estante), todos na mesma faixa, como Central, Plantel e Transferências no FIFA. Os atalhos continuam crescendo até a tela toda quando tocados. Quando não cabe numa linha (no celular), a faixa quebra e os botões se esticam para preencher.
  - **Em cima**, três blocos: **Jogar a próxima partida** (o bloco inteiro é o botão, na cor do clube, com a semana, o mando, a competição e o escudo do adversário), **Como jogar** (só o resultado, com decisões táticas ou com os lances decisivos) e a **Prévia** do jogo (o confronto sobre a foto do estádio, o estádio, o peso do jogo, os desfalques, os avisos pendentes e o calendário dos próximos compromissos).
  - **Embaixo**, da mesma altura: o **Desenvolvimento do jogador** (agora no painel claro, com a cor do clube nos destaques), as **Notícias** em manchetes (a arte pequena, a editoria e o texto; quatro por página, os pontinhos trocam a página e cada manchete abre o feed inteiro) e a **Tabela** resumida com sete clubes, jogos e pontos, o seu em destaque.
  - Depois, a caixa de entrada, o último jogo e a turma.
- Meu time não mudou. A Temporada ganhou o painel **Artilharia**.
- **A artilharia agora é de cada competição.** Antes, a lista juntava os gols de todas as competições (Brasileirão, Libertadores, Copa do Brasil...) numa só. Agora:
  - na Tabela, a artilharia é a da competição aberta nas abas;
  - na Sede, aba Temporada, o painel Artilharia tem as abinhas das competições (as do seu clube primeiro, começando pela liga), e o "Ver tabela" abre a Tabela na mesma competição;
  - na Estante, cada competição guardada mostra a sua artilharia, e o prêmio de artilheiro é o da liga do seu clube;
  - a festa do campeão mostra os artilheiros do campeão naquela competição.
  - Nas carreiras em andamento, os gols dos jogos de vocês feitos antes desta atualização ficam só no total (a ficha do jogador e o artilheiro do time); daqui para a frente entram na competição certa. Os gols dos jogos do computador já saem certos desde o começo da temporada.
- O teste do botão de voltar do cabeçalho (`tests/carreira-zoom.test.js`) falhava desde o PR do "← Sede" com a cor do clube: o cabeçalho de mentira do teste não tinha `classList`. Agora tem, e o teste confere a classe `para-sede`.

## Como

- `public/carreira/index.html`: a `.hub-barra` junta as abas e os atalhos numa faixa só (as duas listas com `display:contents`; `.hub-tiles` aparece em todas as abas); a tabela resumida aparece na Central e na Temporada; o painel `#cartaoArtilharia` na Temporada.
- `carreira.js`: `contarGols(save, r, comp)` também conta em `save.golsComp[comp]` (zerado na virada); `golsDoMundo(save, limite, comp)` filtra pela competição; o estado manda `artilharias` (o top 10 de cada competição); a festa usa os gols da competição; o arquivo guarda `competicoes[id].artilharia` (top 5).
- `public/carreira/sede-hub.js`: `artilhariaNaSede`; `telas.js`: `artilhariaHTML` e a artilharia da Tabela pela competição aberta; `temporadas.js`: a artilharia de cada competição e o prêmio da liga.
- `public/carreira/feed.js`: `refazerArtes` não quebra mais quando a pessoa já saiu da carreira e um escudo chega depois.
- `public/carreira/telas.js`: `telaJogo` monta `.cj` (os três blocos de cima; `#btnJogar` continua sendo o botão de jogar, e na sala o `grupo.js` muda o texto dele como antes); a tabela resumida tem sete linhas com J e Pts.
- `public/carreira/feed.js`: `feedNaSede` virou a lista de manchetes com páginas; o carrossel do Instagram na sede saiu (o feed inteiro continua na tela Notícias).
- `public/carreira/sede-hub.js`: a faixa do calendário perdeu o título "Avançar" e entra na prévia.
- `public/carreira/hub.css`: a barra, a grade da Central por áreas (`display:contents` nas colunas), os blocos de cima, o desenvolvimento claro, as manchetes e a tabela; `estilo.css` perdeu o CSS do carrossel.
- Testes: `tests/e2e/carreira.spec.js` confere as manchetes e a troca de página; `tests/carreira-zoom.test.js` tem o `classList` no cabeçalho; `tests/carreira-chaves.test.js` confere que cada competição soma só os gols dos seus jogos, que somadas dão o total e que os gols de humanos vão para a competição do jogo.
