# Cozinha da Galera: o Overcooked da galera

Jogo novo e o primeiro **cooperativo** da Vila: de 1 a 4 cozinheiros na mesma cozinha, contra o relógio. Pique, cozinhe,
monte o prato, entregue antes de o cliente desistir e lave a louça. O plano das próximas fases está em
`planos/cozinha.md`.

### A base paramétrica (`public/cozinha/regras.js`, a mesma no servidor e no navegador)
- Tudo o que é comida é dado: **ingredientes** (a cadeia de estados de cada um: cru → picado → cozido/frito),
  **processos** (picar na tábua, cozinhar na panela, fritar na frigideira), **recipientes**, **receitas** (as do
  Overcooked: sopas de cebola, tomate e cogumelo, saladas, hambúrgueres e sushi) e **cozinhas** (um desenho de texto
  com a legenda). Cozinha ou receita nova não mexe no motor.
- A regra de "encostar uma coisa na outra" do Overcooked (`juntar`): ingrediente na panela, panela pronta no prato,
  prato na panela, ingrediente no prato... O prato só aceita o que é de alguma receita do cardápio.
- Panela esquecida no fogo apita e queima (vai para o lixo). Ingrediente novo numa panela pronta faz ela voltar a
  cozinhar.
- Pedidos com paciência, gorjeta por entregar rápido, multa no pedido perdido, pratos sujos que voltam para a pia e
  1 a 3 estrelas no fim (a meta muda com o número de cozinheiros).

### O jogo
- Servidor `cozinha.js` (canal `/cozinha`): cada navegador mexe o próprio cozinheiro e o servidor confere; pegar,
  soltar, picar, lavar, o fogão e os pedidos são do servidor, que manda a cozinha na hora em que ela muda. O relógio
  do jogo anda com o relógio de verdade (o `setInterval` do Windows atrasava).
- Página 3D com os bonecos e skins da Pelada de chapéu de cozinheiro, a bancada da frente acesa, barras de progresso,
  o aviso de queimar, fumaça, as comandas dos pedidos com o desenho do prato e os ingredientes, moedas, relógio, sons
  sintetizados, toque no celular e controle.
- Três cozinhas: **1-1 Sopa de cebola**, **1-2 Sopas da casa** (com a bancada do meio dividindo a cozinha) e
  **1-3 Lanchonete** (saladas e hambúrguer).
- Na Vila, o restaurante fica na praça, no lugar dos três food trucks do lado oeste (toldo listrado, telhado de telha e
  a chaminé soltando fumaça). Entra na Noite da Galera (com estrela, todos ganham) e na lista de salas.

## Testes
- `tests/cozinha.test.js`: confere toda cozinha do catálogo (lugares no chão, bancadas alcançáveis, todas as receitas
  possíveis com as caixas e bancadas que ela tem), o `juntar`, uma sopa inteira da caixa à pia, queimar e o lixo, a
  panela que volta a cozinhar, pedido perdido e estrelas, colisão e impulso, e uma sopa entregue pelo servidor com o
  relógio acelerado (`COZINHA_VEL`).
- `/cozinha` em `tests/salas.test.js` (regravado) e em `tests/e2e/paginas.spec.js`.
