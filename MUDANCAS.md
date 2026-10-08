# Leilão: a festa do campeão

No fim do campeonato do Leilão de times (futsal ou futebol), abre para todo mundo da sala um pop-up que passa como um
vídeo curto, em pixel-art, celebrando o campeão.

## As cenas
1. **Fim de jogo:** o apito e o placar final da decisão, com os números contando, mais a prorrogação e os pênaltis
   quando há. O time campeão comemora no telão.
2. **Os gols da final:** cada gol com o minuto, o rosto de quem marcou, o time e o placar parcial. No telão, quem
   marcou faz a comemoração dele (as mesmas dos replays).
3. **Os pênaltis**, quando a final foi para eles: quem bateu, quem acertou e quem errou.
4. **A campanha:** gols feitos, gols sofridos, vitórias, empates, derrotas e saldo. Atrás, o time dá a volta olímpica.
5. **Quem fez os gols:** os artilheiros do time campeão, com barras, e o artilheiro da Copa quando ele é do time.
6. **A foto:** o elenco inteiro (titulares em pé, reservas de joelho), a taça, o papel picado e a faixa CAMPEÕES.
   Embaixo vêm a final, a campanha e os jogadores campeões (rosto, nome e gols de cada um).
   - "Baixar a foto" gera um PNG de 1080 de largura (cresce para caber o elenco) com tudo isso.

## Como funciona
- **Quando abre:** sozinha, uma vez por campeonato, quando tudo foi revelado e a final já terminou na tela. Vale para
  todo mundo da sala, inclusive quem só assiste.
- **Não reabre** ao redesenhar nem ao recarregar a página. Um campeonato novo abre de novo, e o botão "Rever a festa do
  título" (ao lado de "Baixar card do campeão") abre outra vez.
- **Controles:** a barra das cenas é clicável, como nos stories. Também tem "Pular para a foto", "Ver de novo", som
  (apito, torcida, gol, clique da foto, que liga e desliga e fica guardado) e "Fechar" (o Esc também fecha).
- **Menos movimento:** vai direto para a foto, parada, sem confete.
- **O tempo do vídeo** só anda com a aba aberta: ninguém perde cenas.
- **Visual:** o telão é um canvas de 160x90 com os bonecos dos replays (`Lances.kit` e `Rostos`), ampliado sem borrar,
  e todo o time veste a camisa do craque. Os textos ficam em HTML por cima, nítidos e com acento. Nada de emoji.

## Dados
- **O resumo do campeonato** (`summary`, em `simulador.js`) ganhou:
  - `final`: o jogo que decidiu o título, o mesmo de `lives`, com placar, gols, prorrogação e pênaltis;
  - o `id` do campeão;
  - o `dono` do time;
  - a `pos` dos titulares.
- Esses campos só copiam o que já saiu, sem sortear nada. Comparando com o simulador antigo, deu campeonato idêntico em
  1920 de 1920 combinações (semente × número de times × formato × esporte × pênaltis).
- **`public/card.js`:** o baixar/compartilhar do card virou `ChampionCard.baixar(canvas, nome)`, usado também pela foto.
  O card continua igual.

## Arquivos
- **Novos:**
  - `public/leilao/campeao.js`;
  - `tests/leilao-campeao.test.js`;
  - `tests/e2e/leilao-campeao.spec.js`.
- **Mexidos:**
  - `simulador.js`;
  - `public/leilao/sala.js` (o gancho e o botão "Rever a festa");
  - `public/leilao/index.html`;
  - `public/leilao/estilo.css`;
  - `public/card.js`;
  - `package.json`;
  - `CLAUDE.md`.

## Conferido
- `tests/leilao-campeao.test.js`: o resumo em 120 campeonatos de todos os formatos, e a mesma semente dando o mesmo
  campeonato.
- **e2e:** `leilao-campeao.spec.js` (uma sala de verdade até o fim, mais o menos movimento), `paginas.spec.js` (`/leilao/`)
  e `salas.spec.js` (leilão) passando.
- **No navegador:**
  - futsal e futebol;
  - final nos pênaltis;
  - elenco de 11;
  - celular em pé;
  - menos movimento;
  - a foto baixada.
- **O que não rodou:**
  - o `npm test` inteiro (os testes que este PR mexe passam);
  - a revisão adversarial da mudança, que foi cancelada.
