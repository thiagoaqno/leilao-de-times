# Leilão da Galera — anotações do projeto

Tudo o que foi decidido e construído, para não se perder. Atualizado em 29/09/2026.

## De onde veio

A galera montava times por leilão ao vivo no Meet: um rodava a roleta com os nomes, cada um dava lance, e o controle de moedas ficava numa planilha do Excel. A regra era colocar **um item a mais por participante** na roleta, para cada um poder recusar (pular) uma vez. Depois os times iam para o ChatGPT ou o Claude "batalhar".

Os primeiros campeonatos foram simulados no chat: futsal com jogadores atuais, futsal com lendas (double elimination e suíço), um Major de CS all-time (7 times) e um Champions de Valorant (6 times). Os apelidos da galera: Tabba, Kizzy, Wepex, Atrox, Verago, Notzin, Klaus, Dolly(nnn).

O site substitui a live, a roleta e o Excel.

## O que o site faz

- **Salas** com código de 5 letras. O organizador cria, a galera entra pelo link ou pelo código. Se a internet cair, é só abrir o link de novo.
- **Temas prontos:** futsal e futebol 11x11 (lendas ou atuais), CS, Valorant, hambúrguer, pizza, drink, sobremesa e personalizado. O site gera a lista equilibrada por categoria para o número de participantes, mais as sobras (padrão: uma por participante). Os nomes mudam com o tema (jogador/ingrediente, time/pizza…). Dá para salvar temas próprios no navegador.
- **Dois modos de leilão:**
  - 🔒 *Lance secreto:* todo mundo dá um lance escondido ou pula. O maior leva, e empate vai para o sorteio.
  - 🔨 *Lance aberto:* um cobre o outro (+1 no mínimo). Cada lance reinicia o cronômetro. Quem não quer mais clica em "Sair" (não gasta pulo).
- **Reta final:** enquanto sobram itens, dá para recusar. Quando a roleta fica só com o necessário para completar as vagas, ninguém pode recusar mais: se todos passarem, o item vai por sorteio, pelo lance mínimo, para quem tem vaga. Vale por categoria também (ex.: últimos goleiros).
- **Moedas:** ninguém fica sem dinheiro para completar o time, porque o site sempre guarda o lance mínimo de cada vaga que falta.
- **Composição:** livre, mínimo obrigatório (padrão) ou exata.
  - Mínimos: futebol 1 goleiro · CS 1 IGL e 1 AWPer · Valorant 1 controlador e 1 sentinela · hambúrguer pão e carne · pizza massa, molho e queijo · drink destilado · sobremesa base.
  - Quem já tem o obrigatório não pode "estocar" os últimos que sobraram enquanto alguém ainda precisar.
