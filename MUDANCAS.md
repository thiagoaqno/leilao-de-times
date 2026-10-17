# Table Tennis Pro original na Vila

## O que muda

- O prédio Tênis de Mesa da Vila abre o Table Tennis Pro original dentro de uma página da Vila, usando o jogo hospedado pela GameDistribution.
- A página oferece tela cheia, retorno à Vila e abertura direta em outra aba caso o jogo externo não carregue no iframe. Ela avisa que o provedor pode exibir anúncios.
- O placar da Noite da Galera não recebe resultados do jogo externo. O modo anterior da Galera continua disponível em `/pingpong/` para as salas antigas.

## Verificação

- O iframe carregou a tela inicial do Table Tennis Pro no navegador.
- `npx playwright test tests/e2e/table-tennis-pro.spec.js tests/e2e/paginas.spec.js --grep 'Table Tennis Pro|table-tennis-pro'`
