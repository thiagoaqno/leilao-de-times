## Safety car nas corridas F1

### Causa
- A direção de prova acionava o safety car obrigatoriamente ao líder chegar à volta 3 em qualquer corrida com pelo menos 4 voltas.
- Com o pelotão comprimido durante a neutralização, a resolução de colisões no servidor deslocava lateralmente o carro dos jogadores humanos e podia jogá-los para fora da pista.

### O que mudou
- Cada corrida com pelo menos 4 voltas agora tem 40% de chance de safety car, com o momento sorteado entre as voltas intermediárias. O sorteio usa a semente da corrida, preservando a consistência da sala.
- Durante o safety car, o servidor deixa de aplicar o empurrão de colisões aos carros humanos. Fora da neutralização, as colisões continuam como antes.
- O cenário de regressão existente acompanha o novo momento sorteado; outro cobre uma corrida de 5 voltas sem safety car.

### Verificação
- Código e diff revisados. Testes finais não foram executados, conforme solicitado.
