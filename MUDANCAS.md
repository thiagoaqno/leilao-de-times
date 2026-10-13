# Gatinhos Explosivos: visual novo e animações

**Antes:** o jogo funcionava, mas com visual de protótipo: jogadores numa fila, cartas só com emoji e nome, nada se mexia e não tinha som.

**Depois:** noite roxa com patinhas no fundo e uma mesa de feltro com borda de neon laranja, com cada jogador sentado em volta (você sempre embaixo, a vez brilha e o alvo de um Favor ou roubo pulsa). As cartas ficaram ilustradas, com gradiente por tipo, cantos e faixa de nome; o Gatinho Explosivo é preto com brilho vermelho e aparece grande na mesa enquanto alguém desarma. A mão se ajusta ao espaço (lado a lado, sobreposta ou em duas linhas no celular).

**Animações e sons (feitos à mão, sem biblioteca nova):** cartas voam do monte para cada jogador ao dar as cartas e ao comprar, da mão para o descarte ao jogar, entre os jogadores em Favor e roubo, e o gatinho volta ao monte. Avisos grandes para Nem Pensar, Cancelada, Pular, Ataque (com tremida), Embaralhar, Desarmado e vitória (com confete). Explosão com clarão, fagulhas e tremida. A jogada pendente brilha no descarte e fica riscada se estiver cancelada, e o relógio do Nem Pensar tem cor própria. Sons sintetizados com botão de mudo, que fica guardado. Quem pede "menos movimento" no sistema fica sem voos, tremidas e confete.

**Como:** `public/kittens/estilo.css` e `public/kittens/efeitos.js` novos; `index.html` ganhou a mesa em volta e o `rodarFx`, que anima só os eventos `fx` novos (ao entrar ou voltar para a sala não repete o passado). O servidor e as regras não mudaram.
