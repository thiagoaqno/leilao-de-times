# Carreira: o zoom da sede (abre e fecha como uma janela) e o "← Sede" no cabeçalho

## O zoom
- Clicou num bloco da sede (**Elenco e tática, Mercado, Tabela, Calendário, Clube, Temporadas** e **Trocas**, na sala), uma folha de vidro com o nome do bloco **cresce do lugar dele até a tela toda**, a tela nova aparece por baixo e a folha some. É o jeito de abrir uma janela no Mac.
- Voltando, a folha cobre a tela, a sede reaparece por baixo (na mesma posição de rolagem) e a folha **encolhe até o bloco**.
- É só um retângulo liso (posição, tamanho e canto arredondado), sem texto nem desfoque animado, e as entradas em cascata param enquanto ele anima: continua leve. Quem pede "reduzir movimento" no sistema troca de tela na hora. Clique rápido não trava (cliques durante o zoom trocam direto).

## O botão do cabeçalho
- Antes ficava sempre "← Vila", e era fácil clicar sem querer e sair da carreira. Agora é **"← Vila" só na sede, na entrada e na partida**, e **"← Sede"** em todas as telas de gestão (no mesmo lugar). O "← Sede" repetido dentro de cada tela saiu, já que o do cabeçalho faz o mesmo.
- O cabeçalho vira "← Sede" já no começo do zoom, para o clique durante a animação nunca cair em "← Vila".

## Conferido
- `tests/carreira-zoom.test.js` (4 testes): o texto do cabeçalho em cada tela, o atalho de quem pede menos movimento, o "Ver todas" (sem bloco) e a ordem dos scripts.
- No Chrome, os 6 blocos (e o voltar de cada um): a folha aparece com o nome certo, a tela abre, o cabeçalho troca para "← Sede" durante e depois, e a sede volta com "← Vila"; sem erros no console. Fotos em `planos/imagens/carreira-zoom-*.jpg`.
