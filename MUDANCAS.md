# Vila 3D: protótipo com as peças do KayKit

Antes: a Vila só existia como mapinha pixel-art visto de cima.

Depois: existe uma página nova, `/vila3d/`, com a mesma Vila em 3D: os 23 prédios nos mesmos lugares (cada um com o nome em cima e a cor do telhado do jogo), as ruas, a Praça com o chafariz e o telão, a pista da Vila Esportiva, os terrenos vazios, postes, bancos, árvores, cerca viva em volta e carros rodando. Dá para girar, dar zoom e tocar num prédio para ver o nome e o botão Entrar. A Vila de verdade (`/`) não mudou: é só um protótipo para ver se o estilo agrada.

Como: as peças são do KayKit City Builder Bits (CC0, a licença vai junto em `public/vila3d/kaykit/LICENSE.txt`). Cada prédio de jogo é uma grade de módulos de 2x2 casas esticada para caber na planta, com um telhado na cor do jogo. As ruas são montadas por célula (reta, T ou cruzamento, vendo os vizinhos). As coordenadas saem de `public/index.html` pelo script `ferramentas/vila3d-dados.js`, que grava `public/vila3d/dados.js` (rode de novo se mudar a Vila). Código em `public/vila3d/jogo.js`. Ficou de fora: andar com o personagem, os estádios, o mundo em volta da cerca e os ginásios.
