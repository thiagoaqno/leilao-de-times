# Modo Jogador: nota de começo escolhida, eventos com decisão e modo História

## O que muda no jogo

- **Nota de começo escolhida:** na criação você escolhe a nota geral de 65 a 70. A chance de jogar de cada clube já usa a nota escolhida.
- **Eventos com decisão:** entre os jogos acontece uma situação (entrevista, festa, treino extra, patrocínio, dor no joelho, sondagem de clube grande, projeto social, briga no vestiário...). O jogo espera a sua resposta. Cada escolha mexe na confiança do treinador, na fama, no dinheiro, na evolução, na nota ou na saúde, e algumas dependem de sorte. Depois da resposta aparece o que aconteceu, com os números. As últimas decisões ficam no painel da sede.
- **Modo História do Estrelato** (escolhido na criação, ao lado do modo Clássico):
  - cada temporada abre com um capítulo (a chegada ao clube, a meta do ano, a despedida do veterano que te ensinou, a homenagem pelo projeto social, a cobrança da diretoria depois de vazar uma sondagem, a campanha do patrocinador);
  - as escolhas formam o personagem em seis traços (disciplina, carisma, ambição, humildade, lealdade, coração) e deixam marcas que chamam capítulos novos mais adiante;
  - os traços valem em campo: disciplina melhora o treino, ambição rende evolução a mais e carisma rende fama no fim do ano;
  - a meta do ano pode ser ousada (cumprir os três objetivos rende fama e evolução, falhar custa confiança) ou segura;
  - no fim da carreira sai um epílogo que depende do perfil, dos clubes, dos prêmios e das marcas.
- No modo Clássico os eventos são mais raros e não há capítulos, traços nem epílogo.

## Como

- `jogador-historia.js` (novo): catálogo de 26 eventos (`EVENTOS`), sorteio com semente, `responder`, traços, marcas, meta do ano e `epilogo`. O estado fica em `save.jogador` (`modo`, `tracos`, `marcas`, `evento`, `livro`, `vistos`, `pacto`); carreiras antigas ganham os campos em `garantir`.
- `jogador.js`: `criar` aceita `nota` (65 a 70) e `modo`; `jogar` e `proxima` recusam enquanto há evento; novo evento de socket `evento` (`escolha`); `visao` manda `evento`, `livro`, `perfil` e `epilogo`.
- `public/jogador/`: escolha da nota e do modo, o cartão do evento e do resultado na sede, o painel "Seu personagem" e o epílogo.
- `tests/jogador.test.js`: nota entre 65 e 70, evento que trava o jogo e entra no livro, modo História de ponta a ponta (capítulo da chegada, perfil, capítulo da temporada 2, epílogo) e modo Clássico.
