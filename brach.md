# PR intermediário: ritmo dos robôs na F1

Branch `fix/corrida-ia-ritmo`, criada a partir de `origin/main` depois dos PRs 1 a 3 e dos extras de equipes, pontuação e pistas.

## Adicionado nesta branch

- Na F1, a classificação e a corrida usam uma referência competitiva por pista: o melhor tempo humano guardado no banco, limitado pela capacidade do carro da McLaren no traçado calculado. Em pista ainda sem volta, usam essa capacidade. Uma volta apenas razoável do jogador deixa de reduzir o ritmo do grid inteiro. Um recorde humano competitivo permanece protegido na classificação. Os outros modos conservam o balanceamento anterior.
- O alvo de cada bot inclui o carro da equipe e a nota de ritmo do piloto. A semente ainda define a constância da volta e o estilo de pilotagem. O limite de velocidade final, os pneus, o dano, o tráfego e os boxes continuam valendo na corrida.
- A pole simulada fica acima de um recorde humano conhecido, mesmo com uma variação favorável no sorteio da classificação.
- Depois da primeira chegada, a F1 calcula o prazo para os bots ativos cobrirem as voltas que faltam, com margem para tráfego e paradas, até 10 minutos. A regra de 45 segundos dos outros modos continua.
- O tráfego dos bots confere também a distância percorrida na pista antes de frear por outro carro. Isso evita confundir trechos vizinhos do desenho; carros que já chegaram não bloqueiam o pelotão e uma fila parada pode voltar a ultrapassar.
- Uma perda total retira o carro da pista: bots, colisões e direção de prova deixam de considerá-lo obstáculo; os navegadores deixam de desenhá-lo. O pelotão pode continuar mesmo numa curva sob bandeira.
- Cada batida válida agora causa 2% de dano, independentemente da força, e nenhuma punição em segundos. Cada 2% de dano reduz em 2% velocidade final, aceleração, frenagem e aderência, para humanos e bots. O intervalo entre registros do mesmo contato passou a quatro segundos.
- O log da F1 informa se o alvo veio do recorde ou da capacidade dos carros.

## Conferência

- Simulação de 19 bots, duas voltas em cada uma das 24 pistas de GP, sem volta humana: todos terminam. Em Mônaco, o grid de classificação fica aproximadamente entre 46 e 49 s no nível médio.
- Com recorde humano de 43,2 s em Mônaco e uma volta de 49,5 s, a pole dos bots fica acima do recorde, e os 19 bots classificam abaixo de 49,5 s. Se a única volta conhecida é 49,5 s, ela não arrasta a pole para trás. Em Interlagos, o grid sem referência também deixa de andar no ritmo do Cadillac.
- Teste de um bot passando por carro retirado da pista, mesmo em trecho curvo, e testes de dano fixo sem acréscimo ao tempo.
- Testes novos cobrem o grid completo sem referência, o limite pelo recorde e o prazo após a primeira chegada. `node --test tests/corrida*.test.js` e `git diff --check`.

## Repositórios consultados

- [awesome-f1](https://github.com/subinium/awesome-f1#tools-and-apps) é um índice de ferramentas e fontes; suas entradas de telemetria e traçados podem ajudar a aferir pistas em trabalho futuro. Não há algoritmo de IA para importar diretamente.
- [F1DB](https://github.com/f1db/f1db) disponibiliza dados históricos de pilotos, construtores, circuitos e temporadas em formatos abertos. É uma boa fonte para conferir o calendário e as tabelas no PR 4; qualquer dado copiado exigirá a atribuição prevista na licença CC BY 4.0. O balanceamento deste PR usa os tempos medidos no próprio jogo, pois a duração das pistas do jogo não corresponde à volta real da F1.
