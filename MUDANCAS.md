# Barcelona refeita em cima do kit 2

O cenário do GP da Espanha (`gps/barcelona.js`) foi refeito: entram `barcelona.js` (a montagem) e `kit/barcelona/` (`pecas.js`, `vegetacao.js`, `paisagem.js`, tudo em código, sem modelo 3D baixado). Não mexe em traçado, física, robôs, regras, HUD, menus, sala nem carreira. Mudanças fora da pista: `kit/marcas.js` só ganhou nomes de lugares (aditivo) e `pista.js` deixou de pôr as árvores redondas genéricas em Barcelona (uma condição a menos).

**A reta (frações 0,92 a 0,12)**
- Tribuna principal coberta (`tribunaPrincipal`): dois lances de degraus vermelhos e brancos em xadrez, faixa de vidro espelhado, cobertura em asa que sobe para trás (alumínio, vigas escuras), bico curvo com cabine de vidro, núcleos de concreto com os números das seções e a torcida em `InstancedMesh`.
- Prédio dos boxes (`complexoDosBoxes`): portões vermelhos, varandas brancas, vidro escuro, torres redondas de escada e a torre de controle de prova; torre do relógio; paddock atrás (motorhomes, tendas, carretas).
- Faixa "GRAN PREMI D'ESPANYA" no pórtico da largada, de frente para os carros (conferido na malha: normal contra o sentido da volta; a viga é perpendicular à pista).

**As curvas**: Elf (0,157), Renault, curva 3, Repsol, Seat, Campsa (0,60, o ponto mais alto), La Caixa (0,74), Sabadell e as curvas 13 e 14 têm tribunas de curva (`tribunaCoberta` nas encostas, com fundação, e fitas do kit), placas só com nome e número, brita clara e asfalto verde de escape, zebras vermelhas e brancas e pneus em Elf e La Caixa; asfalto vermelho com o nome do circuito por dentro da curva 13.

**A Catalunha seca**: pinheiros mansos e de alepo, ciprestes, garrigue, capim seco e pedras (6 geometrias com cor por vértice), serras de Sant Llorenç del Munt, Montserrat e Montseny, povoados do Vallès com igreja e naves industriais, bandeiras da Espanha e da Catalunha nos degraus. Sem marca registrada de patrocinador.

**Conferido (só scripts de node, sem navegador)**: monta sem erro; invasão da pista: 0 achados; ~170 chamadas por quadro na vista do jogo (pico 281), ~470 mil triângulos (Monza: 444 mil), 343 malhas. Não rodei os testes (o Thiago joga).

## Referências (Wikimedia Commons)
- Tribuna principal, cobertura em asa, assentos em xadrez: File:F1 Circuit de Catalunya - Tribuna.jpg, File:Circuit de Catalunya Grandstand.jpg (bico, núcleos numerados), File:Circuit de Catalunya, Barcelona (Ank Kumar) 01.jpg (assentos e pit wall).
- Prédio dos boxes, torre do relógio, pórtico vermelho: File:2018 Spanish Grand Prix main straight fans.jpg; portões vermelhos: File:Boxes-montmelo-2012.JPG.
- Curvas, escape e zebras: File:Curvas 1-6 de Circuit de Barcelona-Catalunya Montmeló (2023).jpg, File:Curva 10 de Circuit de Barcelona-Catalunya Montmeló (2023).jpg (asfalto vermelho com o nome), File:Pit Lane Entrance@circuitdeCatalunya.jpg (pinheiros e barreiras), File:Circuit Catalunya - Montmeló (41351982625).jpg e (41531860424).jpg (brita clara, zebras, montanha), File:Circuito de montmelo desde grada A.jpg (tribunas lotadas).
- Paisagem: File:La Mola, Matadepera.jpg (Sant Llorenç del Munt: paredão ocre sobre pinhal).

