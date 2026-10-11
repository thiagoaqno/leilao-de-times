# Carreira: a Sede no jeito da central do FIFA 16

- **Antes**, a Central da Sede tinha três colunas: o Avançar com o próximo jogo e o desenvolvimento do jogador à esquerda, os blocos da gestão e as notícias no formato do Instagram (um post inteiro por vez) no meio e a caixa de entrada à direita.
- **Agora** ela segue a tela Central do FIFA 16, com as cores do clube:
  - **A barra de cima** tem as abas (Central, Meu time, Temporada) e, à direita, os atalhos da gestão (Elenco e tática, Mercado, Tabela, Calendário, Trocas, Clube, Estante) no mesmo jeito das abas. Eles continuam crescendo até a tela toda quando tocados. No celular viram uma grade de duas colunas.
  - **Em cima**, três blocos: **Jogar a próxima partida** (o bloco inteiro é o botão, na cor do clube, com a semana, o mando, a competição e o escudo do adversário), **Como jogar** (só o resultado, com decisões táticas ou com os lances decisivos) e a **Prévia** do jogo (o confronto sobre a foto do estádio, o estádio, o peso do jogo, os desfalques, os avisos pendentes e o calendário dos próximos compromissos).
  - **Embaixo**, da mesma altura: o **Desenvolvimento do jogador** (agora no painel claro, com a cor do clube nos destaques), as **Notícias** em manchetes (a arte pequena, a editoria e o texto; quatro por página, os pontinhos trocam a página e cada manchete abre o feed inteiro) e a **Tabela** resumida com sete clubes, jogos e pontos, o seu em destaque.
  - Depois, a caixa de entrada, o último jogo e a turma.
- Meu time e Temporada não mudaram.
- O teste do botão de voltar do cabeçalho (`tests/carreira-zoom.test.js`) falhava desde o PR do "← Sede" com a cor do clube: o cabeçalho de mentira do teste não tinha `classList`. Agora tem, e o teste confere a classe `para-sede`.

## Como

- `public/carreira/index.html`: a `.hub-barra` junta as abas e os atalhos (`.hub-tiles` saiu da Central e aparece em todas as abas); a tabela resumida aparece na Central e na Temporada.
- `public/carreira/telas.js`: `telaJogo` monta `.cj` (os três blocos de cima; `#btnJogar` continua sendo o botão de jogar, e na sala o `grupo.js` muda o texto dele como antes); a tabela resumida tem sete linhas com J e Pts.
- `public/carreira/feed.js`: `feedNaSede` virou a lista de manchetes com páginas; o carrossel do Instagram na sede saiu (o feed inteiro continua na tela Notícias).
- `public/carreira/sede-hub.js`: a faixa do calendário perdeu o título "Avançar" e entra na prévia.
- `public/carreira/hub.css`: a barra, a grade da Central por áreas (`display:contents` nas colunas), os blocos de cima, o desenvolvimento claro, as manchetes e a tabela; `estilo.css` perdeu o CSS do carrossel.
- Testes: `tests/e2e/carreira.spec.js` confere as manchetes e a troca de página; `tests/carreira-zoom.test.js` tem o `classList` no cabeçalho.
