Antes: a Arena de Futevôlei ficava na areia da praia de Santos, fora da vila, muito longe de tudo.

Depois: a Arena de Futevôlei fica dentro da Vila, na Vila Esportiva, no lote que estava vazio. O terreno "em breve" desse lote deixou de existir.

Como: a entrada `futevolei` de `GAMES` em `public/index.html` mudou para `x: 21, y: 39, w: 6, h: 4, doors: [24], bairro: "esportes"` e saiu de `TERRENOS`; `public/vila3d/dados.js` foi regenerado com `node ferramentas/vila3d-dados.js`. O `vila.js` só guarda o id, então não mudou.
