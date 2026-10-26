# Branch: boxes com duas faixas

## Adicionado nesta branch

- Corredor ampliado de 34 para 54 unidades, com faixa rápida e faixa das garagens. O carro que para desvia da faixa rápida, troca o pneu na garagem e retorna à faixa de passagem; os robôs seguem a mesma trajetória.
- Garagens com prédio aberto, mecânicos, cores e nomes das equipes, inclusive em Mônaco. O asfalto agora marca a separação entre as duas faixas.
- Área dos boxes reservada antes da montagem do cenário. Postes, painéis, balizas, torcida, pessoas e arquibancadas respeitam essa área.
- Teste novo confirma a separação lateral das duas faixas em Mônaco e Interlagos.

## Verificação

- `node --test tests/corrida*.test.js`: 44 testes passaram.
- `git diff --check`: sem problemas.
- Conferido no navegador, com regras de F1 e câmera de cima: Mônaco e Interlagos, sem erros de página. Capturas: `planos/imagens/boxes-monaco-duas-faixas.png` e `planos/imagens/boxes-interlagos-duas-faixas.png`.
