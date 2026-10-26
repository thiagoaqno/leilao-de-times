# Branch: correção da saída dos boxes

## Adicionado nesta branch

- O carro agora chega exatamente ao fim do corredor e volta à pista com o ângulo da tangente da volta e o índice correto. Isso elimina o giro para leste causado por `atan2(0, 0)` no último passo.
- `F1Regras.saidaDoCorredor` centraliza o cálculo da saída.
- Teste de regressão para Mônaco, Interlagos, Barcelona, Silverstone e Monza: a saída avança pelo traçado e aponta no sentido da volta.

## Verificação

- `node --test tests/corrida*.test.js`: 44 testes passaram.
- `git diff --check`: sem problemas.
