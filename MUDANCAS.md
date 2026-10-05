# Noite da Galera: ir junto para outro jogo e o placar da noite

Uma camada nova que liga todos os jogos numa mesma noite. Quem está numa sala de qualquer jogo entra na "noite"
daquela sala sozinho, sem fazer nada. A aba **🌙 Noite** aparece na beirada esquerda da tela.

## "Bora de outro jogo" (trocar de jogo sem sair da galera)
- Na aba da Noite, qualquer um escolhe o próximo jogo (Truco, Uno, Pelada...).
- A galera vê o aviso "Fulano chamou todo mundo pro Truco".
- O navegador de quem chamou abre a sala nova sozinho. Assim que ela existe, todo mundo vai junto, entrando com o
  próprio nome, sem digitar código. Antes de ir, cada um tem 3 segundos para apertar "Ficar aqui".
- A revanche com os mesmos times já existia em todos os jogos ("Jogar de novo"/"Revanche" na mesma sala).

## Placar da noite
- Cada jogo avisa a Noite quando uma partida termina: quem ganhou e quem perdeu.
  - O Leilão fica de fora, porque não tem um vencedor de partida.
  - Os robôs não entram no placar.
- Na aba da Noite: o ranking (vitórias e derrotas), o que rolou nas últimas partidas e os títulos:
  - 👑 **Campeão da noite**: quem tem mais vitórias, sozinho na frente;
  - 🏅 **Rei do Truco** (de cada jogo): quem mais ganhou naquele jogo, com pelo menos 2 vitórias;
  - 🔥 **Em chamas**: 3 vitórias seguidas ou mais;
  - 🧊 **Pé-frio**: 3 derrotas seguidas ou mais.
- No fim de cada partida aparece o aviso "🏆 Fulano ganhou no Uno: +1 na noite". A aba mostra quem está na frente.
- A noite fica na memória do servidor e some depois de 12 horas parada. Se o servidor reiniciar, a noite recomeça.

## Arquivos
- `noite.js` (servidor, canal `/noite`): junta as salas numa noite, o "chamar"/destino e o placar
  (`vitoria(jogo, sala, ganhadores, perdedores)`).
- `public/noite.js`: a aba, o painel e os avisos, e a entrada/criação automática da sala. Vai em todas as páginas de
  jogo (`?entrar=1` entra com o nome salvo; `?criar=1` cria a sala).
- Cada servidor de jogo chama `noite.vitoria(...)` no fim da partida: banco, uno, sinuca, botao, truco, domino,
  ludo, corrida, tiro, pelada (e Rocket), batalha, tenis, rumi, proibida e pingpong.

## Testes
- `tests/servidor.test.js`, uma noite de verdade:
  - dois numa sala de Pingue-Pongue caem na mesma noite;
  - a partida até 11 entra no placar (1 V para quem ganhou, 1 D para quem perdeu, com o título de campeão);
  - "chamar" para o Truco avisa o outro, e a sala nova manda o destino.
- No navegador:
  - criei uma sala de Uno e uma amiga de mentira entrou;
  - "Truco" na aba da Noite criou a sala de Truco sozinha e a amiga recebeu o destino;
  - indo para uma sala de Dominó com `?entrar=1`, o navegador entrou sozinho com o nome salvo.
- `npm test` (46) e os testes no navegador de páginas, Pingue-Pongue e Tênis passando.
