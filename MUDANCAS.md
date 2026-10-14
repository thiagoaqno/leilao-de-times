# Road to Champions: os seis protagonistas

## O que muda

- A criação agora é a escolha de um entre seis protagonistas, cada um preso ao seu clube, com posição, idade e jeito próprios. O jogador dá o nome:
  - **O Último Romântico** (Arsenal, MEI, 34): festas e câmeras, a última dança;
  - **O Prodígio** (Barcelona, PD, 18): a marra, o bairro e as causas;
  - **O Resiliente** (Real Madrid, PE, 26): o banco de Ventura, a arquibancada e as finais;
  - **O Imprevisível** (PSG, PD, 29): a Bola de Ouro, o caos e a fama de vidro;
  - **O Enigma** (Bayern, PD, 24): sem câmeras, respostas que ninguém entende;
  - **A Máquina** (City, ATA, 26): o protocolo e o fantasma dos jogos grandes.
- **Estilo de vida:** três eixos (Rotina, Exposição, Grupo) começam no perfil de cada um e andam com as escolhas. Cada protagonista tem também um medidor próprio (relação com o técnico, fama de cai-cai, marra cumprida, decifrado, jogo grande, fama de vidro).
- **Escolhas por personagem:** os capítulos 2 e 4 têm um evento exclusivo de cada protagonista. Os outros capítulos trazem opções que só alguns veem (bancar a marra, a resposta enigmática, “Ok.”). Algumas opções dependem do estilo de vida ou de quem está na sala.
- **Consequências:** escolhas podem trazer risco de lesão, mexer na forma do clube na jornada (de -2 a +2 na força, nunca mais que isso), virar manchete, apostar (a marra é cobrada depois do jogo) ou dar certo ou errado na sorte. O epílogo ganha uma linha própria de cada protagonista.
- **Laços prontos:** quem está na sala já começa ligado (ídolo e herdeiro, El Clásico, seleção, ex-Barça, os dois frios).
- **Aparência como dados:** tom de pele, cabelo, cor, barba, altura, porte, número e a marca do personagem (faixa, fones, óculos âmbar...). Hoje o desenho é um SVG (`public/jogador/aparencia.js`); um estilo cartoon futuro só troca esse arquivo.
- A repercussão na imprensa passa a usar o `tom` de cada opção, não o texto.
- No lobby dá para trocar de protagonista (o clube vem junto) e ajustar a aparência. Quem entra com o código vê bloqueados os protagonistas que já têm dono.
- Campanhas antigas, sem protagonista, continuam jogáveis com os eventos de antes.

## Verificação

- `tests/road-to-champions.test.js`: 9 testes (criação por arquétipo, aparência limpa, sem repetir, laços, evento exclusivo, opções próprias, eixos, forma, sorte, marra e campanha antiga).
- `tests/salas.test.js`, `jogador.test.js`, `servidor.test.js` e `bd.test.js` passando.
- 300 campanhas simuladas com os seis protagonistas, sem erro.
- Fotos da criação, do lobby e do evento exclusivo no navegador, no computador e no celular.
