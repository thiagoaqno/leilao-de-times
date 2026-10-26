# Corrida: regras de F1, parte 1, os pneus

O PR 1 do plano `planos/temporada-f1.md`. A sala da Corrida ganha a opção **Regras: Corrida da Galera / Fórmula 1**. Com as regras de hoje, nada muda.

**Os pneus** (`public/corrida/f1-regras.js`, o mesmo arquivo no servidor e no navegador)
- Três compostos com as cores da Pirelli: **macio** (o que mais segura, dura 35% da corrida até o penhasco), **médio** (60%) e **duro** (90%, segura menos).
- O desgaste anda pela **fração da corrida**, não por volta: 3 ou 5 voltas gastam a mesma parte do pneu, então a estratégia vale em qualquer tamanho de corrida. Escorregar gasta mais.
- Até o penhasco o pneu perde pouco (6%); depois dele, despenca (até 26% a menos de aderência).
- Na largada o pneu está **frio** (8% a menos) e esquenta andando; o macio esquenta mais rápido.
- Na física (`fisica.js`), a aderência do pneu multiplica o `grip` e o `kin` do carro: com o pneu gasto, o carro escorrega mais nas curvas.

**Na sala**
- Com "Fórmula 1", as caixas e a ajuda do pelotão saem (o servidor desliga as duas). O vácuo continua.
- Cada piloto escolhe o **pneu da largada** (macio, médio ou duro) nas Regras. O plano deixava a escolha para o PR 2, com o box, mas sem box um pneu só não aguentaria a corrida, por isso ela veio já agora.
- Os **robôs** usam o mesmo pneu: gasta pela distância, escorrega quando a curva pede mais que o grip, e nas curvas eles andam com a raiz da aderência (com o pneu gasto ou frio, freiam antes).

**No HUD**
- O anel do pneu ao lado do velocímetro: a cor do composto, esvaziando com o desgaste, vermelho depois do penhasco e com o miolo azul enquanto está frio; no meio, quanto ainda resta.
- O aviso "PNEU NO FIM: segura nas curvas" depois do penhasco.
- "Como jogar" explica os pneus.

**Testes** (`tests/corrida-f1-pneus.test.js`, 6 testes)
- O macio é o mais rápido no começo e chega ao penhasco antes do médio e do duro; depois dele, fica atrás do duro.
- 3 ou 8 voltas gastam a mesma fração; escorregar gasta mais; a aderência fica sempre entre 0,7 e 1,1.
- Os robôs com as regras de F1 gastam o pneu e fecham a volta; sem elas, não têm pneu.
- A sala: "f1" desliga caixas e equilíbrio, o pneu inválido e a troca no meio da corrida são recusados.

**Conferido**
- `npm test`: 553 de 554 passaram; o que falhou foi um teste da Cozinha (`servidor: abre a cozinha...`), por tempo, com a máquina carregada; rodado sozinho, `tests/cozinha.test.js` passa inteiro (24 de 24). Os 6 testes novos e os de hoje da Corrida passam.
- No navegador do app, em Interlagos com 1 volta, macio e 3 robôs: as Regras sem caixas e sem equilíbrio, com a escolha do pneu (`planos/imagens/corrida-pneus-regras.jpg`); o pneu frio na largada (`corrida-pneus-largada.jpg`); o macio em 28% com 36% da corrida, já vermelho (`corrida-pneus-desgaste.jpg`); e em 0%, com o aviso e a fumaça do carro escorregando (`corrida-pneus-fim.jpg`).

Não mexe em `pista.js`, `vida.js` nem `sons.js` (o #303 mexe neles).
