# Corrida: stop-and-go com pneu esgotado

O MFD recusava um stop-and-go quando não havia outro jogo do composto atual, embora cumprir a punição sem troca não consuma pneu. Agora o pedido é aceito; trocas continuam sujeitas ao estoque.

O teste da simulação preparava o corredor tarde demais e falhava antes de testar o stop-and-go. Ele agora cobre a troca para chuva, e há uma verificação da escolha do servidor para chuva disponível ou esgotada.

## Verificação

- `node --test tests/corrida-punicoes.test.js`: 17 testes passaram.
- No teste de navegador do MFD, a verificação do pedido com composto esgotado passou; o teste depois falhou porque o painel de pneus ficou oculto. O teste completo de navegador não passou.
- A suíte npm completa já apresentava falhas anteriores no CI: ver o job npm-test do PR #441.
