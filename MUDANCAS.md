# Carreira de verdade (transferências, figurinhas, prancheta, eventos) e ginásios pela Vila

## Carreira: cara própria
- Estilo novo, só da Carreira: a **prancheta do técnico**. Fundo de lousa com giz, papel creme, amarelo de apito e o
  brilho das cores do clube atrás de tudo. Letras Oswald e Manrope. Não copia o visual do Leilão.
- Sede com cabeçalho do clube (forma, posição, rodada, caixa e moral), próximo jogo, caixa de entrada, último
  resultado, tabela, finanças, atalhos e histórico. Funciona no celular (375px) e respeita "menos movimento".
- Fotos: `planos/imagens/carreira-*.jpg`.

## Figurinha e ficha do jogador
- Todo jogador tem a sua figurinha: nota, posição, escudo, retrato em pixel-art, valor e marcas (lesão, suspenso, à
  venda, dica do olheiro). A borda muda pela nota: bronze, prata, ouro e lenda.
  - O retrato usa a cabeça do `rostos.js` do Leilão, com a camisa do clube atual.
- Tocar na figurinha abre a ficha, com atributos, salário, gols e as ações:
  - jogador de outro clube: fazer proposta (valor e salário);
  - jogador seu: pôr na lista de venda ou vender na hora.

## Transferências (`public/carreira/mercado.js`)
- Valor de mercado e salário pela nota, e o caixa inicial pelo tamanho do clube.
- Duas janelas: da pré-temporada até a rodada 4, e das rodadas 17 a 21. O elenco fica entre 18 e 36 jogadores.
- O clube responde aceitando, com contraproposta ou recusando, e depois o jogador pede o salário dele.
  - A resposta sai de um sorteio com semente: o preço pedido não muda entre tentativas, e pagar o pedido sempre fecha o
    negócio.
  - São 3 tentativas por jogador por rodada.
- Vender: na lista, os clubes mandam propostas entre as rodadas; vender na hora sai por 70% do valor.
- Tela do mercado com busca e filtros (posição, nota, preço, "cabe no caixa"), indicações do olheiro primeiro, a lista
  para vender e as notícias das transferências (inclusive entre os clubes da IA).

## Prancheta (formação e substituições)
- Campinho com as peças: toque em dois titulares para trocar de posição, ou num titular e num reserva para substituir.
  Aparece uma marca quando o jogador está improvisado.
- A escalação fica fixa (`fixo`) até você pedir "Escalar sozinho". Lesionados e suspensos saem sozinhos, e o buraco é
  preenchido pelo elenco.
- Mentalidade, pressão e linha em botões. Trocar de formação mantém os mesmos 11.
- No intervalo e nas paradas da partida, a prancheta tática tem a energia de cada um, as trocas de posição e as
  substituições.

## Entre as rodadas
- **Eventos aleatórios** na caixa de entrada, cada um com escolhas:
  - proposta por um jogador seu, pedido de aumento, lesão no treino, patrocínio, joia da base, entrevista, noitada,
    olheiro (desconto), protesto da torcida e festa;
  - se ficar sem resposta, vale a escolha padrão quando a rodada é jogada.
- **Finanças:** bilheteria, TV, prêmio por vitória, patrocínio e salários, com extrato. Prêmio pela posição no fim da
  temporada.
- **Moral** (20 a 95): sobe e desce com os resultados e os eventos, e mexe na nota do time.
- **Lesões, cartões e suspensões** para todos os clubes (3 amarelos = suspensão).

## Partida
- Os gols ganham replay em pixel-art (o motor `lances.js` do Leilão), com os uniformes dos dois clubes.
  - `lances.js` agora aceita `g.uniforme` e `g.uniformeRival`.
- Placar de TV, decisões do lance em cartas (pênalti com a grade da trave) e confete nas vitórias.

## Ginásios e treinadores pela Vila (`public/galeramon/lideres.js`)
- Antes só existia o time de fogo. Agora são 10 adversários, cada um com o seu tipo e um time de 3 nos dois modos
  (Galeramon e Pokémon):
  - **4 líderes de ginásio**, em prédios próprios perto dos estacionamentos de saída: Brasa (Fogo), Maré (Água), Mata
    (Grama) e Faísca (Elétrico);
  - **6 treinadores** pelas ruas e pela praça: Rochedo (Pedra), Mística (Psíquico), Assombração (Fantasma), Escama
    (Dragão), Punho (Lutador) e Geada (Gelo).
- Na Vila, chegar perto mostra o cartão do adversário com o botão "Desafiar", que abre `/ginasio/?lider=<id>`: uma
  partida 1x1 contra o time dele.
- Vencer um líder dá a **insígnia**, que aparece na tela inicial do Ginásio (guardada no navegador).
- Os robôs comuns do Ginásio sorteiam um dos times temáticos em vez de usar sempre o de fogo.
- Fotos: `planos/imagens/vila-ginasios-*.png`, `vila-treinadores.png` e `ginasio-lider-mare.jpg`.

## Consertos no caminho
- Vila: o rótulo do quiosque do Botão aparecia como "true".
- Carreira: a página travava quando o socket conectava antes de todos os scripts carregarem.

## Conferido
- No navegador:
  - criar carreira, a sede e a troca e a substituição na prancheta;
  - comprar o Marquinhos depois de uma contraproposta;
  - uma partida no modo 3 com decisões, a prancheta do intervalo e os replays;
  - a Vila com os ginásios e os treinadores, e o desafio da Líder Maré.
- `npm test`: 91 de 92 passam. O que falhou foi o teste do Dominó, que às vezes falha por tempo.
- e2e: carreira (desktop e celular), Vila/Ginásio e as páginas.
