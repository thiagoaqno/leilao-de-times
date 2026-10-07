# Carreira de Treinador: feed de notícias, pós-jogo, estádio, trocas, orçamentos, mercado e lances em pixel-art

Guia para o Codex. Leia o `CLAUDE.md` inteiro antes de começar: ele diz onde fica cada coisa e o jeito de trabalhar.
Este guia diz **o que fazer, onde mexer e como saber que ficou pronto**. Os nomes de arquivo e de função abaixo são os
do `main` de hoje. Se algo tiver mudado, procure pelo nome parecido antes de criar um novo.

---

## 0. Regras do projeto (valem para tudo abaixo)

- **Branch e PR:** comece de `origin/main` numa branch nova (sugestão: `carreira-feed-mercado`).
  - Um PR só para `main`, nada de PR em cima de PR.
  - Reescreva o `MUDANCAS.md` com o resumo do PR; o corpo do PR é esse mesmo texto.
- **Português** em textos da tela, comentários e nomes de variáveis, no mesmo tom dos arquivos de hoje.
- **Sem emojis na tela.** Ícones vêm de `public/icones.js` (`ic("nome")`). Arte é **pixel-art desenhada em canvas** por
  nós: nada de imagens baixadas da internet nem pacotes de fora.
- **Só "← Vila" no topo**, sem abas novas no cabeçalho.
- **Finais de linha:** mantenha o que cada arquivo já usa (CRLF ou LF). Se o diff virar o arquivo inteiro, está errado.
- **O servidor manda** (`carreira.js`).
  - O navegador só desenha e pede.
  - Tudo que sorteia usa semente (`Motor.sorteDe(...)`): recarregar a página nunca muda um resultado.
  - Enquanto há partida em andamento (`save.partida`), nada no save muda.
- **Carreiras antigas continuam abrindo.** Campo novo no save entra com valor padrão em `completar(save)`.
- **Animações:**
  - quem pede "menos movimento" (`prefers-reduced-motion`) fica sem elas: a informação aparece, sem o movimento;
  - quando a tela é redesenhada a cada estado, use relógio único com `animation-delay` negativo para não reiniciar;
  - efeitos simultâneos aparecem **lado a lado, na hora**, nunca numa fila que atrasa (é a regra do Leilão).
- **Visual da Carreira:** é o estilo "prancheta" de `public/carreira/estilo.css`, com fundo de lousa, papel creme,
  amarelo de apito (`--apito`) e as cores do clube (`--clube`, `--clube2`). **Não copie o visual do Leilão**: copie as
  mecânicas.
- **Celular:** tudo precisa funcionar em 375x812, sem rolagem lateral.

---

## 1. Feed de notícias com cara de Instagram (cada notícia com a sua arte 8 bits)

### O que é
Hoje as notícias são listas de texto: as transferências em `listaNoticias()` (`public/carreira/tela-mercado.js`) e os
avisos na caixa de entrada (`telaEntrada()` em `public/carreira/telas.js`). Elas viram **um feed vertical de posts**,
como o Instagram. Cada post tem:

- **Topo:** avatar redondo (o escudo do clube da notícia, `escudo(id, 1)`), o "perfil" (`@galeranews`, `@bahia`...), a
  rodada ("R12") e o ícone de verificado nos perfis de clube;
- **A arte:** um quadrado 1:1 em **pixel-art**, desenhado num canvas pequeno (64x64 ou 96x96) e ampliado sem suavizar
  (`image-rendering: pixelated`). A arte tem que **combinar com a notícia**: ver a tabela abaixo;
- **Barra de ações:** curtir, comentar e compartilhar, com ícones SVG. Curtir funciona (fica guardado no navegador:
  `store`, chave `carreira:curtidas`); os outros dois são enfeite;
- **"Curtido por X e outras N pessoas":** o número sai da semente da notícia e do tamanho do clube (não muda ao
  recarregar);
