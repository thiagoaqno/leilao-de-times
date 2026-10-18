# Remoção do tênis de mesa

## O que muda

- Remove o prédio de tênis de mesa da Vila e as páginas `/pingpong/` e `/table-tennis-pro/`.
- Remove o canal online `/pingpong`, a implementação do jogo, seus recursos 3D e as referências na Noite da Galera.
- Atualiza a documentação e os testes. O teste da Noite usa Truco e Uno para conferir sala compartilhada e convite entre jogos.

## Verificação

- `node --test tests/servidor.test.js tests/salas.test.js`
- `npx playwright test tests/e2e/paginas.spec.js --grep "tênis de mesa removido|a página / abre sem erro"`
- As duas URLs removidas retornam 404.
