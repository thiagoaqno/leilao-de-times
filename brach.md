# Corrida: chuva e tempo de chegada

- A hora dos eventos do carro humano agora usa o relógio real validado do passo, limitado para pacotes muito antigos. Depois de uma travada, o relógio acumulado da simulação podia ficar atrasado e registrar o humano antes de bots que já haviam terminado, tanto na torre quanto no resultado.
- Prepara o som da chuva ao iniciar uma corrida com chuva prevista, exercita os efeitos gráficos antes de carregar as demais malhas e reduz as consultas ao relevo usadas por gotas e respingos.

## Verificação

- `node --test tests/corrida-f1-rede.test.js tests/corrida-rede-suave.test.js tests/corrida-chegada-relogio.test.js`: 26 testes passaram; o teste da chegada após uma travada falha na versão anterior.
- Testes de clima, punições e fim de semana: 30 passaram.
- `npx playwright test tests/e2e/corrida-chuva-posicao.spec.js`: verifica a transição de chuva e a ordem de bots concluídos na torre e no resultado. O teste de navegador não mede se a travada desapareceu em todo hardware.
