# Carreira: o Guia ("como jogar") na barra de cima

## O que muda no jogo

Antes, o "Como jogar" da Sede só escolhia o modo da partida, e não havia explicação do resto da carreira. Quem chegava não sabia o que fazer entre as rodadas.

Agora a barra de cima tem o botão **Guia** (só o "?" no celular), em qualquer tela. Ele abre uma janela por cima, sem mexer em nada da tela de trás, com um assunto por aba: O básico, A partida, Elenco e tática, Mercado, Temporada e copas, Clube e Em grupo. A janela abre no assunto da tela em que você está (no Mercado, abre em Mercado) e fecha com "Entendi", fora dela ou com Esc.

## Como

- `public/carreira/guia.js` é o módulo novo (os textos ficam nele, um por assunto).
- `index.html` ganha o botão `#btnGuia` na barra e o script; `hub.css` o estilo (abas que rolam de lado no celular).
- Teste: `tests/e2e/carreira-guia.spec.js` (abre, troca de assunto, cabe na tela sem rolagem de lado, no PC e no celular).
