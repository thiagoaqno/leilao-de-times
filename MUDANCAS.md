# Ginásio: golpes de muitos jeitos, física de empurrão, defesa de verdade e a 5ª geração

## O que muda

- **Cada golpe tem o seu jeito.** Antes quase tudo era "tacar" (projétil) ou "cair do céu" (área). Agora os golpes
  de Pokémon e Galeramon saem em 13 jeitos novos, além dos de antes:
  - **feixe** (Hyper Beam, Ice Beam, Hydro Pump...): o bicho para e carrega, a linha do feixe aparece no chão, e
    depois o raio atravessa a quadra até a parede ou a pilastra. Dá para sair da linha;
  - **sopro em leque** (Flamethrower, Blizzard, Frost Breath...): acerta tudo na frente, num leque;
  - **tremor** (Earthquake, Discharge, Hyper Voice...): um anel que abre em volta de quem usou; pular (esquiva) na
    hora em que o anel passa escapa;
  - **onda** (Surf, Glaciate, Leaf Storm...): uma parede curva que anda pela quadra e empurra;
  - **rajada** (Bullet Seed, Rock Blast, Icicle Spear...): vários tiros seguidos, abrindo um pouco;
  - **bumerangue** (Bonemerang, U-turn, Volt Switch, Gear Grind): vai, bate na parede ou chega no fim e volta,
    acertando de novo na volta;
  - **teleguiado** (Shadow Ball, Aura Sphere, Magical Leaf...): faz curva atrás do inimigo;
  - **bomba em arco** (Sludge Bomb, Seed Bomb, Fire Blast...): passa por cima de tudo e cai no ponto mirado;
  - **salto** (Body Slam, Heavy Slam, Heat Crash, High Jump Kick...): pula até o ponto, ninguém acerta no alto, e cai
    com pancada em volta. Errar o High Jump Kick machuca quem pulou, como nos jogos;
  - **redemoinho / chão tomado** (Whirlpool, Hurricane, Magma Storm, Inferno...): machuca aos poucos, e os
    redemoinhos puxam para o meio;
  - **combo** (Double Kick, Triple Kick, Dual Chop, Close Combat...): golpes seguidos avançando, o último mais forte;
  - **agarrão** (Storm Throw, Circle Throw, Dragon Tail...): agarra e arremessa longe;
  - **armadilha** (Stealth Rock, Spikes, Toxic Spikes): fica escondida no chão e explode em quem pisar (voador passa
    por cima; até 3 por jogador);
  - e as investidas ficaram mais fortes e variadas (Flare Blitz, Brave Bird, Bolt Strike, Head Charge...).
- **Física.** Todo golpe empurra, pelo poder e pelo peso de quem apanha (bicho de muita vida e defesa voa menos). O
  empurrão forte deixa tonto um instante (estrelinhas na cabeça), e quem bate na parede ou na pilastra escorregando
  forte leva um pouco mais de dano e fica tonto. Tonto seguido dura cada vez menos: ninguém fica preso.
- **Defesa competitiva.**
  - **Esquiva** (Espaço) agora rola para o lado do movimento. Esquivar no último instante é **esquiva perfeita**:
    adianta as recargas e deixa o próximo golpe 30% mais forte (o bicho brilha em dourado).
  - **Guarda** (segure Shift ou F, ou o botão Guarda; no celular, o 6º botão): segura o golpe de frente (só 30% do
    dano e quase nada de empurrão), mas anda devagar e gasta a barra. Se a barra acaba, a guarda quebra e o bicho fica
    tonto. Levantar a guarda bem na hora **apara**: o projétil volta contra quem atirou, e quem bateu de perto
    cambaleia.
  - **Pedra, papel e tesoura:** o agarrão e o salto passam pela guarda; quem apanha enquanto prepara um golpe (feixe,
    agarrão) perde o golpe ("Interrompido!").
  - **Buffer de comando:** o golpe apertado enquanto o bicho está ocupado (pulando, no combo, tonto) sai assim que ele
    fica livre (até 0,4 s), em vez de se perder.
