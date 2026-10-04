# Efeito no Pingue-Pongue + robô do Tênis mais esperto

## Pingue-Pongue: efeito na bola
- O movimento do mouse na hora da batida agora dá **efeito**:
  - **empurrando forte para a frente: top spin.** A bola cai mais rápido no ar e acelera para a frente no quique;
  - **puxando para trás: cortada.** A bola flutua e freia no quique;
  - **batendo de lado: efeito lateral.** A bola faz a curva no ar e espirra para o lado no quique.
- A bola continua caindo onde a batida mirou: o efeito aparece no caminho (a curva) e no quique (que pega quem recebe
  desprevenido). Depois do quique o efeito cai pela metade.
- **Na tela:** a bola tem uma faixa e gira com o efeito, deixa um rastro colorido (vermelho = top spin, azul = cortada,
  roxo = lateral) e o nome do efeito aparece embaixo rapidinho ("Top spin", "Cortada", "Efeito lateral").
- O robô também joga com efeito (ele bate de lado para mirar, então as bolas dele fazem curva).
- **Online:** o efeito vai junto no pacote da batida, e os dois navegadores calculam a mesma curva (o efeito é uma
  aceleração constante: conta fechada, igual nos dois). O servidor limita o valor.
- A minha raquete ficou meio transparente (ela fica bem na frente da câmera).

## Tênis: robôs
- **Bug consertado:** o robô armava o golpe "fingindo" que tinha armado 0,5 a 0,7 s antes, para bater forte. Desde
  que o golpe armado passou a esperar só 0,5 s, o golpe vencia antes da bola chegar: no difícil ele não devolvia
  nenhuma bola. Agora o golpe do robô tem prazo e força próprios.
- **Corre para o lugar certo:** antes ele mirava o último ponto do voo da bola (às vezes atrás do muro) e ficava
  parado no fundo. Agora ele escolhe o primeiro ponto, depois do quique, aonde consegue chegar a tempo.
- **Arma no último instante:** armado ele anda devagar, então só arma quando a bola vai estar no alcance do braço
  em 0,2 s.
- **Joga pensando:** manda a bola no lado vazio da quadra, longe de quem vai receber; com o rival na rede, balão
  ou bola rápida na paralela; com o rival no fundo, às vezes a curtinha.
- **Dificuldade:**
  - fácil: reage devagar (0,6 s), erra mais e joga quase sem pensar;
  - médio: reage em 0,45 s;
  - difícil: reage em 0,3 s, bate mais forte, erra menos e quase sempre joga pensando.
  - O saque do robô erra como o de gente (não tem mais dupla falta demais no fácil).
- Robô contra robô (simples), devoluções por ponto: antes 2,7 no fácil, 0,35 no médio e 0 no difícil; agora 7,9 no
  fácil, 9,8 no médio e 18,6 no difícil.

## Testes
- `tests/pingpong.test.js`: com efeito a bola cai do outro lado, o top spin acelera no quique e a cortada freia.
- `tests/regras.test.js`: robô contra robô devolve bola em todas as dificuldades (e o difícil troca mais bolas).
- `tests/servidor.test.js`: o efeito vai no pacote do pingue-pongue (e o servidor limita o valor).
- `npm test` (41) e os testes no navegador do Pingue-Pongue e do Tênis passando.
