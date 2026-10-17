# Tênis de Mesa: controle, física e raquete do Table Tennis Pro

## O que muda

- **Controle igual ao original.** A raquete vai para onde está o mouse (ou o dedo), sem segurar nada. Ela não anda nem bate sozinha: só devolve se estiver no caminho da bola. Parada, devolve alto e devagar; mexendo para a frente na hora, bate forte; para o lado, mira e faz a curva. Forte demais ou de lado demais, a bola sai.
- **Saque igual ao original.** A bola fica parada em cima da mesa, na frente da raquete; passe a raquete por ela para a frente (ou clique).
- **Física lida do próprio jogo.** Abri os arquivos do Table Tennis Pro: o mundo de lá é 10 vezes maior, a gravidade ficou em 9,81 e o tempo roda 2 vezes mais rápido. Em metros, isso dá uma bola que cai com só ~3,9 m/s² (por isso ela flutua), sem resistência do ar e que quica com 0,6 da velocidade. Cada batida mira um ponto da mesa e uma altura sobre a rede, como lá. O efeito é a curva para o lado.
- **Rastro na bola**, como no original.
- **Raquete 3D nova:** o modelo "Ping Pong Paddle", de ethan_garden (Sketchfab, licença CC BY 4.0), com as texturas reduzidas de 5 MB para 150 KB. O crédito fica no menu de pausa e no README.
- O robô fácil ficou mais fácil e o difícil erra menos.

## Verificação

- `node --test tests/pingpong.test.js`
- `node --test --test-name-pattern="pingpong|noite" tests/servidor.test.js`
- `node --test tests/salas.test.js`
- `npx playwright test tests/e2e/pingpong.spec.js --reporter=line`