- **Robô mais esperto.** Foge dos avisos no chão, do pouso do salto e da linha do feixe, esquiva ou apara o que vem,
  agarra quem fica na guarda, pune quem está preparando ou tonto e mira à frente de quem anda. O robô dos líderes
  reage mais rápido.
- **Na tela:** a linha do feixe e o leque do sopro aparecem enquanto o golpe carrega; o anel de onde o salto vai cair;
  o anel do tremor, a onda, o redemoinho, as armadilhas e a bomba em arco em 3D; a bolha da guarda (que acende ao
  aparar e racha ao quebrar), a barra da guarda embaixo da vida, as estrelinhas do tonto, o bicho inclinando ao ser
  empurrado e as palavras "Perfeita!", "Aparou!", "Guarda quebrada!", "Na parede!" e o contador de combo. Cada botão
  de golpe tem o ícone do seu jeito, e o título diz qual é. Sons novos para guarda, aparar, perfeita, pulo e pouso. Na
  tela inicial, "Como lutar" explica tudo.
- **5ª geração (Unova).** Os 156 Pokémon de Victini a Genesect, com atributos e tipos oficiais (tirados dos dados do
  PokeAPI), 70 golpes novos (V-create, Fusion Flare, Bolt Strike, Glaciate, Hurricane, Scald, Shell Smash, Quiver
  Dance...) e os sprites do Black/White. O seletor ganhou o filtro por geração. Agora são 649 Pokémon (também nas
  batalhas por turnos da Vila).

## Arquivos

- `public/ginasio/regras.js`: o motor (`ESTILOS`, as classes novas em `habilidadeDeGolpe`, `executarGolpe`,
  `aplicarDano` com guarda/aparar/perfeita/empurrão, `atordoar`, `bater`, `aterrissar`, `atualizarSequencia`,
  `atualizarArea` por `forma`, o robô novo e a previsão com empurrão, guarda e salto).
- `ginasio.js`: o comando `guarda`, os campos novos no pacote e nas áreas, `fimArea` para área que acaba sem estourar.
- `public/ginasio/`: `controles.js` (guarda), `rede.js`, `hud.js` (botão e barra da guarda, ícones por jeito),
  `desenho.js` (o chão de cada jeito, os avisos de preparo e de pouso, as palavras), `animacao.js` (rolar, pular,
  tonto, inclinar, bolha da guarda), `golpes3d.js` (feixe, leque, anel, onda, redemoinho, bomba, aparar), `golpes.js`,
  `marcas.js`, `sons.js`, `sala.js` (filtro de geração), `index.html` e `estilo.css`.
- `public/galeramon/pokemon.js`: a 5ª geração e os golpes novos.
- Testes: `tests/ginasio-fisica.test.js` (novo) e `tests/e2e/ginasio.spec.js`.

## Testes

- `tests/ginasio-fisica.test.js`: os 156 novos, cada jeito de golpe, empurrão e peso, parede, tonto decrescente,
  guarda, guarda quebrada, aparar (projétil e de perto), agarrão contra guarda, interromper o preparo, esquiva perfeita
  e foco, previsão igual ao servidor e uma rodada de comandos aleatórios nos três modos sem erro nem bicho fora da
  quadra (esse teste achou e corrigiu um erro que derrubaria o servidor quando uma investida era aparada).
- `tests/ginasio.test.js`, `tests/ginasio-servidor.test.js`, `tests/ginasio-marcas.test.js` e `tests/e2e/ginasio.spec.js`
  (com a guarda pelo Shift e o filtro de Unova) passando. O teste dos clientes contra robôs em `tests/ginasio-servidor.test.js` passou a copiar mais do estado (tonto, preparo, salto, guarda, projéteis e áreas) para o robô dos clientes ler o jogo.
- `npm test`: só falha `carreira: comprar na janela, vender na hora...` (`tests/carreira-servidor.test.js`), que falha igual na `main`.
