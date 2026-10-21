# Cozinha: três fases novas com outros layouts

## O que muda

- O Mundo 3, “Novos caminhos”, acrescenta três cozinhas ao mapa de progressão.
- **3-1 — Dois lados:** o cardápio de sushi volta numa cozinha dividida, com uma passagem ao sul entre as duas áreas.
- **3-2 — Ilhas de bancada:** saladas e hambúrgueres voltam com bancadas espalhadas pelo salão.
- **3-3 — Balcão em U:** o mesmo cardápio é preparado em uma planta com um balcão central e uma única saída interna.
- As receitas, os ingredientes e as ações continuam os mesmos. Cada mapa usa as metas e os prazos calculados para as distâncias da nova cozinha. As músicas das fases 1, 2 e 3 também servem às fases correspondentes do novo mundo.

## Verificação

- `node --test tests/cozinha.test.js tests/salas.test.js`
- `npx playwright test tests/e2e/cozinha-fases.spec.js`
- Capturas das três cozinhas em funcionamento no navegador.
