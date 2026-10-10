# Carreira: as notícias da Sede inteiras na tela, sem rolar

Antes: na Sede, cada notícia era mais alta que a caixa. A legenda e os comentários ficavam embaixo da arte e só apareciam rolando, mas a rolagem pulava direto para a próxima notícia, então o texto quase nunca dava para ler.

Depois: cada notícia aparece inteira na caixa, com a arte, as curtidas, a legenda e os dois primeiros comentários de uma vez, sem precisar rolar. A troca de notícia virou explícita: setas de anterior e próxima, os pontinhos (que agora são clicáveis), as teclas ← → com a caixa em foco e o arrastar para o lado no celular. A roda do mouse não troca mais de notícia. Continua passando sozinha a cada 10 segundos, segurando quando a pessoa mexe; com "menos movimento" no sistema, só troca na mão.

Como: `feedNaSede` (`public/carreira/feed.js`) empilha os posts no mesmo lugar e mostra só o da vez (`.post.atual`, os outros ficam `inert`); a arte encolhe para caber (`flex` com `object-fit: contain`), a legenda corta em 4 linhas e os comentários em 2. A tela "Ver todas" não mudou. No celular, os pontinhos viram "2 de 7".

Conferido: o E2E da carreira (`tests/e2e/carreira.spec.js`) agora confere que a legenda cabe na caixa e que a seta troca de notícia, e fotos da Sede no PC (1440x900) e no celular (390x844).
