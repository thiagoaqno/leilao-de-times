# Corrida: atualizar testes e tabela de estratégia

O CI da versão após o PR #445 registrou 22 falhas. Esta mudança corrige 14 delas sem alterar Dominó ou Carreira: atualiza as expectativas para o pneu de chuva, situações do rádio e campos atuais da sala; testa as bandeiras genéricas numa pista que as tem e verifica a suavidade da descida atual de Mônaco. Os testes de rede deixam de interpretar a colisão com a borda do mapa como salto de reconciliação; o cenário de disputa lateral faz o carro humano realmente avançar. O teste de parada antecipada inicializa o mesmo pneu na IA e no carro simulado.

Recalcula a tabela de 32 pistas com `node ferramentas/pneus-tabela.js`, sem alterar a física ou o limite de jogos. A tabela de Interlagos volta a bater com a simulação; em corridas de cinco voltas, o melhor plano muda em Barcelona, Xangai, Suzuka e Singapura. Sorvete já não tinha tabela e o simulador continuou sem obter medição confiável para essa pista.

## Verificação

- 15 testes direcionados passaram, incluindo as 14 falhas do CI tratadas aqui e o teste de parada antecipada. Também passaram 26 testes de pneus, rádio, rede e salas.
- O `npm test` completo não foi repetido até o fim. O CI ainda deve falhar em oito testes de Corrida: diferenças de ritmo entre compostos e estratégias, oversteer, aderência dos pneus, montagem das equipes e ritmo dos robôs. Eles não foram afrouxados para passar; precisam de decisão e calibração do comportamento.
- O teste de navegador do MFD também falhou ao verificar a navegação do painel, fora do `npm test`; não foi alterado neste PR.
