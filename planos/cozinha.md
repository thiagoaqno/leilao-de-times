# Cozinha da Galera: um Overcooked da galera

Cozinha cooperativa em 3D, de 1 a 4 cozinheiros: pegar o ingrediente, picar, cozinhar, montar o prato, entregar o
pedido antes de o cliente desistir e lavar a louça. Tudo contra o relógio. É o primeiro jogo **cooperativo** da Vila:
a galera ganha ou perde junto (as estrelas do fim).

## Decisões fechadas
- **As mesmas receitas do Overcooked.** Sopas (cebola, tomate, cogumelo), saladas, hambúrgueres e sushi, com os mesmos
  passos (picar na tábua, cozinhar na panela, fritar na frigideira, montar no prato). Nada de inventar receita.
- **Jogabilidade do Overcooked:** um botão pega/solta (e junta: ingrediente na panela, sopa no prato...), outro usa
  (picar, lavar) e o terceiro dá o impulso (dash). O cozinheiro olha para onde anda, e a bancada da frente é a que ele
  usa (fica acesa).
- **Base paramétrica primeiro.** Cozinha, receita e ingrediente são **dados** em `public/cozinha/regras.js`: uma
  cozinha nova é um desenho de texto (`mapa`) com a legenda; uma receita nova é uma lista de `ingrediente:estado`; um
  ingrediente novo é a lista dos passos dele. O motor não sabe nada de "sopa" ou "hambúrguer".
- **Começar simples e escalar:** a primeira versão sai com 3 cozinhas pequenas (sopa de cebola; sopas de cebola e
  tomate; saladas e hambúrguer). Fogo, extintor, arremessar ingrediente, bancadas que mexem e mapas que mudam vêm
  depois, um por PR.
- **Rede (o jeito da Pelada e do Futevôlei):** cada navegador mexe o próprio cozinheiro (a física das bancadas está
  em `regras.js`, a mesma dos dois lados) e manda a posição ~30 vezes por segundo; o servidor confere. **Tudo o que é
  comida é do servidor**: pegar, soltar, picar, cozinhar, entregar e os pedidos. Com o servidor em SP (ping ~30 ms), o
  pegar/soltar volta em menos de 50 ms, o que basta sem previsão.
- **Bonecos e skins da Pelada**, com um chapéu de cozinheiro por cima.
- **Na Vila:** o restaurante fica no lugar dos três food trucks do lado oeste da praça (pastel, açaí e churros). Os do
  lado leste continuam.
- Sem robôs na primeira versão (cozinha boa de robô é difícil; dá para jogar sozinho).

## Como o motor funciona (`regras.js`, UMD `window.Cozinha`)
- **Ingrediente:** `{ t: "cebola", e: "cru" }`. `INGREDIENTES[t].passos` diz a cadeia de estados: a cebola é
  `cru → picar → picado → cozinhar → cozido`; a carne, `cru → picar → picado → fritar → frito`; o pão não tem passo.
- **Processos (`PROCESSOS`):** `picar` (na tábua, segurando o botão de usar), `cozinhar` (na panela, no fogão) e `fritar`
  (na frigideira, no fogão). Passou do ponto na panela/frigideira, queima (`queimado`) e vai para o lixo.
- **Recipientes (`RECIPIENTES`):** panela (até 3), frigideira (1) e prato (a receita). Um recipiente só aceita o que
  está no ponto de entrar nele, e o prato só aceita o que cabe em alguma receita do cardápio da cozinha.
- **Juntar (`juntar(mao, bancada)`):** é a regra do Overcooked de "encostar uma coisa na outra": ingrediente na panela,
  panela pronta no prato, prato na panela pronta, ingrediente no prato, prato no ingrediente... Vale nos dois sentidos.
- **Receitas (`RECEITAS`):** a lista dos `ingrediente:estado` (com repetição) e os pontos. `receitaDe(conteudo)` diz qual
  receita está no prato.
- **Cozinhas (`COZINHAS`):** `mapa` (uma linha por fileira; `.` chão, `#` bancada, `=` tábua, `F` fogão com panela,
  `f` fogão com frigideira, `P` pia, `E` escorredor, `S` entrega, `R` volta dos pratos sujos, `L` lixo, `W` parede,
  `1` a `4` onde cada um começa, e as letras da `legenda` para as caixas de ingrediente), `receitas` (o cardápio),
  `tempo`, `pratos`, `pedidos` (máximo, intervalo, paciência) e `estrelas` (os pontos de 1, 2 e 3 estrelas; com menos
  gente a meta baixa: `metaDe`).
- **Movimento (`mover`):** aceleração rápida, impulso com recarga, colisão de círculo com as bancadas e empurrão entre
  cozinheiros. O navegador roda; o servidor só confere (sem teletransporte, fora das bancadas).
- **A partida (`novaPartida`, `passo`, `interagir`, `usar`):** contagem, pedidos que chegam e vencem, gorjeta por
  entregar rápido, pratos sujos que voltam e o fim com as estrelas.

## Fases
1. **(este PR) Base e primeiras cozinhas.** Motor, servidor `/cozinha`, página 3D (cozinha, comida, bonecos com chapéu,
   barra de progresso, pedidos, placar, estrelas), toque no celular, Vila, Noite, lobby e testes.
2. **Fogo e extintor.** Panela queimada pega fogo, o fogo espalha pelas bancadas vizinhas e o extintor apaga.
3. **Arremessar** ingrediente (Overcooked 2) e mais receitas: sopa de cogumelo, sushi e burrito.
4. **Cozinhas que mexem:** bancadas que andam, chão que divide a cozinha, portas, e o mapa das fases (as estrelas
   guardadas no navegador destravam a próxima).
5. **Robô ajudante** para quem joga sozinho.
