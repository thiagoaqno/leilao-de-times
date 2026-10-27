# Corrida F1: os pneus fazem sentido na estratégia

O macio agora compensa a parada, dura só uma volta e meia e depois o carro despenca; o duro aguenta, mas é mais lento. A vida é em voltas (não mais em fração da corrida) e as estratégias dos robôs saem da conta de um simulador de stint com a própria física do carro. Só mexe em como os pneus entram na dirigibilidade: o jeito de virar de `dinamica.js` e `sim.js` continua o do `main`, com o médio como base (aderência 1,35, freio e tração 1,08).

## Os pneus (`public/corrida/f1-regras.js`)

- **Vida em voltas:** `PNEUS[c].vida` é quantas voltas o composto dura, pilotado limpo, até o penhasco: macio 1,5, médio 3,8, duro 7. O piloto ideal da física gasta exatamente isso em todas as pistas (medido). `gastarPneu` recebe o comprimento de `volta` (não mais o `total` da corrida) e gasta mais com o escorregão, a roda travada (`travada`) e a patinada (`patina`): quem pilota sujo gasta até uns 2×.
- **Ritmo:** `pico` do macio 1,515, médio 1,35 e duro 1,31; freio e tração acompanham a aderência (`BASE_FREIO`, `EXPOENTE_*`). Dá uns 3 s por volta do macio sobre o médio nas pistas de volta normal (Interlagos 3,4 s, Mônaco 3,0 s, Silverstone 2,8 s; Monza, de reta, 1,3 s) e o duro perde uns 0,9 s para o médio.
- **Penhasco:** passou do `PENHASCO` o pneu despenca até 40% do pico (aderência, tração e freio lá embaixo, 8% menos de velocidade final): o carro perde 17 a 20 s por volta com o pneu acabado. O desgaste vai de 0,8 a 1 em um quarto da vida do composto (o macio leva 0,4 volta).
- **Pneu frio:** na largada e na saída do box segura 72% e esquenta em alguns segundos (macio 2 s, duro 6 s): custa de 0,2 a 0,9 s na primeira volta.
- O anel do pneu no HUD (`hud.js`, só as duas contas de `resta`) agora esvazia até 0% no penhasco (`F1.vidaRestante`) em vez de parar em 20%; os textos de ajuda (`menus.js`) foram atualizados.

## O simulador de stint e a estratégia dos robôs

- `ferramentas/pneus-fisica.js`: o piloto ideal (`Dinamica.perfilIdeal` refeito conforme o pneu muda + `Sim.pilotoAutomatico`) dá a volta com a física de verdade com cada composto em cada desgaste, mede o pneu frio, o tempo real da parada (entrada no corredor, limitador, parada e saída, contra o mesmo trecho sem parar) e corre a corrida inteira com as trocas.
- `ferramentas/pneus-tabela.js` grava `public/corrida/f1-pneus-tabela.js` (28 pistas com corredor; as de kart ficam de fora). `node ferramentas/pneus-estrategias.js interlagos 5` mostra os melhores planos.
- `public/corrida/f1-pneus-ritmo.js`: com a tabela, o tempo de qualquer plano (`simular`) e todos os planos até 3 paradas (4 em corridas longas), do melhor para o pior (`planos`).
- `F1.estrategia(voltas, nivel, semente, pista, fator)`: escolhe entre os planos perto do melhor (difícil até 2 s, médio 3,5 s, fácil 6 s), pesados pela diferença e sorteados pela semente; sempre dois compostos. Sem tabela, cai na conta simples pela vida. Os robôs param na volta do plano e antes se o pneu passa do penhasco.

## Os números (piloto ideal, física do carro)

