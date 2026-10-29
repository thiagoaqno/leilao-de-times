# Carro de F1: pintura de equipe, faixas do pneu e sem sombra oval

## O que mudou
- **Pintura por equipe** (`public/corrida/f1-pintura.js`, novo): as 11 pinturas de equipe de `MODS.pintura` (Papaia, Rosso, Flecha de Prata, Touro Azul, Verde Inglês, Azul Francês, Preto e Ouro, Azul Marinho, Audi, Racing Bulls e Clássico 88) ganharam desenho próprio, no jeito dos carros de 2026: McLaren com tampa preta cortada em diagonal, Ferrari com tampa branca, Mercedes preta com a faixa verde-água, Red Bull com bico amarelo e airbox vermelho, Aston Martin com filetes verde-limão, Williams em dois azuis, Alpine com rosa, Audi prata com degradê vermelho, Haas com faixas diagonais, Cadillac branco se desfazendo em pixels pretos e Racing Bulls branco e azul. A "Sua cor" segue na máscara de antes.
- **Como funciona:** o UV do modelo é uma máscara, então cada equipe tem UMA folha (canvas 1024x1152 com o carro em cinco vistas: dois lados, de cima, frente e traseira), feita uma vez e guardada em cache (não é uma por carro). O shader do corpo projeta a folha pela posição de cada ponto (atributos `pcar` e `ncar`, gerados uma vez por geometria em `f1.js`), misturando três projeções pela normal. Os painéis laterais do monocoque (`McLaren_mp4_5_1`, material `bottom_details_mat`) recebem a mesma pintura; o assoalho e a barriga ficam de carbono. Os modelos completo e leve usam o mesmo código.
- **Logos e patrocínios:** o logo de cada equipe vem de `logos/` (recortado e colorido uma vez); os patrocínios são decalques inventados no estilo dos de verdade (nenhuma marca registrada copiada). O número do piloto (`numero` do estado; sem número, nada) é um decalque à parte com um atlas de dígitos compartilhado: tampa do motor, asa traseira e o bico visto de cima.
- **Faixas do pneu:** anel colorido na lateral do pneu pelo composto em uso: macio vermelho, médio amarelo, duro branco, chuva azul. O seu carro lê `race.pneu.composto` (muda na hora no pit stop), os outros `pneuAtual` do estado; `poseKart` recebe `fx.pneu` e `trocarComposto` só mexe em dois uniforms quando o composto muda (nenhuma textura nova por quadro). Fora das regras de F1 não há faixa.
- **Sombra oval removida:** o disco escuro (`shadow` em `carros.js`) debaixo de cada carro saiu; a sombra de verdade do sol ficou como estava.
- Triângulos: os mesmos (só ganhou atributos nos vértices).

## Referências usadas (Wikimedia Commons, só para estudo, não vão no repositório)
- McLaren: "FIA F1 Austria 2026 Nr. 1 Norris" e "Nr. 81 Piastri" (CC BY-SA 4.0).
- Ferrari: "F1 2026, Ferrari F1 Team, Ferrari SF-26, Charles Leclerc, Spa-Francorchamps" (CC BY 4.0) e "Lewis Hamilton Ferrari F1 Car" (CC BY-SA 4.0).
- Mercedes: "2026 Chinese GP - Mercedes - W17" e Russell/Antonelli na classificação (CC BY 4.0).
- Red Bull: "F1 2026, Red Bull Racing, Red Bull RB22" (Hadjar, Verstappen; CC BY 4.0) e "Max Verstappen Red Bull Racing RB22".
- Racing Bulls: "2026 Chinese GP - Racing Bulls" (Lawson, Lindblad; CC BY 4.0).
- Aston Martin: "F1 2026, Aston Martin F1 Team, Aston Martin AMR26" (Alonso, Stroll; CC BY 4.0).
- Williams: "2026 Chinese GP - Williams" (Albon, Sainz) e "Williams FW48 of Alexander Albon".
- Alpine: "F1 2026, Alpine F1 Team, Alpine A526, Pierre Gasly" e "FIA F1 Austria 2026 Alpine".
- Haas: "F1 2026, TGR Haas F1 Team, Haas VF-26" (Bearman, Ocon).
- Cadillac: "Cadillac F1 Car" e "FIA F1 Austria 2026 Nr. 11 Perez". Audi: "Audi Revolut F1" (CC0) e "F1 2026, Audi F1 Team, Audi R26".
- Pneus: faixas Pirelli vistas nas mesmas fotos (macio vermelho, médio amarelo, duro branco, chuva azul).

