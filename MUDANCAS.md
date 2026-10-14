# Road to Champions: dublagem das cenas, a Champions de 36, decisões no meio do jogo e o feed

## O que muda

- **As cenas ganham dublagem.** Os 43 MP3 do ElevenLabs (Eleven v4, 12 vozes secundárias, 3,4 MB) entram em
  `public/jogador/dublagem/vo/<PERSONAGEM>/<ID>.mp3`, com os nomes originais. A cena abre por cima da central como uma
  cutscene: a ilustração do evento escurecida, faixas de cinema, o nome de quem fala numa plaqueta e a legenda grande.
  - **Uma fala por vez**, em ordem; a próxima só depois que a anterior termina. Na escolha a cena **para** e espera;
    depois toca **só o ramo escolhido**. A resposta da cena vira a resposta da entrevista (o pré-jogo vem travado nela).
  - **Controles:** voz liga/desliga, volume, legendas (CC), avançar a fala, pular a cena (até a escolha, que não se pula)
    e "decidir depois". Pular ou trocar de cena **corta o áudio e cancela o download na hora**.
  - **Legendas no tempo real:** 29 falas têm o alinhamento palavra a palavra do ElevenLabs, e a legenda troca de frase
    no tempo certo; as outras 14 mostram a fala inteira enquanto o MP3 toca. Nenhum tempo inventado.
  - **Protagonistas** (17 falas) ficam em legenda, com o **nome que o jogador deu**, sempre visíveis. As vozes fixas
    nunca dizem esse nome.
  - **Falhou o MP3?** A fala segue em legenda pelo tempo de leitura (erro, 404 ou conexão que não responde em 8 s).
    Sem toque na página, a cena pede ▶ (política de autoplay).
  - **As cenas:** cinco são a versão dublada de exclusivos que já existiam (aniversário, banco, despertador, coletiva,
    protocolo). As opções do jogo ganharam o ramo (`voz`) e o que gravam na história (`narrativa`); três opções novas
    do roteiro entraram ("Sair em silêncio", "Desligar e correr para o treino", "Ficar com os colegas até tarde").
    **"Primeira noite"** é um prelúdio novo do Prodígio, com escolha própria antes da estreia. **"Pergunta
    inconveniente"** é o callback: se o Último Romântico perde o jogo logo depois da festa, a repórter pergunta, numa
    variante só (foi à festa, passou rápido, ficou em casa).
  - **Condições sem eval:** `road-voz.js` lê `rom_festa == "integral" && resultado_ultimo_jogo == "derrota"` uma vez,
    na ferramenta, e vira comparações; o resto é recusado.
- **O formato novo da Champions.** 36 clubes numa fase de liga só: 8 jogos para cada um, dois adversários de cada pote
  (um em casa, um fora), sorteados com a semente da sala. Do 1º ao 8º, direto às oitavas; do 9º ao 24º, playoff de
  ida e volta; oitavas, quartas e semifinais de ida e volta (agregado, pênaltis no fim da volta); final única em campo
  neutro. **17 rodadas** em vez de 5. As cinco entrevistas caem na estreia, na 4ª rodada (os exclusivos), na última da
  liga, na semifinal de ida e na final; nas outras rodadas ninguém precisa decidir, e o pré-jogo muda só a estratégia.
  Campanhas antigas seguem no formato de grupos.
- **Decisões no meio do jogo.** Aos 25', no intervalo e aos 70', o jogo de quem tem protagonista **para** e ele decide
  como joga: voltar para ajudar na marcação, economizar energia para o contra-ataque, pressionar a saída de bola, pedir
  a bola e ditar o ritmo, partir para cima, manter o plano (as opções seguem o placar). A escolha vira **tática no
  motor da Carreira** (mentalidade, pressão, linha e estilo) e **muda o resultado**: em 60 jogos iguais, "partir para
  cima" deu mais gols que "voltar para marcar" e o placar mudou em boa parte deles. O técnico do computador segue
  fazendo as trocas. Protagonista contra protagonista decidem ao mesmo tempo; quem não responde em 30 s mantém o plano.
  As decisões entram na narração do jogo ao vivo e viram post.
- **O feed no jeito do Instagram.** A aba Diário virou **Feed**: posts com avatar, @, foto (a arte do evento, o
  placar sobre a foto do jogo), curtidas e legenda. Os **stories no alto filtram** por protagonista (Todos, Você, cada
  um da sala, Imprensa): dá para ver as notícias dos outros. Curtir fica só no seu navegador.

## Para conferir

- `node --test tests/road-dublagem.test.js tests/road-champions-liga.test.js tests/road-to-champions.test.js`
- `npx playwright test road-dublagem road-champions`: a cena em ordem, pular, trocar de cena, MP3 com falha,
  dois jogadores sem interferir, prelúdio, o momento do jogo, o feed com filtro e a rodada sem entrevista.
- Importar de novo a pasta de produção: `node ferramentas/rtc-dublagem.js "<pasta Voz>"` (mede as durações com o
  ffprobe; não renomeia nem converte nada).
