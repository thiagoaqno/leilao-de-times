# Corrida: cenário completo de Jeddah (Jeddah Corniche Circuit)

Salto de qualidade na pista de Jeddah, no nível de Mônaco e Interlagos: de um GP simples do kit para um cenário próprio, com marcos reconhecíveis. **Depende do #351 (kit 2), que já está no `main`** (o branch já tem o `origin/main` mesclado). Só cenário: `pistas.js` (traçado e `hills`), física, robôs, regras, HUD, menus, sala e carreira intactos.

## O que entrou
- **Mar Vermelho e corniche**: a costa é o contorno de tudo que fica a menos de 440 da pista (mar a oeste, norte e sul; terra a leste), com a água animada, raso turquesa, calçada de pedra com parapeito, palmeiras e postes de luz. Dentro da laçada do sul fica a **lagoa** (a água dos dois lados da reta de trás), atrás do prédio dos boxes.
- **Fonte do Rei Fahd**: jato de 820 de altura no mar, com a plataforma, as bocas laterais, névoa e fios d'água que sobem (pulsa e balança).
- **Mesquita Al-Rahma** (a mesquita flutuante): branca, sobre estacas no mar, cúpula central, cúpulas dos cantos, arcadas, dois minaretes e píer até a corniche.
- **Prédio dos boxes (Pit & Team Building)**: quatro andares escalonados, como o projeto da Tilke, com vidro em fita, brise-soleil, lajes com LED verde, terraço do Paddock Club sob velas (kit 2), Race Control, letreiro do GP, bandeiras da Arábia Saudita e tendas de paddock (kit 2) atrás. Fica atrás das garagens do corredor dos boxes.
- **Cidade a leste com a Jeddah Tower** (três pétalas, agulha e guindastes) e arranha-céus de vidro com janelas acesas (janelas do tamanho certo em qualquer prédio, shader de `InstancedMesh`).
- **Barcos**: dhows com vela latina e lanchas que andam devagar; marina com píer, postes e iates.
- **Pista**: zebras vermelhas e brancas, muros com painéis stc, Aramco, Saudia, Roshn, Pirelli, Rolex e o GP; arquibancadas verdes e roxas (stc) com a torcida de túnicas brancas (reta principal, T1 a T3, T13, T22, grampo final), tribunas cobertas do kit 2, telões de LED, torres de holofotes da corrida noturna, serra do Hejaz ao fundo, faixa do GP no pórtico da largada, som de mar e gaivotas.
- **Assets novos exclusivos** em `public/corrida/kit/jeddah/` (`mar`, `barcos`, `palmeiras`, `predio-boxes`, `fonte`, `mesquita`, `cidade`, `marcas`); marcas novas registradas por esse módulo, sem mexer em `kit/marcas.js`. Kit compartilhado: só uma linha no `kit/README.md`.

## Referências
Sem imagens baixadas: tudo desenhado em Three.js e canvas. Descrições e fotos do circuito, do prédio dos boxes (Autosport, Arab News: quatro andares escalonados, de Ulrich Merres, da Tilke), do guia do McLaren e da Fonte do Rei Fahd / Mesquita Al-Rahma / Jeddah Tower.

## Conferido
- No navegador (porta 3361), em volta da pista inteira: largada, pórtico perpendicular à pista na linha, prédio dos boxes, arquibancadas, T1, S, T13, retas, lagoa, fonte, mesquita e skyline. Console sem erros.
- `tests/ajuda-cena`: invasão = 0 no asfalto; malhas e chamadas de desenho no nível de Melbourne e Bahrein (`medir.mjs`).
- `node --test tests/corrida*.test.js`: 255 de 261 passam; as 6 falhas são as antigas conhecidas (pneus e estratégia, ritmo da IA e rádio), nenhuma nova.

## Ficou de fora
Banking visual do T13, ponte do T2/T3 sobre a pista e a Jeddah Yacht Club.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
