# Os jogos de mesa usam um esqueleto só

Quinto passo da refatoração: tirar o código repetido do servidor, começando pelos jogos de mesa.

## O que muda

- **`ligarMesa` (`salas.js`):** Uno, Truco, Dominó, Ludo, Bloqueio, Sinuca e Botão repetiam, quase letra por letra, o
  mesmo bloco de conexão:
  - `create`, que cria a mesa;
  - `join`, que deixa voltar com o token, assistir ou sentar;
  - `act`, que chama as ações;
  - `react`, as reações com emoji;
  - `disconnect`.

  Agora esse bloco mora num lugar só. Cada jogo passa só o que é dele:
  - o limite de jogadores;
  - os campos da sala nova;
  - o jogador novo e as ações;
  - os eventos a mais: a mira da Sinuca e do Botão, o goleiro do Botão e o sinal do Truco;
  - as frases próprias do registro: "Mesa montada por..." do Botão e "... chegou." da Sinuca e do Botão.
- **Para quem joga, nada muda:** as mesmas mensagens, os mesmos limites, o mesmo estado. As regras de cada jogo
  (`handle`, `addPlayer`) só saíram de dentro do bloco de conexão e continuam no módulo de cada jogo, iguais. O
  `git diff -w` mostra só o bloco que saiu.
- **Os sete módulos perderam cerca de 390 linhas.** Contando a peça nova do `salas.js`, o projeto fica cerca de 310
  linhas menor. Cada módulo importa do `salas.js` só o que ainda usa.
- **Jogo de mesa novo:** usar o `ligarMesa` em vez de copiar o bloco (está no `CLAUDE.md`).

## Testes

- `salas` (a forma do estado de cada canal, com entrar e sair), `servidor` (partidas de verdade), `regras`, `bloqueio`,
  `lobby` e `rumi`: 33 passando.
- No navegador, `salas.spec.js` (dois entram e jogam em cada jogo), `mesa.spec.js` e `paginas.spec.js`: 41 de 42
  passando, com as sete mesas todas verdes.
- O que falhou foi "corrida: dois entram, começa e roda sem erro", e a Corrida não mudou neste PR. Esse teste passa
  sozinho na `main` e falha quando a máquina está carregada. Fica anotado como teste instável.
