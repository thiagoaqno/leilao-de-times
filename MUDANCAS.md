# Carreira em grupo: o anfitrião sem jogos libera as rodadas dos amigos

## O problema
Quando o clube do anfitrião terminava a temporada antes dos amigos (por exemplo, eliminado cedo nas copas ou sem jogo na semana), a sede dele só mostrava **"Começar a temporada"**. Esse botão não abre com jogo de amigo pendente ("Ainda tem jogo nesta temporada"), e o botão de **jogar a rodada** sumia: o anfitrião ficava sem como liberar os jogos dos amigos e a sala travava.

## Agora
- Se o seu clube terminou mas **algum técnico da sala ainda tem jogo**, a sede mostra um aviso e o botão **"Liberar a rodada dos amigos"** (só para o anfitrião; os outros veem "Esperando o anfitrião liberar os jogos"). Enquanto a rodada roda, o botão vira "Rodada rolando: os amigos estão jogando".
- A **temporada nova só aparece quando todos terminaram**: o botão "Começar a temporada" volta sozinho quando não resta nenhum jogo na sala.
- O servidor já sabia montar a rodada só com os jogos dos amigos; faltava a tela. Cada técnico recebe no estado `faltamJogos` (algum jogo pendente na sala).

## Conferido
- `tests/carreira-host-sem-jogos.test.js` (2 testes): com o host sem jogos, a próxima rodada tem só os jogos do amigo e a temporada nova não abre; o estado traz `faltamJogos` e a tela tem o botão de liberar a rodada (pelo canal de verdade, com o servidor).
- Os testes de sala, rodada, dispensar e mercado da sala continuam passando.
