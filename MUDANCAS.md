# A Vila agora é em 3D

Antes: a Vila era um mapa pixel-art visto de cima, e os amigos apareciam como bonequinhos de 12 pixels.

Depois: a Vila (`/`) é em 3D, com as peças do KayKit (CC0): prédios, ruas, Praça com chafariz, pista, terrenos, árvores e a cidade em volta. Você anda com a skin que escolheu (as mesmas da Pelada: botão 🎭 Skin; o 👕 Roupa continua trocando a cor da camisa) e os amigos aparecem com a skin deles e o nome em cima. O telão mostra o top 5 da estante, os 6 treinadores estão nas ruas, os 4 ginásios fora da cerca, os carros e as rodovias seguem como antes, e um facho de luz marca o estádio escolhido no menu. O interior dos estádios continua no 2D por enquanto, e `/?2d=1` abre o mapa antigo.

Como: a lógica não mudou (andar em casas, entrar nos jogos, amigos, desafios, carro). Só o desenho é novo: `public/vila3d/mundo.js` lê os mesmos dados de `public/index.html` (`ground`, `GAMES`, `TELAO`...) e desenha tudo em Three.js, com a câmera sempre olhando para o norte para o teclado e o toque funcionarem igual; `frame()` chama `V3.render` fora dos estádios. O chão do mapa inteiro é uma textura só; os prédios são grades de módulos esticadas para a planta; o telão reaproveita o `drawTelao` como textura. A skin viaja no `hello` e no `look` (`vila.js`, `cleanSkin`). Os modelos estão em `public/vila3d/kaykit/` com a licença. Música ambiente: `public/vila3d/musica/`.

A Arena de Futevôlei saiu da praia de Santos (longe da vila) e foi para a Vila Esportiva, no lote que estava vazio (x 21, y 39); o terreno deixou de existir.
