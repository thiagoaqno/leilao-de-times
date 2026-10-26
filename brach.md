# Corrida, regras de F1: o vácuo de verdade e o ar sujo

O vácuo antigo era do modo arcade e, com as regras de F1, atrapalhava: dava até +12% de velocidade final (o mesmo teto do DRS e do ERS somados, então quem estava no vácuo não ganhava nada abrindo o DRS) e ainda o "estilingue" (+8% de velocidade e +80% de aceleração por 1,2 s ao sair de trás do outro carro). Agora, só com as regras de F1 (`config.regras === "f1"`; sem elas o vácuo e o estilingue continuam como antes):

- **Vácuo na reta, pequeno:** até +3% de velocidade final e +15% de aceleração colado no carro da frente (`F1Regras.vacuoF1`). O DRS (+5%) volta a ser o que decide a ultrapassagem: o teto passou a 11% e o DRS soma por cima do vácuo.
- **Ar sujo na curva:** colado atrás de outro carro numa curva, o carro de trás perde até 10% da aderência e escorrega mais, como na F1 de verdade. O HUD mostra "🌀 AR SUJO".
- **Sem estilingue** nas regras de F1.
- A ajuda do pelotão já era desligada nas regras de F1 e continua assim.

## Testes

Só os da Corrida: `node --test tests/corrida*.test.js`, 52 passando, com o novo `tests/corrida-f1-vacuo.test.js` (o vácuo menor que o DRS, o DRS somando por cima, o ar sujo só na curva e crescendo com a distância).
