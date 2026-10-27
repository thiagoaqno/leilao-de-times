# Corrida F1: robôs fazem as curvas na velocidade de quem joga (Interlagos 63,4 s → 51,4 s de ideal)

Vale nas regras de F1. A física do carro não mudou: o robô não ganhou aderência, só passou a calcular e a seguir uma linha melhor.

## Causa

Medi a volta limpa de um jogador em Interlagos (Cadillac, médio novo, 49,70 s; dado em `tests/dados/volta-interlagos-cadillac.json`). A aceleração lateral dele (v² x curvatura do caminho) chega a ~230-270 u/s², praticamente o limite do pneu que `dinamica.js` calcula. Ou seja, o carro aguenta: quem estava errado era o robô.

- **A linha do robô era a mais curta, não a mais rápida.** O elástico de `tracado` encosta por dentro e fecha o raio no ápice (R ~ 100 u onde quem joga passa a R ~ 300 u). O perfil de velocidade saía 30-40% abaixo do jogador nas curvas. O PR anterior (#335) via o mesmo efeito como "o piloto automático bate acima de 1,08".
- **O volante mirava mal.** O ponto à frente ficava no lado em que o carro estava, não sobre a linha, e não havia contra-esterço: a traseira escorregava na saída e o carro oscilava de batente a batente.

## O que mudou

- `tracado(pista, true)` (F1, fora das pistas de fantasia): linha de **menor curvatura** (relaxa a quarta diferença do caminho dentro da pista) e curvatura do caminho suavizada em ±72 u (o carro não faz quinas menores que isso). O limite de curva continua vindo de `D.perfilIdeal` e do pneu, valendo em todas as pistas; as margens (1,08 e 1,0) não mudaram.
- `Sim.pilotoAutomatico`: olha `LD_K` = 0,6 s à frente, aceita a lateral como função do ponto (o robô passa a linha dali), soma contra-esterço pela deriva da traseira (`K_TRASEIRA`) e amortece a diferença de guinada (`K_GUINADA`). Vale também para o fantasma.
- Níveis: folga sobre o ideal 0 / 2 / 6% (difícil / médio / fácil). Na pista, sozinho, o difícil fica ~4,5% atrás do ideal, o médio ~6% e o fácil ~9%.

## Números (Cadillac, médio novo, robô sozinho, volta lançada)

| Pista | Ideal antes | Ideal depois | Robô difícil antes | Robô difícil depois |
|---|---|---|---|---|
| Interlagos | 63,4 s | 51,4 s (jogador: 49,7 s) | 66,6 s | 53,6 s |
| Melbourne | 64,7 s | 54,5 s | 67,1 s | 56,6 s |
| Mônaco | 67,8 s | 57,3 s | 71,4 s | 60,0 s |

Velocidade média nas curvas de Interlagos: robô difícil >= 90% da do jogador (antes 60-70%). Nenhuma batida e nenhuma saída de pista nas três pistas.

## Testes

- Novo `tests/corrida-robos-curvas.test.js`: (a) ideal Cadillac/Interlagos em 49,7 s +-4%; (b) robô difícil sozinho em Interlagos e Mônaco: volta lançada a menos de 6% do ideal, sem batida e sem passar do limite da pista; (c) velocidade de curva >= 90% da do jogador.
- `corrida*.test.js` rodados uma vez no fim.

## Fica de fora

- O difícil ainda está ~8% atrás do jogador (53,6 contra 49,7 s): a diferença restante é de controle (a saída de curva ainda perde velocidade) e de a linha de menor curvatura não ser a de menor tempo. Subir as margens além de 1,08 volta a encostar no muro em Mônaco.
- Pistas de fantasia e o jogo clássico seguem com a linha e as margens antigas.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
