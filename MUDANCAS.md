# Cozinha: arremesso, impulso e controles em tela em pé

## O que muda
- Segurar F (ou o botão de usar) com ingrediente na mão mostra a trajetória e carrega o arremesso. Soltar lança o ingrediente: ele pode cair numa bancada, entrar num recipiente compatível, pousar no chão ou ser pego por outro cozinheiro no ar. Um toque curto continua usando a bancada.
- O impulso empurra um colega próximo, com posição corrigida pelo servidor. O cozinheiro desliza pelas quinas ao andar na diagonal.
- A bancada à frente recebe um contorno, e o item que ela contém pulsa para indicar o que será pego.
- Em tela em pé, a câmera acompanha o cozinheiro e parte do grupo de mais perto. Os controles de toque permitem essa orientação e o placar fica acima dos botões.

## Testes
- `node --test tests/cozinha.test.js`: cobre arremesso, pouso, recuperação e captura no ar, além do restante das regras da Cozinha.
- `npx playwright test tests/e2e/cozinha-controles.spec.js`: abre a partida em tela em pé, verifica os controles e a ausência de erros no navegador.
