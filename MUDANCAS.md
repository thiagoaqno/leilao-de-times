Antes: a Vila 3D só tinha a câmera de cima, o céu era uma cor lisa e a música ambiente (só no protótipo) tocava a 30%.

Depois: dá para trocar a câmera entre terceira pessoa (de cima, como antes) e primeira pessoa (nos olhos do boneco, que some da tela) pelo botão 👁️ Câmera ou pela tecla V; a escolha fica guardada. Arrastar o mouse ou o dedo inclina a visão: na terceira pessoa para cima e para baixo (dá para ver o céu), na primeira também gira a cabeça (ela volta sozinha ao andar). O céu agora é o SD_Sky de ritsuka (CC BY 4.0, montanhas e nuvens pintadas; crédito em `public/vila3d/ceu/LEIAME.md`), com o degradê feito por código de reserva. A música ambiente passou a tocar na Vila de verdade, a 5% do volume, com o botão 🔊 Música para silenciar.

Como: `public/vila3d/mundo.js` ganhou o céu (o modelo `public/vila3d/ceu/sd_sky_230315a.glb`, com uma cúpula de degradê por código de reserva), os dois modos da câmera e o arrastar para olhar (`criar` devolve `camera()`, `modo()` e `arrastou()`; o toque no mapa agora vale no `click`, só se não arrastou). A música foi para `public/vila3d/ambiente.js` (`VOLUME = 0.05`), usada pela Vila; o protótipo `/vila3d/` também baixou para 5%.

A cidade modular (`neighbourhood_city_modular_lowpoly.glb`, 70 MB) ainda não entrou: pesa demais para o repositório do jeito que está.
