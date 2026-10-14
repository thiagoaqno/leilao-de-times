# Carreira: números inteiros na formação

## O que muda

- O resumo da formação mostra a média dos titulares e o rendimento nas posições sem casas decimais.
- As dicas de energia no campo, no banco, no cartão em destaque e no aviso antes do jogo mostram porcentagens inteiras.
- O arredondamento afeta apenas a exibição. As contas de energia e desempenho continuam com a mesma precisão.

## Verificação

- `node --test tests/carreira-leitura.test.js` passou.
- O teste de navegador da prancheta confirmou médias e dicas de energia inteiras, além dos badges de perda de overall. A captura da página completa foi conferida em 1280 × 800.
