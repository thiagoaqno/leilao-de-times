# Ginásio da Galera: batalha de Galeramon e Pokémon em tempo real

Plano para o Codex fazer por fases. Cada fase vira **uma branch nova a partir de `origin/main` e um PR**. Nada de PR em
cima de PR.

## Como usar este plano
- Antes de tudo, leia `CLAUDE.md`, que é o mapa do projeto e o jeito de trabalhar. Siga do mesmo jeito:
  - português na tela, nos comentários e nas variáveis;
  - manter os finais de linha (CRLF/LF) de cada arquivo;
  - reescrever o `MUDANCAS.md` a cada PR.
- Peça ao Codex **uma fase por vez**: "Leia `planos/ginasio.md` e faça a Fase N".
  - No fim, ele roda `npm test` e escreve no PR o que conferiu.
  - Depois, o PR passa pela revisão do Claude antes do merge.
- As decisões de "Decisões fechadas" já foram tomadas. Não reabrir sem perguntar.

## A ideia
Uma casinha nova na Vila, o **Ginásio**, onde os bichos lutam numa arena vista de cima, em pixel-art 8 bits e em
**tempo real**.
- Você anda com o seu bicho, mira, solta os golpes e **desvia** dos golpes do outro.
- Lembra um LoL, só que bem mais leve: uma arena pequena, sem lanes, sem itens, partidas de 2 a 4 minutos.
- Serve para os dois modos que já existem: **Galeramon** (os bichos da galera) e **Pokémon** (os 493).

A batalha por turnos que já existe na Vila (`galeramon.js`) continua igual. O Ginásio é um jogo à parte que
reaproveita os **dados** (tipos, atributos, golpes e sprites), mas tem o seu próprio motor.

## O que já existe e deve ser reaproveitado
| O quê | Onde |
| --- | --- |
| Bichos, tipos, golpes e tabela de tipos do Galeramon | `public/galeramon/dados.js` (UMD: `window.Galeramon` / `require`) |
| Os 493 Pokémon com atributos, tipos e golpes; sprites do PokeAPI | `public/galeramon/pokemon.js` (`window.PokeDex`, `PokeDex.sprite(id, costas)`) |
| Desenho dos Galeramon em canvas 32x32 | `public/galeramon/sprites.js` (`GaleramonSprite(id)`) |
| Conta de dano (STAB, tipo, crítico, ataque/defesa especial) | `useMove` em `galeramon.js`: copiar a ideia, não o código de turno |
| Times montados pela pessoa | localStorage `galeramon_time` / `pokemon_time` (ver `public/index.html`, "Central de batalha") |
| Jogo em tempo real com servidor que manda | `batalha.js` e `tenis.js`: laço a 60/s, pacote a 20/s, robôs, salas |
| Salas, reconexão, ping | `salas.js` |
| Controles de toque | `public/toque.js` |
| Placar da noite | `noite.js` (`noite.vitoria`, lista `JOGOS`) |

## Decisões fechadas
1. **Jogo novo:** `ginasio.js` na raiz, no canal `/ginasio`, com a página em `public/ginasio/`.
   - As regras ficam num UMD (`public/ginasio/regras.js`), usado pelo servidor e pelo navegador.
   - O servidor é quem manda: dano, acerto e desmaio são decididos só nele.
2. **Modos da sala:** Galeramon ou Pokémon. Formatos 1x1 e 2x2, com robôs para completar ou treinar sozinho.
3. **Time:** 3 bichos por pessoa, um em campo por vez.
   - Quando um desmaia, entra o próximo depois de 2 s.
   - Trocar de propósito tem recarga de 10 s.
   - Perde quem fica sem bichos. Com 4 minutos acaba, e ganha o lado com mais vida somada (em %).
4. **Controles no computador:**
   - WASD/setas andam e o mouse mira;
   - clique esquerdo = golpe 1, clique direito = golpe 2, Q = golpe 3, E = golpe 4;
   - Espaço = **esquiva** (um pulinho curto, com 0,25 s sem levar dano e recarga de 3 s);
   - 1/2/3 trocam de bicho.
5. **Controles no celular:** `Toque.setup` com o direcional à esquerda, 4 botões de golpe e o da esquiva à direita.
   - Mira automática no inimigo mais perto.
   - Segurar o botão do golpe mostra a mira e solta na direção do direcional.
