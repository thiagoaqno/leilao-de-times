# Ginásio: velocidades diferentes, ré mais lenta, bote dos golpes de perto e o robô em três dificuldades

## O problema, medido

Antes de mudar, medi com duelos no próprio motor (100 lutas por medida). Os dois lados eram o mesmo Pokémon: um só
com golpes de perto, que persegue e rola para a frente, e outro só com tiros, que recua atirando com reflexo perfeito.

- **O de perto vencia 0%.** Andar para trás era tão rápido quanto para a frente, e o golpe de perto alcança 1,2 casa
  contra os 5 a 7,5 do tiro.
- **A velocidade quase não mudava:** de 2,5 a 4,5 casas por segundo, e metade de todos os Pokémon entre 3,1 e 3,75.
- **O robô** batia menos de 0,1 s depois de o golpe recarregar, mirava calculando a trajetória e fugia de cerca de 3
  em cada 4 tiros. Quem recuava atirando vencia 3% contra ele.

## O que muda

1. **Cada Pokémon com a sua velocidade:** de 2,2 casas por segundo (Shuckle) a 5,2 (Ninjask); Snorlax 2,7, Pikachu
   3,8, Jolteon 4,5. A previsão da tela continua igual à do servidor (a velocidade não muda com o nível).
2. **Andar de ré custa:** quem anda para longe de onde está mirando vai a 60% da velocidade; de lado, a 90%. Fugir
   atirando ficou mais difícil, e quem persegue alcança.
3. **O bote dos golpes de perto** (corpo a corpo, combo e agarrão):
   - Com o alvo na frente, a até 2,2 casas além do alcance, o Pokémon avança rápido até ele e só então bate.
   - Durante o bote e o combo ele fica firme: golpe tira vida, mas não empurra nem deixa tonto.
   - Depois do bote, fica um instante parado, que é a brecha de quem apanhou.
   - Quem aparar na hora certa ainda desequilibra quem atacou.
   - Na tela, o corpo vai esticado, sobe a poeira e soa um arranque.
4. **O robô em três dificuldades**, escolhidas na sala (linha "Robô"):
   - **Fácil:** demora para reagir, esquiva pouco, erra mais a mira e respira bastante depois de bater.
   - **Normal** (o padrão): reage em 0,3 a 0,6 s e esquiva em cerca de 1 de cada 3 perigos.
   - **Difícil:** o robô de antes, ainda mais afiado. Os líderes ficam sempre nele.
   - O selvagem da grama alta vai pela raridade: comum, fácil; incomum e raro, normal; épico e lendário, difícil.
   - O robô agora vê o perigo na hora, mas só decide depois do tempo de reação, uma decisão por perigo.
   - Os tempos dele contam pelo relógio da partida.

## Medido depois (100 lutas por medida)

| Duelo | Antes | Depois |
| --- | --- | --- |
| O de perto contra quem recua atirando | 0% | 42% |
| Quem recua atirando contra o robô Fácil | 3% | 92% |
| Quem recua atirando contra o robô Normal | 3% | 41% |
| Quem recua atirando contra o robô Difícil | 3% | 0% |

Quem recua atirando nessa medida é um script com reflexo perfeito. Uma pessoa mira pior, mas também esquiva e levanta a
guarda.

As lutas de robô contra robô ficaram mais curtas (de 1,7 para cerca de 1 min em média), porque agora os golpes de
perto acertam. O piso do teste de duração foi de 1,5 para 0,8 min.

## Arquivos

- `public/ginasio/regras.js`:
  - `VEL_MIN`/`VEL_MAX` e `velocidade`;
  - `RE` e `fatorDaRe`;
  - o bote (`BOTE_*`, `boteDe`, `e.bote` em `executarGolpe` e em `mover`, firme em `aplicarDano`);
  - `DIFICULDADES` e `PERFIL_ROBO` no `pensarRobo`, com a reação atrasada, o erro de mira, a pausa e o tempo pelo
    relógio da partida.
- `ginasio.js`:
  - `robo` na sala (o líder, difícil);
  - o selvagem pela raridade;
  - `bote` no pacote.
- `public/ginasio/sala.js`, `index.html` e `estilo.css`: a escolha do robô.
- `public/ginasio/rede.js`, `animacao.js` e `sons.js`: o bote na previsão, no desenho e no som.
- `CLAUDE.md`: o mapa atualizado.

## Testes

- `tests/ginasio-equilibrio.test.js` (novo):
  - a velocidade espalhada;
  - a ré a 60%, com a previsão igual ao servidor;
  - o bote: avança, acerta e fica firme; sem bote de longe demais ou de costas;
  - as três dificuldades e o líder no difícil;
  - os duelos medidos: o de perto entre 30% e 75%; o robô fácil > normal > difícil.
- `tests/ginasio-fisica.test.js` (sem mudança) segue passando: o bote não vai atrás de quem está no ar ou sumido.
- `tests/ginasio-servidor.test.js`: os dois clientes jogam no difícil, com o relógio da sombra acertado a cada pacote.
- `tests/ginasio.test.js`: o piso de duração do robô contra robô foi de 1,5 para 0,8 min.
- `npm test`: só falham "carreira: comprar na janela…" e o formato de `/carreira-online` em `salas.test.js`, que já
  falhavam na `main`.
- O teste "dois clientes e robôs jogam até o fim" às vezes falha por tempo:
  - na `main`, 2 em 8;
  - aqui, 1 em 8.
- E2E não rodado, como combinado.
- Conferido no navegador: a escolha do robô na sala e uma luta rodando sem erros.
