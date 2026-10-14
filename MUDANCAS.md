# Carreira: o som da partida destrava em qualquer navegador

## O que muda

- **O som liga no primeiro toque, em qualquer tela.** O Safari e o iPhone só deixam o som tocar se ele for ligado
  dentro de um toque. Antes, o áudio só era destravado com um toque já durante a partida, então quem tocava em "Jogar"
  e ficava assistindo não ouvia nada. Agora o primeiro toque ou tecla em qualquer tela da Carreira (o "Jogar" da sede,
  por exemplo) já liga o som, e cada toque depois destrava de novo se o navegador segurar.
- **iPhone no silencioso:** o som da partida passa a tocar mesmo com a chave do silencioso ligada
  (`navigator.audioSession.type = "playback"`, Safari 16.4 ou mais novo), como a música de fundo já tocava.
- **"Ativar som":** se mesmo assim o navegador segurar o som durante a partida, o botão Som fica amarelo e diz
  "Ativar som". Um toque nele libera o narrador e a torcida, sem trocar o modo escolhido.

## Arquivos

- `public/carreira/som-partida.js` (`destravar`, `avisarBloqueio`), `tests/e2e/carreira-som.spec.js` (o som barrado e
  o "Ativar som"), `CLAUDE.md`.

## Testes

- `tests/e2e/carreira-som.spec.js` e `tests/e2e/carreira-mesa.spec.js` passando.
- No Chromium com a regra normal de autoplay (sem a liberação dos testes), o volume medido na saída fica entre 0,03 e
  0,39 (RMS) durante a partida. Não deu para testar no Safari nem no iPhone daqui.
