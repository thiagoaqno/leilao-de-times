# Mônaco mais parecido com o de verdade

Primeiro passo para ter todas as pistas da temporada com cara de GP: Mônaco ganha os detalhes das fotos da corrida real, num módulo novo, `public/corrida/monaco-detalhes.js`. Tudo é cenário: a física e as colisões não mudam.

**No chão**
- As zebras vermelhas e brancas saíram da volta inteira e ficam só nas curvas: do lado de dentro, em volta do ápice, e do lado de fora, na saída das curvas fechadas. Na Nouvelle Chicane e na Piscine, as de dentro são amarelas e mais altas, como as que o circuito pôs para ninguém cortar caminho.
- No resto, a sarjeta de concreto com a junta escura e a canaleta junto do guard-rail.
- Faixas de pedestre nas retas da cidade (Beau Rivage, Cassino, descida para Mirabeau, saída do grampo, Portier, cais e Rascasse).
- A linha da rua tracejada e gasta na subida da Beau Rivage, em Portier, dentro do túnel e no cais.
- As linhas do safety car (SC 2 depois da Sainte Dévote e SC 1 antes da Anthony Noghès), com o nome pintado.
- O grid pintado: o "colchete" de cada posição e o número, de 1 a 8.
- Remendos de asfalto e bueiros espalhados pela pista. As faíscas do assoalho agora só saem onde existe zebra.

**Na beira e no horizonte**
- O guard-rail ganha painéis de 6 m: listras vermelhas e brancas e os nomes MONACO, GRAND PRIX, MONTE-CARLO e GALERA, legíveis dos dois lados da pista.
- Os prédios ganham fachadas com sacadas de grade, venezianas, toldos listrados, cornija, telhado de telha ou terraço com casa de máquinas. As janelas têm sempre o mesmo tamanho, qualquer que seja o prédio.
- Três passarelas com faixas do GP por cima da pista (na reta dos boxes, na Beau Rivage e depois da Rascasse), no lugar das bandeirolas coloridas.
- A capela de Sainte Dévote do lado de fora da primeira curva.
- 34 postes de rua verde-escuros atrás do guard-rail.
- A montanha de pedra (a Tête de Chien) atrás da cidade, ao norte.

As peças repetidas usam InstancedMesh ou uma malha só por material, sem luzes novas. As outras pistas continuam iguais.

Validação: 29 testes da corrida passaram; `git diff --check` sem erros. Conferido no navegador do app em toda a volta (grid, Sainte Dévote, Beau Rivage, Cassino, grampo, túnel, chicane, Piscine e Rascasse).
