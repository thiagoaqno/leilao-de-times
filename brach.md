# Acaba com as microtravadas dos robôs de F1

O servidor avançava os robôs sempre 50 ms a cada ciclo, mas carimbava a posição com a hora real, e o timer não bate certinho. No Windows, ele roda a cada ~62 ms: os robôs andavam ~20% mais devagar que o tempo real e a tela via o carro frear e acelerar. Em servidor Linux o timer é mais preciso, então o efeito deve ser menor (não medido lá).

Agora os robôs de F1 andam o tempo real que passou, em passos inteiros da física (`Robos.tempoDoPasso`), e a pose leva a hora exata em que eles estão (`room.relogioRobos`). As outras regras não mudam.

## Medição

22 robôs em Mônaco, com timer real, o mesmo envio de 30 ms e o mesmo suavizador do navegador (`Pose.Outro`), desenhando a 60 Hz, numa máquina Windows.

| Tremida na velocidade desenhada | Antes | Depois |
| --- | --- | --- |
| p50 | 3,5% | 0,3% |
| p95 | 22,2% | 2,7% |
| p99 | 49,2% | 4,6% |
| Quadros que parecem travar | 1,35% | 0% |

Os tempos de volta em tempo real ficam mais rápidos no Windows, porque os robôs não perdem mais os ~20%.

## Testes

Novo `tests/corrida-relogio-robos.test.js`. Não rodei a suíte local (regra do projeto); o CI confere.
