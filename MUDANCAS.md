# Carreira de Treinador: o banco de dados e o motor da partida (fases 0 e 2)

As fases 0 e 2 de `planos/carreira.md`, adiantadas juntas. A fase 1 (a base real do Brasileirão) ainda espera a
resposta de qual temporada usar. Ainda não há tela: isto é a fundação que a fase 3 vai usar.

## Fase 0: banco de dados
- **SQLite pelo `node:sqlite`**, que já vem no Node: nenhuma dependência nova.
- **Onde fica o arquivo:** `DB_PATH` diz o caminho.
  - No Fly, vai ser `/data/galera.db`, num volume.
  - Sem `DB_PATH`, fica em `dados/galera.db` (fora do git).
  - Os testes usam um banco em memória.
- **`bd.js` abre o banco e roda as migrações** de `migracoes/NNN-nome.sql`, em ordem e uma vez só, anotadas na tabela
  `migracoes`.
- **A primeira migração cria a tabela `carreiras`.** As funções são pequenas, sem ORM:
  - `criarCarreira` devolve o token (que fica no navegador) e um código de recuperação de 12 letras, que aceita traço e
    minúscula;
  - o banco guarda só o hash dos dois;
  - `recuperarCarreira` entra em outro aparelho e troca o token, e o antigo deixa de valer.
- **O servidor abre o banco ao subir.** Se não abrir, avisa no log e o resto do site segue normal.
- **O `Dockerfile` vai para `node:24-slim`.**
- **`DEPLOY-FLY.md` explica o volume:** como criar, quando pôr o `[mounts]` no `fly.toml` e como fazer o backup.
  - O `fly.toml` **não** mudou de propósito: com o deploy automático, pôr o `[mounts]` antes de o volume existir quebraria
    o deploy.

## Fase 2: o motor da partida (`public/carreira/motor.js`)
- **Partida minuto a minuto, com semente**, e com acréscimos nos dois tempos. A mesma semente com as mesmas decisões dá
  sempre o mesmo jogo.
- **As forças vêm da escalação e da formação**, com as mesmas contas do Leilão (`FORMATIONS`, `FIT` e `strength` de
  `escalacao.js`). As posições da base (GOL, ZAG, LAT, VOL, MC, MEI, PE, PD, ATA) viram os grupos do FIT.
- **Tática:**
  - mentalidade (de -2 a +2): mais ataque cria mais e também deixa criar;
  - pressão: tira lances do adversário, mas cansa e faz mais faltas;
  - linha alta: tira lances, mas deixa espaço nas costas.
- **O resto do jogo:** cansaço (o físico conta), faltas, amarelos, segundo amarelo, vermelho direto, lesões com troca
  automática, 5 substituições e mando de campo.
- **O técnico do computador** tira os mais cansados, arrisca quando perde aos 70' e segura o 1 a 0 aos 82'.
- **Os três jeitos de jogar:**
  1. **simulada:** não para;
  2. **com decisões táticas:** para no intervalo, aos 70', no gol sofrido, no vermelho e no cansaço, para mudar a
     tática, a formação e fazer as trocas;
  3. **com os lances decisivos:** além disso, de 3 a 6 lances por jogo (deu 3,8 em média), cada opção com a chance
     calculada pelas notas de quem está no lance:
     - ataque perigoso contra: linha de impedimento, bloco baixo, mano a mano ou preparar o contra-ataque;
     - ataque perigoso a favor: chutar de primeira, tocar, driblar ou cruzar;
     - falta a favor e falta contra;
     - pênalti nos 6 cantos do Leilão (`ZONAS` do `ritmo.js`), com a "mania" de cada batedor e goleiro.
- **Sem resposta, a partida para** (`parado`) e quem chama guarda a decisão e simula de novo, como nos pênaltis do
  Leilão. O que já aconteceu nunca muda.
- **A calibragem fica toda em `AJUSTE`.**

### Uma temporada simulada (20 clubes de teste, turno e returno)
Clubes fictícios com notas médias de 80 a 68, só para ver o motor. A base real é a fase 1.

| # | Clube (nota média) | P | J | V | E | D | GP | GC | SG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Clube 01 (80) | 87 | 38 | 27 | 6 | 5 | 78 | 24 | 54 |
| 2 | Clube 07 (76) | 80 | 38 | 25 | 5 | 8 | 77 | 41 | 36 |
| 3 | Clube 03 (79) | 77 | 38 | 23 | 8 | 7 | 76 | 35 | 41 |
| 4 | Clube 02 (79) | 76 | 38 | 23 | 7 | 8 | 72 | 32 | 40 |
| 5 | Clube 05 (77) | 71 | 38 | 22 | 5 | 11 | 60 | 34 | 26 |
| 6 | Clube 06 (77) | 66 | 38 | 21 | 3 | 14 | 70 | 41 | 29 |
| 7 | Clube 04 (78) | 66 | 38 | 19 | 9 | 10 | 62 | 38 | 24 |
| 8 | Clube 09 (75) | 64 | 38 | 19 | 7 | 12 | 49 | 38 | 11 |
| 9 | Clube 08 (76) | 63 | 38 | 18 | 9 | 11 | 52 | 43 | 9 |
| 10 | Clube 12 (73) | 53 | 38 | 13 | 14 | 11 | 48 | 42 | 6 |
| 11 | Clube 14 (72) | 53 | 38 | 15 | 8 | 15 | 48 | 51 | -3 |
| 12 | Clube 11 (74) | 49 | 38 | 13 | 10 | 15 | 48 | 56 | -8 |
| 13 | Clube 13 (72) | 44 | 38 | 11 | 11 | 16 | 40 | 55 | -15 |
| 14 | Clube 18 (69) | 39 | 38 | 10 | 9 | 19 | 49 | 70 | -21 |
| 15 | Clube 16 (71) | 36 | 38 | 9 | 9 | 20 | 38 | 55 | -17 |
| 16 | Clube 10 (74) | 31 | 38 | 7 | 10 | 21 | 45 | 71 | -26 |
| 17 | Clube 19 (69) | 27 | 38 | 7 | 6 | 25 | 27 | 70 | -43 |
| 18 | Clube 15 (71) | 26 | 38 | 5 | 11 | 22 | 39 | 89 | -50 |
| 19 | Clube 17 (70) | 25 | 38 | 5 | 10 | 23 | 31 | 70 | -39 |
| 20 | Clube 20 (68) | 25 | 38 | 6 | 7 | 25 | 30 | 84 | -54 |

380 jogos: 2.73 gols por jogo, mandante venceu 45.5%, empates 21.6%.

## Conferido
- `npm test`: 79 passaram, 0 falharam.
  - `tests/bd.test.js`: as migrações rodam uma vez só; carreira criada e lida pelo token; o banco não guarda o token nem
    o código; a recuperação troca o token; o andamento é salvo.
  - `tests/carreira-motor.test.js`:
    - em 10 mil jogos entre times iguais: 2,55 gols por jogo, mandante vence 45,4%, empate 26,2%;
    - o time 8 pontos melhor vence 72,5%;
    - a mesma semente dá o mesmo jogo;
    - o modo 2 para no intervalo e aos 70';
    - em 200 jogos no modo 3, decidir nunca mudou o que já tinha acontecido;
    - o pênalti usa os 6 cantos;
    - a troca pedida no intervalo entra.
- O servidor subiu com `DB_PATH` apontando para uma pasta nova: o arquivo foi criado e as migrações rodaram.
