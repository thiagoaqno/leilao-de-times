# Corrida: descartar voltas gravadas incompatíveis com a pista

Depois de um retraçado, índices de uma volta gravada podem apontar para outro trecho. A validação anterior olhava somente a distância lateral e aceitava pontos muito distantes ao longo da pista. Agora o servidor descarta a volta quando mais de 20% das amostras com intervalo válido estão longe do índice registrado; os robôs usam outra volta válida ou o traçado calculado.

## Verificação

- `node --test --test-name-pattern="aprendem a volta gravada|cinco linhas humanas|volta de pista antiga" tests/corrida-robos.test.js`: 3 testes passaram.
- Volta sintética do Mônaco anterior ao estreitamento: um robô, em três voltas, passou de 63,25 s para 55,95 s; 20 robôs passaram de melhores voltas de 61,4–67,55 s para 54,45–60,15 s. Todos terminaram nas duas versões. Houve 0 eventos de batida antes e 6 depois (3 contatos entre carros), na mesma semente. A simulação não reproduz as condições nem prova a causa da corrida relatada.
- Sem volta gravada, 20 robôs completaram três voltas em Jeddah, sem batidas, com e sem a alteração experimental local; a validação deste PR só atua em voltas gravadas.
