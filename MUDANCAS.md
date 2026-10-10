# Carreira: o calendário só mostra o que está definido, e o resto vira TBA

## O problema
- A Copa do Brasil e a Libertadores (do mata-mata em diante) **apareciam do nada**: o calendário só mostrava o próximo confronto quando ele chegava, e ficava um buraco no meio das datas.
- E o que aparecia com nome de adversário às vezes era **previsão da simulação**: o Super Mundial (e o Mundial e a Sul-Americana) listava jogos e adversários desde o começo da temporada, antes de saber quem se classifica.

## Agora
- **TBA onde ainda é previsão.** Libertadores, Champions e Copa do Brasil mostram as fases que o seu clube ainda pode jogar como linhas **"A definir · TBA"**, com a competição, a fase (ida/volta) e a semana. Elas viram jogo de verdade quando a fase anterior acaba (a primeira do mata-mata, quando os grupos acabam; as oitavas da Copa do Brasil, quando a fase preliminar acaba).
- **Sem spoiler:** o TBA não diz quem joga nem se o clube passa. Se o clube é eliminado (chave perdida, ou grupos que acabaram sem ele no mata-mata), as linhas TBA daquela competição somem.
- **Sul-Americana, Super Mundial e Mundial só aparecem quando a participação está definida** (a Sul-Americana depois dos grupos da Libertadores; o Super Mundial depois das finais da Libertadores, da Champions, da Copa do Brasil e da Sul-Americana; o Mundial depois das finais da Libertadores e da Champions). Antes disso o que a simulação previa era mostrado como certo.
- Os nomes das fases ficaram legíveis ("Oitavas de final · ida", "Grupo F") e o ponto solto antes da semana dos jogos de liga saiu. Uma nota embaixo explica o TBA.

## Conferido
- `tests/carreira-calendario.test.js` (5 testes): no começo, nenhum confronto de mata-mata aparece e as fases viram TBA (com as semanas de ida e volta); Sul-Americana, Super Mundial e Mundial não aparecem como previsão; depois dos grupos da Libertadores, as oitavas aparecem de verdade (ou some tudo de quem caiu); as oitavas da Copa do Brasil só depois da preliminar; clube eliminado não ganha TBA.
- Os 70 testes de copas, chaves, campeões, temporada, servidor, ao vivo e clube continuam passando. Foto em `planos/imagens/carreira-calendario-tba.jpg`.
