# Corrida: evita recalcular os robôs ao aprender uma volta

Quando um piloto registrava sua melhor volta, o servidor descartava os perfis de todos os robôs daquela pista. No próximo passo da corrida, eles eram calculados de novo no mesmo processo que atende todos os jogadores, provocando pausas e possíveis saltos nas posições.

Cada robô conserva o perfil preparado para sua corrida; a volta aprendida continua disponível para as próximas largadas. Isso também protege outras salas que estejam correndo na mesma pista. Um robô que assume um jogador desconectado calcula seu perfil uma vez.

## Verificação

- Testes de regressão nas regras de F1 e no modo clássico: a volta nova não troca os perfis em corrida e é usada na próxima largada.
- Medição local com 19 robôs em Singapura: o passo seguinte ao aprendizado caiu de aproximadamente 300 ms para 17 ms nesta máquina. O tempo real depende da carga e do servidor.
