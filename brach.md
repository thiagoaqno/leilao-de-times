# Bots contornam carros lentos

Quando o pelotão alcançava um carro muito lento, os bots podiam ficar presos atrás dele: a decisão de ultrapassar exigia que o próprio bot ainda estivesse rápido, e a frenagem seguia limitada pelo outro carro mesmo após a mudança de faixa.

Os bots agora podem iniciar o desvio mesmo se já reduziram a velocidade. Em Mônaco, uma passagem lenta pode usar a margem próxima ao muro, mantendo espaço físico; a aceleração só é liberada depois de existir separação lateral suficiente. Outros carros e bandeiras continuam limitando a manobra.

## Verificação

- Sintaxe e `git diff --check`; nenhum teste novo criado.
- Simulação de bot atrás de humano lento em Mônaco: ultrapassagem concluída sem contato; com os dois lados ocupados, permanece atrás.
- Três simulações de 19 bots em Mônaco e comparação em Interlagos; todos terminaram e os contatos foram iguais aos das simulações anteriores.
- Falta conferir visualmente em partidas com humanos.
