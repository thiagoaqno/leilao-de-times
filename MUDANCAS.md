# Os testes esquecidos voltam a rodar

Terceiro passo da refatoração.

## O que muda

- **`npm test` roda todos os arquivos de teste.** A lista no `package.json` era feita à mão e tinha ficado para trás:
  28 arquivos existiam, mas nunca rodavam:
  - Banco, Bloqueio, Digitação, Cozinha, Drag, Lobby e música;
  - comida do Leilão;
  - física, biomas e encenação do Ginásio;
  - encenação do Futevôlei;
  - poderes e recordes da Corrida;
  - 14 da Carreira: estante, festa, leitura, memória, painel de moderação, anfitrião, pausa, personalidade, pressão,
    rivais, rodada, técnicos, troféus e ver time.

  Agora o script é `node --test "tests/*.test.js" "tests/*.test.mjs"`: teste novo entra sozinho. Os 28 passam como
  estão.
- **O teste dos robôs da Corrida ficou estável.** "Robôs miram o ritmo da sala" sorteava o carro e a pilotagem dos
  robôs sem semente, e às vezes as duas voltas gravadas saíam parecidas demais. Agora o teste usa um `Math.random` com
  semente só enquanto roda (`comSemente`). O jogo não muda.
- **O teste dos dilemas da Carreira ficou estável.** "Cada resposta muda o jogo e a conta chega depois" joga antes uma
  temporada sorteada, e às vezes um dilema dela deixava outra conta agendada em `gestao.depois` (dava 2 em vez de 1).
  O teste já zerava a demissão e a confiança dessa temporada. Agora zera também as contas agendadas.

- **A Copa do Mundo da Carreira (correção trazida do PR #298):** "Nos 16 avos, ninguém do mesmo grupo" falhou no
  GitHub neste PR. Não era o teste: em cerca de 8% dos sorteios, a troca que separava os grupos criava outro encontro
  do mesmo grupo. A mesma correção do #298 (`Temporada.separarGrupos`, com o teste `carreira-copa-chave`) vem aqui
  para este PR ficar verde. Quando o #298 entrar, ela não muda mais nada.

## Testes

- Os 28 arquivos que estavam de fora, um por um: todos passando.
- `corrida-robos.test.js` três vezes seguidas: passando.
- `npm test` inteiro com o padrão novo: 595 testes (antes, 451). Falhou só o dos dilemas, que agora está estável.
