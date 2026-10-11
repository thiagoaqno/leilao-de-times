# Carreira: a sede mais limpa e alinhada, com a troca de telas deslizando para o lado

## O menu sem os ícones e a Central da sala

- **Antes**, os botões da gestão na faixa da sede (Elenco e tática, Mercado, Tabela, Calendário, Trocas, Clube e Estante) tinham um quadradinho com um ícone em SVG na frente do nome, e as abas ao lado (Central, Meu time, Temporada) não tinham.
- **Agora**, todos os botões da faixa ficam no mesmo padrão das abas: só o nome, com o mesmo espaço dos lados.
- Com a janela de transferências aberta, o Mercado continua com a bolinha verde, agora logo depois do nome.
- Na carreira em grupo, a linha "Antes da rodada..." / "Já mexeram no time..." entrava no meio da Central: o Jogar ficava sozinho numa linha e o Como jogar e a prévia, espremidos embaixo. Agora os três blocos ficam lado a lado, como no solo, e a linha vai logo abaixo deles.

## A Prévia alinhada e a troca deslizando

- **Antes**, na Central, os três quadros de cima (Jogar, Como jogar e Prévia) não batiam com os de baixo, e a Prévia ficava apertada: o último quadradinho do calendário cortava. Trocar de aba (Central, Meu time, Temporada) era instantâneo, e abrir Elenco, Mercado, Tabela e os outros fazia um zoom saindo do bloco.
- **Agora**, Jogar e Como jogar ocupam juntos a largura do Desenvolvimento do jogador, e a Prévia fica exatamente em cima de Notícias + Tabela, mais larga, com os seis jogos do calendário inteiros.
- A troca entre as abas e as telas do menu desliza para o lado, como um carrossel: a faixa é uma fila só (Central, Meu time, Temporada, Elenco e tática, Mercado, Tabela...). Ir para a direita da fila faz a tela nova entrar pela direita; voltar (inclusive pelo "← Sede") faz ela entrar pela esquerda.
- No celular, arrastar o dedo para o lado passa para a aba ou a tela vizinha da fila. Não vale em cima do que já anda para o lado (tabelas largas, a prancheta, campos de texto) nem com uma janela aberta.
- Quem pede menos movimento no sistema continua trocando de tela na hora.

## Como

- `public/carreira/index.html`: saíram os `<span class="tile-ic">` dos `.tile` da sede.
- `public/carreira/hub.css`: o `.tile` da sede ganhou o espaço das abas (`padding: 0 16px`); a bolinha do mercado aberto foi para `.tile-txt b::after`; saíram as regras do `.tile-ic`.
- `public/carreira/estilo.css`: saíram as regras antigas do `.tile-ic`, que nada mais usa.
- `public/carreira/hub.css`: a linha `.cj>.prontos` (escrita por `grupo.js` logo depois do botão Jogar) ganhou `order:1`, para ir para o fim da grade da Central.
- `hub.css`: a grade da Central passou a ter quatro colunas (as duas primeiras somam a do Desenvolvimento) e o bloco do jogo repete as mesmas colunas, com a Prévia nas duas últimas (acima de 1240 px; abaixo, nada mudou). Subgrid não serve aqui porque o `container-type` do `#cartaoJogo` isola a grade.
- `zoom.js` (o nome ficou): `deslizar` troca uma tela inteira pela outra (a velha fica fixa por cima e sai para um lado, a nova entra pelo outro), `aba` faz o mesmo com o miolo da sede entre as abas, `passo` anda na fila da faixa e o arrastar do dedo (`touchstart`/`touchend`) chama `passo`. O zoom saiu (e a placa `.zoomando` do `estilo.css`).
- `sede-hub.js`: os cliques e as setas das abas passam por `Zoom.aba`.
- Testes: `tests/carreira-zoom.test.js` ganhou a fila do arrastar (das abas para os blocos, a Trocas escondida no solo e o fim da fila).
