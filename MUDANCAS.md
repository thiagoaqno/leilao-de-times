# Carreira: personalidade dos jogadores

## O que muda no jogo

- **Cada jogador tem um jeito.** Sete personalidades: líder, profissional, pavio curto, vaidoso, festeiro, guerreiro e reservado. O jeito sai do próprio jogador (não muda no meio da carreira), a posição inclina o sorteio (atacante é mais vaidoso, zagueiro mais líder, goleiro mais reservado ou profissional) e aparece na ficha.
- **O jeito vale em campo.** O líder entre os titulares segura o time quando a moral está baixa (+1 na nota). O pavio curto é suspenso no 2º amarelo, e não no 3º.
- **Cada jeito abre histórias.** 14 eventos novos na caixa de entrada, dois por personalidade, com escolhas que mexem em moral, vestiário, imprensa, caixa, rendimento do jogador e até na evolução de um reserva (o profissional que apadrinha a base, o líder que pede a palavra, o pavio curto que perde a cabeça depois da derrota, o vaidoso que exige status, o festeiro que faz aniversário, o guerreiro que quer jogar com dor, o reservado que precisa de atenção). No máximo um a cada 3 rodadas, cada um uma vez por temporada, e entra no sistema de memória do clube como os outros eventos.

## Como

`public/carreira/personalidade.js` (UMD: `tipoDe`, `de`, `bonusDoLider`, `limiteDeAmarelos`), `carreira-personalidades.js` (os eventos, `alvo: "p:<tipo>"`), `carreira-eventos.js` sorteia e acha o alvo pelo tipo, `carreira.js` soma o líder em `timeDe` (`titularesAprox`) e usa o limite de amarelos em `cartoesELesoes`; a ficha (`cartas.js`) e o guia mostram. Testes em `tests/carreira-personalidade.test.js`.

## Também neste PR: aba Rival na Sede

- A **Leitura do rival** saiu da prévia do jogo (que ficou limpa de novo) e ganhou uma aba própria na Sede, entre Meu time e Temporada: o escudo do adversário, onde é o jogo, a leitura da formação e do estilo dele contra os seus, e os botões de resposta (trocam a formação na hora). `rivalNaSede` em `sede-hub.js`, `#cartaoRival`; teste no navegador em `tests/e2e/carreira-rival.spec.js`.
