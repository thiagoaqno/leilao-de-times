# Carreira: o zoom da sede (a tela sobe já carregada, como abrir uma janela) e o "← Sede" no cabeçalho

## O zoom
- Clicou num bloco da sede (**Elenco e tática, Mercado, Tabela, Calendário, Clube, Temporadas** e **Trocas**, na sala), a tela nova é **desenhada por inteiro antes** (cartas, listas, números) e a **própria tela, já carregada, cresce do lugar do bloco até o tamanho final**, com a sede esmaecendo por baixo. Voltando, a tela encolhe até o bloco e a sede (também já desenhada) reaparece por baixo.
- **Sem troca no fim:** o último quadro da animação é igual à tela parada (medido: zero de diferença no abrir e no fechar). Antes havia uma folha cinza e borrada e um "recarregar" no final; agora nada é trocado.
- Para isso: só `transform` (mais canto e sombra) anima; a tela não ganha opacidade nem desfoque (o vidro dos painéis não muda no meio); uma placa escura em pseudo-elemento fica por trás durante o movimento, para a sede não vazar pelo vidro; a entrada em cascata dos painéis fica desligada (se ela voltasse no fim, reiniciaria e daria o "pulo").
- A tela começa já no tamanho do bloco enquanto pinta (sem piscar em tamanho cheio), e cliques durante o zoom são ignorados (inclusive no cabeçalho). Quem pede "reduzir movimento" no sistema troca de tela na hora.

## O botão do cabeçalho
- Antes ficava sempre "← Vila", e era fácil clicar sem querer e sair da carreira. Agora é **"← Vila" só na sede, na entrada e na partida**, e **"← Sede"** em todas as telas de gestão (no mesmo lugar). O "← Sede" repetido dentro de cada tela saiu, já que o do cabeçalho faz o mesmo.
- O cabeçalho vira "← Sede" já no começo do zoom, e cliques nele durante a animação não fazem nada (nunca caem no "← Vila" que aparece por baixo).

## Conferido
- `tests/carreira-zoom.test.js` (4 testes): o texto do cabeçalho em cada tela, o atalho de quem pede menos movimento, o "Ver todas" (sem bloco) e a ordem dos scripts.
- No Chrome (Mercado, Elenco, Clube e Tabela, abrindo e fechando): o último quadro da animação é idêntico à tela parada; sem erros no console. Fotos em câmera lenta em `planos/imagens/carreira-zoom-*.jpg`.
