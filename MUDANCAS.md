# Carreira: a música começa sozinha

## O que muda no jogo

A música da Carreira agora liga sozinha ao abrir a página. Os navegadores (e o celular) não deixam tocar som antes de a pessoa tocar ou clicar na tela: se barrarem, a música começa no primeiro clique, toque ou tecla. Quem pausar no botão ♪ Música não é incomodado de novo: a escolha fica guardada no navegador. Antes, só voltava a tocar quem tinha deixado ligada.

## Como

Só `public/carreira/musica.js`: o padrão de `tocando` passou de desligado para ligado (`salvo.tocando !== false`).
