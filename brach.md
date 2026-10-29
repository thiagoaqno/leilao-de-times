## Som de F1 na Corrida

### Contexto
O modo F1 usava o mesmo sintetizador grave de kart, apesar de já ter rotação e câmbio próprios.

### O que mudou
- Motor V6 turbo sintetizado no navegador, com frequência de ignição entre 200 e 625 Hz, assobio do turbo e filtro abafado ao soltar o acelerador.
- Corte breve e estalo nas trocas para cima, estalo nas reduções e pulsação do limitador.
- Até três carros próximos recebem volume pela distância e variação de frequência Doppler ao se aproximar ou se afastar.
- Os outros modos mantêm o motor de kart. O motor F1 usa o volume, liga/desliga e eco existentes; o ambiente continua no barramento atual.

### Verificação
- `node --check` nos três arquivos JavaScript alterados.
- `git diff --check`.
- `node --test tests/corrida-fisica.test.js tests/corrida-robos-curvas.test.js`: 13 de 17 passaram na base `origin/main`; quatro falhas existentes na física (aderência e relevo), sem mudanças nesses arquivos neste PR.
- O timbre ainda precisa de escuta em uma corrida real no navegador.
