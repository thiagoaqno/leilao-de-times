# Ginásio: página jogável da Fase 3

## Como fica
- `/ginasio/` agora abre a arena de pixel-art, com piso de quadra, arquibancadas, pilastras e os sprites dos dois dex. `/ginasio` redireciona para a página.
- Dá para jogar imediatamente contra um robô ou criar/entrar numa sala, escolher Galeramon ou Pokémon, 1x1 ou 2x2 e os 3 bichos de cada pessoa. O seletor tem busca, filtro de tipo e páginas para os 493 Pokémon.
- O time reaproveita `galeramon_time` e `pokemon_time`, sem mudar a batalha por turnos da Vila. O convite pode ser copiado e quem entra só para assistir não recebe controles.
- No computador: WASD/setas, mira no mouse, cliques esquerdo/direito, Q/E, Espaço e 1/2/3. No celular: joystick, quatro golpes, esquiva e reservas; segurar um golpe mostra a mira e soltar dispara.
- Os ataques têm efeitos por tipo e categoria, projéteis em movimento, aviso de área antes da explosão, impactos, dano, cura, escudo e troca. Todos os bichos usam esse sistema, com diferenças de golpes e atributos; não são animações exclusivas desenhadas individualmente para cada Pokémon.
- A tela mostra vida, recargas, relógio e resultado, com revanche e retorno à sala. Recarregar a página recupera o mesmo jogador por token.

## Por dentro
- HTML/JS puro, sem dependências novas. `sala.js`, `desenho.js`, `controles.js`, `rede.js`, `sons.js` e `hud.js` dividem as variáveis globais, seguindo os jogos existentes.
- Canvas 2D em baixa resolução, com `imageSmoothingEnabled = false`, sprites `GaleramonSprite`/PokeDex e pilastras na posição dos obstáculos do motor.
- `Ginasio.preverMovimento` compartilha movimento, paredes, pilastras e esquiva com o servidor. A previsão não aplica dano nem cura; golpes, vida e trocas continuam autoritativos.
- Comandos a 30/s, reconciliação pela sequência confirmada, interpolação dos outros a 100 ms e trajetórias de projéteis iniciadas por evento e corrigidas pelos pacotes.
- `Toque.setup`, áreas seguras do celular, recargas nos botões, cancelamento de toque e limpeza dos comandos ao perder foco. Quem pede menos movimento fica sem tremor, pulinho dos sprites e deslocamentos decorativos dos efeitos.
- Sons curtos sintetizados com Web Audio, iniciados por gesto, com preferência de som salva. Nenhum áudio externo.
- `#debug` expõe `window.__ginasio`; a página entrou na lista de testes de abertura. `CLAUDE.md` foi atualizado com os arquivos e testes.

## Conferido
- `npm test`: 58 testes passaram, sem falhas.
- `npx playwright test tests/e2e/ginasio.spec.js`: 6 testes passaram no servidor real.
- `npx playwright test tests/e2e/paginas.spec.js`: 23 testes passaram, incluindo abertura do Ginásio e páginas dos outros jogos.
- Computador 480x270: movimento, quatro ataques, esquiva, troca, reconexão e saída da sala.
- Toque emulado em 375x812 e 480x270: dois dedos, mira ao segurar, ataque ao soltar, esquiva, troca e dano causado pelo robô.
- Pokémon: seleção dentre os 493, busca vazia e sprites remotos carregados na arena. Verificações de pixels do canvas, ausência de suavização, botões dentro da tela e sem sobreposição.
- Sala 2x2 com dois navegadores e robôs, time salvo e espectador sem controles. Partida completa com relógio acelerado apenas no servidor de teste, resultado, revanche e lobby.
- Inspeção visual no navegador do app. Toque foi verificado por emulação Chromium, não em aparelho físico; falta jogar no celular real para avaliar o conforto dos controles.

## Fotos
Computador, 480x270:
![Ginásio no computador](https://raw.githubusercontent.com/thiagoaqno/leilao-de-times/ginasio-fase-3/planos/imagens/ginasio-fase-3-computador.png)

Celular, 375x812:
![Ginásio no celular](https://raw.githubusercontent.com/thiagoaqno/leilao-de-times/ginasio-fase-3/planos/imagens/ginasio-fase-3-celular.png)

Celular deitado, 480x270:
![Ginásio em paisagem](https://raw.githubusercontent.com/thiagoaqno/leilao-de-times/ginasio-fase-3/planos/imagens/ginasio-fase-3-paisagem.png)

Pokémon, 1280x800:
![Pokémon no Ginásio](https://raw.githubusercontent.com/thiagoaqno/leilao-de-times/ginasio-fase-3/planos/imagens/ginasio-fase-3-pokemon.png)

## Limite desta fase
Sem prédio novo ou desafio pelo boneco da Vila: entram somente na Fase 4. Sem mudanças no banco de dados ou no plano de carreira.
