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
