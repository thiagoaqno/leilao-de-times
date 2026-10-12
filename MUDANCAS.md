Antes: a Vila 3D só tinha a câmera de cima, o céu era uma cor lisa e a música ambiente (só no protótipo) tocava a 30%.

Depois: dá para trocar a câmera entre terceira pessoa (de cima, como antes) e primeira pessoa (nos olhos do boneco, que some da tela) pelo botão 👁️ Câmera ou pela tecla V; a escolha fica guardada. Arrastar o mouse ou o dedo inclina a visão: na terceira pessoa para cima e para baixo (dá para ver o céu), na primeira também gira a cabeça (ela volta sozinha ao andar). O céu agora tem degradê, sol e nuvens que andam devagar. A música ambiente passou a tocar na Vila de verdade, a 5% do volume, com o botão 🔊 Música para silenciar.

Como: `public/vila3d/mundo.js` ganhou a cúpula do céu (shader, sem imagem), os dois modos da câmera e o arrastar para olhar (`criar` devolve `camera()`, `modo()` e `arrastou()`; o toque no mapa agora vale no `click`, só se não arrastou). A música foi para `public/vila3d/ambiente.js` (`VOLUME = 0.05`), usada pela Vila; o protótipo `/vila3d/` também baixou para 5%.

Os arquivos novos da pasta "Skybox e Cidade" não entraram: o .rar traz só o programa Cubemap Splitter (nenhuma imagem de skybox), e a cidade modular (`neighbourhood_city_modular_lowpoly.glb`, 70 MB) tem licença Sketchfab Standard, que não permite redistribuir o modelo.
