# Futevôlei: o golpe na hora certa e o boneco vivo

Continuação do Futevôlei (#95), com o que apareceu jogando: o jogador tocava na bola e só depois fazia a animação, os
golpes eram lentos e o boneco ficava duro parado.

## O golpe na hora certa
- **O golpe começa antes do toque:** cada animação tem o seu momento de impacto (`impacto`). O jogo prevê quando o
  jogador com o toque armado vai pegar na bola (`F.previsaoToque`, com as mesmas contas do toque) e começa o golpe para
  o pé, a cabeça ou o peito chegarem junto com ela (`antecipar`). Quando o toque acontece, só acerta o relógio
  (`confirmar`).
- **Online:** os eventos levam a hora do servidor (`e.t`) e esperam a bola chegar na tela (a tela mostra tudo 100 ms
  "no passado").
- **Saque:** tem o balanço da perna antes do chute (0,3 s, evento `preSaque`).
- Medido no navegador: 15 de 16 toques com o golpe já em andamento, chegando no impacto com no máximo 20 ms de
  diferença.

## Mais rápido e fluido
- Golpes mais curtos.
- Cada junta vai atrás da pose com uma mola, então nada pula de uma pose para outra.

## O boneco vivo
- **Parado:** respira e troca o peso de perna. Esperando a bola, fica na base quicando.
- **Correndo:** inclina o corpo e, de lado, faz o passo lateral.
- **Manias, de vez em quando, parado:** alongar, mão na cintura, girar o pescoço, ajeitar a areia com o pé.
- **Comemorações**, sorteadas a cada ponto: pulos com os braços para cima, soco no ar, dancinha, aviãozinho.
- **Frustrações**, sorteadas a cada ponto: mãos na cabeça, agachar com as mãos nos joelhos, reclamar de braços abertos,
  chutar a areia.
- A pausa entre os pontos subiu de 1,9 s para 2,3 s, para dar tempo de comemorar.
- Robôs do Difícil um pouco menos perfeitos (robô contra robô passava de 20 minutos).

## Arquivos
- `public/futevolei/atleta.js` (reescrito: clipes com impacto, base viva, grupos e suavização);
- `public/futevolei/regras.js` (`previsaoToque`, hora nos eventos, preparo do saque);
- `public/futevolei/jogo.js` (antecipar e confirmar, eventos online na hora certa);
- `futevolei.js` (hora do servidor em cada evento);
- `CLAUDE.md`.

## Conferido
- `npm test`: 158 testes passando.
- `paginas.spec.js` (`/futevolei/`) passando.
- No navegador: o tempo dos golpes medido e as poses fotografadas.