6. **Golpes viram habilidades automaticamente**, a partir dos dados de cada golpe. Assim os 493 Pokémon e todos os
   Galeramon funcionam sem escrever um por um (a tabela está logo abaixo).
   - Uma lista pequena de exceções (`ESPECIAIS`) cuida dos golpes famosos e dos estranhos.
7. **Desviar é o centro do jogo:** não existe "errou por azar".
   - A precisão do golpe vira a velocidade e a largura do projétil.
   - Os golpes fortes mostram no chão, antes de cair, onde vão acertar (o aviso).
8. **Rede:**
   - o navegador manda os comandos (`{seq, dx, dy, mira, golpe?, esquiva?}`) 30 vezes por segundo;
   - o servidor roda a 60/s e manda um pacote por jogador 20 vezes por segundo;
   - o próprio bicho anda na hora no navegador (previsão) e se corrige com o pacote do servidor;
   - os outros aparecem 100 ms atrasados, com interpolação;
   - os projéteis nascem por evento e o navegador desenha a trajetória sozinho;
   - sem voltar no tempo para checar acertos: os projéteis são lentos o bastante para dar para desviar com o ping do Brasil.
9. **Visual:** arena vista de cima, num ginásio de pixel-art.
   - Piso de quadra, arquibancada em volta e 4 pilastras que bloqueiam projéteis.
   - Canvas 2D com `imageSmoothingEnabled = false`, sem Three.js.
   - Pokémon: o sprite de frente do PokeAPI, virado na horizontal conforme a direção, com sombra e um pulinho ao andar.
   - Galeramon: o `GaleramonSprite`.
   - Os efeitos de cada tipo também são de pixel-art: fogo, água, raio etc.

## Do golpe para a habilidade (as regras em `regras.js`)
Campos dos golpes: `p` (poder), `a` (precisão), `t` (tipo), `c` (`"s"` = especial), `pri`, `self`, `foe`, `heal`,
`drain`, `recoil` e `crit`.

| Golpe | Vira | Detalhes |
| --- | --- | --- |
| `p > 0`, físico, `p < 100` | **corpo a corpo** | Golpe em leque curto (1,2 casa, 90°) na frente. |
| `p > 0`, especial, `p < 100` | **projétil** | Velocidade 6 a 10 casas/s pela precisão (precisão 100 = mais rápido e mais largo). |
| `p >= 100` (físico ou especial) | **área com aviso** | Círculo de 1,5 casa onde mirou (até 5 casas), aviso de 0,7 s, depois o dano. |
| `pri > 0` | **investida** | Avança 3 casas rápido e acerta quem estiver no caminho; recarga curta. |
| `self` (sem dano) | **reforço** | O atributo sobe por 6 s (+1 = +25%), com uma aura. |
| `foe` (sem dano) | **projétil lento** | Não tira vida; baixa o atributo do alvo por 6 s. |
| `heal` | **cura** | Fica parado 0,8 s (pode ser interrompido por dano); cura a % do golpe. Respeita o `max` de usos. |
| `drain` / `recoil` | iguais ao turno | Calculados sobre o dano feito. |

- **Recarga:** `1,5 s + p / 40 s`, com piso de 1 s e teto de 6 s. Os golpes de reforço e de cura: 8 s.
- **Dano:** a mesma conta do `useMove` (tipo, STAB, ataque/defesa especial quando houver, estágios).
  - Multiplique por uma constante `K_DANO`, ajustada para um golpe neutro médio tirar de 10% a 15% da vida.
  - Crítico: 1/16 (ou 1/4 com `crit`), dano ×1,5.
  - Variação: de 0,9 a 1.
- **Velocidade de andar** vem do atributo `spd`: de 2,5 a 4,5 casas/s, em escala linear, presa nesses limites.
- **`ESPECIAIS`** (mesmo efeito do turno, adaptado):
  - Counter/Mirror Coat: escudo de 1 s que devolve o dobro do dano do tipo certo.
  - Metronome: sorteia outra habilidade.
  - Transform: copia o bicho em frente.
  - Super Fang: metade da vida do alvo.
  - Belly Drum: paga metade da vida e vai ao ataque máximo.
  - Truant: depois de cada golpe, fica 1 s sem atacar.
  - Wonder Guard e Huge Power: iguais ao turno.