| Pista | Composto | Vida (voltas) | Volta nova | No penhasco | Acabado | Frio (1ª volta) |
|---|---|---|---|---|---|---|
| Interlagos | macio | 1,5 | 63,5 s (-3,4) | 64,3 s | 81,8 s (+18,3) | +0,4 s |
| Interlagos | médio | 3,8 | 66,9 s | 67,8 s | 86,5 s (+19,6) | +0,5 s |
| Interlagos | duro | 7,1 | 67,8 s (+0,9) | 68,4 s | 87,8 s (+20,0) | +0,7 s |
| Mônaco | macio | 1,5 | 70,2 s (-3,0) | 71,0 s | 87,5 s (+17,3) | +0,4 s |
| Mônaco | médio | 3,9 | 73,2 s | 74,1 s | 91,9 s (+18,7) | +0,8 s |
| Mônaco | duro | 7,1 | 74,0 s (+0,9) | 74,7 s | 93,1 s (+19,0) | +0,9 s |
| Monza | macio | 1,5 | 60,5 s (-1,3) | 60,8 s | 71,7 s (+11,2) | +0,2 s |
| Monza | médio | 3,9 | 61,7 s | 62,1 s | 74,2 s (+12,4) | +0,3 s |
| Monza | duro | 7,1 | 62,1 s (+0,4) | 62,4 s | 74,8 s (+12,7) | +0,5 s |

**A parada de verdade** (o que ela custa contra passar direto): Interlagos 6,3 s (3,6 s de corredor, entrada e saída + 2,6 s parado, em média), Mônaco 5,9 s, Monza 6,5 s. É mais que os "uns 4 s" da conta original, e por isso o macio precisa ganhar tanto por volta.

**Estratégias** (tempo da corrida, diferença para a melhor; S = macio, M = médio, H = duro; os números são as voltas de cada trecho):

| Pista | Voltas | S-M | S-H | M-H | S-M-S / S-S-M (2 paradas) | tudo macio (+10 s da regra) | S esticado (3 voltas) |
|---|---|---|---|---|---|---|---|
| Interlagos | 3 | 205,2 s (S1 M2) | +1,3 | +4,3 | +3,2 | +7,0 | |
| Interlagos | 5 | 340,1 s (S2 M3) | +2,2 | +4,7 | +2,9 | +9,9 (sem a regra, -0,1) | +14,2 |
| Interlagos | 10 | 684,0 s (S2 S2 S2 M4) | +3,5 (S2 H8) | +1,3 (M4 H6) | +0,5 (S2 M4 M4) | | |
| Mônaco | 3 | 224,3 s (S1 M2) | +1,4 | +4,1 | +3,3 | +7,3 | |
| Mônaco | 5 | 372,0 s (S2 M3) | +2,3 | +4,2 | +2,9 | +10,5 | +13,7 |
| Mônaco | 10 | 747,3 s (S2 M4 M4) | +2,5 | +0,7 | 0,0 | | |
| Monza | 3 | 191,4 s (S1 M2) | +0,8 | +1,8 (H1 M2) | | | |
| Monza | 5 | 315,6 s (S1 M4) | +1,2 | +1,8 (H1 M4) | +5,2 | +15,4 | +10,6 |
| Monza | 10 | 628,8 s (M4 H6, melhor) | +2,3 | 0,0 | +4,2 | | |

Conferido na física, com a corrida inteira de 5 voltas e as trocas (diferença para a melhor): Interlagos S2 M3 0,0; S2 H3 +2,0; M3 H2 +4,2; S1 S1 M3 +1,1; S3 M2 (esticado) +14,2. Mônaco: 0,0; +2,7; +3,3; +1,3; +13,7. A tabela erra menos de 2,6 s entre planos.

## Testes

- `tests/corrida-f1-pneus.test.js`: vida em voltas de cada composto, vida independente do tamanho da pista, escorregar/travar/patinar gastam mais, penhasco e pneu frio (ajustados).
- `tests/corrida-f1-estrategia.test.js` (novo): vida, ganho do macio sobre o médio e do médio sobre o duro, penhasco custando muitos segundos, pneu frio e parada na física; tabela conferida contra a física; estratégias boas a poucos segundos em 3, 5 e 10 voltas, macio pagando a parada, esticar claramente pior; corrida inteira na física; estratégia dos robôs (perto do melhor, variação, regra dos dois compostos) e parada antecipada.
- Se mexer nos pneus ou na física: `node ferramentas/pneus-tabela.js` (uns 2 minutos) e rode o teste novo.
