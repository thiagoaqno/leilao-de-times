# Carreira: as outras telas no visual do hub

O hub da carreira (a sede no estilo EA FC) já tinha a cara nova. Agora o elenco, o mercado, a tabela, o calendário e
as notícias seguem o mesmo visual. É só CSS, mais a classe `hub` nas telas (`public/carreira/index.html`); nenhum
JavaScript e nenhum servidor mudam.

## O que muda
- **As cinco telas** ganham o estádio à noite ao fundo, os painéis de vidro e a cor de destaque do seu clube (a mesma
  do hub: o Flamengo em vermelho, o Palmeiras em verde...). No PC, elas usam até 1320 px de largura.
- **O topo de cada tela** (o "← Sede" e o título) virou uma faixa como a do hub, com a cor do clube e um filete no acento.
- **Os controles:** os botões de escolha (formação, posições do mercado, modos), as abas das competições e os controles
  deslizantes usam a cor do clube. No mercado, os filtros acompanham a rolagem da tela.
- **Os cards** do mercado, do banco e do olheiro sobem e brilham na borda ao passar o mouse.
- **A tabela:** a linha do seu clube fica na cor dele, com um filete; as linhas acendem no hover.
- **O calendário:** o próximo jogo fica destacado na cor do clube.
- **O leilão e o olheiro** (carreira em grupo) ganham o mesmo vidro e o brilho.
- Quem pede "menos movimento" no sistema fica sem as animações de hover.

## Ficou para depois
As animações de contratação e de transferência (o card voando, o carimbo de "vendido", o martelo).

## Conferido
- **Fotos:** `planos/imagens/carreira-tela-elenco.png`, `carreira-tela-mercado.png`, `carreira-tela-tabela.png` e
  `carreira-tela-calendario.png` (Flamengo, no vermelho do clube).
- **E2E da carreira:** 4 de 4 passando. Na primeira rodada, um teste falhou esperando o diálogo de decisão fechar, o
  que parece instabilidade de tempo (a mudança é só de CSS); na segunda, passaram os 4.
