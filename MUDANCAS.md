# Carreira: a festa do campeão no fim de cada competição

Quando uma liga ou copa acaba, abre um pop-up com a animação do campeão, para todos da sala (e para quem joga sozinho). É a festa do
campeão do Leilão, adaptada para a carreira.

## O que aparece
- **Fim de jogo** (copas: o placar da final, com pênaltis) ou **fim de campeonato** (ligas: os pontos do campeão e do vice), com o time
  comemorando em pixel-art.
- **Os gols da final** (copas): cada gol com o minuto, o rosto de quem fez e a comemoração dele, do campeão e do adversário.
- **A campanha** (gols feitos e sofridos, vitórias, empates e derrotas) com a volta olímpica.
- **Quem fez os gols**: os artilheiros do campeão na temporada.
- **A foto**: o elenco com a taça e a faixa CAMPEÕES, na cor do clube, com confete e fanfarra; dá para **baixar a foto** em PNG.
- Barra de cenas, botão "Pular para a foto", som liga/desliga e "Ver de novo". Com "menos movimento" no sistema, vai direto para a foto.

## Quando abre e para quem
- Abre sozinho, para todo mundo, quando a competição termina (depois da partida, do pós-jogo e de qualquer outro pop-up). Cada competição
  abre uma vez por temporada em cada navegador.
- Se mais de uma competição termina junta, vem **uma festa só**, com as outras em fichinhas no topo para trocar na hora (nunca em fila).
  A ordem: o título do seu clube, a sua liga, as finais que ele jogou e o resto por importância.
- Na Tabela, cada competição encerrada tem o botão "Rever a festa do campeão".

## Por dentro
- `competicoes[id].festa` (`festaDaCompeticao`, `carreira.js`): campeão, vice, final com os gols (da mesma simulação do mundo, ou da partida
  do próprio técnico), campanha, pontos e artilheiros do campeão. Só existe com a competição encerrada e visível: nada de spoiler.

## Conferido
- `tests/carreira-campeoes.test.js` (no `npm test`): a festa só aparece depois do fim; os gols da final batem com o placar, o campeão é quem
  ganhou (inclusive nos pênaltis) e a campanha fecha com as tabelas; o pop-up está ligado na página. 205 testes passando.
- Na tela: a festa no navegador (`planos/imagens/carreira-campeao-final.jpg` e `carreira-campeao-foto.jpg`).
