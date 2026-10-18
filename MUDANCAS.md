# Tênis de Mesa da Galera — nova recriação

## O que muda

- O prédio de tênis de mesa da Vila abre uma nova partida 3D contra a IA, com amistoso, torneio e mundial, escolha de país e três dificuldades. A versão antiga continua acessível em `/pingpong/`.
- A física usa os parâmetros recuperados do build Unity do jogo de referência: escala da mesa, tamanho da bola, gravidade, passo fixo de 0,02 s, tempo 2×, restituição da mesa (0,6), restituição da rede (0,05) e atrito dinâmico (0,01).
- Saque de dois quiques, colisão com rede e mesa, bolas fora, controle da raquete pelo cursor ou toque, direção e efeito da devolução, previsão da trajetória pela IA e pontuação de 11 com vantagem de dois pontos.
- A fórmula exata da tacada não pôde ser recuperada do WebAssembly compilado; mira, efeito e decisões da IA são uma reconstrução ajustada para ser jogável.

## Verificação

- `node --test tests/table-tennis-pro.test.js`
- `npx playwright test tests/e2e/table-tennis-pro.spec.js`
- Conferência visual em 1280 × 720 e 390 × 844, incluindo saque, quique, ponto e pausa.
