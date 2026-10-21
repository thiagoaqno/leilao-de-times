# Corrida: modo Drag no jeito do Need for Speed Underground 2

## O que muda

- **Quatro faixas e troca de faixa semiautomática.** ←/→ só trocam de faixa; o carro se alinha sozinho. Com alguém do lado, a troca é recusada; um raspão no meio da troca devolve o carro para a faixa dele.
- **Aquecimento dos pneus e largada.** Antes das luzes, segurar o ponteiro na faixa verde do conta-giros esquenta os pneus (mais tração na 1ª e 2ª). No verde, o giro decide a largada: perfeita, boa, patinou (alto demais) ou fraca.
- **Câmbio manual obrigatório.** A luz do conta-giros mostra a hora da troca: verde é troca perfeita (um tranco a mais), azul é boa, fora disso é cedo (o carro morre na marcha seguinte) ou tarde. Ficar no corte de giro esquenta o motor até estourar.
- **Nitro (N2O)** com medidor próprio; nas primeiras marchas ele só faz o pneu patinar. **Vácuo:** logo atrás de um rival, a barra enche e o ar pesa menos.
- **Tráfego e obras.** Carros comuns em cada faixa e obras que fecham uma faixa (com cones e placa de seta antes). Bater de frente é **perda total** e acaba a corrida. Freio no S/↓.
- **Rivais de verdade:** três pilotos com níveis diferentes que trocam marcha, usam nitro, desviam e às vezes também dão perda total. Eles usam os outros modelos de carro da garagem.
- **Três pistas noturnas:** Ponte Estaiada (cabos e refletores verdes), Debaixo do Elevado (luz de sódio e alambrado vermelho) e Porto à Noite. Neon embaixo dos carros, brilho nas luzes, lanternas acesas no lugar das lanternas de cada modelo, fumaça dos pneus.
- **HUD no jeito do jogo:** conta-giros grande à esquerda com a marcha, N2O à direita, posição, tempo e velocidade no alto, a árvore de luzes da largada e a classificação no fim.
- O Ctrl saiu dos controles (Ctrl+W fechava a aba): reduzir é Q.

## Verificação

- `node --test tests/corrida-drag.test.mjs` (regras: trocas, aquecimento, nitro, vácuo, perda total, tráfego, corrida inteira e equilíbrio dos rivais).
- Fotos das três pistas e de cada carro visto de trás, com as lanternas.
- Os testes E2E do drag foram atualizados (`tests/e2e/corrida-drag*.spec.js`), mas não rodaram aqui: o navegador por software deste ambiente fica em 1 quadro por segundo.
