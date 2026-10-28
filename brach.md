# Corrida: cenário refeito do Bahrein (Sakhir)

Refaz o cenário do GP do Bahrein (o do PR #348 tinha um pórtico de lado e peças se sobrepondo). Só aparência: `pistas.js` (traçado e `hills`), física, robôs, regras, HUD, menus, sala e carreira não foram tocados.

## O que estava errado
- Um segundo pórtico, copiado de Melbourne, girado 90° (as colunas ficavam ao longo da pista). O pórtico de pista.js (cinco luzes) já atravessa a pista na linha de chegada: o extra saiu e a faixa Gulf Air agora fica pendurada nele.
- A Torre Al Sakhir nascia dentro do prédio dos boxes, e as palmeiras também (o prédio era posto tarde demais, depois dos enfeites).
- Os trechos de escape (asfalto listrado, brita e pneus) se sobrepunham, e as frações das curvas 14 e 15 estavam erradas (a 14 é o grampo em 0,72-0,74).
- Linhas SC em lugar sem sentido (agora na entrada e na saída dos boxes) e morros verdes aleatórios no horizonte do deserto.

## O que entrou
- **Torre Al Sakhir** nova, como nas fotos: núcleo escuro com lajes largas e grades de varanda empilhadas, cobertura em velas bege com mastros e a bandeira do Bahrein, atrás do prédio dos boxes.
- **Kit novo `kit/holofotes.js`**: postes altos com painel de lâmpadas virado para a pista, em `InstancedMesh`, só onde `livre`/`ocupado` deixam (documentado no `kit/README.md`).
- Prédio dos boxes com torre de controle, painéis Gulf Air, Bahrain GP, Aramco, Rolex..., feito no `cenario` para reservar o lugar antes dos enfeites.
- Escape com asfalto pintado de azul e areia, brita cor de areia e muro de pneus, cada trecho só com uma coisa; zebras vermelhas e brancas e zebra alta nas curvas 4, 8, 10 e 14.
- Sete arquibancadas (principal em frente aos boxes e uma por fora de cada curva lenta), passarelas, dunas, jardins de tamareiras e, ao longe, a refinaria com o flare.

## Fontes
Fotos de referência enviadas pelo dono (torre, corrida noturna, reta de largada, foto aérea) e o traçado de pistas.js para as frações.

## Conferido
- `tests/corrida*.test.js` (resultado no comentário do PR), `corrida-pistas-invasao` sem invasão no Bahrein.
- No navegador: volta completa (24 pontos) sem erro no console; pórtico perpendicular na linha, torre, boxes, arquibancadas e postes sem entrar no asfalto.
- Relevo: nada alterado.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
