# Leilão da Galera

Site multiplayer para montar times (ou hambúrgueres, pizzas, drinks…) por leilão: a roleta sorteia o item, cada participante dá lance, o maior leva e as moedas são controladas sozinhas.

**Ludo da Galera:** ludo de 2 a 4 jogadores (4 peões, ou 2 no modo rápido), em `/ludo/`. Sai da base com 6 (opção: 1 ou 6), tirou 6 joga de novo, três 6 seguidos perdem a vez, comer ou chegar em casa dá outra jogada, estrelas são casas seguras e dois peões juntos formam uma torre (opção de barreira). O dado é rolado no servidor.

**Vila da Galera (lobby):** a página inicial (http://localhost:3000) é um mapinha 2D. Ande com as setas/WASD (ou o direcional no celular), chegue na porta de uma casinha e aperte Espaço (ou A) para entrar no jogo. Também dá para clicar/tocar numa casinha que o boneco anda sozinho. Quem estiver no lobby ao mesmo tempo aparece andando com o nick em cima da cabeça (canal `/vila`, em `vila.js`). O leilão fica em `/leilao/`. Nicks têm no máximo 8 caracteres.

**Galeramon (batalha na vila):** clique no boneco de um amigo na vila (ou fique de frente para ele e aperte Espaço) para desafiar. Cada um monta o time de 3 bichos no botão 🐾 Time. É por turnos, estilo Pokémon, com 18 bichos (paródias de animais brasileiros) e 7 tipos: Fogo, Água, Grama, Raio, Pedra, Psíquico e Normal (Fogo > Grama > Água > Fogo, Raio > Água e Psíquico, Pedra > Fogo e Raio, Psíquico > Pedra). Bichos, golpes e tipos ficam em `public/galeramon/dados.js`, os desenhos em `public/galeramon/sprites.js` e as contas da batalha (feitas no servidor) em `galeramon.js`.

**Modo Pokémon:** no desafio dá para escolher Galeramon ou Pokémon. O modo Pokémon tem os 493 Pokémon de Kanto, Johto, Hoenn e Sinnoh (com Wonder Guard do Shedinja, Truant do Slaking, Huge Power do Azumarill, Transform do Ditto, Metronome, Splash do Magikarp, Counter/Mirror Coat do Wobbuffet, Hidden Power do Unown e Belly Drum) com atributos, golpes e a tabela de tipos oficiais, e usa os sprites do FireRed/LeafGreen (até o 386) e do Platinum (da 4ª geração), carregados na hora do PokeAPI (nenhuma imagem fica no site). Os dados ficam em `public/galeramon/pokemon.js`. Os sprites são da Nintendo: deixe o link só entre amigos. Para desligar o modo, rode o servidor com `POKEMON=0`.

**Banco da Galera:** o mesmo site também tem um jogo de tabuleiro de compra e venda de cidades, de 2 a 6 jogadores, em `/banco/` (ex.: http://localhost:3000/banco/). Quem manda uma cidade a leilão ganha 10% do lance vencedor de comissão (se outro jogador levar). As regras estão no botão "Regras" da página.

**Uno da Galera:** jogo de cartas com as regras oficiais, de 2 a 8 jogadores, em `/uno/` (ex.: http://localhost:3000/uno/).

**Sinuca da Galera:** bola 8 no estilo 8 Ball Pool, de 2 a 8 jogadores, em duplas (2x2) ou individual (rei da mesa ou mata-mata), em `/sinuca/` (ex.: http://localhost:3000/sinuca/). As regras e os controles estão no botão "Regras" da página.

**Truco da Galera:** truco paulista (baralho limpo, manilha pela vira, jogo até 12) para 4 jogadores em duplas ou 6 em trios (dá para jogar de 2 também), em `/truco/` (ex.: http://localhost:3000/truco/). Tem truco/seis/nove/doze, mão de onze, mão de ferro, carta coberta e sinais para o parceiro.

**Botão da Galera:** futebol de botão com tampinhas, de 2 a 8 jogadores, em `/botao/` (ex.: http://localhost:3000/botao/). Na vila é o quiosque do lado direito da praça. Times de 1x1 até 4x4 (pode ser desigual, como 3x2), ou cada um por si (rei do campo / mata-mata). Cada time tem 5 tampinhas numa formação de quadra (2-2, 3-1, 1-2-1 ou 1-1-2, com a tampinha 1 de goleiro) e as tampinhas têm o desenho do uniforme (Corinthians, São Paulo, Santos, Palmeiras e outras; se os dois lados escolherem o mesmo time, o segundo joga com a segunda camisa). Cada vez tem 3 toques (configurável): todo peteleco conta, e num time com mais gente cada toque é de um jogador (um passa, o outro recebe). Falta (bater primeiro numa tampinha adversária) passa a vez, e gol só vale se o último toque foi no campo de ataque. O organizador escolhe: toques por vez, mesa fechada ou com lateral, goleiro (um bloquinho que o time arruma na própria vez e que trava na vez do adversário), bola parada com a tampinha arrumada, super palhetada (passes enchem uma barra) e o estádio (mesa de madeira, MorumBIS, Neo Química Arena, Nubank Parque ou Arena da Baixada, nas cores do time da casa). O servidor simula cada peteleco (`public/botao/fisica.js`) e as regras ficam em `botao.js`.

**Corrida da Galera:** kart (sem poderes) com a câmera atrás do carro, de 1 a 8 pilotos, em `/corrida/` (ex.: http://localhost:3000/corrida/). Na vila é o Autódromo, no fim do mapa (depois da rua de baixo). Três pistas: Mônaco (guard-rail, porto com iates e o Cassino), Interlagos (S do Senna, Reta Oposta, Bico de Pato) e Tóquio (de noite, com neon, a Tokyo Tower e o Fuji). Os outros karts são fantasmas: cada navegador roda a física do próprio kart e só manda a posição, então ninguém bate em ninguém e a internet lenta não atrapalha. O chão em perspectiva é desenhado pixel a pixel (estilo Mode 7 do Super Nintendo). Cinco carros (Pé no Chão, Foguete, Formiguinha, Drifteiro e Tanque), com velocidade final, aceleração, aderência e resistência diferentes; a ficha aparece na sala em fileiras de LED. A física é arcade com aderência limitada: entrou rápido demais na curva, o pneu satura, o kart escorrega para fora e perde velocidade, então tem que frear antes. As pistas são desenhadas por vértices com o raio exato de cada curva (grampos, esquinas de 90°, chicanes). O servidor (`corrida.js`) faz a largada sincronizada e conta as voltas pelos 4 setores da pista, na ordem e com tempo mínimo de volta (contra atalho). Traçados e temas em `public/corrida/pistas.js`.

**Dominó da Galera:** dominó de dupla para 4 jogadores (7 pedras cada, parceiro de frente), por pontos de batida (comum 1, carroça 2, lá-e-lô 3, cruzada 4; jogo fechado dá 1 para a dupla com menos pontos), em `/domino/` (ex.: http://localhost:3000/domino/).

## Rodar no seu PC
1. Instale o Node.js (versão 18 ou mais nova): https://nodejs.org
2. Abra um terminal nesta pasta e rode:
   ```
   npm install
   npm start
   ```
3. Abra http://localhost:3000

Para os amigos entrarem de outras casas, exponha o seu PC com um túnel gratuito, por exemplo:
```
npx cloudflared tunnel --url http://localhost:3000
```
Ele mostra um link https://....trycloudflare.com. É só mandar esse link para a galera.

## Deixar online de graça (Render)
A Vercel não mantém conexões em tempo real abertas, então use o Render:
1. Suba esta pasta para um repositório no GitHub.
2. Em https://render.com crie um **Web Service** a partir do repositório.
3. Build command: `npm install` · Start command: `npm start`
4. Pronto: o Render te dá um link público.

No plano gratuito o servidor "dorme" depois de um tempo parado, e o primeiro acesso demora uns 30 segundos para acordar. As salas ficam na memória, então se o servidor reiniciar a sala se perde.

## Temas
Ao criar a sala, escolha um tema: futsal ou futebol 11x11 (lendas ou atuais), CS, Valorant, hambúrguer, pizza, drink, sobremesa ou personalizado.
- Informe quantos **participantes** vão jogar e quantas **sobras** quer na roleta (por padrão, uma por participante).
- O site sorteia a lista respeitando as categorias de cada tema (ex.: 1 goleiro, 1 defensor, 1 meio e 2 atacantes por time no futsal).
- A lista e os nomes (jogador/ingrediente, time/pizza…) podem ser editados. Use **⭐ Salvar como meu tema** para guardar no navegador.
- Para criar um tema fixo para todo mundo, edite `public/presets.js`.
- **Composição** (para temas com categorias):
  - *Mínimo obrigatório* (padrão): todo mundo precisa ter as categorias obrigatórias do tema, como 1 goleiro no futebol ou 1 IGL e 1 AWPer no CS. O site guarda a vaga para elas, e quem já tem o obrigatório não pode pegar os últimos que sobraram enquanto alguém ainda precisar.
  - *Exata*: cada um termina exatamente com a composição do tema (ex.: 1 goleiro, 1 defensor, 1 meio e 2 atacantes no futsal).
  - *Livre*: sem regra.
  - A categoria de cada item é o texto entre parênteses, como em "Neuer (Goleiro)".

## Modos de leilão (escolhidos ao criar a sala)

### 🔒 Lance secreto
- Ninguém vê o lance dos outros até todos darem o seu.
- Maior lance leva. Empate é decidido por sorteio entre os empatados.
- **Pulos:** cada time pode pular um número limitado de jogadores (padrão 1).
- **Tempo (opcional):** quando acaba, quem não deu lance usa um pulo (se tiver) ou dá o lance mínimo.

### 🔨 Lance aberto
- Todo mundo vê os lances na hora e vai cobrindo a oferta (sempre pelo menos +1).
- Cada lance novo reinicia o cronômetro. Quando ele zera, quem está na frente leva.
- Quem não quer mais disputar clica em **Sair**. Se todos os outros saírem (ou não tiverem moedas para cobrir), o jogador é vendido na hora.
- O organizador pode **bater o martelo** antes do tempo acabar.

### 🏁 Reta final (vale para os dois modos)
- Enquanto a roleta tem jogadores de sobra, dá para recusar: se ninguém der lance, o jogador fica "sem time".
- Quando o número de jogadores na roleta fica igual (ou menor) ao número de vagas abertas, começa a reta final.
- Na reta final, se ninguém der lance, o jogador vai por sorteio, pelo lance mínimo, para um dos times que ainda têm vaga.

## Regras gerais
- **Lance máximo:** você sempre precisa guardar o lance mínimo para cada vaga que ainda falta, então nunca fica sem moedas para completar o time.
- **Ninguém deu lance:** o jogador fica "sem time". O organizador pode devolver esses jogadores à roleta.
- **Reiniciar:** no fim da página, o organizador pode reiniciar o leilão (pede confirmação e a palavra REINICIAR). Todo mundo volta com moedas e pulos cheios, os times são esvaziados e a lista volta inteira para a roleta, com os mesmos participantes e regras.
- **Desfazer:** o organizador pode desfazer a última compra. O jogador volta para a roleta e as moedas são devolvidas.
- Se alguém fechar a aba ou cair a internet, é só abrir o link de novo que volta para o mesmo time.

## Resultado com suspense (sem API, grátis)
1. No card **Resultado**, copie o prompt e cole no ChatGPT ou no Claude.
2. Copie a resposta (botão de copiar da própria IA) e cole em **🎬 Resposta da IA**.
3. Clique em **Publicar com suspense**: o site divide a resposta pelos títulos (## Rodada 1, ## Final…) e esconde tudo.
4. Clique em **▶ Revelar próxima**, e cada parte aparece na tela de todo mundo ao mesmo tempo.

O servidor só envia para os participantes as partes já reveladas, então ninguém consegue espiar o campeão.

## ⚽ Simulação pelas notas do FC 27 (futebol e futsal)
Nos temas de futebol e futsal, cada jogador tem a nota do **EA FC 27** (lendas usam a versão Icon). Quando o leilão termina, o organizador clica em **⚽ Simular campeonato**: o site sorteia placares e autores dos gols com base na força dos times, com a resenha da galera, e o resultado é revelado parte por parte para todo mundo (modo suspense).

- **Notas:** ficam em `public/ratings.js`. Nota com `[nota, "est"]` é estimativa (jogador sem nota oficial divulgada). Jogador fora da lista entra com 75.
- **Bordões da galera:** ficam em `public/bordoes.js` (frases por apelido, gritos de lavada, frases do narrador e as **pérolas do futebol**, que os jogadores soltam na entrevista, cada uma na situação certa: gol, zebra, lavada, pênalti perdido, título…). Dá para editar e adicionar gente nova.
- **Formação:** cada participante escolhe a sua (futsal: 2-2, 3-1, 1-2-1, 1-1-2; campo: 4-3-3, 4-4-2, 3-5-2, 4-2-3-1, 3-4-3, 5-3-2) ou deixa na automática. O organizador escolhe se a formação é **fluida** (muda até a simulação) ou **travada** (escolhida na sala de espera, não muda depois que o leilão começa). Fora de posição o jogador rende menos: atacante no meio 90% e na defesa 80%; defensor no meio 90% e no ataque 80%; linha no gol e goleiro na linha 50%. Meias têm dois tipos: **volante** (95% na defesa, 85% no ataque) e **meia-atacante** (95% no ataque, 85% na defesa); a lista de quem é quem fica em `public/ratings.js` (`MEIAS`). Tabela completa em `public/escalacao.js`, constante `FIT`.
- **Química (estilo FIFA):** no campinho, linhas ligam os vizinhos de escalação. Verde = mesmo país e já jogaram no mesmo clube; amarela = mesmo país ou mesmo clube; vermelha = nada em comum. Química alta faz o jogador render até 4% a mais na simulação, e baixa até 4% a menos. País e clubes ficam em `public/quimica.js` (jogador fora da lista conta como química média).
- **Card do campeão:** quando todas as partes do resultado forem reveladas, aparece o botão **🖼️ Baixar card do campeão** para todo mundo. Ele gera uma imagem (1080×1350) com o campeão, a escalação no campinho com as notas e os gols, a campanha, o artilheiro e a pérola do título. No celular, abre direto o menu de compartilhar (WhatsApp etc.).
- **Formatos:** 2 times = série melhor de 3; mais times = pontos corridos + final (ou semifinais, com 6+), ou mata-mata direto.

## 🍽️ Batalha dos pratos (hambúrguer, pizza, drink, sobremesa)
Quando o leilão acaba, o organizador clica em **Abrir votação**. Cada participante dá nota de 1 a 10 para os pratos dos outros, e o site junta com a nota de três jurados fictícios que avaliam os ingredientes e as combinações (metade júri, metade galera). Depois é só **Encerrar votação e julgar** e revelar parte por parte. As notas dos ingredientes e as combinações ficam em `juri.js`.

CS e Valorant continuam com o **Copiar prompt** para usar no Claude ou no ChatGPT (e publicar com suspense). Nos temas de comida, o prompt também continua disponível.
