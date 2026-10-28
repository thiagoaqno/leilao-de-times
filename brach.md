# Corrida: luz de verdade nos refletores do Bahrein

No Bahrein à noite, a "luz" das torres de refletores eram placas aditivas de 300 de diâmetro flutuando 2,5 acima do asfalto (`kit/bahrein/luz.js`): clareavam a pista a ponto de não dar para ver o asfalto, e as rodas atravessavam as placas.

## O que mudou
- As placas de luz no chão saíram. No lugar entram `SpotLight` de verdade: um punhado fixo (6) que, a cada quadro, vai para as torres mais perto do carro e aponta para o mesmo lugar do asfalto onde a placa ficava. A luz cai no asfalto e nos carros, sem objeto nenhum por cima.
- O número de luzes não muda (de dia ficam apagadas, intensidade 0), então trocar dia e noite não recompila os materiais. A torre que está para sair da lista já chega apagada (`FAIXA`), então a troca não pisca.
- `ligarNoite` (`kit/bahrein/base.js`) ganhou `quadro`: funções que rodam em todo quadro (com a noite e o foco), além da troca de dia e noite.
- Os mastros, as cabeças, os painéis de lâmpadas e o halo em volta deles continuam iguais.

## Conferido
- `node --test tests/corrida-pistas-desempenho.test.js tests/corrida-pistas-invasao.test.js tests/corrida-pistas-volta.test.js`: 76 de 76.
- Não conferi no navegador, a pedido. A força da luz (`FORCA`, 230) pode precisar de ajuste depois de ver na pista.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
