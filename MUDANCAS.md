# Carreira: a revolução visual (as telas que faltavam, as transferências animadas e o leilão)

Depois do hub e das telas de menu, o resto da carreira entra no mesmo visual: o estádio à noite, os painéis de vidro e
a cor do seu clube.

## As telas que faltavam
- **Tela inicial e sala da carreira em grupo:**
  - ganham o estádio ao fundo e o título com degradê;
  - os clubes sobem e brilham ao passar o mouse, e o escolhido fica com a borda na cor de destaque.
- **Diálogos (ficha, decisão no jogo, pós-jogo, disputa e código):** vidro escuro com a borda e o brilho na cor do
  clube, e o fundo desfocado atrás.
- **Partida:**
  - o placar de vidro vai da cor do mandante à do visitante;
  - o gol brilha na cor de destaque na narração, e os lances do seu time têm o filete do clube;
  - os botões de velocidade usam a cor do clube.
- **Botões principais** dentro dos diálogos e das telas: saem do âmbar antigo e vão para a cor do clube. O botão "3×"
  da rodada em grupo também. O e2e que conferia o âmbar agora confere a cor do clube.

## Transferências animadas
- O Codex já tinha feito a cena da transferência no #85 (`AnimacoesCarreira.animarTransferencia`: o card, os escudos
  de origem e destino, o carimbo e o martelo). Ela só tocava quando você comprava ou vendia pela ficha, na disputa ou
  no leilão.
- Agora ela também toca nas transferências do seu clube que chegam sem um clique seu: uma proposta aceita pela caixa
  de entrada, a venda da lista ou o leilão que você levou (`animarTransferenciasNovas`, em `inicio.js`). A contratação
  ganha confete. Na primeira vez que o estado chega, nada anima.

## Leilão
- A faixa do leilão (que o #85 já tinha deixado viva) mostra o histórico dos últimos lances, com o escudo de quem está
  na briga e o maior lance em destaque.

## Conferido
- **Fotos:** `planos/imagens/carreira-visual-inicio.png`, `carreira-visual-ficha.png`, `carreira-visual-partida.png` e
  `carreira-visual-posjogo.png`.
- **E2E da carreira:** 6 de 6.
- A mudança é só no navegador (o servidor não muda).
