# Festa da Galera (novo jogo: minijogos rápidos valendo moedas)

Em `/festa/`, e com um salão na vila (Vila Esportiva, ao lado do Pingue-Pongue, com telhado de confete e bexigas).

## Como funciona
- Uma sequência de minijogos rápidos (de 15 s a 1,5 min cada), todo mundo jogando junto ao mesmo tempo. O organizador
  escolhe quantos: 5, 8, 10 ou 15 (todos). A ordem é sorteada.
- Cada minijogo tem a explicação (7 s, com a regra e os controles), o jogo e o resultado (7 s).
- **Moedas por colocação:** 1º 10, 2º 7, 3º 5, 4º 3, 5º 2, os outros 1. Empate leva as moedas da melhor posição.
- Quem tiver mais moedas no fim ganha a festa (desempate: mais vezes em 1º). Vale na Noite da Galera.
- De 2 a 8 jogadores, com robôs completando. Quem cai da internet no meio vira robô até voltar.
- Os bonecos são os da Pelada, com a skin de cada um (a mesma escolha da Corrida, Batalha e Tênis).

## Os 15 minijogos
Na arena (os bonecos numa plataforma; WASD/setas andam, Espaço pula ou dá o empurrão):
- 💣 **Batata quente**: passe a bomba encostando em alguém; quem estiver com ela quando explodir sai.
- 🔴 **Pular o laser**: um laser gira rente ao chão, cada vez mais rápido (depois vem um segundo); pule na hora.
- 🪙 **Chuva de moedas**: pegue as moedas que caem (a dourada vale 3); a bomba deixa tonto e tira 2.
- 🤼 **Sumô**: empurre todo mundo para fora; a plataforma vai encolhendo.
- 🟥 **Chão que cai**: o ladrilho que você pisa cai logo depois (e volta um tempo depois, cada vez mais devagar).
- 🧟 **Pega-pega zumbi**: quem o zumbi pegar vira zumbi; quem escapar até o fim ganha.
- 👑 **Rei da colina**: fique no círculo dourado que anda (sozinho vale o dobro).
- ☄️ **Chuva de meteoros**: saia de baixo da sombra vermelha; 3 vidas.

Na tela (Espaço, clique ou toque):
- ⏱️ **Cronômetro cego**: pare no tempo pedido; o relógio some depois de 3 s. 3 tentativas, ganha quem errar menos.
- ⚡ **Reflexo**: aperte quando ficar verde (antes da hora: +1 s de castigo). 8 rodadas.
- 🐔 **Conta os bichos**: passa uma bicharada; no fim, quantos de um bicho passaram?
- 🎈 **Enche o balão**: cada balão estoura num ponto secreto; pare antes de estourar.
- 🟩 **Sequência de cores**: repita a sequência, que cresce a cada rodada.
- 🎯 **Tiro ao alvo**: quem acertar o alvo primeiro leva (o dourado vale 3).
- 🧮 **Conta de cabeça**: 10 contas, quem acerta primeiro ganha 2 pontos.

## Arquivos
- `public/festa/minijogos.js`: as regras dos 15 minijogos, a física da arena e os robôs.
- `festa.js`: o servidor (canal `/festa`): a sala, a sequência, o relógio de 30 quadros/s, as moedas e a Noite.
- `public/festa/index.html` e `public/festa/jogo.js`: a página, a arena em 3D, as telas, a explicação, o resultado e
  o pódio.
- A vila (`public/index.html`, `vila.js`), `server.js` e `noite.js` (a Festa conta na noite).

## Testes
- `tests/festa.test.js`: cada minijogo só com robôs (2, 4 e 8 jogadores) termina no tempo, coloca todo mundo e dá
  as moedas; e as moedas por colocação com empate.
- `tests/servidor.test.js`: uma festa com 3 robôs começa, explica, joga (com os pacotes chegando) e aceita os controles.
- Teste das salas regravado (só entrou `/festa`) e o de abrir as páginas.
- `npm test` (93) passando.
- Jogado no navegador com 3 robôs: Pega-pega zumbi, Conta de cabeça e Chão que cai, com as moedas indo para o placar.
