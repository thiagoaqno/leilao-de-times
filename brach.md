# Calibra o piloto de Mônaco em pista livre

Calibra experimentalmente o Leclerc com Ferrari padrão, pneu médio, pista seca e sem trânsito, e usa a trajetória e velocidades medidas nas voltas limpas como referência da linha visual. O controlador anterior continua valendo fora das condições avaliadas e quando há uma linha aprendida com jogadores. Assinaturas impedem usar dados desatualizados após mudanças na pista ou na física.

A busca é determinística, não uma garantia de melhor volta global. Em oito sementes reservadas, a referência antiga fez 0/16 voltas limpas com 45 toques e média de 56,03 s; a calibrada fez 16/16 limpas, sem toques, com média de 57,46 s. Com desgaste em duas voltas, registrou 0 toques contra 23 em quatro sementes. O ajuste do grampo baixou a média de 57,52 s para 57,46 s frente à candidata segura anterior, ainda sem toques. A versão segura ficou mais lenta que a referência original em pista livre; ainda não há comprovação de que vence mais corridas. Método e limites em `planos/calibracao-monaco.md`.

## Verificação

- `node --test tests/corrida-calibracao-monaco.test.js` (4 testes focados).
- `node --test --test-name-pattern 'Mônaco molhado' tests/corrida-monaco-chuva.test.js` (pelotão na chuva).
- Referência gerada com 8 voltas limpas e validada em navegador: linha fixa e mudança de verde para vermelho com a velocidade.
- O conjunto completo de testes não foi executado, conforme pedido anterior.
