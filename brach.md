# Mônaco: alinhamento e frenagem nas chicanes

A linha de F1 em Mônaco agora é otimizada dentro da mesma faixa lateral que o volante consegue mirar. Nas curvas 10–11 (Nouvelle Chicane) e 15–16 (Piscine), o robô olha mais adiante e pode aliviar o acelerador antes de usar o freio. Com tráfego, bandeira, chuva, pneu muito gasto, dano ou instabilidade, conserva a pilotagem normal. Isso não elimina colisões entre carros.

## Verificação

- `node --test tests/corrida-robos-curvas.test.js`: 5 passaram, incluindo a volta individual nas duas chicanes.
- `node --test --test-name-pattern="Mônaco molhado" tests/corrida-monaco-chuva.test.js`: passou. O outro teste desse arquivo, de inclinação do grampo, já falhava na base do PR #441.
- Mônaco seco, uma volta lançada de um robô difícil: velocidade média na Nouvelle 247,8 → 271,6 e na Piscine 266,8 → 292,3 unidades/s; freio em 52,8% → 50,0% e 43,8% → 34,5% das amostras, respectivamente. Variação média do volante por amostra: 0,0421 → 0,0369 e 0,0391 → 0,0350. As medições são uma simulação, não uma reprodução da corrida relatada.
- Mônaco seco, 20 bots, três voltas, duas sementes: 6 → 4 e 8 → 2 eventos de batida; zero batidas de muro e todos terminaram nas duas versões. Um contato pode gerar evento para cada carro. Jeddah, 20 bots na segunda semente: resultado idêntico antes e depois, com 2 eventos e sem abandonos.
- A alteração é específica de Mônaco. O `npm test` completo não foi validado; a base já apresentava 23 falhas no CI do PR #441.
