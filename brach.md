# Corrida: carro sobre o asfalto de Mônaco

Em trechos próximos ao box, o terreno do cenário é rebaixado para não atravessar a pista. Usá-lo para inclinar o carro fazia o modelo tombar e atravessar visualmente o asfalto. Nas regras de F1, sobre o asfalto de Mônaco, a inclinação passa a usar a mesma altura da física do carro.

Teste: `npx playwright test tests/e2e/corrida-monaco-carro.spec.js`. A amostra reproduz a diferença entre terreno e asfalto e verifica a inclinação corrigida. Ainda é necessária uma volta jogada para verificar outros pontos da pista.
