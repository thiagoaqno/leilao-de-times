# Carreira: queda de overall limitada a 3 pontos

## O que muda

- O desgaste por energia continua gradual, mas a perda efetiva de overall para em 3 pontos.
- Na prancheta e no aviso antes do jogo, a perda aparece sempre arredondada para baixo: menos de 1 não mostra badge; de 1 a menos de 2 mostra −1; de 2 a menos de 3 mostra −2; a partir de 3 mostra −3.
- Três jogos seguidos não aplicam uma penalidade extra. A sequência deixa de entrar no cálculo do motor; a energia continua caindo ao jogar e se recupera com descanso.

## Verificação

- `node --test tests/carreira-leitura.test.js` passou.
- Testes direcionados de energia, sequência e desgaste em `tests/carreira-taticas.test.js` passaram.
- O teste de navegador da prancheta confirmou os badges −1, −2 e −3 e a ausência de desconto fixo no terceiro jogo. A captura foi conferida em 1280 × 800.
