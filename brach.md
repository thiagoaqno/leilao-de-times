# Auxílio de frenagem e entrada da Corrida

A entrada mostra uma capa nova até o primeiro desenho da garagem, sem espera artificial. A linha de auxílio, desligada por padrão e configurável no menu ou na corrida, muda de cor conforme a velocidade e as curvas adiante. O minimapa ficou 40% maior. A tela em tela cheia antes da corrida rápida e do contrarrelógio foi removida.

As faixas de velocidade relativa para punição de colisão sobem 10%. O causador recebe 12%, 20% ou 35% de dano nas infrações leve, média ou com stop-and-go; a proteção do atingido continua igual.

## Verificação

- Testes focados de punições: `node --test tests/corrida-punicoes.test.js` (19 aprovados).
- Entrada e capa conferidas no navegador; opção de linha presente no menu e desligada por padrão.
- A suíte completa não foi executada, conforme solicitado. A linha ainda precisa de conferência visual em uma corrida real.
