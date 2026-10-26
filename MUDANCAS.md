# Corrida: Silverstone (GP da Grã-Bretanha) com o kit de pista

A pista número 4 da temporada de F1 na Corrida da Galera, montada com o kit (`public/corrida/kit/`) e a configuração `public/corrida/gps/silverstone.js`.

**O traçado** (`pistas.js`)
- É a linha central real do circuito (layout atual, de 18 curvas, do repositório aberto `bacinger/f1-circuits`), reamostrada e ajustada em 96 vértices `[x, y, raio]` com o norte para cima; o maior desvio para a linha real é de uns 7 m. Os raios mínimos foram limitados a 30 para a pista de 124 de largura não se cruzar nas curvas mais lentas (The Loop e Vale).
- Na ordem: a largada na reta entre Club e Abbey, Abbey (1), Farm (2), Village (3), The Loop (4), Aintree (5), a Wellington Straight, Brooklands (6), Luffield (7), Woodcote (8), Copse (9), o S Maggotts-Becketts-Chapel (10-14), a Hangar Straight, Stowe (15), Vale (16) e Club (17-18). Volta de uns 14,6 mil (a mais longa de F1), `minLap` 35.
- Relevo quase plano de aeródromo (de 4 a 16): sobe um pouco pela Hangar Straight até Stowe e desce por Vale e Club. Uma leve curva nas duas retas longas (Hangar e Wellington) faz a largada cair na reta dos boxes.

**O cenário** (`gps/silverstone.js`)
- **The Wing**: o prédio dos boxes do lado direito da reta, com garagens, faixa de vidro, o teto prateado inclinado como uma asa, os painéis SILVERSTONE, Pirelli, British Grand Prix, Rolex e Sky Sports e a torre de controle.
- Escape largo (30): **brita** em Copse e em Stowe, **asfalto listrado** de vermelho e azul nas saídas de Abbey, Becketts-Chapel e Club, e pilhas de pneus por fora das curvas rápidas.
- Arquibancadas azuis, vermelhas e brancas em Club, na reta dos boxes e Abbey, The Loop, Luffield, Copse e Stowe; bandeira do Reino Unido nos mastros; patrocinadores do GP (marcas novas `silverstone`, `britgp` e `skysports` em `kit/marcas.js`); passarela na reta; só o som de `campo` (vento e passarinhos) e a torcida das arquibancadas.
- Cores de `LOOK.silverstone` (`cena.js`) e `THEMES.silverstone` (`pista.js`): campo verde, neblina e luz de dia nublado. O céu é o nublado do Nürburgring: `CEUS` ganhou o campo opcional `arquivo` (outra foto de `ceus/`). Sem os cones de montanha no horizonte, poucas árvores.

**Também**: Silverstone entra em `jogo.js` (carro de F1 na pista), no "Como jogar" (`menus.js`) e em `tests/corrida-robos.test.js`.

**Conferido**
- Só os testes da Corrida, a pedido: `node --test tests/corrida*.test.js` passou, 35 de 35 (inclui a volta dos robôs em Silverstone). O `npm test` completo **não foi rodado** (ficou lento demais com a máquina carregada e foi interrompido); os specs do Playwright da Corrida são só do drag e não cobrem a pista.
- No navegador do app com `#debug`, em sala com a pista escolhida: a largada, Abbey, The Loop, a Wellington Straight, Luffield, Copse (brita e arquibancada), Becketts, a Hangar Straight, Stowe, Vale e Club, e The Wing; sem erro no console, e Mônaco, Interlagos e Barcelona continuam montando.

**Ficou faltando**: o céu é emprestado do Nürburgring (não há foto de céu inglês no repositório); The Wing é uma caixa estilizada, sem a curva do teto real; a altura segue só o relevo geral (sem o perfil oficial metro a metro).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
