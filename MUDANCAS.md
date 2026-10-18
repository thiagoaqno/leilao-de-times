# Paulista Aberta: nova Vila da Galera

## O que muda

- Refaz a Vila como um passeio de pedestres colorido: alamedas de tijolos, ciclovia coral, gramados, travessias e praça circular com fonte.
- Quebra as fileiras rígidas em quarteirões menores. Os jogos de mesa ficam ao norte, os quiosques cercam a praça, os esportes e jogos de velocidade ficam ao sul e os líderes fecham o passeio.
- Renova os prédios com fachadas quentes, vitrines turquesa, placas claras e telhados temáticos; o painel da estante ganha cobertura de lona e um convite para jogar quando ainda está vazio.
- Simplifica a interface em creme e verde, com controles compactos no celular. O minimapa abre sob demanda; o jogador chega em frente à fonte com a câmera móvel enquadrando a praça.
- Remove o jogo de tênis de mesa e coloca o Haxball no antigo lote dele, com uma quadra de discos no telhado.
- Reduz o mapa de 320 × 260 para 64 × 64 casas e reúne todos os jogos e líderes em um único bairro caminhável. Retira estádios, rodovias, estacionamentos, carros e navegação entre zonas.
- Atualiza servidor, documentação e teste de layout para a nova organização.

## Verificação

- `node --test tests/servidor.test.js tests/vila-mato.test.js` — 24 testes passaram.
- `npx playwright test tests/e2e/vila-layout.spec.js tests/e2e/vila-ginasio.spec.js` — 6 testes passaram.
- `git diff --check` — sem problemas.
- Conferência visual em `planos/imagens/vila-paulista-aberta-desktop.png` e `planos/imagens/vila-paulista-aberta-mobile.png` (1365 × 768 e 390 × 844), sem erros de JavaScript, prédios sobrepostos ou portas inacessíveis.