- **Teste obrigatório:** todos os golpes dos dois dex viram uma habilidade válida, com recarga e dano dentro dos limites.

## Fases (um PR cada)

### Fase 1: o motor, sem tela
- `public/ginasio/regras.js` (UMD) com:
  - `criarPartida(config, lados)` e `passo(partida, dt, comandos)`;
  - colisão com as paredes e as pilastras;
  - as habilidades da tabela, os projéteis, as áreas com aviso, a esquiva sem dano, os reforços e as trocas;
  - o fim da partida;
  - um robô simples (`pensarRobo`): chega a uma distância boa, desvia do que vem e usa o golpe com vantagem de tipo.
- O sorteio tem semente (copiar o `sorteDe` do `simulador.js`), para os testes repetirem igual.
- `tests/ginasio.test.js`:
  - todos os golpes viram habilidade;
  - quem desvia não leva dano;
  - a vantagem de tipo dobra o dano;
  - robô contra robô sempre termina em menos de 4 minutos;
  - as partidas duram em média de 1,5 a 3,5 minutos.
- **Pronto quando:** `npm test` passa e mil partidas de robô contra robô rodam sem erro.

### Fase 2: servidor e salas
- `ginasio.js` no canal `/ginasio`, com o mesmo esqueleto de `batalha.js`:
  - as peças do `salas.js`, a reconexão por token e o ping;
  - os robôs para completar a sala;
  - laço a 60/s e pacote a 20/s.
- Na sala, o organizador escolhe o modo (Galeramon/Pokémon), o formato (1x1/2x2) e os robôs. Cada pessoa escolhe o
  time de 3 (vem do localStorage e pode trocar na sala).
- Fim de partida: `noite.vitoria("ginasio", ...)`. Entra em `JOGOS` no `noite.js`, em `CANAIS` no
  `tests/salas.test.js` (regravar o esperado) e em `GAMES` no `vila.js`.
- **Pronto quando:** um teste de servidor joga uma partida inteira com dois clientes Socket.io e um robô.

### Fase 3: a página
- `public/ginasio/index.html`, com os scripts em ordem que dividem as variáveis globais, como no Leilão:
  - `sala.js`: entrar/criar e a sala de espera;
  - `desenho.js`: a arena, os bichos, os golpes por tipo e as barras de vida;
  - `controles.js`: teclado, mouse e toque;
  - `rede.js`: previsão e interpolação;
  - `hud.js`: os 4 golpes com a recarga, a esquiva, o time e o relógio;
  - `sons.js`.
- `#debug` expõe `window.__ginasio`. A página entra em `tests/e2e/paginas.spec.js`.
- No topo, só o "← Vila". Quem pede menos movimento fica sem o tremor de tela.
- **Pronto quando:** dá para jogar 1x1 contra um robô no computador e no celular (480x270 e 375x812), com foto da tela no PR.

### Fase 4: a casinha na Vila
- Prédio novo em `GAMES` no `public/index.html` (e na lista do `vila.js`), com o telhado próprio (`ginasio: true` no
  `drawBuilding`): telhado arredondado de ginásio, com uma Pokébola/pegada pintada.
- Achar um lote livre na vila. Se não houver, abrir uma rua nova, como já foi feito com a "rua nova" do autódromo.
- O botão "⚔️ Batalha" da Vila ganha a opção "Desafiar no Ginásio (tempo real)", que abre a sala já criada com o
  amigo (`?sala=` e `?entrar=1`).
- **Pronto quando:** dá para entrar no Ginásio andando pela vila e o desafio pelo boneco funciona, com foto.

### Fase 5: acabamento (só depois de jogar com a galera)
- Ajuste fino de `K_DANO`, das recargas e da velocidade com base nas partidas de verdade.
- Efeitos melhores por tipo e sons.
- Opcional: **líderes de ginásio**. São 8 robôs com times temáticos e uma insígnia cada, guardadas no navegador.
  Decidir depois.

## Fora do escopo
Itens, níveis, evolução, captura, mapa grande, mais de 2x2 e ranking (que precisa do banco de dados).
