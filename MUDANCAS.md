# Corrida da Galera: pista de Barcelona (Circuit de Barcelona-Catalunya)

A segunda pista da temporada de F1 feita com o kit de pista (depois de Mônaco). Aparece no menu como **Barcelona**. A física é a mesma de sempre; é traçado, cenário e som.

**O traçado** (`pistas.js`, id `barcelona`): desenhado em cima da linha central real do circuito (layout atual de 14 curvas, sem a chicane do fim) e ajustado em 27 vértices: a reta dos boxes descendo até a Elf (1) e a Renault (2), a curva 3 longa à direita, a Repsol (4) e a Seat (5) em grampo, a Würth, as curvas 7-8 subindo, a Campsa (9) cega no alto, a reta de trás, a La Caixa (10), a 11, a Banc de Sabadell (12), as 13 e 14 e a reta final. Autódromo de verdade: largo (130), sem muro (`walls: false`) e com relevo (`hills`) que sobe da Elf até o alto da Campsa e desce depois da La Caixa. Volta de uns 13,9 mil, parecida com as outras.

**O cenário** (`gps/barcelona.js`, uma linha em `gps/index.js`):
- chão: faixa de asfalto de escape, zebras vermelhas e brancas nas curvas, linhas do safety car, grid numerado, remendos e **brita do lado de fora das curvas** (peça nova do kit);
- tribuna vermelha e amarela na reta dos boxes e arquibancada azul por fora da curva 1 (peça nova do kit: `arquibancadas`, com o som da torcida);
- prédio dos boxes com garagens, vidros, painéis de patrocinadores e a torre de controle;
- cerca, painéis (Repsol, Pirelli, la Caixa, Sabadell, Rolex...), mastros com a bandeira da Espanha, postos de fiscais e placas de 100/50 m;
- passarela da Repsol na reta dos boxes e outra da la Caixa mais adiante;
- a serra de Montserrat ao noroeste, helicóptero da TV, fiscais com a bandeira verde e som de campo (vento e passarinhos), sem gaivotas;
- céu claro da Catalunha (`ceus/barcelona.jpg`, Poly Haven CC0), chão seco de grama amarelada e árvores esparsas.

**No kit:** `kit/arquibancadas.js` (arquibancadas em rampa, com `tr.arquibancadas` e `tr.reservado`), a chave `brita` em `chao`, e as marcas `repsol`, `lacaixa`, `sabadell` e `circuit` em `marcas.js`; tudo na tabela do `kit/README.md`.

**Pequenos ajustes:** o carro de F1 também em Barcelona (`jogo.js`), o céu em `ceu.js`, a ajuda das pistas (`menus.js`), e o teste de robôs (`tests/corrida-robos.test.js`) passou a dar a volta também em Barcelona (fecha o traçado sem sair da pista).

Validação: testes da corrida passaram; conferido no navegador com `#debug` em vários pontos da volta (largada, Elf, curva 3, reta de trás, La Caixa, curva 14, boxes), sem erro no console.
