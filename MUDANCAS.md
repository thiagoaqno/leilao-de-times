# Carreira: vidro líquido em todas as telas de gestão e animações mais leves

## O que travava
- Cada tela entrava com um **desfoque animado** (`filter: blur`) em dezenas de painéis que, ao mesmo tempo, têm `backdrop-filter` (o vidro). Animar um filtro sobre um painel de vidro obriga o navegador a refazer o desfoque de tudo que está atrás, a cada quadro.
- O fundo também se mexia o tempo todo (as manchas coloridas e a foto do estádio "respirando"), e cada painel de vidro refazia o desfoque do que estava atrás de si a cada quadro, mesmo com a sede parada.
- O brilho dos blocos animava sombra e posição do fundo ao passar o mouse.

## O que mudou
- As entradas das telas, do painel do time, do pós-jogo e dos pop-ups agora só sobem e aparecem (opacidade e posição), sem desfoque animado; o contêiner da grade da sede não anima mais por cima dos painéis de vidro filhos.
- O fundo ficou **parado**: as manchas de cor e a foto do estádio não se mexem mais. O desfoque do vidro caiu de 22 para 16 px e perdeu o realce de brilho.
- Os blocos da sede animam só a subida.

## Vidro em mais telas
- Mercado, Tabela, Calendário, Notícias e Clube agora usam o mesmo vidro da sede, com a **foto do estádio atrás de todas as telas de gestão** (antes só na sede). Painel dentro de painel não leva vidro de novo (só translúcido), para não empilhar desfoques.
- Continua valendo o "reduzir transparência" do sistema, que volta aos painéis sólidos.

## Medido (Chrome, processador 4 vezes mais lento para imitar um computador fraco)
| | antes | depois |
| --- | --- | --- |
| sede parada | 49 quadros/s | 144 quadros/s |
| entrar na sede | 20 | 59 |
| entrar no mercado | 18 | 57 |
| entrar no Clube | 58 | 73 |

Fotos em `planos/imagens/carreira-vidro-*.jpg`.
