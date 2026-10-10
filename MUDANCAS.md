# Carreira: o tema da Sede em todas as telas (sai o vidro líquido)

- **Todas as telas da carreira** ganharam o visual da Sede e do intervalo: painéis claros e retos por cima do estádio, títulos em letra condensada e caixa alta, e os destaques na cor do seu clube. Vale para a entrada (escolha do clube), Elenco e tática, Mercado, Tabela, Calendário, Clube, Estante, Trocas, Notícias e a sala em grupo.
- **Sai o vidro líquido:** as manchas coloridas atrás de tudo e o desfoque dos painéis saíram. Os painéis agora são sólidos (também fica mais leve para o celular).
- **Abas e controles:** as abas das competições, do Clube e das temporadas, e os botões de escolha (formação, mentalidade, filtros...) viraram a mesma faixa reta da Sede, com o escolhido na cor do clube. O botão principal de cada tela também fica na cor do clube.
- **Prancheta:** o jogador em destaque aparece num painel na cor do clube, como o "Desenvolvimento do jogador" da Sede. As cartinhas do banco continuam escuras.
- **Partida:** o placar virou o da transmissão, com os nomes dos times em placas claras e o marcador na cor do clube (ou na cor do jogo grande, no clássico, no decisivo e na final). A narração, os jogos da rodada e os gols ao vivo ficam em placas claras.
- **Diálogos:** a ficha do jogador, o pós-jogo, as paradas táticas, os pênaltis e os pop-ups (antes do jogo, reunião com a diretoria, troca) usam o mesmo painel claro, com o título em caixa alta.

## Como

- `public/carreira/hub.css`: os tokens claros passam a valer em `.tela .quadro`, `.dialogo`, no aviso (`#toast`), no caixa, nas abas e na partida; novos blocos para os títulos das telas, as abas, os botões, o destaque da prancheta e o placar da partida.
- `public/carreira/estilo.css`: o bloco do tema vidro líquido foi removido.
- `CLAUDE.md`: o mapa aponta o tema para o `hub.css`.
