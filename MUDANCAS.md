# Corrida: batidas menos punitivas e qualidade gráfica que não cai à toa

## Batidas
- **Muro:** antes, enquanto o carro encostava no muro, a velocidade era multiplicada por 0,82 (no Turbo 88) **a cada quadro**. Raspar o muro por um sexto de segundo tirava quase 90% da velocidade. Agora a batida tira a velocidade que ia contra o muro (com um quiquezinho) e, do que sobra, perde mais quanto mais de frente bateu: de raspão segue quase igual. Encostado, só sobra um atrito leve por segundo. O `wall` de cada carro continua valendo (o Blindado sofre menos).
- **Carro com carro:** o quique caiu de 0,35 para 0,2. A batida empurra, mas não joga o carro longe.

## Gráficos que baixavam sozinhos
O ajuste automático de qualidade baixava a resolução e tirava as sombras em computadores que estavam bem:
- Ele media desde o carregamento da pista, quando todo computador engasga montando shaders e texturas. Agora ignora os primeiros 6 s de cada corrida e trechos em que a aba ficou escondida.
- Ele exigia 50 qps fixos. Numa tela de 50 Hz, ou com o navegador economizando bateria (preso em 30 qps), ele baixava sempre, e baixar não muda nada nesses casos. Agora compara com o melhor que a própria tela já fez.
- Depois de baixar, ele confere: se os quadros não melhoraram pelo menos 10%, o limite era da tela e não da placa. Aí ele volta o nível e para de mexer.
- Dá para fixar pelo console: `localStorage["corrida:qualidade"] = "alta"` (ou `"baixa"`).
- O renderer não guarda mais a tela a cada quadro (`preserveDrawingBuffer`), o que custava desempenho sem ninguém usar.

## Testes
- `node --test tests/corrida-colisao.test.js tests/corrida-experiencia.test.js tests/corrida-robos.test.js`: tudo passa, menos "turbo do cogumelo", que já falha no `main` sem esta mudança.
- Conferido no navegador: corrida em Interlagos, encostando no muro, sem erro no console e sem baixar a qualidade no começo.