- **Legenda:** o perfil em negrito e o texto da notícia, com "mais" para abrir quando for longa;
- **2 ou 3 comentários de torcedor** sorteados de uma lista por tipo de notícia ("VAMOOO", "vende logo esse
  perna-de-pau"...). Sem palavrão.

O feed rola na vertical, um post embaixo do outro, e o mais novo fica em cima. No celular, o post ocupa a largura toda.
No computador, a coluna tem no máximo uns 470 px, como no Instagram, centralizada.

### Onde fica
- **Servidor:** crie a lista `save.feed` (no máximo 60 posts; o mais velho sai). Em `fecharRodada` (`carreira.js`),
  entram os posts da rodada:
  - o resultado do seu jogo;
  - os gols do artilheiro do seu time;
  - lesões e suspensões do seu time;
  - as transferências (suas e da IA, que hoje vão para `save.transferencias`);
  - os eventos do catálogo já resolvidos (`carreira-catalogo.js`);
  - a tabela, quando você entra no G4 ou no Z4;
  - um post de outro clube de vez em quando (o líder goleando, um clássico).
- **Formato de cada post:** `{ id, rodada, tipo, perfil, arte: { cena, ... }, texto, dados }`. A **arte não vai pronta
  do servidor**: vai só a "receita" (`cena` e os dados que a cena precisa: ids de jogador e clube, placar). O navegador
  desenha.
- **Estado:** mande o feed no `estado(save)`, só os últimos 30.
- **Navegador:** um script novo, `public/carreira/feed.js`, entre `telas.js` e `elenco.js` em `index.html`. Ele tem:
  - `artePost(post)`: devolve o canvas da arte, com cache por `post.id`;
  - `postHTML(post)`: o post inteiro;
  - `telaFeed()`: a tela.
- **Acesso:** um atalho "Notícias" na sede (os atalhos ficam em `#atalhos`) que abre a tela, em `<section id="feed">`
  no `index.html`. Na sede, mostre os 3 posts mais novos em formato compacto, com "Ver tudo".
- **Mercado:** a aba "Notícias" do mercado passa a usar o mesmo `postHTML`, filtrando os posts de transferência.

### As artes (cada uma é uma função pequena em `feed.js`)
Use o que já existe:
- `retrato(pid)` (`cartas.js`): a cabeça do jogador com a camisa do clube atual;
- `Rostos.cabeca` (`public/leilao/rostos.js`);
- `Escudos.svg(clube)`: para desenhar no canvas, faça uma versão pixel ou desenhe o SVG numa `Image`;
- `uniformeDoClube(clube)`, para corpo inteiro;
- as peças de `Lances.kit` (`public/leilao/lances.js`): boneco, bola, rede, traves, bandeirinha, poeira, cores.

| Tipo de notícia | Arte |
| --- | --- |
| Contratação sua | O jogador de corpo inteiro com a camisa nova, segurando a camisa aberta; escudo atrás; flashes de câmera |
| Venda sua / transferência da IA | Aperto de mãos entre dois bonecos com as camisas dos dois clubes, seta entre os escudos e o valor numa placa |
| Vitória | Placar de TV em pixel com o resultado, a torcida pulando nas cores do clube |
| Derrota | O mesmo placar, céu cinza, chuva fina e um torcedor de cabeça baixa |
| Gol / artilheiro | O jogador comemorando, com uma comemoração de `Lances.COMEMORA` num quadro parado |
| Lesão | Maca com o jogador e o médico com a maleta |
| Cartão / suspensão | Juiz levantando o cartão (amarelo ou vermelho) |
| Patrocínio / dinheiro | Contrato com caneta e pilhas de moedas |
| Entrevista / imprensa | Microfones apontados e a placa de fundo com o escudo |
| Torcida (protesto, festa, mosaico) | Arquibancada com faixas; protesto com faixas pretas, festa com sinalizador |
| Treino / CT | Cones, o gramado do CT e o jogador correndo |
| Vida pessoal (pai, casamento, carro...) | Uma cena simples por grupo: bebê, bolo, carro esportivo |
| Tabela (G4, Z4, liderança) | A tabela em pixel com a linha do clube acesa |

Cada evento do catálogo já tem `grupo` e `def`. Faça um mapa `def → cena` e use o grupo como reserva para o que não
estiver no mapa. A arte sorteia variações (cor do céu, posição, torcedores) com a semente `post.id`: a mesma notícia
tem sempre a mesma arte.

### Ficou pronto quando
- A tela de notícias rola como o Instagram, com todos os tipos de post acima, cada um com a sua arte.
- Recarregar a página mostra as mesmas artes, curtidas e comentários.
- No celular, sem rolagem lateral.
- `tests/carreira-servidor.test.js` ganha um teste: depois de umas rodadas, o `estado.feed` tem posts dos tipos
  esperados, cada um com `arte.cena`, e o feed não passa de 60.

---

## 2. Pós-jogo em pop-up (bonito, com CSS)

### O que é
Quando a sua partida acaba, o que mexeu no seu time aparece num **pop-up de pós-jogo**, em vez de ficar escondido na
caixa de entrada e no extrato. É uma sequência de "cartões" que entram um depois do outro (com pouco intervalo, sem
travar), dentro de um `<dialog>` com o fundo escurecido:

1. **O placar:** escudos, o resultado grande e "Vitória / Empate / Derrota" com a cor certa.
2. **A moral:** o medidor anima do valor antigo ao novo, com a seta e o número (+6, −6).
3. **O dinheiro da rodada:** bilheteria, TV, prêmio e salários entram um a um, contando até o valor (count-up), e
   no fim aparece o caixa novo.
4. **Desfalques:** a figurinha de quem se machucou (com "fora por N rodadas") ou foi suspenso; quem chegou a 2
   amarelos vira alerta "pendurado".
5. **Efeitos valendo:** os chips de `save.efeitos` que começaram agora ("Time +1 · 2 jogos").
6. **O que chegou:** os eventos novos que pedem resposta (`caixaEntrada` sem `resolvido`), com os botões de escolha
   ali mesmo, usando o mesmo pedido `evento` de hoje. Quem fechar sem responder deixa para depois, como hoje.

O botão do fim é "Continuar" (vai para a sede). O pop-up aparece uma vez por rodada; guarde a rodada vista no navegador
(`carreira:posjogo`).

### Onde fica
- **Servidor:** em `fecharRodada`, monte `save.posJogo = { rodada, placar, moral: [antes, depois], financas: itens da
  rodada, lesoes: [...], suspensos: [...], pendurados: [...], efeitos: [...novos], eventos: [ids] }`. Mande no `estado`.
  Pegue a moral de antes no começo da função.
- **Navegador:**
  - um `<dialog id="posJogo">` novo no `index.html`;
  - um arquivo `public/carreira/posjogo.js` (depois de `partida.js`), chamado quando o jogador sai da tela da partida:
    pelo botão do fim, `#fimJogo`;
  - se a página for aberta e houver `posJogo` ainda não visto, ele também aparece.
- **CSS** (em `estilo.css`, com cara de prancheta):
  - cada cartão entra com `transform` e `opacity`;
  - o atraso de cada cartão é `--i`, com `animation-delay: calc(var(--i) * 120ms)`;
  - o medidor da moral anima com `transition` em `--v`;
  - os números contam com `requestAnimationFrame`;
  - com "menos movimento", tudo aparece direto, sem animação.

### Ficou pronto quando
- Depois de cada jogo, o pop-up mostra o que mudou de verdade, com os números batendo com o extrato e a moral.
- Responder um evento dentro do pop-up funciona e some da lista.
- Recarregar não mostra de novo o pop-up já visto.

---

## 3. O estádio do mandante na prancheta do meio do jogo

### O que é
Na **prancheta tática da partida** (`decisaoTatica(p)` em `public/carreira/partida.js`, o modal das paradas e do
intervalo), aparece o **estádio de quem joga em casa** em pixel-art, como cenário:
- a arquibancada com as cores do mandante;
- o nome do estádio numa placa ou num telão;
- o clima do jogo (dia, noite ou chuva), que já existe em `climaDoJogo(...)` e no `J.clima`.

O gramado da prancheta fica "dentro" desse estádio, com a arquibancada em volta ou como faixa de fundo.

### Onde fica
- **Arquivo novo:** `public/carreira/estadios.js` (UMD não precisa: só navegador), com
  `Estadio.desenhar(canvas, clubeId, { clima })`.
- **Perfil de cada estádio:** uma tabela `PERFIS` com um registro por estádio da base (`CLUBES[id].estadio`:
  Maracanã, Allianz Parque, Mineirão, Fonte Nova, Arena MRV, Vila Belmiro, Beira-Rio, São Januário, Couto Pereira,
  Arena Condá...). Cada perfil tem:
  - `forma`: `"oval"` ou `"retangular"`;
  - `teto`: cobertura inteira, parcial ou nenhuma;
  - `tamanho`: anéis de arquibancada (pelo `tamanho` do clube);
  - um detalhe marcante: o arco do Maracanã, a cobertura branca da Fonte Nova, os prédios em volta da Vila Belmiro,
    o telão...
- **Detalhes:**
  - Maracanã e Nilton Santos aparecem para mais de um clube; o que muda é a cor da torcida (sempre a do mandante);
  - quem não tiver perfil cai num estádio genérico com as cores do clube;
  - inspire-se no traço de `public/vila/estadios.js` (fachada e interior), mas desenhe aqui: a Vila tem só 4
    estádios e nomes diferentes.
- **Prancheta:** o modal ganha o canvas como fundo atrás do campinho. Com "menos movimento", a torcida para de pular.

### Ficou pronto quando
- Abrir a prancheta num jogo em casa mostra o seu estádio; fora de casa, o do adversário.
- Chuva, noite e dia aparecem de acordo com o clima do jogo.
- O campinho e os botões continuam fáceis de tocar no celular.

---

## 4. Trocar começando pelo banco

### O que é
Na **prancheta da partida** (`decisaoTatica` em `partida.js`), hoje o reserva só pode ser tocado depois de escolher
quem sai: o código diz "Primeiro toque em quem vai sair, no campo." Os dois caminhos passam a valer:
- tocar num titular e depois num reserva (como hoje);
- **tocar no reserva primeiro** (ele fica marcado, com a borda acesa) e depois no titular que sai.

Tocar de novo no mesmo reserva desmarca. Tocar em outro reserva troca a marcação. A dica embaixo do campinho muda:
"Agora toque em quem sai para entrar o X".

### Onde fica
- `decisaoTatica`: o estado `sel` passa a aceitar `{ onde: "banco", pid }`, e o clique no gramado com um reserva
  marcado faz a substituição (`d.subs.push([sai, entra])`, como já faz).
- **Prancheta fora da partida:** confira também `public/carreira/elenco.js`, que já aceita banco primeiro. Deixe os
  dois iguais no comportamento e nos textos.

### Ficou pronto quando
- Os dois caminhos funcionam nas duas pranchetas (fora e dentro da partida), respeitando o limite de substituições.
- O teste e2e `tests/e2e/carreira.spec.js` ganha uma substituição feita a partir do banco.

---

## 5. Orçamentos diferentes para começar

### O que é
Hoje o caixa inicial sai de `Mercado.CAIXA_INICIAL[tamanho]` (`public/carreira/mercado.js`). Como quase todo clube da
base é `tamanho: 5`, quase todos começam com o mesmo dinheiro. Cada clube passa a ter o seu **orçamento**, com uma
**situação** que vira texto na tela de escolha do clube e na mensagem de boas-vindas:

| Situação | Exemplo de texto |
| --- | --- |
| Rico | "Cofres cheios: dá para sonhar alto." |
| SAF / investidor | "O dono novo quer resultado rápido." |
| Equilibrado | "Dá para reforçar, sem loucura." |
| Endividado | "Dívida alta: vender antes de comprar." |
| Pequeno | "Cada real conta." |

Sugestão de partida (valores de jogo, **não** dados oficiais; deixe numa tabela fácil de mudar):

| Clube | Caixa inicial | Situação |
| --- | --- | --- |
| Flamengo | R$ 120 mi | Rico |
| Palmeiras | R$ 110 mi | Rico |
| Botafogo | R$ 80 mi | SAF |
| Cruzeiro | R$ 70 mi | SAF |
| Bahia | R$ 60 mi | SAF |
| Atlético-MG | R$ 55 mi | SAF |
| Bragantino | R$ 50 mi | Investidor |
| Fluminense | R$ 50 mi | Equilibrado |
| Grêmio | R$ 45 mi | Equilibrado |
| Internacional | R$ 45 mi | Equilibrado |
| Athletico | R$ 40 mi | Equilibrado |
| Corinthians | R$ 35 mi | Endividado |
| Santos | R$ 35 mi | Endividado |
| São Paulo | R$ 30 mi | Endividado |
| Vasco | R$ 30 mi | SAF endividada |
| Coritiba | R$ 20 mi | Pequeno |
| Vitória | R$ 18 mi | Pequeno |
| Remo | R$ 15 mi | Pequeno |
| Mirassol | R$ 12 mi | Pequeno |
| Chapecoense | R$ 10 mi | Pequeno |

- **Outros números do clube:** a situação também mexe na receita, para o orçamento continuar importando ao longo da
  temporada:
  - endividado paga parcela da dívida por rodada;
  - rico tem TV e patrocínio maiores;
  - SAF ganha um "aporte do dono" na janela do meio do ano se estiver no G6.
- **Clubes da IA:** a IA também tem caixa (`save.caixaIA[id]`), e as compras dela (o evento `ia` em
  `carreira-eventos.js`) passam a depender dele: clube pobre compra barato, clube rico compra caro.
- **Onde:**
  - a tabela fica em `ferramentas/base-brasileirao.js` (campos `caixa` e `situacao` de cada clube; hoje `caixa` é
    `tamanho * 1.5e7` e não é usado) e regenera `public/carreira/base/brasileirao-2026.js`;
  - `completar(save)` usa `clube.caixa` quando existir e `CAIXA_INICIAL` como reserva, só para carreiras novas: **não
    mude o caixa de quem já tem carreira**;
  - na tela inicial (`inicio.js`), cada clube na escolha mostra o caixa e a situação.

### Ficou pronto quando
- Duas carreiras novas, com Flamengo e Chapecoense, começam com caixas bem diferentes, e a tela mostra a situação.
- O evento de transferência da IA respeita o caixa do clube comprador.
- `tests/carreira-base.test.js` confere que todo clube tem `caixa` e `situacao`.

---

## 6. Mercado mais flexível, com lucro de verdade

### O que é
Hoje o valor do jogador só depende da nota (`Mercado.valorDe`), a venda rápida paga 70% e a venda pela lista recebe
propostas de 85% a 120% do valor. Não dá para "comprar barato e vender caro". O mercado passa a ter:

1. **Valor que muda com o momento** (calculado entre as rodadas, nunca durante):
   - `Mercado.valorDe(j, momento)` multiplica o valor da nota por um fator de **forma** (gols e assistências na
     temporada, ser titular, `save.bonusNota`, efeitos de evento) entre 0,8 e 1,5;
   - jogador insatisfeito ou à venda vale menos;
   - guarde o histórico curto de cada jogador seu (`save.valores[pid] = [valores das últimas rodadas]`) para mostrar
     um gráfico pequeno de sobe e desce na ficha.
2. **O quanto você pagou fica guardado:** `save.compras[pid] = { valor, rodada }`. A ficha (`desenharFicha` em
   `cartas.js`) mostra "Comprado por R$ X na R5 · vale R$ Y · **lucro +R$ Z**" (verde ou vermelho).
3. **Você escolhe o preço de venda:**
   - pôr na lista abre um controle de preço pedido, de 70% a 250% do valor;
   - entre as rodadas, a chance de chegar proposta cai quanto mais alto o pedido;
   - as propostas da IA ficam perto do pedido, às vezes acima quando o jogador está em alta;
   - tudo sai do sorteio com semente de `carreira-eventos.js`.
4. **Disputa entre clubes (mecânica do Leilão):** quando dois ou mais clubes querem o seu jogador (por exemplo, pedido
   razoável e jogador em alta), chega um evento "Disputa por X".
   - Os clubes dão lances em rodadas curtas, um cobrindo o outro, como no leilão, e você vê os lances subindo numa
     tela própria.
   - Você aceita o maior a qualquer momento ou espera o próximo lance, com o risco de um desistir.
   - Tudo decidido pelo servidor com semente; o navegador só mostra.
5. **Comprar de mais jeitos:**
   - **parcelado:** entrada de 50% e o resto em 4 rodadas, com juros de 10%; as parcelas entram em `movimentar` com
     o nome "Parcela de X";
   - **troca:** oferecer um jogador seu como parte do pagamento (vale o valor de mercado dele com desconto de 10%);
   - o limite de 3 tentativas por jogador e rodada continua.
6. **Sem truque:** comprar e revender na mesma janela, sem o valor ter subido, nunca dá lucro (a venda pela lista não
   passa do que você pagou nas primeiras 3 rodadas depois da compra). Lucro vem de valorização de verdade (forma,
   evolução por evento, olheiro com desconto).

### Onde fica
- **Contas:** em `public/carreira/mercado.js` (servidor e navegador):
  - `valorDe` com o momento;
  - `chanceDeProposta(pedido, valor, momento)`;
  - `avaliarProposta` aceitando `parcelas` e `troca`.
- **Servidor (`carreira.js`):**
  - `propor` aceita `{ parcelas: true }` e `{ troca: pid }`;
  - `vender` no modo `"lista"` aceita `{ pedido }`;
  - o evento de disputa em `carreira-eventos.js`, com as respostas "aceitar o lance de X" e "esperar".
- **Tela:**
  - a ficha ganha preço pedido, lucro e gráfico;
  - o formulário de proposta ganha "parcelar" e "incluir jogador na troca";
  - a tela da disputa mostra os escudos dando lances, os valores subindo e o martelo.

### Ficou pronto quando
- Dá para comprar um jogador com dica do olheiro, ele valorizar com gols e eventos, e vender pela lista com lucro, e a
  ficha mostra o lucro certo.
- Revender logo depois de comprar não dá lucro.
- A disputa aparece, os lances sobem, e aceitar vende pelo lance aceito.
- O parcelado cobra as parcelas nas rodadas certas, e a troca tira o seu jogador do elenco.
- Testes novos em `tests/carreira-servidor.test.js`: lucro com valorização, sem lucro na revenda imediata, parcelas,
  troca e disputa (com a mesma semente, os mesmos lances).

---

## 7. Os lances da partida em pixel-art, como no Leilão

### O que é
Hoje só o **gol** ganha replay em pixel-art (`gol(e)` em `partida.js`, com `Lances.criar`). Os outros lances aparecem só
como texto na narração (`narrar(e)`). Como no Leilão, cada lance importante ganha o seu **quadro animado em
pixel-art**, curtinho (1,5 a 3 s):

| Lance (`e.tipo`) | Quadro |
| --- | --- |
| `defesa` | O goleiro voando e espalmando (reaproveite `goleiroVoa` de `Lances.kit`) |
| `perdeu` | A bola explodindo na trave ou passando raspando, e o atacante com as mãos na cabeça |
| `penalti` | A cobrança vista de trás: o canto escolhido (`Ritmo.ZONA_NOME`) e o pulo do goleiro |
| `amarelo` / `vermelho` | O juiz correndo e levantando o cartão; no vermelho, o jogador saindo de cabeça baixa |
| `lesao` | O jogador no chão, a maca entrando |
| `sub` | O quarto árbitro com a placa de LED, número saindo em vermelho e entrando em verde, nas cores do clube |
| `contra_ataque` | Três bonecos correndo em velocidade com linhas de vento |
| `intervalo` / `fim` | O placar de TV com o apito; no fim, os jogadores do vencedor comemorando |

- **Os quadros:** use as peças de `Lances.kit` (boneco, poe, corre, bola, traves, rede, bandeirinha, poeira, clima),
  com o uniforme de cada clube (`uniformeDoClube`) e o cenário nas cores do mandante, igual ao `gol(e)`.
- **Onde ficam as cenas:** num arquivo novo, `public/leilao/lances-outros.js`, carregado depois de `lances.js` (o
  Leilão também pode usar), com `Lances.criarLance(tipo, dados, opcoes)` devolvendo um telão igual ao do gol.
- **Mesma lógica do Leilão:**
  - o quadro aparece **na hora** do lance;
  - lances no mesmo minuto ficam **lado a lado**;
  - os mais velhos descem, e o mais novo fica em cima (como `#replays` já faz com os gols);
  - o gol continua sendo o maior e o mais longo;
  - a cena é sorteada pela semente do lance: todo mundo vê a mesma, e recarregar repete.
- **Pular, acelerar e "menos movimento":** ao pular (`J.pulando`) ou acelerar, os quadros entram já no último quadro
  (sem animar). Com "menos movimento", aparece o quadro final parado.
- **Limite:** guarde no máximo uns 12 quadros na tela; os mais velhos saem, para o celular não pesar.

### Ficou pronto quando
- Numa partida no modo 1 assistida até o fim, aparecem quadros de defesa, chance perdida, cartão e substituição, cada
  um coerente com o texto da narração.
- Dois lances no mesmo minuto aparecem lado a lado, sem fila.
- Pular a partida não trava e não acumula animação.

---

## 8. Ordem sugerida

1. Item 4 (trocar pelo banco): pequeno e isolado.
2. Item 5 (orçamentos): dados e uma regra no servidor.
3. Item 6 (mercado): o maior, mexe em servidor, contas e tela. Faça os testes junto.
4. Item 2 (pós-jogo): usa os números do servidor.
5. Item 1 (feed): usa os eventos, as transferências e o pós-jogo.
6. Itens 3 e 7 (estádio e lances): pixel-art no navegador, sem mexer no servidor.

---

## 9. Conferir antes de abrir o PR

- `npm test` passando, com os testes novos citados acima. Teste novo entra na lista do `"test"` do `package.json`,
  senão não roda.
- `npm run test:e2e` com `tests/e2e/carreira.spec.js`, que tem uma rodada no computador e outra em 375x812.
- **Fotos em `planos/imagens/`:**
  - o feed (computador e celular), com pelo menos 6 tipos de arte;
  - o pop-up de pós-jogo;
  - a prancheta com o estádio (dia e chuva);
  - a ficha com o lucro e a tela da disputa;
  - quatro quadros de lance.
  - Se o navegador do teste não abrir no seu ambiente, diga isso no `MUDANCAS.md` em vez de dizer que conferiu.
- **`CLAUDE.md`:** atualize a linha da Carreira com os arquivos novos (`feed.js`, `posjogo.js`, `estadios.js`,
  `lances-outros.js`) e os campos novos do save (`feed`, `posJogo`, `compras`, `valores`, `caixaIA`).
- **`MUDANCAS.md`:** o resumo do que mudou, para quem joga, e o que foi conferido de verdade.
