# O jogo deixa de limitar o FPS e para de desenhar o que não se vê

## FPS sem limite

A Corrida e o Drag pulavam um quadro sempre que o anterior tinha menos de 11 ms: 120 Hz virava 60 FPS, 144 Hz virava 72, 240 Hz virava 80 e 360 Hz virava 90. Agora desenham um quadro por atualização da tela, até o limite do monitor.

A física não muda: continua em passos fixos de 1/120 s. O esterçar visual das rodas era suavizado por quadro e passou a ser por tempo, com a sensação de antes em 144 Hz.

## O que não se vê não é desenhado

O three só descarta o que está fora do enquadramento. Em Mônaco, chegavam a ser 690 objetos desenhados para 17 que apareciam.

`recorte.js` monta um mapa durante a abertura de cada pista (um desenho pequeno por quadro, 404 em Mônaco, cerca de 5 s no total): o que dá para ver de cada trecho, para os quatro lados. Vale para o cenário, as árvores e os carros, e carro escondido também não é animado nem repetido no desenho da vinheta.

Para nada sumir: o que está perto fica sempre ligado, cada trecho soma os vizinhos, peça transparente nunca é cortada, e aérea, TV ou câmera longe da pista mostram tudo.

| Pista | Chamadas (média) | Pico | Triângulos (média) | Pixels diferentes (média / pior) |
|---|---|---|---|---|
| Mônaco | 397 → 232 | 905 → 732 | 688 mil → 450 mil | 0,005% / 0,14% |
| Suzuka | 417 → 223 | 924 → 643 | 723 mil → 443 mil | 0,004% / 0,03% |
| Spa | 343 → 165 | 875 → 689 | 638 mil → 384 mil | 0,001% / 0,02% |

## O que isso não resolve

- A placa de vídeo trabalha mais em telas rápidas por causa do FPS sem limite. Esse era o motivo do limite antigo.
- O pico continua alto com muitos carros à vista.
- O jogo ainda baixa o código de todas as pistas. Isso pesa no carregamento, não no FPS.
- A diferença entre jogar local e no servidor não foi explicada.

## Verificação

- Corrida inteira no laço real do jogo, em Mônaco, Suzuka e Spa, sem erro no console.
- Tabela: 60 a 80 posições de câmera, com 21 carros espalhados pela volta, comparando a imagem com e sem o corte. O retrovisor e os outros modos de câmera não foram comparados.
- **O FPS real não foi medido:** o navegador de teste estava escondido, então os números são de chamadas e triângulos, não de quadros por segundo. Ninguém jogou a versão final.
- Só `node --check` no código; a suíte fica com o CI.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
