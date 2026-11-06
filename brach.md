# Rádio novo da corrida: estrategista, objetivo da corrida, observador e nomes

- **Estrategista:** assim que há volta de referência, avisa em que volta a chuva vem ou para, por voz e na tela (`estrategistaDaChuva` em `hud.js`). É uma estimativa: a hora da chuva vem do roteiro do clima, e a volta sai do seu ritmo.
- **Engenheiro:** na largada da carreira, diz o objetivo daquela corrida (a meta do GP, `im.meta.gp`). Fora da carreira não fala.
- **Observador (spotter):** segunda voz que avisa carro à esquerda, à direita e pista livre (`observador` em `hud.js`). Os áudios saem de `ferramentas/radio-engenheiro.js`; defina `ELEVENLABS_VOICE_SPOTTER` para a voz dele (sem ela, usa a do engenheiro).
- **Nomes:** `dolllyin`, `nikao` e `1kizzy` no rádio. `1kizzy` é falado "Kizzy" e `dolllyin`, "Dollyin".
- **Faxina:** apagados os 99 mp3 soltos na raiz do repositório; nenhum código os usava.

## Para ouvir

Os áudios novos não vão neste PR: sem os mp3, cada fala nova fica em silêncio e o aviso de chuva aparece só na tela. Depois do merge, rode `gerar-radio.bat` (com `--refazer` para regravar todos).

## Verificação

Só sintaxe conferida (`node --check`): não houve corrida nem áudio de teste nesta mudança. O CI confere a suíte.

## Fora deste PR

A tela de câmera e retrovisores fixa no lobby, com visual novo.
