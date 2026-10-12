# Vila volta a ser só 2D

**Antes:** a Vila abria em 3D por padrão, com botões de câmera, música, 3D/2D e skin, e uma pasta `public/vila3d/` inteira só para isso. O pessoal não curtiu.

**Depois:** a Vila é só o mapa 2D de pixel-art, como antes. Saíram os botões Câmera, Música, 3D/2D e Skin (a skin só aparecia no 3D), a tecla V e o carregamento do three.js na página.

**O que ficou:**
- Futevôlei dentro da Vila Esportiva (funciona igual no 2D).
- Karts e cenário da Kenney na Corrida e na Batalha (não eram da Vila).
- A pasta `public/vila3d/musica/` e o endereço `/api/musicas-vila3d`, sem tocar em lugar nenhum por enquanto.

**O que saiu:** `public/vila3d/` (menos a pasta de música), com o céu, a cidade reduzida e os prédios KayKit, e `ferramentas/vila3d-dados.js`. O teste da Vila e do Ginásio voltou a olhar só o desenho 2D.

**Como:** o resto do `public/index.html` já desenhava o 2D por baixo; só tirei a camada 3D e conferi no navegador que a Vila abre sem erros.
