# Carros do Drag na Corrida, Porsche 911 e primeira largada

## O que muda

- O anfitrião pode liberar os onze carros do Drag nas regras da Corrida. Cada piloto escolhe o seu na garagem; o nome escolhido aparece para todos na sala e o GLB pintado com a cor do piloto aparece na pista. Os robôs usam a Supra. Os modelos só são baixados quando entram na sala; a página mostra o link de créditos e licenças.
- Os carros do Drag usam a física equilibrada da Corrida, inclusive nas colisões e nos itens. Ao desligar a opção, cada pessoa recupera o carro F1 que havia escolhido.
- O Porsche 911 tinha a malha da pintura deformada pelo empacotamento, aumentando os limites do modelo e fazendo o carro aparecer muito pequeno. O GLB foi recompresso a partir do original sem juntar, instanciar ou achatar as malhas. O arquivo continua com cerca de 3,8 MB.
- O aquecimento da primeira largada aguarda o F1, os enfeites e os modelos escolhidos antes de compilar os shaders. Um quadro de 2 × 2 pixels, fora da tela, envia as malhas para a placa de vídeo durante a preparação. A contagem ganhou dois segundos na Corrida normal e mais 1,5 segundo quando há carros do Drag.

## Verificação

- `node --test tests/corrida-carros-drag.test.js tests/corrida-colisao.test.js tests/corrida-experiencia.test.js tests/corrida-robos.test.js tests/corrida-drag.test.mjs tests/salas.test.js`: 35 testes passaram.
- `npx playwright test tests/e2e/corrida-carros-drag.spec.js`: escolha do 911 na garagem e modelo na Corrida normal; passou.
- `npx playwright test tests/e2e/corrida-drag-modelos.spec.js --grep porsche`: 911 e 718 carregaram no Drag; os dois passaram. O tempo de espera pelo HUD no teste foi ampliado para o renderizador de software.
- Comparei o GLB comprimido antigo com o original e o corrigido na garagem. O 911 corrigido voltou ao mesmo tamanho do original; conferi também a imagem da Corrida normal e a do Drag. A fluidez da primeira corrida foi tratada pela preparação antecipada, mas não medi tempos de quadro em um aparelho físico.
