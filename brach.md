# Corrida F1: a dirigibilidade de antes volta, com a aceleração e o câmbio novos e os pneus fazendo diferença

Vale nas regras de F1 (`config.regras === "f1"`). A sala arcade continua como estava.

## A dirigibilidade antiga (a de `cfac976`) de volta em `public/corrida/dinamica.js`

O que o carro faz **para o lado** é o modelo de antes, no passo fixo de 1/120 s:

- o volante gira o bico: `turn` do carro × volante × a velocidade (pleno a partir de 90 u/s), com o volante suavizado em ~0,1 s;
- a velocidade fica no mundo e é medida de novo no eixo novo; os pneus tiram até `grip` u/s² da velocidade de lado;
- o que passa disso escorrega (`slip` = a velocidade de lado que sobrou), come velocidade (`scrub`) e, depois de 30 u/s de escorregão, o pneu satura e segura só `kin` do grip;
- a aderência lateral **não depende mais da velocidade** (sem a downforce na curva do modelo de bicicleta): vale `grip` do spec × o pneu × o dano × o asfalto × o ar sujo.

O que **não** mudou (a física nova para a frente): potência por rotação, arrasto, downforce no arrasto, tração do eixo de trás (patina), freio progressivo que trava a roda, rampa, ré, grama, câmbio de 8 marchas esticando até perto do corte (12 mil rpm, troca de 50 ms), 0-200 km/h em ~5,4 s e 300→100 km/h em ~94 m. O freio e a tração ainda dividem o pneu com a curva (`uso`): frear com o volante todo trava a roda, e acelerar forte numa curva lenta faz a traseira patinar e tira parte do grip lateral.

Mantido da infraestrutura nova: passo fixo e independência de FPS, servidor autoritativo e reconciliação sem teleporte, batidas com 1% de dano e cooldown de 4 s sem punição, fantasma depois da bandeirada, subida e descida mexendo na velocidade. O estado que a rede manda ganhou `sl` (escorregão) e `us` (uso do pneu) para o servidor e a previsão do navegador concordarem no escorregão.

Também corrigido: no ar (lombada rápida) o carro não saía do lugar na horizontal; agora segue a velocidade que tinha, com o bico girando pouco.

`Dinamica.velocidadeDeCurva` agora é `min(vmax, sqrt(grip·R), R·turn)` (com o raio mínimo de `90/turn`: uma quina da linha não para o robô). `volanteMaximo` e `pneuLateral` saíram; entraram `guinadaDoVolante` e `volanteParaGuinada` (o piloto automático e os robôs pedem o volante pela guinada).

## Os pneus (`PNEUS` e `aderencia` em `public/corrida/f1-regras.js`)

Antes, na dirigibilidade antiga, os três compostos valiam 1,06, 1,03 e 1,00: quase nada. Agora cada um muda o jeito de virar.

| Composto | `grip` novo e quente | frio (largada, saída do box) | no penhasco (desgaste 0,8) | acabado (desgaste 1) | `kin` | `agil` | `tracao` | `freio` | vida | aquece |
|---|---|---|---|---|---|---|---|---|---|---|
| Macio | 1,22 | 0,98 | 1,15 | 0,40 | 1,06 | 1,05 | 1,10 | 1,06 | 0,35 | 1,6 |
| Médio | 1,06 | 0,85 | 1,00 | 0,55 | 1,00 | 1,00 | 1,04 | 1,03 | 0,60 | 1,0 |
| Duro | 0,92 | 0,74 | 0,86 | 0,68 | 0,93 | 0,95 | 0,95 | 1,00 | 0,90 | 0,6 |

- `grip` multiplica o grip do carro; o frio segura 80% (era 92%); o piso subiu para 0,40.
- o pneu esquenta mais devagar (a largada leva uns 10 s no duro, ~6 no médio e ~4 no macio) e aquece mais quando escorrega;
- `agil` multiplica a guinada do volante (o macio vira mais "na mão", o duro menos), e cai um pouco com o pneu frio e no penhasco;
- **`solta`** (0 a 1; 0 com o pneu quente e inteiro, ~0,65 no frio, ~0,9 e mais no penhasco): quando o volante pede mais do que o pneu segura, sem acelerador a frente não aguenta (o carro vira menos que o volante pede); no acelerador a traseira vem (o bico gira mais que o pedido), e a saída de curva exige tirar o pé;
- `kin`: o quanto sobra depois que escorrega; o duro perde mais, o macio menos;
- `tracao` e `freio` voltaram a diferenciar os compostos sem mexer nos números do carro (o macio arranca e freia melhor).

O que se sente na pista (a maior velocidade constante com que o piloto automático faz a curva sem sair, no meio da pista, em u/s):

| Curva | Macio | Médio | Duro | Médio frio | Médio no penhasco | Macio no penhasco | Duro no penhasco |
|---|---|---|---|---|---|---|---|
| Interlagos (raio ~120) | 270 | 252 | 233 | 232 | 191 | 159 | 208 |
| Mônaco (grampo, raio ~75) | 223 | 206 | 185 | 177 | 145 | 126 | 156 |

O macio faz a curva 7% a 8% mais rápido que o médio e 16% (Interlagos) a 21% (grampo de Mônaco) mais rápido que o duro; o pneu frio perde 8% a 14%; o do penhasco, 24% a 30%; e o macio no penhasco fica bem atrás do duro no penhasco (o duro aguenta o desgaste).

## Os robôs (`corrida-robos.js`)

- o perfil de velocidade dos robôs de F1 usa `MARGEM_F1 = 0,97` do limite de aderência (antes 0,92: com a lateral antiga o escorregão leve quase não custa, e 0,97 fecha a volta sem escorregar de verdade; 1,1 já satura o pneu);
- a velocidade de curva continua indo com a raiz do grip do pneu em uso (agora o do composto novo, frio ou gasto, o dano e o ar sujo) e perde mais 6% quando o pneu solta o carro (`solta`);
- uma quina na linha (raio quase zero) deixava o robô a 1 u/s e travava o pelotão em Barcelona: agora é feita no raio mínimo do volante.

## Testes

Só os da Corrida (`node --test tests/corrida*.test.js`). Ajustados porque dependiam da curva nova: `corrida-fisica` (aderência lateral sem downforce, escorregão, freio com volante cheio, o macio "perto do arcade" virou "o macio vira mais que o duro", piloto ideal a 0,97), `corrida-f1-pneus` (limites de grip/kin e os números dos compostos), `corrida-f1-dano-ia` (a pole de Mônaco cai de 80-90 s para 62-74 s, perto da volta real; o robô parado só realinha o bico andando) e `corrida-f1-equipes` (com a lateral antiga o carro de curva ganha em Mônaco e em Interlagos; Barcelona ficou no meio). Novos: direção de antes, macio × médio × duro na mesma curva, frio e penhasco escorregam mais, a frente abre sem acelerador e a traseira vem no acelerador, os números dos compostos, e a aceleração, a frenagem e as 8 marchas nos números da física nova.
