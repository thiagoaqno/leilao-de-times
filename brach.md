# Corrida: Melbourne 2, o segundo passo (riqueza e fidelidade)

**Depende do #351 (kit 2), que já está no main: este PR já inclui o merge do main.** O primeiro passo (#349) refez o básico; aqui o objetivo é um salto claro de densidade, a partir das fotos de referência (curva lotada com alambrado e grama listrada, reta de largada com a arquibancada de aço e os pórticos azuis, e as aéreas com o lago, o skyline e os telhados azul e vermelho). Só cenário: `pistas.js` (traçado e `hills`), física, robôs, regras, HUD, menus, sala e carreira intocados.

## O que entrou
- **Faixa magenta** da entrada dos boxes (pintura sobre o asfalto do corredor, com o AUSTRALIAN GRAND PRIX em branco; só aparece junto com o corredor, nas regras de F1).
- **Alambrado alto** de aço com a ponta inclinada para a pista e a **mureta contínua de publicidade** (faixas Rolex, Heineken, Pirelli, Aramco, DHL, F1, AWS) nos dois lados, menos no corredor dos boxes (`kit/melbourne/cerca.js`, umas 6 chamadas para a volta toda).
- **Grama listrada** (listras claras e escuras paralelas à pista, seguindo o relevo; `kit/melbourne/grama.js`) e grama mais clara e quente.
- **Reta principal com o kit 2** (`kit/melbourne/complexo.js`): arquibancada longa de aço com cobertura escura em frente aos boxes (`tribunaCoberta` em fila), complexo dos boxes com garagens, faixa de vidro e arquibancadas de **cobertura azul e vermelha** alternadas, e **tendas brancas do paddock** (`tendaPaddock`).
- **Pórticos azuis** "Australia ▼ MELBOURNE ▼ Australia" atravessando a pista, agora altos (`portico` do kit 2, três na reta).
- **Skyline visível da pista** (`kit/melbourne/cidade.js`): ~150 arranha-céus com janelas, Eureka Tower de coroa dourada e faixa vermelha, Rialto, Australia 108. Antes sumia na neblina e atrás das árvores: agora sem neblina do jogo (bruma pintada nos vértices) e o parque deixou de ser uma parede (bosques soltos em moitas, `kit/melbourne/arvores.js`, e as árvores pálidas soltas de longe saíram).
- **Lago** com calçada de saibro, veleiros e fileira de árvores na margem; torcida de camisa laranja e vermelha; arquibancadas das curvas em assentos escuros.
- Mudanças aditivas no kit: `portico({ textura })`, `ambienteGP({ cerca: false })` e uma linha no `kit/README.md`. `LOOK.melbourne.ground` em `cena.js` mais claro.

## Conferido
- No navegador (porta 3364, Playwright com câmera livre): reta com os três pórticos e a faixa magenta, boxes e paddock, curvas 1 e 6, margem do lago e skyline vistos da pista, aérea. Console sem erros nas conferências finais.
- Medido no Node: vista da câmera 173 chamadas e 383 mil triângulos (antes 167 e 356 mil); 375 malhas; conferência de invasão passou em todas as pistas.
- Por pedido, **não rodei a bateria de testes** (`tests/corrida*`).

## Ficou de fora
Telões, ponte de pedestres sobre o lago e roda-gigante do fan zone. Fontes das fotos: as do Thiago; textos sobre as arquibancadas de Albert Park (f1experiences, thef1spectator).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
