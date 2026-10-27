# Robôs da F1: ritmo de verdade, curvas sem frear à toa e sem ficar preso

Os robôs andavam a ~50% acima do piloto ideal (o jogador médio dava volta neles) e freavam quase parando em curvas fáceis. Agora andam perto de quem joga bem, sem passar do limite do carro.

## Causas achadas (medindo corridas de 10 robôs em 24 pistas)

1. **Nível usado como escala de velocidade em tudo.** `ia.nivel` (~0,65–0,71 depois de calibrado com um modelo que não batia com a corrida) multiplicava a velocidade alvo também nas retas: os robôs viam 70% da velocidade final. O modelo de volta (`tempoDaVolta`) só reduzia as curvas; a corrida reduzia tudo.
2. **Curvatura com ruído.** O raio da linha de corrida chegava a ~0 (Barcelona, Spa, Suzuka, Baku) e ~35 u em Interlagos onde a pista tem 82: o perfil de velocidade despencava (a quina de raio quase zero do PR fechado `b8cc28e`, que aqui também aparecia como 1 u/s no perfil) e a linha usada pelo carro (35% da linha de corrida) nem era a do cálculo.
3. **Olhar à frente de 0,5 s a velocidade já multiplicada pelo nível** e freio/acelerador tudo-ou-nada: roda da frente travava na curva, o robô rodava na saída (acelerador cheio com a traseira no limite) e ficava preso no muro (Baku, Barcelona: voltas de 150–300 s).
4. **Ninguém tirava o carro do muro.** Preso, ficava parado até o fim.
5. O robô esperava atrás de um carro lento mesmo com o lado livre (só ultrapassava na reta).

## O que mudou (`corrida-robos.js`)

- Curvatura do caminho de verdade (`curvaturaDoCaminho`: círculo por três pontos, suavizado, raio mínimo de 22 u) e o carro segue 80% da linha de corrida (`FATOR_LINHA`); o perfil de velocidade (`perfilF1`) sai dessa curvatura.
- O nível é a fração da margem do piloto ideal usada **só nas curvas e frenagens**; as retas vão sempre ao limite. `tempoDaVolta` (F1) agora é o mesmo perfil, em tabela por nível.
- Volante e pedais a cada passo da física (120 Hz): tira o pé quando a traseira escorrega, alivia o volante quando a frente passa do pico do pneu, solta o freio se a roda trava (ABS).
- Ritmo: alvo = volta do piloto ideal do carro dele (`idealDe`) + folga do nível (fácil +13,7%, médio +7,4%, difícil +2,5% no modelo; o pneu macio/duro e o vácuo mexem no resultado real) + até 1,2% pelo ritmo do piloto. Nunca abaixo do limite do carro.
- Robô preso (parado 2,5 s ou sem andar 10 pontos em 6 s) volta à pista como o "↺ Pista" (do lado livre, se há carro ao lado).
- Preso atrás de um carro bem mais lento: passa também em curva leve, não só na reta.
- `dinamica.js`: só um atalho de desempenho em `parametros` (cache por objeto; mesmo resultado, ~5x mais rápido as contas dos robôs). A física dos humanos não mudou.

## Antes e depois (10 robôs, 5 voltas, média da melhor volta limpa contra o piloto ideal do próprio carro)

| Pista | Nível | Antes | Depois |
|---|---|---|---|
| Interlagos | fácil / médio / difícil | +60% / +52% / +37% | +8% / +3% / -5% |
| Mônaco | fácil / médio / difícil | +63% / +52% / +39% | +8% / +3% / -5% |
| Monza | fácil / médio / difícil | +52% / +41% / +29% | +12% / +8% / +2% |
| Spa | fácil / médio / difícil | +64% / +58% / +42% | +10% / +6% / -2% |

Robôs mais de 3 s abaixo de 15% da velocidade possível: Spa antes 10 de 10 (todos), depois 0; nas outras pistas 0 antes e depois. No nível difícil o pneu macio dá voltas até alguns % abaixo do "ideal" neutro (a tabela de pneus é de outro PR). Teste novo em 24 pistas, nível médio: média de +2,4% a +9,6% (maioria entre 3% e 6%), todos terminam, nenhum passa de 3 s abaixo de 15%, curvas largas a pelo menos 80% do possível.

## Testes

- Novo `tests/corrida-robos-ritmo.test.js` (24 pistas de F1, ordem dos níveis, robô preso se recupera, perfil sem quinas).
- Ajustados: janelas de pole em `corrida-f1-dano-ia.test.js` (macio quente é mais rápido que o pneu neutro) e dois limites de `corrida-f1-equipes.test.js`.
