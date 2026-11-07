# O jogo deixa de limitar o FPS

A Corrida e o Drag pulavam um quadro sempre que o anterior tinha menos de 11 ms: 120 Hz virava 60 FPS, 144 Hz virava 72, 240 Hz virava 80 e 360 Hz virava 90. Agora desenham um quadro por atualização da tela, até o limite do monitor. Nenhum limite novo foi posto, então 360 Hz funciona em monitor de 360 Hz.

A física não muda: continua em passos fixos de 1/120 s. O esterçar visual das rodas era suavizado por quadro e passou a ser por tempo, com a mesma sensação da tela de 144 Hz.

## O que isso não resolve

- O FPS ainda oscila onde o cenário muda de repente. Em Mônaco, os objetos desenhados vão de 93 a 368 entre os pontos 0,42 e 0,46 da volta. Sem o limite, essa oscilação pode ficar mais visível.
- A placa de vídeo trabalha mais em telas rápidas, então o computador pode esquentar mais. O limite tinha sido posto por isso.
- A diferença entre jogar local e no servidor não foi explicada aqui.

## Verificação

Só `node --check` nos três arquivos. O FPS real não foi medido, porque o navegador de teste estava escondido e sem desenhar quadros. A suíte fica com o CI.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