- **Organizador:** desfazer a última compra, devolver os sem dono à roleta, encerrar, e **reiniciar** (na "Zona de perigo", no fim da página, pedindo para digitar REINICIAR).
- **Resultado com suspense:** o organizador cola a resposta do ChatGPT ou do Claude, o site divide pelos títulos (##) e revela parte por parte para todo mundo ao mesmo tempo, sem ninguém conseguir espiar o fim.

## Simulação de futebol pelas notas do FC 27

- **Notas** do EA FC 27 (lançado em setembro de 2026). Lendas usam a versão Icon, e os atuais usam a nota oficial. Quem não tem nota oficial divulgada entra com uma estimativa (marcada com borda tracejada). Jogador fora da base entra com 75.
- **Base:** 205 jogadores com nota (91 oficiais, 114 estimados). Nas listas dos temas: lendas 106, atuais 100.
- **Formações:** cada participante escolhe a sua (futsal: 2-2, 3-1, 1-2-1, 1-1-2; campo: 4-3-3, 4-4-2, 3-5-2, 4-2-3-1, 3-4-3, 5-3-2) ou deixa na automática. O organizador escolhe se a formação é fluida (muda até a simulação) ou travada (não muda depois que o leilão começa).
- **Fora de posição** (combinado em 29/09, depois de testar uma versão mais dura):

| Posição → joga em | Ataque | Meio | Defesa | Gol |
|---|---|---|---|---|
| Atacante | 100% | 90% | 80% | 50% |
| Meia-atacante | 95% | 100% | 85% | 50% |
| Meia (sem tipo) | 90% | 100% | 90% | 50% |
| Volante | 85% | 100% | 95% | 50% |
| Defensor | 80% | 90% | 100% | 50% |
| Goleiro | 50% | 50% | 50% | 100% |

  Exemplo que guiou a tabela: Mbappé (91) no meio rende 82.
- **Força do time:** ataque (atacantes pesam mais, meias um pouco menos) contra defesa (goleiro pesa muito, depois defensores e meias). Os gols saem de uma distribuição de Poisson baseada na diferença entre ataque e defesa. Média de uns 2,8 gols por jogo no campo e 5,4 no futsal.
- **Formatos:** 2 times = série melhor de 3 (todo jogo tem vencedor). 3 ou mais = pontos corridos + final (ou semifinais, com 6+), ou mata-mata direto. Com prorrogação e pênaltis.
- **Card do campeão:** imagem 1080×1350 com a escalação no campinho, a campanha, o artilheiro e a pérola do título. Só aparece depois que tudo foi revelado.

## Resenha da simulação

- **Sem piadas por apelido (30/09):** os bordões da galera (TÔ AKI, gift card, Mano Purple, KKKKK, Fluence, USP, o "Bad" antes do nome) e os gritos de lavada antigos foram tirados, porque ficavam repetitivos. A narração ficou só com futebol. O `simulador.js` ainda aceita piadas por apelido se um dia alguém colocar uma lista `galera` em `public/bordoes.js`.
- **Gritos de lavada:** de arquibancada: É GOLEADA!, OLÉ!, FREGUÊS!, PODE IR PRO VESTIÁRIO!, TÁ ACHANDO QUE É FÁCIL?, É CAIXOTE!
- **Narrador de mesa redonda:** frases originais no estilo ("Isso aqui não é futebol, é covardia!"). Não usamos frases atribuídas ao Craque Neto porque seriam inventadas.
- **Pérolas do futebol:** frases reais ("Meteli o goli", "Tenho a total dúvida…", "Só bate quem erra", "Dia das Páscoas", "É tetra!"; e, desde 30/09, Galvão "Haja coração"/"Pode isso, Arnaldo?"/"Vai que é tua, Taffarel!", Arnaldo "A regra é clara", Silvio Luiz "Olho no lance!"/"Pelo amor dos meus filhinhos!", Osmar Santos "Ripa na chulipa…", Zagallo "Vocês vão ter que me engolir!", Muricy "Aqui é trabalho, meu filho!", Dadá, Vicente Matheus, Neném Prancha, Garrincha, Parreira, Vampeta…), ditas por um jogador do time simulado na "saída de campo", cada uma na situação certa (gol, vitória, derrota, zebra, lavada, jogo apertado, pênalti perdido, título, apresentação).

## Visual (repaginado em 29/09/2026, estilo Champions League)

- **Conceito:** noite de Champions League. Estádio azul-marinho com refletores e estrelas, prata da taça no lugar do dourado, ciano e magenta de destaque. A roleta fica no círculo central de um gramado noturno, com um aro de refletores que piscam só enquanto ela gira. Cada compra aparece numa placa prateada de "vendido".
- **Cores:** fundo `#050d33`, prata `#dfe7fb`, ciano `#2fd3ff`, magenta `#ff2e88`, verde `#3ee08f`, gramado `#0f4f31`/`#125a39`. Ficam como variáveis no topo do `<style>` de `public/index.html`.
- **Fontes:** Saira Condensed (títulos, números, código da sala, roleta, card do campeão) e Figtree (texto).
- O visual antigo está guardado em `index.antigo.html`, na raiz do projeto (fora da `public`, então não vai para o site).
- **Emblema:** escudo prateado com a roleta dentro e duas estrelas (`public/emblema.svg`). Também é o ícone da aba.
- **Cabeçalho:** uma barra fina fixa no topo. Dentro da sala, mostra o código e o botão de convite; as regras da sala ficam numa linha discreta logo abaixo.
- **Campinho ao vivo (futebol e futsal):** cada time aparece num campo (ou quadra de futsal) com a formação de cada participante, e os jogadores entram na vaga assim que são comprados. A escalação é a mesma que o simulador usa (`public/escalacao.js`, compartilhado entre o site e o `simulador.js`). Número em rosa = jogador fora de posição, mostrando quanto rende ali. Vaga tracejada = vaga que ainda falta. Quem sobra fica em "Reserva". No celular, os times passam para o lado com o dedo.
- **Sombra do jogador em leilão:** enquanto um jogador está em disputa e você pode pegá-lo, ele aparece piscando em ciano no seu campinho, na vaga onde entraria (em rosa se for jogar fora de posição). Um aviso em cima diz quanto ele renderia, quem iria para a reserva e se a formação automática mudaria.

- **Mudar posições:** cada participante toca num jogador do seu campinho e depois em outra vaga, outro jogador ou alguém da reserva, e eles trocam de lugar. Quem foi mexido fica fixado (bolinha azul); os jogadores novos entram sozinhos nas vagas que sobram. "Voltar ao automático" desfaz tudo. As posições ficam livres até a simulação, mesmo com a formação travada (combinado em 29/09), e a simulação usa exatamente o que está no campinho. Ficam guardadas no servidor (`pins` de cada participante) e são apagadas ao reiniciar o leilão.
- **Força do time:** cada time mostra Ataque e Defesa (a mesma conta do simulador) no lugar da média das notas.
- **Temas de comida:** hambúrguer, pizza, drink e sobremesa trocam o estádio por uma lanchonete à noite (mostarda, ketchup, picles, fonte Lilita One). A roleta fica num prato sobre toalha xadrez e a placa de "vendido" vira comanda. Cada participante vê o seu prato sendo montado (`public/cozinha.js`): o hambúrguer empilha (pão a mais vira pão do meio), a pizza ganha cobertura, o drink enche o copo em camadas e a sobremesa é montada na taça. A cor e a forma saem do nome do ingrediente. O que falta aparece tracejado (no máximo uma camada por vaga livre, as obrigatórias primeiro) e o ingrediente em leilão aparece piscando no seu prato. Temas salvos a partir de um tema de comida mantêm o desenho.

- **Batalha dos pratos no site (sem IA):** depois do leilão, o organizador abre a votação e cada participante dá nota de 1 a 10 aos pratos dos outros, em segredo. O júri do site (`juri.js`) tem três jurados fictícios: Chef Armando (exigente), Dona Cida do Podrão (lanche raiz) e Lulu Filtro (ousadia e apresentação). A nota final é metade júri, metade galera (prato sem voto fica só com o júri). O resultado sai em partes para o modo suspense: os pratos, cada prato com os jurados, o voto da galera (voto mais cruel e mais puxa-saco, quando fizer sentido) e o placar até o campeão. As notas dos ingredientes e as combinações ficam no topo de `juri.js` e podem ser editadas. Desfazer uma compra cancela a votação aberta.

## Quem vê o quê

- **Só o organizador:** botões da roleta, card de Resultado (texto para copiar, simulação, batalha dos pratos, prompt da IA e publicação com suspense), Zona de perigo, remover participante e a conta de itens na sala de espera.
- **Todo mundo:** roleta, times/campinhos/pratos, roleta restante, histórico e o resultado revelado.
- **Votos da batalha:** cada um só recebe os próprios votos; dos outros, só quantos pratos já votou, até a revelação.
- **Lances secretos:** o servidor só manda o valor do próprio lance; dos outros, só que já deram lance. Vale também para quem só assiste.
- **Só assistir:** corrigido em 29/09. Antes, quem entrava assim não recebia nenhuma atualização da sala.

## Como publicar e atualizar

- **Hospedagem:** Render (Web Service gratuito), ligado ao repositório do GitHub. A Vercel não serve, porque o site precisa de conexão em tempo real aberta.
- **Atualizar:** subir os arquivos alterados no GitHub (os de `public` vão dentro da pasta `public`) e esperar o Render ficar "Live". Depois, recarregar a página (Ctrl+F5).
- **Rodar no PC:** `npm install` e `npm start` nesta pasta, depois abrir http://localhost:3000.
- **Plano gratuito do Render:** o servidor dorme depois de uns 15 minutos parado, e as salas ficam só na memória. Se reiniciar, a sala some, então baixe o card logo depois da final.
- **IA integrada:** chegamos a colocar a simulação direto pela API (Claude/ChatGPT) com senha e limite diário, mas tiramos, porque a chave ficaria exposta ao uso de qualquer um com o link e custava dinheiro. Ficou o "Copiar prompt" + "Publicar com suspense".

## Banco da Galera (jogo de tabuleiro, criado em 29/09/2026)

Um segundo jogo no mesmo site, em `/banco/`, porque as opções prontas de "banco imobiliário" online são pagas ou têm poucas vagas. As duas páginas têm uma chave "Leilão | Banco" no cabeçalho. O nome evita "Banco Imobiliário", que é marca da Estrela.

- **Arquivos:** `banco.js` (todas as regras, no servidor, canal próprio do Socket.io `/banco`), `public/banco/tabuleiro.js` (tabuleiro, cartas e contas de aluguel, usado pelo servidor e pela página) e `public/banco/index.html` (a página). O leilão não foi mexido, só ganhou a chave no cabeçalho e a linha que liga o `banco.js` no `server.js`.
- **Mesa:** código de 5 letras, de 2 a 6 jogadores, convite por link (`/banco/?mesa=CODIGO`). Quem cai volta pelo mesmo link. Depois de começar, quem chega só assiste. Cada um escolhe peão e cor.
- **Tabuleiro (versão de 29/09, trocada em 30/09 por São Paulo, veja abaixo):** 22 capitais em 8 grupos de cor (Norte, Nordeste, Centro-Oeste, Sudeste, Sul e Rio/São Paulo), 4 aeroportos (CGH, GIG, GRU, SDU), Companhia de Luz e de Água, Imposto de Renda, Taxa de Luxo e 6 casas de "Sorte ou Revés" (um monte só, 26 cartas, algumas com piada da galera: gift card, Fluence). Valores de aluguel e casa iguais aos do clássico. Cada cidade aparece pela sigla do aeroporto (SAO, RIO, BHZ…), para caber no celular.
- **Regras:** salário de R$ 200, grupo completo dobra o aluguel, construção por igual, 32 casas e 12 hotéis no banco, hipoteca (metade do preço; resgate +10%), prisão (dupla, fiança de R$ 50 ou habeas corpus; na 3ª tentativa paga e sai; 3 duplas seguidas prende), trocas de imóveis, dinheiro e habeas corpus a qualquer hora (imóvel com casas no grupo não troca).
- **Dívidas:** se alguém não tem dinheiro para pagar, o jogo espera essa pessoa vender, hipotecar ou negociar. Se não der, declara falência e tudo vai para quem ela devia (as construções voltam ao banco pela metade, e o dinheiro vai para o credor).
- **Opções do organizador:** dinheiro inicial, tempo de partida (30 minutos por padrão; 15, 45, 60, 90 ou sem limite; quando acaba, vence o maior patrimônio), leilão quando ninguém compra (ligado por padrão: lance aberto, 15 s no começo e 8 s depois de cada lance), pote das Férias e salário em dobro no Início. Ele também pode tirar do jogo quem desconectou, encerrar e ver o ranking, e jogar de novo com a mesma galera.
- **Tabuleiro inclinado (30/09):** visão de câmera em 3ª pessoa, com o tabuleiro deitado para trás. Peões, casas (verdes), hotéis (vermelhos) e dados ficam em pé por cima, numa camada à parte que acompanha a posição de cada casa na tela. O peão anda casa por casa depois que os dados param, e as construções novas "caem" no lugar. O botão "Visão de cima" deixa o tabuleiro reto (fica guardado no navegador).
- **Relógios (30/09):** cada jogada tem 40 segundos (15 para quem está desconectado), com barra no painel e contagem na lista de jogadores. Se o tempo acabar: o dado roda sozinho, a cidade vai a leilão (ou fica sem comprar) ou a vez passa. Quem deve e não paga a tempo: o banco vende construções e hipoteca os imóveis mais baratos; se não der, é falência. O relógio recomeça a cada etapa e a cada ação de quem está com a vez. A partida mostra o tempo que falta no cabeçalho (⏳).
- **Dinheiro e animações (30/09, parte 1 do pedido "está pouco divertido"):**
  - Valores em milhares: o jogo guarda 200 e mostra "R$ 200 mil" (1500 vira "R$ 1,5 mi"). Lances e trocas são digitados em mil. A conta fica em `money()`/`short()` no `tabuleiro.js`.
  - Placas grandes com o dinheiro de cada jogador em cima do tabuleiro (a da vez fica dourada).
  - Todo pagamento vira nota voando de quem paga para quem recebe (ou para a casa do tabuleiro / o banco no meio / o pote das Férias), com "−R$"/"+R$" pulando e o número da placa contando. Quem recebe só vê o dinheiro subir quando a nota chega. O servidor manda esses pagamentos na lista `fx` do estado.
  - A jogada anda no ritmo da animação: o servidor espera os dados girarem e o peão chegar antes de cobrar aluguel, oferecer compra ou tirar carta (etapa "moving", sem relógio). A carta fica 2,6 s na tela antes de valer, e a ida para a prisão voa em linha reta. Os tempos ficam no topo do `banco.js` (`BANCO_ANIM=0` zera tudo nos testes).
- **Parte 2 (30/09):**
  - **São Paulo:** ruas, avenidas e bairros com o nome inteiro, sem abreviação (Rua 25 de Março, Brás, Mooca, Penha, Tatuapé, Liberdade, Bela Vista, Consolação, Santana, Lapa, Pompeia, Vila Madalena, Pinheiros, Rua Augusta, Vila Mariana, Moema, Ibirapuera, Itaim Bibi, Vila Olímpia, Avenida Faria Lima, Rua Oscar Freire e Avenida Paulista). Aeroportos de Congonhas, Guarulhos, Viracopos e Campo de Marte; companhias de Luz e Água.
  - **Visual das casas:** o nome fica num "botão" da cor do grupo; comprada, a casa inteira fica na cor do dono, com o peão dele no canto. Imóvel blindado mostra 🛡️.
  - **Meio do tabuleiro:** pilha de Sorte ou Revés (com quantas cartas sobram) e pilha de escrituras viradas (quantos imóveis ainda estão à venda). A carta tirada sai da pilha virada e desvira no meio; na compra ou no leilão, a escritura voa da pilha para o dono. Em trocas, usucapião e doação, a escritura voa de um jogador para o outro.
  - **Cartas novas:** mais cartas no estilo Monopoly (herança, dentista, batida na Marginal…) e 6 cartas de poder, com selo roxo: Demolição/Fiscalização (derruba uma casa ou hotel de outro jogador), Usucapião (toma um imóvel sem casas), Doação (dá um imóvel seu, escolhendo para quem) e Escritura blindada (🛡️ para sempre contra demolição e usucapião). O jogo espera o jogador tocar no alvo (as opções piscam no tabuleiro); se o tempo de 40 s acabar, o alvo é sorteado.
  - **Eventos da rodada:** 3 em cada 4 rodadas têm um evento, anunciado num banner: Black Friday (construções pela metade), Aluguel nas alturas (dobro), Greve nos aeroportos, Apagão (companhias não cobram), Feriadão (salário em dobro), Liquidação do banco (imóveis 30% mais baratos), IPTU (R$ 10 mil por imóvel) e Bolsa em alta (R$ 50 mil para todos). Os eventos e as cartas de poder podem ser desligados na sala de espera ("Eventos e cartas especiais").
  - **Sons:** gerados pelo navegador, sem arquivos: dados, passos, moedas (recebe), pagamento, batida de lance, martelo do leilão, sirene da prisão, carta, fanfarra de evento, explosão, escudo e aviso de "sua vez". Botão 🔊/🔇 no cabeçalho (guardado no navegador).
  - **Reações:** 😂 💸 🤡 😭 🔥 👏 embaixo do tabuleiro; o emoji sobe em cima do peão de quem mandou, para todo mundo. No máximo uma a cada 0,7 s por pessoa.
- **Parte 3 (30/09): modo rápido e modo equipes** (opções na sala de espera)
  - **Modo rápido:** até 4 casas em qualquer imóvel, sem ter a cor toda e sem construir por igual; o hotel continua exigindo a cor completa. Uma casa trava só aquele imóvel (para hipotecar, trocar ou ser alvo de carta), não o grupo. As partidas dos bots caíram de 150–250 para 20–40 rodadas.
  - **Modo equipes (2, 3 ou 4):** Time Coxinha 🍗, Time Pastel 🥟, Time Pão de Queijo 🧀 e (desde 30/09, para mesas de 8) Time Brigadeiro 🍫. Cada um com o seu dinheiro, com botão para mandar dinheiro a um colega. Aluguel entre colegas é grátis; cor completa, aeroportos e companhias contam o que a equipe inteira tem. Demolição e usucapião só miram adversários. Ganha a última equipe de pé ou, no fim do tempo, a de maior patrimônio somado. Na sala de espera cada um escolhe a equipe, e o organizador pode sortear.
- **Interface (30/09):**
  - **Carteira:** mostra o seu dinheiro em destaque, com número animado, brilho quando é a sua vez e tremida/verde quando perde/ganha. As notas que você recebe voam para ela. No celular vira uma barra fixa embaixo, com o dinheiro e o botão da ação da vez (jogar, comprar, pagar, dar lance, passar).
  - **Dados:** dá para jogar tocando nos dados do meio do tabuleiro (brilham com "Toque nos dados" na sua vez).
  - **"SUA VEZ!":** aparece grande quando a vez chega em você.
  - **Seus imóveis:** construir, vender casa e hipotecar/resgatar direto na lista, com o aluguel atual de cada um e o motivo quando não dá para construir.
- **Parte 4 (30/09): mais destaque e tela reorganizada**
  - **Destaques no meio do tabuleiro, para todo mundo:** carta de Sorte ou Revés (sai da pilha e desvira, com quem tirou), aluguel pago, imposto, compra, leilão aberto e vendido, prisão, pote das Férias, falência, troca, ajuda de colega, hotel novo e cartas de poder. Aparecem grandes no centro, com o resto escurecido, um de cada vez (tocar pula). O servidor manda cada um como `news` na lista `fx`.
  - **Leilão em janela** para todo mundo: escritura, maior lance (pulsa a cada lance), quem está na frente, anel de tempo, botões de lance e "sair". Dá para minimizar ("Ver o tabuleiro") e reabrir pelo painel.
  - **Tela:** do lado direito só o que importa agora (carteira, ação da vez, seus imóveis, trocas). Embaixo do tabuleiro, a **Mesa**: cada jogador com dinheiro, patrimônio, situação e todas as escrituras (miniaturas na cor do grupo, com casas, aluguel atual, hipoteca e escudo; tocar abre a escritura). O histórico ficou recolhido no fim da Mesa. O tabuleiro deixou de ficar fixo ao rolar.
  - **Escritura redesenhada:** cabeçalho na cor do grupo, selo de preço, faixas de dono/blindada/hipotecada/casas, tabela de aluguel com a faixa atual destacada, blocos de custo e "aluguel agora"; carimbo HIPOTECADA.
  - **Casas e hotéis novos:** em perspectiva (parede da frente e do lado, telhado de duas águas, chaminé, janelas acesas); o hotel é um prédio com janelas e placa "H" dourada.
- **Ajustes (30/09):** casas e hotéis com uma escala só (antes os da frente do tabuleiro inclinado saíam maiores que os do fundo); verso das escrituras com cara de cédula (gravura, moldura dourada e verde, selo "BG"); Sorte ou Revés de 37 para 66 cartas, com cartas descontraídas (tigrinho, sextou em Noronha, Daddy, day trade, iPhone na privada, rodízio de placa, Faria Lima de colete…). As cartas do Fluence e do gift card viraram piadas gerais (carro na OLX, golpe do Pix).
- **Tabuleiro grande e relógio no tabuleiro (30/09):**
  - Na sala de espera, o organizador escolhe o tabuleiro: **Normal** (40 casas, até 6 jogadores) ou **Grande** (52 casas, 13 por lado, até 8 jogadores). Com mais de 6 pessoas, o jogo só começa no grande.
  - O grande tem mais bairros (Bom Retiro, Jardim Anália Franco, Higienópolis, Perdizes, Barra Funda, Brooklin, Morumbi, Jardim Europa), cores com 4 cidades (marrom e azul com 3), 3 companhias (entrou a de Gás; com as 3, o aluguel é 20x os dados), 3 impostos (entrou o IPVA), 8 casas de Sorte ou Revés, e o banco tem 44 casas e 16 hotéis.
  - Por dentro: `tabuleiro.js` monta o tabuleiro com `makeBoard("normal" | "grande")`; cada mesa guarda o seu em `room.T`. As cartas "avance até…" apontam pelo nome da casa, então valem nos dois.
  - O tempo que falta para acabar a partida aparece grande no meio do tabuleiro (fica vermelho e pulsando nos últimos 5 minutos), além do cabeçalho.
  - Cores de peão: 8 (entraram turquesa e marrom).
  - Casas de Sorte ou Revés pintadas de roxo para se destacarem; o verso das escrituras ficou só com o selo "BG" (sem texto).
- **Testado** com partidas automáticas de bots (2, 3, 4 e 6 jogadores, com e sem limite de rodadas), todas até o fim, sem dinheiro negativo nem jogo travado.

## Uno da Galera (jogo de cartas, criado em 30/09/2026)

Terceiro jogo do site, em `/uno/`. Os cabeçalhos têm a chave "Leilão | Banco | Uno | Sinuca". Observação: "UNO" é marca da Mattel; para uso entre amigos não tem problema, mas se o site ficar público vale trocar o nome.

- **Arquivos:** `uno.js` (regras, no servidor, canal `/uno`), `public/uno/regras.js` (baralho, o que pode ser jogado e pontos, usado pelo servidor e pela página) e `public/uno/index.html`.
- **Mesa:** de 2 a 8 jogadores, código de 5 letras, convite por link (`/uno/?mesa=CODIGO`), volta pelo mesmo link, espectadores. Cada um escolhe um avatar. Cada jogador só recebe as próprias cartas; dos outros, só quantas têm.
- **Regras oficiais:** 108 cartas, 7 para cada, Bloqueio, Inverter (com 2 jogadores vale como bloqueio), +2, Coringa e Coringa +4 com desafio (se quem jogou tinha a cor da mesa, compra 4; se não, quem desafiou compra 6). Quem compra uma carta que serve pode jogá-la na hora. Carta inicial com efeito. UNO!: o botão aparece com 2 cartas na sua vez (ou com 1); quem esquece pode ser pego ("Pegou!") até o próximo jogador agir, e compra 2. Pontos: quem bate ganha as cartas dos outros (número = valor, ação = 20, coringa = 50).
- **Opções:** até 500 pontos (oficial), até 200 ou rodada única; acumular +2 e +4 (regra da casa; sem desafio; +2 também cobre +4, combinado em 30/09); jogar cartas iguais juntas (regra da casa, ligada por padrão, 30/09: dois 4 de cores diferentes saem de uma vez, escolhendo qual cor fica por cima; efeitos somam: dois Bloqueios pulam dois, dois +2 dão +4, dois Inverter se anulam; coringas não entram). Cada jogada tem 30 s (10 s para quem caiu): se passar, compra e passa. Entre rodadas, 12 s de resultado (o organizador pode adiantar).
- **Tela:** mesa oval com os jogadores em volta (quem olha fica embaixo), a luz da mesa na cor em jogo, setas do sentido da roda girando, anel de tempo em volta de quem joga, monte (dá para tocar para comprar) e descarte. A mão fica embaixo, organizada por cor; as cartas que dá para jogar sobem e brilham, as outras escurecem. Coringa abre a escolha de cor mostrando quantas de cada cor você tem.
- **Animações e sons:** cartas distribuídas voando para cada um, carta jogada voando da mão (ou do lugar do jogador) para o descarte, compras voando do monte, carimbos de 🚫, 🔄, +2/+4, "🎨 COR", balão de "UNO!", "PEGOU!", "BLEFE!", "SUA VEZ!", confete e coroa para quem bate. Sons gerados pelo navegador, com botão de mudo. Reações com emoji em cima do avatar.
- **Testado** com partidas automáticas (2, 4, 6 e 8 bots; acumulando; rodada única): as 108 cartas sempre fecharam a conta, e nenhuma jogada válida foi recusada.

## Sinuca da Galera (bola 8, criada em 30/09/2026)

Quarto jogo do site, em `/sinuca/`. Os cabeçalhos têm a chave "Leilão | Banco | Uno | Sinuca | Truco | Dominó".

- **Arquivos:** `sinuca.js` (regras e torneio, no servidor, canal `/sinuca`), `public/sinuca/fisica.js` (física da mesa, triângulo e linha de mira, usada pelo servidor e pela página) e `public/sinuca/index.html`.
- **Como a tacada funciona:** quem joga manda só a mira (ângulo, força, efeito, onde pôs a branca e a caçapa da 8). O servidor simula a tacada inteira e aplica as regras. Os navegadores recebem a mesma tacada e refazem a simulação só para animar. A física usa só + − × ÷ e raiz quadrada, com passo fixo (900 por segundo), então o resultado é idêntico no Node e em qualquer navegador (conferido: diferença zero). A mira aparece ao vivo para todo mundo enquanto a pessoa mexe.
- **Física:** mesa de 9 pés em escala (pano 1000 × 500, bola de raio 11,25), atrito escorregando e rolando (efeito em cima segue, embaixo volta), efeito lateral que abre/fecha o ângulo na tabela, quinas das caçapas que rebatem, choque entre bolas quase elástico. O triângulo é arrumado com folguinhas aleatórias (senão o meio não abre na saída, como um pêndulo de Newton). Em média a saída encaçapa 1 bola.
- **Regras (estilo 8 Ball Pool):** saída com a branca atrás da linha; a 8 que cai na saída volta para a marca; mesa aberta até a primeira bola encaçapada numa tacada limpa depois da saída; faltas: branca na caçapa, não tocar em bola, tocar primeiro em bola errada (na mesa aberta, a 8), nenhuma bola na tabela depois do toque, estourar o tempo; falta = bola na mão em qualquer lugar para o outro lado; a 8 tem caçapa marcada (a página sugere a caçapa pela linha de mira); perde quem encaçapa a 8 antes da hora, na caçapa errada ou junto com falta.
- **Modos:** duplas 2x2 (as duplas se revezam e, dentro da dupla, os dois se alternam; cada um escolhe a dupla no ⇄ ou o organizador sorteia), 1x1 (com 2 jogadores), rei da mesa (quem ganha fica, quem perde vai para o fim da fila, qualquer número de 3 a 8) e mata-mata (4 ou 8 jogadores). Série de 1, 2, 3 ou 5 vitórias. Tempo por tacada de 30, 45 ou 60 s (12 s para quem caiu). A saída alterna entre as partidas.
- **Tela:** mesa em canvas com madeira, diamantes e caçapas; bolas 3D de verdade (cada uma gira conforme rola, desenhadas pixel a pixel, com número, faixa e brilho); taco, linha de mira com bola fantasma e para onde cada bola vai; barra de força (puxa e solta), bolinha de efeito, ajuste fino (e rodinha do mouse / setas ← →). No celular em pé a mesa fica na vertical. Placar em cima com as bolas de cada lado, anel de tempo, avisos de falta, sons gerados pelo navegador e reações com emoji.
- **Ajustes (30/09, a pedido):** a linha de para onde a bola mirada vai ficou curta (no máximo ~3 bolas; antes era ~9 e entregava a jogada). Golpe do taco em estilingue: ao soltar, o taco sai do ponto puxado e acelera até a branca (mais força, golpe mais rápido), passa um pouco da bola e some; com força alta ele treme enquanto você puxa. Quem assiste vê o mesmo golpe (o servidor dá 160 ms antes de a branca partir), e o som da tacada sai no contato.
- **Testado** com robôs jogando campeonatos inteiros no servidor (duplas, 1x1, rei da mesa com 5 e mata-mata com 4 e 8) e pela própria página em duas abas.

## Truco da Galera (truco paulista, criado em 30/09/2026)

Quinto jogo do site, em `/truco/`. Os cabeçalhos têm a chave "Leilão | Banco | Uno | Sinuca | Truco | Dominó".

- **Arquivos:** `truco.js` (regras, no servidor, canal `/truco`), `public/truco/regras.js` (baralho, força das cartas, quem leva a mão, sinais; usado pelo servidor e pela página) e `public/truco/index.html`.
- **Mesa:** 2, 4 ou 6 jogadores em dois times iguais (cada um escolhe o time no ⇄, ou o organizador sorteia). Na mesa os parceiros sentam alternados e a vez passa para a direita. Código de 5 letras, convite por link (`/truco/?mesa=CODIGO`), espectadores. Cada jogador só recebe as próprias cartas.
- **Regras (paulista):** baralho limpo de 40 cartas; a vira define a manilha (a carta seguinte); manilhas: zap ♣ > copas ♥ > espadilha ♠ > pica-fumo ♦; depois 3 2 A K J Q 7 6 5 4 sem naipe. Melhor de 3 rodadas; cangou (empate): se foi a primeira, leva quem fizer a segunda; se foi a segunda ou terceira, leva quem fez a primeira; tudo empatado, ninguém marca. Carta coberta da segunda rodada em diante. Truco (3), seis, nove e doze: aceitar, correr (o outro leva o valor antes do pedido) ou aumentar; quem pediu por último não aumenta. Mão de onze: o time com 11 vê as cartas do parceiro e decide jogar (vale 3) ou correr (dá 1); sem truco. Mão de ferro: os dois com 11, todo mundo joga no escuro. Jogo até 12; opção de melhor de 3 ou de 5 partidas.
- **Tempo:** 20, 30 ou 45 s por jogada (8 s para quem caiu). Se passar: joga a carta mais fraca; pedido sem resposta é aceito; mão de onze sem decisão é jogada. Pausa de 1,5 s entre rodadas (as cartas ficam na mesa) e de 4 s entre mãos.
- **Tela:** mesa oval de pano vinho, jogadores em volta (quem olha fica embaixo), cartas voando para o centro, a vencedora da rodada brilha, marcadores das 3 rodadas, vira com o monte, placar "Nós × Eles" com "vale X". Balões de "TRUCO!/SEIS!" com a mesa tremendo, "Cai dentro!", "Corri 🏃". Painel com a ordem de força das cartas daquela mão. Sinais para o parceiro (piscadinha = zap, sobrancelha = copas…) que aparecem para a mesa toda, como reação, então valem para blefar (mudado em 30/09 a pedido: antes só o time via), reações com emoji, sons gerados pelo navegador. No celular as cartas diminuem e a vira/rodadas ficam no vão entre os lugares.
- **Testado** com robôs jogando no servidor (2, 4 e 6 jogadores, 90 partidas: 39 × 51, sem viés) e pela página com 4 e 6 jogadores.

## Dominó da Galera (dominó de dupla, criado em 30/09/2026)

Sexto jogo do site, em `/domino/`. Os cabeçalhos têm a chave "Leilão | Banco | Uno | Sinuca | Truco | Dominó".

- **Arquivos:** `domino.js` (regras, no servidor, canal `/domino`), `public/domino/regras.js` (pedras, encaixe, tipo de batida; usado pelo servidor e pela página) e `public/domino/index.html`.
- **Mesa:** exatamente 4 jogadores em 2 duplas (cada um escolhe a dupla no ⇄, ou o organizador sorteia); o parceiro senta de frente e a vez passa para a direita. Código de 5 letras, convite por link (`/domino/?mesa=CODIGO`), espectadores. Cada um só recebe as próprias pedras; no fim da mão, todo mundo vê o que sobrou.
- **Regras:** 28 pedras, 7 para cada, sem monte. A primeira mão abre com a carroça de sena (6|6); as outras, com quem bateu (depois de jogo fechado, com quem tem menos pontos na dupla vencedora). Quem não tem pedra que sirva passa sozinho (1,3 s, com "toc toc"). Batida: comum 1, carroça 2, lá-e-lô 3 (a última pedra serve nas duas pontas, diferentes), cruzada 4 (carroça servindo nas duas pontas iguais). Jogo fechado (ninguém consegue jogar): a dupla com menos pontos nas mãos marca 1; empate, ninguém marca. Jogo até 4, 6 (padrão) ou 10 pontos. Tempo por jogada de 20, 30 ou 45 s (8 s para quem caiu); se passar, joga a pedra mais pesada que servir.
- **Tela:** tampo de madeira, peças de marfim com os pontos desenhados. A corrente sai do centro e faz a curva nas beiradas (cobrinha), com as carroças atravessadas; a largura da fileira se adapta à mesa (no celular em pé, a curva vem mais cedo e a corrente ocupa a altura). Pedra que serve nas duas pontas: as duas posições aparecem brilhando na mesa para tocar (ou botões). Banners de BATEU!/LÁ-E-LÔ!/CRUZADA!/FECHOU!, pedras reveladas com a soma de cada um, balão "Passo!", sons de pedra batendo e de toc-toc, reações com emoji.
- **Ajuste (30/09, a pedido):** as pedras dos outros ficam paralelas à beira da mesa, do lado de dentro: em pé ao longo da beira de cima (parceiro) e deitadas em coluna nas laterais (adversários); o avatar fica em cima da borda. No fim da mão, as pedras reveladas seguem o mesmo sentido.
- **Testado** com robôs no servidor (40 jogos: 20 × 20; saíram todos os tipos de batida e 70 jogos fechados; a corrente sempre encaixou e a primeira mão sempre abriu com a 6|6), 300 correntes aleatórias sem nenhuma pedra sobreposta no desenho, e pela página.

## Bugs que já foram corrigidos

- Roleta que não parava: acontecia com o relógio do celular atrasado. Agora usa o horário do servidor e para em no máximo uns 4 segundos.
- Time sem goleiro com a regra de mínimo ligada: os outros compravam dois goleiros. Agora não dá para "estocar".
- Time só de atacantes valia igual a time equilibrado: resolvido com formações e rendimento por posição.

## Ideias para depois

- **Limite máximo por posição** (ex.: no máximo 1 goleiro no 11x11, porque o segundo goleiro acaba jogando na defesa rendendo 43).
- **Relatório completo** do campeonato para baixar (HTML ou PDF).
- **Hall da Fama** com todos os campeões, artilheiros e goleadas. Precisa de um banco de dados externo (ex.: Supabase), porque o Render gratuito apaga os dados.
- Aceitar nota direto na lista, como `Endrick (Atacante) 82`.
- Aumentar a base de jogadores (Brasileirão, mais lendas).

## Fontes das notas

- EA FC 27 Top 100 (FUT.GG): https://www.fut.gg/fc-27/ratings/top-100/
- FC 27 Player Ratings (FIFPlay): https://www.fifplay.com/fc-27-player-ratings/
- FC 27 Icons (FIFPlay): https://www.fifplay.com/fc-27-icons/
- Best EA FC 27 Player Ratings (The Spike): https://www.thespike.gg/fifa/ea-fc-27/highest-rated-players
