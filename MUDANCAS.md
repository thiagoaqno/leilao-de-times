# Carreira: a mesa de botão na partida

## O que muda no jogo

- **Os jogadores viram botões.** Na tela da partida, acima da narração, aparece um campo visto de cima, como no futebol de botão: 11 botões de cada time, nas cores da camisa de cada clube (o visitante troca de cor se for parecida com a do mandante), com o número em cima, o goleiro em amarelo ou verde-água e uma bolinha. O mandante ataca para a direita.
- **Eles andam com os lances do jogo.** Cada lance que o motor já sorteia vira movimento: o gol (o passe do assistente, o botão do artilheiro na área, o chute, o goleiro caindo, o letreiro GOL! e o time pulando), a defesa, a chance perdida (a bola passa ao lado), o pênalti (a bola na marca e o canto escolhido, também na disputa), o contra-ataque, o amarelo e o vermelho (o botão sai e o time joga com 10), a lesão, as substituições, as mudanças de posição e de formação. O nome de quem faz o lance aparece por uns segundos.
- **Entre um lance e outro**, os botões trocam passes de enfeite, com o time todo andando na direção da bola. Isso é só desenho: o resultado do jogo vem do motor, igual a antes.
- **Botão Mesa** na faixa do jogo (liga e desliga; fica guardado no navegador). Respeita o 1×/3×, o Pular e o "menos movimento" do sistema.

## Como

`public/carreira/mesa.js` (`window.Mesa`, SVG, sem dependência) e `mesa.css`. `Mesa.montar` usa `partida.times` (formação e titulares que o motor já devolve; desfaz as trocas já feitas para achar o time do começo) e, sem isso (jogo já acabado ou em grupo), formação do clube com botões sem nome. `partida.js` chama `Mesa.evento(e)` em `mostrarEvento`. As posições vêm de `Taticas.spots`. Teste: `tests/e2e/carreira-mesa.spec.js`.

## Limites desta primeira versão

O motor não guarda posição nem posse de bola, então só os lances importantes são do jogo de verdade; os passes entre eles são enfeite e não são iguais para todo mundo na sala em grupo.
