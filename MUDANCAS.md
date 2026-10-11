# Vila: música com botão de volume na header

## O que muda no jogo

Na Vila aparece um botão 🎵 na header. Ele abre um mini-tocador com tocar/pausar, música anterior e próxima, nome da faixa e volume. A música segue em ordem e recomeça a lista no fim. O volume e se estava ligada ficam guardados no navegador. O botão só aparece se houver músicas.

## Como adicionar músicas

Ponha os arquivos (`.mp3`, `.ogg`, `.m4a`, `.wav`) em `public/musica/` e faça o deploy. A lista sai da pasta sozinha, em ordem alfabética (use `01 - nome.mp3` para ordenar; o número não aparece). Ver `public/musica/LEIAME.md`. Com `MUSICA_DIR` a pasta pode ser outra (um volume do Fly, por exemplo).

## Decisões

- Nada de vídeo do YouTube: é áudio direto, e o arquivo só baixa quando toca (`preload="none"`), então quem não liga não gasta dados. Um mp3 a 128 kbps pesa uns 1 MB por minuto.
- Cada pessoa ouve a sua música, sem sincronizar.
- Celular e navegadores bloqueiam som antes de um toque: quem deixou ligada volta a ouvir no primeiro toque na página.

## Como

`GET /api/musicas` (`server.js`) lista a pasta; `public/vila/musica.js` faz o tocador; o botão e o painel ficam em `public/index.html`. Teste: `tests/musica.test.js`.
