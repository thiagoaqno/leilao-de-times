# Calibração piloto: Mônaco

A bancada `node ferramentas/calibrar-monaco.js` usa a física e o controlador do servidor, um Leclerc com Ferrari padrão, dificuldade difícil, pista seca, sem tráfego, e duas voltas cronometradas. Para comparar o traçado, cada volta começa com o mesmo pneu médio novo; não é uma simulação de estratégia completa de GP. As sementes de busca e de validação são separadas.

A busca é uma grade determinística de deslocamento lateral, velocidade, ponto de mira e alvos de velocidade em dois trechos; não é machine learning e não prova um ótimo global. Prioriza voltas completas sem batida, saída ou recuperação e depois menor tempo. Um candidato mais rápido foi descartado depois de tocar no muro em sementes adicionais. A configuração escolhida usa 75% do deslocamento do traçado de mínima curvatura, mas aproveita até 100% no grampo com transições suaves; mira 80% da distância original e reduz o alvo para 95% entre as frações 0,20–0,25 e 65% entre 0,82–0,91.

Em oito sementes reservadas (901, 902, 903, 904, 951, 952, 953 e 954), com duas voltas por semente:

| Medida | Antes | Calibrado |
| --- | ---: | ---: |
| Voltas completas e sem batida/saída | 0/16 | 16/16 |
| Toques detectados | 45 | 0 |
| Tempo médio | 56,03 s | 57,46 s |

A referência anterior é mais rápida nessa amostra, mas todas as voltas registraram toques. Portanto o resultado demonstra maior consistência, não uma melhoria comprovada de tempo nem vitória garantida. Na mesma amostra final, o ajuste específico do grampo baixou a média de 57,52 s para 57,46 s, mantendo 16/16 voltas limpas. Com o mesmo pneu ao longo de duas voltas, em quatro sementes reservadas, a calibração registrou 0 toques contra 23 anteriormente; essa comparação ainda não representa uma corrida completa.

A otimização só atua no Leclerc com Ferrari padrão, pneu médio até 50% de desgaste, no difícil, em Mônaco seco e sem adversários próximos, sem dano, caixa, bandeiras ou instabilidade. Em outros casos vale o controlador existente. O traçado aprendido com voltas humanas continua prioritário. Isso limita a aplicação ao cenário efetivamente estudado, mas uma corrida com pneus gastos, adversários e clima variável exige estudos próprios.

A linha visual usa o mesmo deslocamento do piloto; para Ferrari padrão, médio pouco gasto e seco, as cores usam a velocidade média de oito voltas limpas de treino, com interpolação e suavização. Para outros carros e condições, continuam usando a estimativa física genérica. É um guia aproximado, não garantia de aderência ou de volta ideal.

- Referência anterior: `node ferramentas/calibrar-monaco.js`.
- Protótipo: `node ferramentas/calibrar-monaco.js --calibrado`.
- Busca reproduzível: `node ferramentas/calibrar-monaco.js --buscar` e `node ferramentas/calibrar-monaco.js --buscar-grampo`.
- Gerar a referência da linha após avaliação: `node ferramentas/calibrar-monaco.js --gerar` e reiniciar o servidor.
- Testes focados: `node --test tests/corrida-calibracao-monaco.test.js`.

O circuito e os arquivos físicos/do controlador são identificados por assinatura; mudanças neles desativam o protótipo e a referência de velocidade até serem reavaliados e gerados novamente.
