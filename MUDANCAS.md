# Corrida: robôs no ritmo de quem joga

## O problema

Os robôs ou eram imbatíveis ou eram muito lentos. O banco guardava só a melhor volta de cada piloto (e só dos cinco pilotos mais rápidos), e cada robô copiava a volta de um piloto diferente, a 80/87/93% da velocidade: um robô andava quase no seu recorde, sem nunca errar, e outro copiava a volta de quem jogou uma vez e andou devagar.

## O que muda

- **O banco guarda as cinco melhores voltas de cada piloto** em cada pista (`corrida_voltas_piloto`, migração 017, que traz as voltas que já estavam guardadas).
- **O ritmo dos robôs é a média dessas voltas** de quem está na sala (cada piloto pesa igual). Se ninguém da sala tem volta naquela pista, vale a média de todo mundo que já correu nela.
- **Cada robô ajusta a própria velocidade para fechar a volta nesse ritmo vezes o nível**, seja qual for o traçado que ele copia: fácil 12% mais lento que a média, médio 3% mais lento, difícil 2% mais rápido. Entre os robôs há uns 3% de diferença, para não andarem em fila.
- O traçado (por onde o robô passa) continua sendo a melhor volta de cada um dos cinco pilotos mais rápidos. Ele só muda quando alguém bate a própria melhor volta.
- Na largada, o registro da sala mostra o tempo de volta que os robôs vão buscar.
- Sem volta de ninguém na pista, nada muda: os robôs seguem o traçado calculado, como antes.

## Verificação

- `node --test tests/corrida-robos.test.js tests/corrida-recordes.test.js tests/corrida-experiencia.test.js tests/corrida-colisao.test.js tests/bd.test.js tests/salas.test.js`.
- Simulação em Interlagos, Mônaco, Tóquio e Nürburgring, com dois ritmos diferentes: os robôs fecham a volta a 1–2% do tempo que miram, nos três níveis. A exceção é quando o carro não tem velocidade para chegar no tempo pedido.
