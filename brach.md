# Bots: trajetória mais precisa em Mônaco e desvio de emergência

Em Mônaco, os bots variam menos em torno da linha e podem usar mais 10 cm de pista na escala do jogo, mantendo o limite dos muros por trecho. A folga dos outros carros e as manobras de trânsito continuam ativas. A física dos freios permanece igual para bots e humanos.

Quando um bot alcança rapidamente um carro e precisa de mais espaço para frear, ele pode desviar para uma faixa livre sem soltar a freada, desde que haja tempo e espaço também à frente. Se a pista estreitar, permanece atrás; o ERS não é acionado no desvio de emergência.

## Verificação

- Sintaxe e `git diff --check`; nenhum teste novo criado.
- Simulações de pelotão em Mônaco e Interlagos, com comparação das batidas e dos tempos.
- Cenário de aproximação rápida conferido com pista livre e com estreitamento adiante.
- Falta conferir visualmente as disputas contra humanos no jogo.
