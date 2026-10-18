# Vila compacta com Haxball no antigo lote do tênis de mesa

## O que muda

- Remove o jogo de tênis de mesa e coloca o prédio do Haxball no lote de 7 × 4 casas que ele ocupava, com uma quadra de discos no telhado.
- Reduz o mapa de 320 × 260 para 64 × 64 casas. Todos os jogos e os quatro ginásios dos líderes ficam em um único bairro caminhável.
- Retira os estádios, rodovias, estacionamentos, carros e a navegação entre zonas. O minimapa agora mostra toda a Vila.
- Reorganiza os caminhos da praça e a Alameda dos Líderes. Renova gramados, calçamento, fachadas, placas e painéis com uma paleta clara de bairro.
- Atualiza o servidor, a documentação e os testes para o novo mapa.

## Verificação

- `node --test tests/servidor.test.js tests/vila-mato.test.js`
- `npx playwright test tests/e2e/vila-ginasio.spec.js --grep "caminha ate a porta"`
- `npx playwright test tests/e2e/vila-layout.spec.js`
- Conferência visual em navegador nas resoluções 1365 × 768 e 390 × 844, sem erros de JavaScript; todas as portas alcançáveis a partir do Haxball.
