Antes: a Vila abria sempre em 3D; o mapa 2D só aparecia por quem sabia usar `?2d=1` no endereço.

Depois: a barra de cima tem o botão 🗺️ 2D / 🧊 3D que troca a Vila entre o 3D e o mapa 2D de cima. A escolha fica guardada no navegador (abre do mesmo jeito da próxima vez). O botão Câmera (primeira/terceira pessoa) só aparece no 3D.

Como: em `public/index.html`, `modoVila` lê `localStorage["vila:modo"]` (`?2d=1` e `?3d=1` ainda valem só naquela visita); o botão `#bModo` grava a outra opção e recarrega a página.