## Conferido
- Uma página solta (fora do jogo) com o modelo completo e o leve nos dois lados, de frente, de trás e de cima: o shader compila, a pintura e as faixas aparecem. Não rodei os testes nem joguei (quem joga e testa é o Thiago).

## Ficou de fora
- O modelo é um F1 antigo (sem halo, sidepods pequenos): as pinturas seguem as cores e as formas das equipes, não o desenho exato dos carros novos. A "palavra Pirelli" no pneu ficou de fora (opcional).

---

# Corrida: previsão do tempo, chuva com rampas e clima da sala

## Previsão por GP
- `F1.previsaoDoGP(semente, opcao)` sorteia, pela semente do GP, a chance `p` de chuva (de 5 em 5%): 60% dos GPs ficam de 0 a 10%, 25% de 20 a 40%, 11% de 50 a 70% e 4% de 80 a 95% (média ~20%). A previsão diz também **quando** (pode largar molhado, começo, do meio para o fim, perto do fim) e a **força** (garoa, chuva forte ou garoa que vira forte).
- A chuva de verdade sai dela: cai com a chance `p` (outro sorteio da mesma semente) e, se cai, começa dentro da janela prevista.
- Onde aparece (cartão com ícone de sol, nuvem ou chuva e a porcentagem, no tema F1): carreira (mapa do GP antes da Q1 e etiqueta no calendário do próximo GP, solo e em grupo), sala (junto da escolha do pneu), grid de largada (onde se escolhe o pneu depois da classificação), transmissão de TV (cartão do clima) e no aviso do box.

## Chuva em corrida curta, duração e transição
- A chuva dura no mínimo 2 minutos (`CHUVA_MIN_S`) ou até o fim da sessão; pode começar e parar no meio de uma corrida de 5 voltas.
- `chuvaEm` entra, sai e muda de força em rampas de 25 s (`RAMPA_S`, suavizadas): sem degrau de seco para chuva nem de garoa para chuva forte.
- `aguaEm` integra a água de segundo em segundo (tabela guardada no roteiro, interpolada): continua conta pura do tempo, igual no servidor, no navegador e nos robôs.
- O engenheiro avisa uma volta antes (`F1.proximaMudanca`): "chuva chegando em uma volta" e "a chuva está parando, a pista vai secar" (falas novas `chuvachegando` e `chuvaparando`; também aparecem como aviso na tela, e a voz só toca depois de gerar os mp3 com `gerar-radio.bat`).

## Corrida casual
- Opção **Clima** na sala (só nas regras de F1, fora da carreira): Aleatório (segue a previsão), Seco, Chuva (larga molhado e chove a corrida toda) e Variável (larga seco e a chuva vem no meio). O servidor valida em `cleanConfig` (`config.clima`) e aplica no sorteio.
- Na sala, a previsão mostrada é a do GP que vem (`room.sementeProx`, a mesma semente que `preparar` usa ao largar).

## Arquivos
`public/corrida/f1-regras.js` (clima), `corrida.js` (opção e semente), `public/corrida/previsao.js` (novo, o cartão), `tema-f1.css`, `transmissao.js/.css`, `hud.js`, `box.js`, `menus.js`, `radio/falas.js`, `temporada/{garagem,sede,grupo}.js`, `tests/corrida-f1-clima.test.js` (novo).

Não rodei testes nem abri o navegador (quem joga e testa é o Thiago).
