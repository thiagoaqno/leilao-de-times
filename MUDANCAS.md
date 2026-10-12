# Carreira: desgaste suave e táticas sem "de graça"

**Antes:** quem jogava toda semana perdia cerca de 0,7 de over por jogo (5 a 6 de over em 8 jogos), por causa da energia e ainda da sequência de jogos. Linha baixa e mentalidade ofensiva eram de graça: a linha baixa melhorava a defesa sem custo e a mentalidade +2 dava mais gols do que cedia.

**Depois:** o titular perde 0,25 de over por jogo até os 29 anos e 0,40 a partir dos 30 (o desgaste do jogo e o departamento médico ainda mexem um pouco). A sequência de jogos não tira mais over por conta própria. Linha e mentalidade ficaram equilibradas (nenhuma é melhor sozinha).

**Como:** `aplicarFadiga` (`carreira.js`) deixa de somar +16 de recuperação e aplica a perda por idade (10 de energia = 1 de over). `penalidadeSequencia` agora é 0. No motor, `LINHA_CEDE`/`LINHA_CONV` e `MENTAL` ficaram simétricos em `AJUSTE`.

**Análise de meta (São Paulo, ~1.500 jogos por configuração, pontos por jogo, base 1,47):**
- Formações melhores: 4-4-2 losango 1,56, 3-2-4-1 1,54, 5-3-2 V 1,54, 5-3-2 1,51. Piores: 3-4-3 (1,37) e 5-4-1 (1,42). O padrão se repete com Palmeiras e Corinthians. A causa é a média ponderada de `strength` (`escalacao.js`, compartilhada com o Leilão), por isso não mexi.
- Estilos: catenaccio, funcional e contra 1,57; tikitaka, gegenpressing e posicional 1,50.
- Antes: linha 0 = 1,54 e mentalidade +2 = 1,57. A combinação 4-4-2 L + funcional + mentalidade 2 + linha 0 chegava a 1,77. Depois do ajuste a mesma combinação dá cerca de 1,65.
