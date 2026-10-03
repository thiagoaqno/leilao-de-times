# Mudanças — Batalha, Corrida e CS (parte 2)

Continua o PR da Pelada (#23). Este PR foi aberto em cima daquela branch.

## Batalha: 4 arenas novas
- Na sala (organizador) e no treino (tela inicial) dá para escolher a arena: **Praça da Fonte** (a de antes),
  **Rosquinha**, **Forte de Blocos**, **Dois Andares** e **Arranha-céu**.
- As quatro novas são inspiradas nas arenas de batalha do Mario Kart 64. Tirei a planta (vista de cima) dos
  modelos que você mandou e refiz cada uma com as peças do jogo: chão, rampas, blocos e muros.
  **Nenhum arquivo da Nintendo entra no repositório.**
  - **Rosquinha:** anel de pista em volta de um poço de lava, com 4 buracos no anel e uma borda que sobe até o muro redondo.
  - **Forte de Blocos:** quatro fortes (base a 3 m e torre a 6 m), pontes entre as torres, corredores no chão e rampas por fora e por dentro.
  - **Dois Andares:** andar de cima com um vão no meio, térreo com muros e 8 rampas, e duas rampas para sair do vão.
  - **Arranha-céu:** telhado sem muro, com anel por fora, praça no meio e 4 pontes. Lá embaixo fica a cidade.
- **Cair** (buraco, lava, borda do prédio): perde um balão e volta na largada mais perto (ninguém ganha ponto).
  Funciona no treino e online: o servidor detecta a queda e manda a nova posição.
- Os robôs olham o chão à frente: freiam e viram antes de um buraco.
- Arquivos: `public/batalha/regras.js` (arenas, `usarArena`, `VAZIO`, queda e robôs), `public/batalha/jogo.js`
  (arena montada por arena: piso com buracos, lava, prédio, minimapa e escolha na sala e no treino),
  `public/batalha/index.html` e `batalha.js` (servidor: `config.arena` e queda online).

## Corrida: 3 pistas novas
- **Circuito do Luigi** e **Terra do Sorvete**: traçado desenhado por cima da planta dos modelos.
- **Estrada Arco-íris**: o traçado e a altura de cada ponto foram tirados do modelo, seguindo o meio da pista. Tem o
  laço e 4 cruzamentos (viadutos em alturas diferentes). Fica no espaço, com estrelas, asfalto arco-íris e sem chão em volta.
- Temas novos: neve e pinheiros no Sorvete, grama e zebra amarela/roxa no Luigi.
- Arquivos: `public/corrida/pistas.js`, `public/corrida/pista.js`, `public/corrida/cena.js`.

## CS (Tiro)
- 14 coberturas novas de cada lado (espelhadas, 28 no total) nas três rotas e na saída da base: caixas, caixas
  empilhadas e muretas de concreto. Nenhuma bloqueia largada nem alvo do treino.
- Arquivo: `public/tiro/arena.js`.

## Também
- README atualizado (sem Strikers; controles novos da Pelada, arenas e pistas novas).

## Testes
- `npm test`: 27 passaram.
- Simulação com 8 robôs por 1 minuto em cada arena: todos pegam caixas e estouram balões. No Arranha-céu ainda
  caem às vezes, como no original.
- Conferido no navegador: as 5 arenas da Batalha e as 3 pistas novas da Corrida abrem e são desenhadas.
