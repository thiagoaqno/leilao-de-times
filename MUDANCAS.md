# Carreira: posições finas, 13 formações, estilos de jogo e o que a tática muda em números

## Posições de verdade
- Antes, lateral e zagueiro eram o mesmo grupo (e ponta e centroavante também): improvisar dentro do grupo não custava nada. Agora cada vaga
  tem a sua posição (lateral-esquerdo, lateral-direito, zagueiro, volante, meio, meia, ponta-esquerda, ponta-direita, centroavante) e cada
  jogador rende pelo **encaixe** da posição dele naquela vaga: perde 3,5% por linha de distância e 4% por lado trocado, e lateral na zaga
  (ou o contrário) perde mais 6%. Goleiro fora do gol rende 50%.
- Vale na força do time e também **nos lances decisivos** (os atributos de quem está improvisado contam menos) e no sorteio de quem chuta e passa.
  Na prancheta, o improvisado fica com borda tracejada e a nota nova (ex.: 82 → 76).

## 13 formações
- As seis antigas continuam (4-3-3, 4-4-2, 3-5-2, 4-2-3-1, 3-4-3, 5-3-2). Novas: 4-4-2 losango (4-4-2 L), 4-1-4-1, 4-2-4, 3-2-4-1, 3-6-1, 5-4-1 e 2-3-5.
  Cada uma tem a explicação em uma frase e as vagas desenhadas no campinho nos lugares certos.

## 7 estilos de jogo
- Equilibrado, **Tiki-taka**, **Gegenpressing**, **Jogo de posição**, **Futebol funcional**, **Retranca (catenaccio)** e **Contra-ataque direto**.
  Cada um dá um bônus (mais lances criados, menos lances do rival, mais conversão) e cobra um custo (cansaço, faltas, menos lances ou mais lances
  do rival), e muda as chances das opções dos lances (tocar, driblar, cruzar, contra-ataque...).
- **O bônus vale pelo encaixe do elenco**: cada estilo pede um perfil (passe dos meias, ritmo e físico, drible e passe, defesa dos defensores,
  finalização dos atacantes...). A tela mostra o encaixe (%) e o atributo médio do seu time; sem o perfil, quase não há bônus e o custo continua.
- O computador escolhe sozinho o estilo que mais combina com o elenco dele (ou joga equilibrado, se nenhum combina).

## O que a tática muda, em números
- Na prancheta (Elenco e tática) e na parada do jogo, o painel **"O que a tática muda"** mostra seis contas: lances que você cria, lances que o rival
  cria, sua conversão, a do rival, cansaço e faltas. Verde ajuda, vermelho cobra. Cada botão de mentalidade, pressão e linha mostra, ao passar o mouse,
  o que muda em relação ao que está escolhido agora. Exemplos: ofensiva +12% de lances criados e +8% para o rival; pressão alta cansa mais e segura o rival.

## Cartinhas do campinho
- As cartas dos jogadores no campinho estavam pretas: agora têm a cor da faixa (bronze, prata, ouro e elite), como as figurinhas.

## Conferido
- `tests/carreira-taticas.test.js` (no `npm test`): o encaixe (lateral na zaga, ponta de centroavante, lado trocado, goleiro), as 13 formações escalando e jogando,
  as contas dos estilos e do neutro, o encaixe decidindo o bônus, tiki-taka criando mais lances e retranca cedendo menos em 600 jogos, e o servidor guardando o estilo.
- `tests/carreira-motor.test.js` continua passando: a calibragem (10 mil jogos) não mudou. Na tela: `planos/imagens/carreira-taticas-*.jpg`.

## Ajustes depois do primeiro teste
- **Dá para ver se é bom ou ruim:** cada conta do painel "O que a tática muda" agora diz em palavras o que muda ("Rival cria menos lances") e, embaixo,
  em pequeno, a porcentagem em verde ("−5% · a seu favor") ou vermelho ("+5% · contra você"). Os textos de cada botão também dizem a favor ou contra.
- **Estilos balanceados e adequados ao elenco:** medi os 6 estilos (pontos por jogo contra o equilibrado, com o mesmo elenco). Com o perfil ideal ganham de +0,10 a +0,14;
  com um elenco médio, de +0,04 a +0,08; sem o perfil, perdem. Cada botão de estilo mostra o **encaixe do seu elenco** (%), para escolher o que combina.
- **Variações da formação:** o 4-3-3 tem 1 volante + 2 meio-campistas, 1 volante + 2 meias, 2 volantes + 1 meia, 3 meio-campistas e falso 9; o 4-2-3-1, 4-4-2, 3-5-2, 3-4-3 e 5-3-2
  também têm variações (dupla de meio, 3 meias, losango, linha de 4 com volante...). A prancheta escolhe o esquema em cima e a variação embaixo.
- **Quem é só MC:** rende de 96,5% a 100% em qualquer vaga do meio (volante, meio ou meia), perde mais na zaga e agora conta nos lances (passe e defesa) dos dois lados.
  Antes, os meio-campistas (a maioria) ficavam de fora das contas dos lances.
- **Cansaço de verdade:** a energia agora vale a temporada inteira. Cada jogo gasta (mais com pressão alta e estilos que cansam), entre as rodadas todos recuperam 16 pontos
  e o banco volta a 100 em poucas rodadas. Quem repete os mesmos 11 vai caindo (a nota vale até 16% menos e o risco de lesão sobe). As barras aparecem no campinho e no banco,
  a média de energia dos titulares aparece embaixo e as férias (virada de temporada) devolvem tudo a 100. A escalação automática dá descanso a quem está cansado.
- Testes novos em `tests/carreira-taticas.test.js`: MC, variações, equilíbrio dos estilos, o time cansado rendendo menos e os mesmos 11 caindo de energia em 8 jogos.
