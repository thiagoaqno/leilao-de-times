# Carreira: o visual refeito do zero (minimalista, animado, painel do time, cartas por nota e ícones novos)

A carreira inteira ganhou outra cara, no estilo das interfaces do Emil Kowalski: escuro, limpo, com tipografia fina e
movimento curto em tudo. O CSS foi reescrito do zero (`public/carreira/estilo.css`); a cor do seu clube continua
mandando no acento (o brilho no topo, o botão de jogar, as abas e as seleções).

## O visual
- **Base nova:** fundo quase preto, superfícies com borda fina, fonte Geist (e Geist Mono nos números), cantos
  arredondados e sombras suaves. Sai o estádio verde, sai o âmbar antigo e saem os títulos em caixa alta.
- **Todas as telas refeitas:** início, sala em grupo, sede, elenco e tática, mercado, tabela, calendário, notícias,
  partida, pós-jogo, ficha, decisões, disputa, código, leilão e a cena da transferência.
- **Layout da sede:** três colunas. À esquerda o próximo jogo e os atalhos; no meio, o painel do time e as notícias; à
  direita, a caixa de entrada, o último jogo, a tabela e as finanças. No celular, uma coluna só.

## O painel do time (novo, `painel.js`)
- **Visão geral:** a força do time num anel, pontos, aproveitamento, gols, idade média, valor do elenco, artilheiro,
  moral e os últimos jogos. Os números sobem contando.
- **Setores:** a média dos titulares no gol, na defesa, no meio e no ataque, com as barras na cor da faixa. Mostra o
  ponto forte e o setor a reforçar; tocar num setor abre quem joga nele.
- **Elenco:** quantos jogadores há em cada faixa (elite, ouro, prata, bronze) e os melhores por nota, valor ou idade.
  Tocar num jogador abre a ficha.
- **Finanças:** caixa, folha, valor do elenco e o saldo de cada jogo num gráfico de barras.
- A pílula da aba desliza até a escolhida, e o conteúdo troca com um desfoque curto.

## As cartas por nota
- **Bronze** (até 79): escura, com o cobre na borda.
- **Prata** (80 a 84): metálica prateada.
- **Ouro** (85 a 89): metálica dourada.
- **Elite** (90 ou mais): o ouro mais forte, com o brilho correndo pela carta, um reflexo passando e um halo dourado.
- Com mouse, as cartas inclinam atrás do ponteiro e o reflexo segue o cursor. As peças da prancheta e as barras do
  painel usam as mesmas faixas.

## Ícones novos
- `simbolos.js` redesenha em SVG os 73 ícones que a carreira usa (traço fino e uma segunda camada suave). O sprite
  entra antes do de `/icones.js` e ganha dele, então nenhum outro script mudou; os outros jogos continuam com os
  ícones de antes.

## As animações
- As telas entram em cascata (sobem e saem do desfoque); os diálogos crescem de 96%; o aviso sobe como um toast; os
  botões encolhem ao tocar; os lances da narração descem; o placar pulsa no gol; o gráfico de valor da ficha se
  desenha; o leilão sobe como uma gaveta.
- Quem pede menos movimento no sistema fica sem elas (a cena da transferência e os balões aparecem parados).

## Junto com o #90
- O #90 (as transferências que chegam sem clique animadas e o histórico de lances no leilão) já está no `main`; este PR
  mantém o que ele fez nos scripts e troca o visual dele por este.

## Conferido
- **Fotos:** `planos/imagens/carreira-nova-inicio.png`, `carreira-nova-sede.png`, `carreira-nova-painel-setores.png`,
  `carreira-nova-mercado.png`, `carreira-nova-ficha.png`, `carreira-nova-partida.png` e `carreira-nova-celular.png`.
- Telas conferidas no navegador (PC e celular de 390 px, sem rolagem lateral e sem erro no console).
- **E2E da carreira:** 6 de 6.
- A mudança é só no navegador (o servidor não muda).
