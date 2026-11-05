# Auxílio de frenagem e entrada da Corrida

A entrada mostra uma capa nova até o primeiro desenho da garagem, sem espera artificial. A linha de auxílio, desligada por padrão e configurável no menu ou na corrida, usa o traçado otimizado dos robôs, fica fixa e 80% transparente, e diferencia aceleração, alívio e frenagem conforme a velocidade e as curvas adiante. O minimapa ficou 40% maior. A tela em tela cheia antes da corrida rápida e do contrarrelógio foi removida; ao escolher Largar, o menu permanece visível até a corrida ou classificação começar, sem exibir a sala intermediária.

As faixas de velocidade relativa para punição de colisão sobem 10%. O causador recebe 12%, 20% ou 35% de dano nas infrações leve, média ou com stop-and-go; a proteção do atingido continua igual.

A Central da carreira abre sobre uma foto, prepara uma garagem 3D mais leve quando o navegador está ocioso e mostra a chegada do carro quando pronto. O desenho da cidade e os rótulos do Desenvolvimento foram otimizados. Em Interlagos, os objetos de cenário são divididos em regiões menores para cortar mais geometria e sombras fora da câmera.

## Verificação

- Testes focados de punições: `node --test tests/corrida-punicoes.test.js` (19 aprovados).
- Entrada e capa conferidas no navegador; opção de linha presente no menu e desligada por padrão.
- Medição de cena em Interlagos: 303.914 → 246.969 triângulos visíveis e 92.560 → 39.335 triângulos de sombra, com 198 → 223 chamadas na vista medida.
- A suíte completa não foi executada, conforme solicitado. A linha e sua transparência foram conferidas em um teste de navegador com o traçado real; a condução ainda precisa de calibração em uma corrida real.
