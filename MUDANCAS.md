# Carreira: treinar um jogador para outra posição

- **Antes**, a posição de cada jogador era a da base e nunca mudava: um ponta ficava ponta a carreira inteira.
- **Agora**, na ficha de um jogador do seu elenco aparece **Treinar para outra posição**, com as posições parecidas e quantos jogos cada uma leva. No último jogo do treino ele passa a ser daquela posição (aviso na caixa de entrada e notícia no feed), e a escalação, a força do time e o motor já usam a posição nova.
- **Só posições parecidas**, na mesma linha do campo: defesa (ZAG, LE, LD), meio (VOL, MC, MEI) e ataque (PE, PD, ATA). Goleiro não troca.
- **Duração:** 4 jogos do clube mais 2 por ponto de encaixe entre as duas posições (ponta para o outro lado é rápido; lateral para zagueiro é longo), vezes a idade: até 21 anos ×0,6, 22-24 ×0,8, 25-28 ×1, 29-31 ×1,3, 32+ ×1,6. O técnico formador tira 10% por nível. Mínimo de 3 jogos.
- Até 3 jogadores treinando ao mesmo tempo, e dá para cancelar o treino. O treino anda a cada jogo do clube (liga ou copa).

## Como
- `public/carreira/clube-regras.js`: `alvosDeTreino`, `jogosDeTreino`, `TREINOS_MAX`.
- `carreira-clube.js`: ações `treinar` e `parar-treino` (canal `clube`, solo e grupo), `g.treinos` na gestão do clube, andamento em `aposJogo` (`treinarPosicoes`).
- `carreira.js`: `save.posicoes` (id → posição nova, de todos) aplicado em `jogadorDe`/`todosJogadores`; `estado().posicoes` para o navegador.
- Navegador: bloco na ficha (`treinoHTML`, `cartas.js`) e `receber` (`inicio.js`) troca a posição dos já treinados.
- Teste novo em `tests/carreira-clube.test.js`. `tests/salas.test.js` já falha nesta máquina sem as mudanças.
