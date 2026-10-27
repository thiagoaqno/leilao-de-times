## Telas da sala da Corrida no tema da carreira F1

Refaz só em CSS (novo `public/corrida/sala-f1.css`, carregado depois de `garagem.css`) as telas de sala da Corrida, reaproveitando as variáveis e os cartões de `tema-f1.css` e `garagem.css`. Nenhuma regra, evento de socket, ID ou atributo mudou; o HTML só ganhou o `<link>` do CSS.

- Entrada (criar/entrar na sala): campos escuros com filete, botão "Abrir sala nova" grande.
- Box da sala: barra de abas no topo (caixa alta, aba ativa destacada, fixa ao rolar), cabeçalho com carro e piloto, painel tipo dashboard com o botão "Largar" enorme à direita, cartões escuros com título.
- "Na sala": lista de pilotos em tabela zebrada com cabeçalho de coluna.
- Pistas, garagem, equipe, pintura: painéis com faixa de título e grades de cartões com o selecionado destacado.
- Regras: um cartão por configuração, com título e opções em sub-abas em pílulas.
- Celular: 16 px de margem, sem rolagem horizontal, abas roláveis e coluna única.

## Conferido
- Navegador (servidor local): criar sala, mudar robôs, regras de F1 e classificação, iniciar a corrida contra robôs sem erro no console (só o 404 do mp3 do rádio, que não vai no git). Celular a 375 px sem rolagem lateral.
- `node --test tests/corrida*.test.js`: 251 passam. O teste Playwright da carreira só usa `#hubAbas [data-aba]`, que não mudou.

## Ficou de fora
Barra de navegação inferior com ícones (as abas continuam no topo, como pedido), imagens nos cartões de pista e a tela de resultado/classificação além da zebra das tabelas.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
