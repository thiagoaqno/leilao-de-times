# Carreira: a escalação automática respeita a função de cada vaga

## O que muda no jogo

- **Antes**, a escalação automática enchia as vagas uma por uma, na ordem do campinho (o gol, a defesa, o meio e o ataque), e cada vaga levava quem rendia mais nela naquele momento. Como sair da posição custa pouco no encaixe, o resultado era estranho: no 4-3-3 do Flamengo, Arrascaeta (MEI 83) ia de lateral esquerdo e Paquetá (MEI 82) de lateral direito, porque as laterais vinham antes do meio; Pedro (ATA 80) ia para a ponta esquerda, a primeira vaga do ataque, e Samuel Lino (PE 78) acabava de centroavante.
- **Agora**, o time inteiro é montado de uma vez, com a distribuição que dá a maior soma. E, além do que o encaixe já tira no jogo, a escolha conta mais 1 ponto por ponto de encaixe: com força parecida, entra quem é da função (o volante no volante, o meia na vaga de meia, o ponta esquerda na esquerda). Um craque bem melhor continua jogando fora da posição quando compensa.
- O mesmo Flamengo no 4-3-3 agora sai com Alex Sandro e Emerson Royal nas laterais, Jorginho de volante, Arrascaeta e Paquetá no meio, Samuel Lino na ponta esquerda, Pedro de centroavante e Plata na direita.
- Nas seis ligas e na Série B, em todas as formações (incluindo o 4-3-3 O e o 4-3-3 G): os titulares na posição de origem passaram de 6,5 para 9,4 de 11 em média, e a soma das notas na vaga ficou maior em 90% das escalações.
- Vale para todo lugar que usa a automática: os times do computador, a escalação automática do seu time, a troca de formação no meio do jogo e quem entra no lugar de um lesionado ou suspenso na escalação fixa. Na escalação fixa, quem você pôs em cada vaga continua onde está.
- Os jogos do computador são simulados de novo a cada vez a partir da semente, então numa carreira em andamento os placares já jogados entre times do computador podem mudar depois deste PR (os jogos com humanos ficam como estão).

## Como

- `public/carreira/motor.js`: `escalar` deixou de escolher vaga por vaga. `preencher` monta a tabela de notas (vagas × jogadores) e `distribuir` (o método húngaro) acha a distribuição de maior soma; a nota usada para escolher é `notaNaVaga` = `valorNa` − `FUNCAO` × `Taticas.pontosDeEncaixe` (`FUNCAO` = 1). Os escolhidos sem escalação fixa entram primeiro, cada um na vaga que mais combina; o resto do elenco preenche as vagas que sobraram. As contas do jogo (`valorNa`, `afinidade`, força do time) não mudaram.
- Testes: `tests/carreira-taticas.test.js` ganhou o Flamengo real (goleiro, zagueiros, laterais e centroavante na posição em quatro formações), um elenco de notas iguais com todo mundo na posição em nove formações e os dois lados da regra da função (o meia 76 ganha do meio-campista 77; o meio-campista 82 ganha do meia 70).
