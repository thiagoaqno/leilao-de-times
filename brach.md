# Corrida F1: pneu macio com a dirigibilidade arcade, robôs calibrados pelo carro de verdade e parada decidida pelo pneu

Vale nas regras de F1. A sala arcade não muda.

## 1. Pneu macio com a dirigibilidade arcade antiga

- `F1.aderencia(pneu).arcade` é verdadeiro para o **macio dentro da vida útil** (desgaste até `PENHASCO`). Nesse caso `dinamica.js` usa `lateralArcade`: o volante gira o bico (`turn` do carro, plena a partir de 90 u/s), a velocidade continua no mundo e os pneus tiram até `grip` u/s² (sem depender da velocidade, vezes o pneu, o dano, o asfalto e o ar sujo) da velocidade de lado; o que passa disso escorrega, come velocidade (`scrub`) e, acima de 30 u/s de escorregão, o pneu satura (`kin`). Grudado e responsivo.
- Aceleração, freio e câmbio de 8 marchas são os mesmos (o passo normal); a curva divide o pneu com o freio e a tração pelo `uso`.
- Médio, duro e macio **acabado** (depois do penhasco) seguem a física intermediária, com o desgaste mandando como hoje.
- Cliente e servidor usam o mesmo código; `sl` (escorregão) e `us` (uso do pneu) entram no estado da rede (`serializar`/`aplicar`) para a reconciliação concordar. O piloto automático (robôs e fantasma) pede o volante pela guinada quando o pneu é arcade.
- Medido (Cadillac, volante cheio, aceleração lateral em u/s²): a 100 u/s macio novo 230 contra médio 155 e macio acabado 138; a 180 u/s, 414 contra 186 e 164.
- Teste novo em `tests/corrida-fisica.test.js`: macio novo é arcade e vira bem mais que o médio; macio acabado vira menos que o médio novo.

## 2. Robôs calibrados pelo carro

O perfil de velocidade dos robôs de F1 já usa a física de `dinamica.js` (limite de curva, frenagem e aceleração reais); o que estava lento eram as margens. Medi o que o carro faz de verdade (piloto automático dirigindo pela `Sim.passo`, Cadillac, médio novo, sem tráfego) em todas as pistas:

- `MARGEM_F1` 0,95 → **1,08** e `MARGEM_FREIO` 0,8 → **1,0** (o ABS do robô segura a roda). Em todos os GPs a volta fecha sem tocar no muro nem sair da pista; 1,15 já bate em Mônaco.
- As pistas de fantasia (serra, deserto, circuito alemão, arco-íris) têm lombada e salto e batem com 1,08: ficam na margem antiga (0,95 e 0,8).
- A folga dos níveis sobre o ideal: fácil 13,7% → **10%**, médio 7,4% → **6%**, difícil 2,5% → **0%** (mais o ritmo do piloto, até ~1,2%). Na pista o robô não segura o ideal inteiro (tráfego, ABS, desvios): medido em 3 pistas, difícil +4,5%, médio +6%, fácil +8% sobre o ideal.

| Ideal do robô (Cadillac, médio novo, volta lançada) | antes | depois |
|---|---|---|
| Interlagos | 68,2 s | 63,4 s |
| Melbourne | 68,6 s | 64,7 s |

Volta real com o piloto automático no limite (sem tráfego): Interlagos 70,7 s (margem antiga) → 64,5 s; Melbourne 71,0 → 68,2 s.

**As referências de 49,7 s (Interlagos, saindo parado) e ~52 s (Melbourne) não saem desta física dirigindo na pista:** mesmo com a lateral arcade e margem 1,4 o piloto automático faz 54,5 s em Interlagos, e com a física intermediária, margem 1,25 já bate no muro (volta de ~64 s no limite). Para chegar a 50 s o carro precisa de uma linha bem melhor ou de atalho pela grama/zebra (a volta só exige passar pelos setores na ordem). Não forcei os robôs acima do limite de aderência: o ideal deles agora é o que o carro sustenta sem bater. Um teste fixa as duas referências novas (±3%).

## 0. Trazido do PR #333 (fechado), sem a linha ideal

- Depois da primeira chegada, quem ainda corre tem **60 s** (`AFTER_FIRST_MS`, texto das regras em `menus.js`, `prazoDeChegada` fixo).
- A parada do robô é decidida pelo pneu (`decidirParada`, `escolherComposto`, `taxaDoPneu`): para só se o pneu não chega ao fim, na volta do plano ou antes se a próxima já passaria do penhasco (ou de graça sob safety car com o pneu pela metade), e sempre cumpre a regra dos dois compostos; o composto novo é o mais rápido que aguenta o resto.

## Testes

`node --test tests/corrida*.test.js`: 247 passam. Ajustados: `corrida-f1-dano-ia` (prazo de 60 s, difícil > 60 s, pole de Mônaco > 63 s), `corrida-f1-estrategia` (o macio arcade ganha 2,35 s em Mônaco, antes 2,95 s), `corrida-robos-ritmo` (limites de ritmo, baixo15 ≤ 5 s e o teste novo das referências).

## Ficou de fora

- A linha ideal (PR #333) e a recalibração da tabela de estratégia (`f1-pneus-ritmo.js`) com o macio arcade.
- O ideal de 49,7 s / 52 s (precisa de linha melhor; ver acima).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
