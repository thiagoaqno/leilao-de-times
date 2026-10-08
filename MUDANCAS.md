# A Casa do Naruto na Vila

Uma casinha nova na Praça da Galera, ao lado da fonte: o **Ichiraku Ramen**, a casa do Naruto. Entrar nela abre o Ginásio já no
modo Naruto Shippuden (os 30 ninjas, em tempo real, contra o robô ou os amigos).

- **No mapa:** `id: "naruto"` na lista `GAMES` de `public/index.html` (e no `vila.js`, que repete a lista), em
  `x: 12, y: 19`, entre o Quiosque do Ludo e a fonte. Telhado de telhas marrons com o redemoinho laranja do Naruto e uma lanterna
  vermelha; a placa tem o narutomaki. O banco que ficava nesse lugar saiu.
- **O link:** `/ginasio/?modo=naruto`. O `sala.js` do Ginásio agora lê o `?modo=` do endereço (galeramon, pokemon ou naruto) e
  ele ganha do último modo guardado no navegador. Sem o parâmetro, tudo como antes.
- `CLAUDE.md` atualizado. Foto em `planos/imagens/naruto-casinha.png`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
