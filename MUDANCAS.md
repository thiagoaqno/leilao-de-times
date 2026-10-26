# Corrida: Monza (GP da Itália)

A Corrida da Galera ganha **Monza** (Autodromo Nazionale Monza), montada com o kit de pista, parecida com a de verdade: a reta dos boxes longa, a Variante del Rettifilo, a Curva Grande e Biassono, a Variante della Roggia, as duas Lesmo, o Serraglio, a Variante Ascari, a reta de trás e a Parabolica (Curva Alboreto).

**O traçado** (`public/corrida/pistas.js`)
- Vem da **linha central real do circuito** (OpenStreetMap), ajustada em 27 vértices `[x, y, raio]` curva por curva, no mesmo sentido (horário, norte para cima): a largada sobe para o norte pela reta dos boxes, a 70% do caminho até o Rettifilo. Volta de ~14,9 mil unidades; `scale: 3,7`, `width: 112`.
- Quase plano (uns 12 m de diferença, `hills`). As chicanes (Rettifilo, Roggia, Ascari) ficaram um pouco maiores que as reais para caber na pista larga.
- `tests/corrida-robos.test.js` passou a dar uma volta em Monza também.

**O GP** (`public/corrida/gps/monza.js` e `public/corrida/monza.js`)
- Asfalto de GP, margem cinza, zebras vermelhas e brancas, **zebras amarelas altas** nas três chicanes, **escape listrado** de vermelho e branco nelas, **brita** na saída de Biassono, das Lesmo e da Parabolica e **pilhas de pneus** nas Lesmo e na Parabolica (tudo pelo `escape` do kit).
- **Tribunas vermelhas** com a torcida da Ferrari na reta dos boxes, por fora do Rettifilo e da Parabolica; a torcida solta de `vida.js` também veste vermelho.
- **Prédio dos boxes** na reta, com as garagens e os painéis dos patrocinadores no teto.
- **O pódio sobre a reta**: a passarela de ponta a ponta da pista, com as faixas do GP da Itália, as bandeiras da Itália nas duas torres e a sacada do pódio pendurada embaixo, com os três degraus.
- **A Sopraelevata**: a velha pista oval inclinada (traçada pelo OpenStreetMap) aparece ao lado da Curva Grande, do Serraglio e da Parabolica, com a borda levantada nas curvas, o concreto velho com mato nas juntas e uma **ponte por cima do Serraglio**.
- **O parque**: ~3 mil árvores altas (folhosas e pinheiros) fecham a pista dos dois lados, e os Alpes ao norte, no horizonte.
- Bandeira da Itália de três faixas, patrocinadores do GP (Ferrari, Pirelli, Heineken, Rolex, Aramco, DHL, Iveco, Peroni, GP da Itália...), placas de frenagem de 150, 100 e 50 m, passarelas, fiscais com bandeira, helicóptero, e só o som de `campo` e da torcida.
- O céu é a foto `ceus/monza.jpg` (Poly Haven, CC0, `pizzo_pernice_puresky`), as cores do tema em `cena.js` e `pista.js`.

**No kit** (`public/corrida/kit/`, guia em `kit/README.md`)
- `parque.js`: o bosque que fecha a pista dos dois lados (chave `parque`).
- `boxes.js`: o prédio dos boxes com os painéis (função `prediosDosBoxes`).
- `arquibancadas`: `torcida` por trecho (as cores das camisas); `ambiente`: `bandeira` com três cores vira faixas verticais; `marcas.js`: Ferrari (com o escudo), Iveco, Peroni, GP da Itália e Autodromo Nazionale Monza.
- `vida.js` e `vida-mais.js` leem `tr.camisasGP` para vestir a torcida solta.

**Conferido**
- `node --test tests/corrida*.test.js` passa; os robôs fecham a volta em Monza sem sair da pista.
- No navegador do app (`#debug`), sem erro no console: a largada e a reta dos boxes com as tribunas e o pódio, o Rettifilo, a Curva Grande com a passarela da Ferrari, a Roggia com as zebras amarelas e o escape listrado, as Lesmo com os pneus, a ponte do Serraglio, a Ascari, a reta de trás, a Parabolica e vistas de cima do pódio e da Sopraelevata. Mônaco, Interlagos e Barcelona continuam montando.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
