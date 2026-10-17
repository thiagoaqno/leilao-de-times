# Tênis de Mesa da Galera renovado

## O que muda

- O Pingue-Pongue ganhou uma arena de arcade com mesa azul, piso coral, barreiras, bola branca, raquete vermelha e placar novo. A física de saque, quique, efeito, rede e pontuação até 11 continua compartilhada entre treino e jogo online.
- A bola agora cruza a mesa mais rápido em uma batida neutra; empurrar a raquete acelera e aplica top spin, enquanto puxar produz uma cortada mais lenta. A raquete acompanha o mouse até perto da rede, o gesto vertical funciona mesmo no limite da mesa, o robô se desloca com aceleração e a simulação usa passos fixos para manter o ritmo quando os quadros oscilam.
- O menu agora oferece amistoso, torneio de quatro partidas e mundial de oito partidas contra o computador. O jogador escolhe país, dificuldade e skin. A etapa do campeonato fica salva no navegador por país e modo, e a dificuldade sobe nas partidas finais.
- O 1x1 online com sala da Vila continua disponível em **Com amigos**. A placa e o telhado da Vila mostram o novo nome e as cores da mesa.

## Verificação

- `node --test tests/pingpong.test.js`
- `node --test --test-name-pattern=pingpong tests/servidor.test.js`
- `npx playwright test tests/e2e/pingpong.spec.js --reporter=line`
