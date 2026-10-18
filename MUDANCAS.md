# Vila da Galera na Avenida Paulista

## O que muda

- Reestiliza a Vila com uma avenida urbana: pista de asfalto grafite, ciclovia vermelha, faixas de pedestres, calçadas de mosaico e praça com jardins.
- Transforma o telão da estante em um pórtico vermelho suspenso, inspirado no vão livre do MASP. Atualiza fachadas com vidro azulado, mobiliário urbano, placas, terrenos em obra e a interface em grafite e vermelho.
- Faz o jogador iniciar na praça para enxergar a avenida e o pórtico desde a chegada. Identifica o centro no mapa e no cabeçalho como Av. Paulista.
- Remove o jogo de tênis de mesa e coloca o Haxball no antigo lote dele, com uma quadra de discos no telhado.
- Reduz o mapa de 320 × 260 para 64 × 64 casas e reúne todos os jogos e líderes em um único bairro caminhável. Retira estádios, rodovias, estacionamentos, carros e navegação entre zonas.
- Atualiza servidor, documentação e teste de layout para a nova organização.

## Verificação

- `node --test tests/servidor.test.js tests/vila-mato.test.js` — 24 testes passaram.
- `npx playwright test tests/e2e/vila-layout.spec.js tests/e2e/vila-ginasio.spec.js` — 6 testes passaram.
- `git diff --check` — sem problemas.
- Conferência visual no navegador em 1365 × 768 e 390 × 844, sem erros de JavaScript e com todas as portas alcançáveis.
