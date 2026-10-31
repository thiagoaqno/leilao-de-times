# Corrida: estratégias, carreira e confirmação do box

Reequilibra o ritmo dos pneus secos, preservando a ordem macio, médio e duro, e recalcula a tabela das pistas. A penalidade por terminar no seco com um só composto passa a ser de 1 segundo por volta, limitada a 10 segundos. Assim, uma estratégia sem parada pode competir numa corrida curta, assumindo a penalidade. O planejador respeita os dois jogos disponíveis por composto; os bots continuam buscando cumprir os dois compostos.

O engenheiro compara estratégias nas corridas curtas e considera a chuva próxima: evita recomendar uma troca seca quando o pneu atual aguenta até a chuva. Enter confirma o box no MFD sem cancelar uma solicitação existente; B continua cancelando.

As equipes rivais desenvolvem seus carros de forma determinística ao longo das temporadas individuais e em grupo, inclusive em saves existentes. As duas modalidades passam a oferecer 10 voltas por GP.

## Verificação

- Testes de clima, pneus, box e punições: 47 aprovados. Testes das temporadas individual e em grupo aprovados, além de testes específicos da opção de 10 voltas.
- Simulação de Silverstone com 19 bots, cinco voltas e mesma semente: melhores voltas de 46,6 a 49,8 segundos após a calibração (51,15 a 55 segundos antes); é uma simulação, não reprodução exata da corrida do jogador.
- Em Mônaco, três simulações secas de 20 bots e três voltas não reproduziram batidas registradas nas curvas indicadas. O relato de contato com o muro permanece em investigação; não houve ajuste especulativo do traçado.
- Teste de navegador confirma Enter com pedido de box existente. A opção de 10 voltas é verificada no navegador.
- A tabela de pneus foi regenerada; Sorvete continua sem medição confiável, como antes.
- O npm test completo foi iniciado, mas interrompido antes do fim; o teste conhecido de escudos da carreira de futebol já havia falhado. Nenhuma correção foi feita em futebol ou Dominó.
