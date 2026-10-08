# Carreira: a revolução visual (a página inteira na cor do clube, a partida de TV, as transferências animadas e o leilão)

Depois do hub e das telas de menu, a carreira inteira passa a ter a cara do seu clube: não só os detalhes, mas o fundo,
os painéis, a barra do topo e o placar.

## A cor do clube na página inteira
- **O estádio deixa de ser verde:** os refletores, as faixas na diagonal e a arquibancada ficam nas cores do clube. Com o
  Flamengo a página fica vermelha e preta; com o Palmeiras, verde; com o Cruzeiro, azul.
- **O escudo gigante** do clube fica de marca d'água atrás de tudo (`#marcaClube`, montado em `inicio.js`).
- **A barra do topo** ganha a faixa nas duas cores do clube, e cada painel tem um filete com elas em cima.
- **O topo de cada tela** (sede, elenco, mercado, tabela, calendário, notícias) vira uma faixa de transmissão na cor do
  clube, com listras.
- **Na tela inicial**, escolher o clube já pinta a página. Cada clube da lista tem a faixa das suas cores.
- As telas entram subindo (quem pede menos movimento fica sem).

## A partida
- **O placar de transmissão de TV:** cada lado preenchido com a cor do seu clube, com o nome na cor que dá leitura
  (escuro em clube branco, como o Santos), e o relógio numa pílula na cor do seu clube.
- A partida também ganha o estádio ao fundo.

## As outras telas
- **Tela inicial, sala em grupo, diálogos (ficha, decisão, pós-jogo, disputa, código):** vidro escuro com a borda e o
  brilho na cor do clube.
- **Botões principais:** saem do âmbar antigo e vão para a cor do clube. O e2e que conferia o âmbar no "3×" agora confere
  a cor do clube.

## Transferências animadas
- O Codex já tinha feito a cena da transferência no #85 (`AnimacoesCarreira.animarTransferencia`: o card, os escudos,
  o carimbo e o martelo). Ela só tocava quando você comprava ou vendia pela ficha, na disputa ou no leilão.
- Agora ela também toca nas transferências do seu clube que chegam sem um clique seu: a proposta aceita pela caixa de
  entrada, a venda da lista ou o leilão que você levou (`animarTransferenciasNovas`, em `inicio.js`). A contratação
  ganha confete. Na primeira vez que o estado chega, nada anima.

## Leilão
- A faixa do leilão mostra o histórico dos últimos lances, com o escudo de quem está na briga e o maior lance em destaque.

## Conferido
- **Fotos:** `planos/imagens/carreira-visual-inicio.png`, `carreira-visual-sede.png`, `carreira-visual-mercado.png`,
  `carreira-visual-partida.png`, `carreira-visual-ficha.png` e `carreira-visual-posjogo.png`.
- **E2E da carreira:** 6 de 6.
- O tema do clube foi conferido no solo e no grupo (cada técnico vê a sua cor).
- A mudança é só no navegador (o servidor não muda).
