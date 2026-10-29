# Montreal com cenário próprio (kit 2)

O cenário do GP do Canadá (`gps/montreal.js`) saiu do GP simples do kit e ganhou `montreal.js` (a montagem) e `kit/montreal/` (as peças exclusivas, todas em código, sem modelo 3D baixado). Não mexe em traçado, `hills`, física, robôs, regras, HUD, menus, sala nem carreira; o kit compartilhado não mudou.

**A ilha e a água** (`kit/montreal/terra.js`)
- O mundo é um plano de água; a terra é uma malha de células de 56 cuja altura vem de "quão dentro da terra" cada ponto está, então a costa sai suave, com praia de pedra. Ilha Notre-Dame, rio São Lourenço a oeste, **bacia olímpica de remo** ao lado da reta do Cassino e da reta dos boxes (para o leste), margem de lá com choupos, canal e margem sul, e a **ilha Sainte-Hélène** a noroeste. `tr.ocupado` diz "é água".

**A reta dos boxes** (quadro `reta` em `montreal.js`: +x ao longo da pista, +z para o lado dos boxes, o oeste)
- **Prédio dos boxes de 2019** (`predioDosBoxes2019`): térreo de garagens brancas, dois andares recuados com guarda-corpo de vidro, telhado em madeira laminada (forro marrom) apoiado em colunas brancas em V, terraço verde e painéis solares; plataforma de gramado na altura da pista, paddock atrás (motorhomes, tendas, carretas, sem marca).
- **Arquibancada principal** do outro lado (4 módulos de `tribunaCoberta`, torcida de vermelho e branco do Canadá), com a bacia atrás e muro de concreto na margem.
- Faixa "GRAND PRIX DU CANADA" / "CIRCUIT GILLES-VILLENEUVE" no pórtico de `pista.js`, **de frente para os carros** (normal contra o sentido da volta; conferido na malha).

**Muros e curvas** (`kit/montreal/muros.js`)
- Muros de concreto com alambrado em vários trechos (retas, saídas das curvas), blocos vermelhos e brancos por fora das curvas.
- **Muro dos Campeões** na saída da chicane final (0,95-0,975, do lado de fora da curva): muro branco com "Bienvenue au Québec" em letra cursiva e flores-de-lis, pneus pintados de vermelho e branco na frente.
- Grampo e Senna com arquibancadas de curva (fitas do kit), placas com o nome das curvas, zebras vermelhas e brancas, asfalto pintado nas chicanes e brita por fora do grampo e da T2, placas de frenagem 150/100/50, passarelas e bandeira do Canadá nos mastros.

**Ao longe** (`kit/montreal/cidade.js`, sem neblina do jogo, bruma pintada nos vértices)
- **Skyline de Montreal** a oeste (Place Ville-Marie em cruz, "1000 de la Gauchetière" de topo piramidal, Basílica de Notre-Dame, Torre do Relógio, cais baixo do Vieux-Port), com o Mont Royal atrás (`montanha`).
- **Ponte Jacques-Cartier** a norte (treliça de aço verde em três vãos) e o **Biosfera** (esfera geodésica de barras, em uma malha instanciada) na ilha Sainte-Hélène.

**Parque** (`kit/montreal/parque.js`): bordos de copa redonda em verde de junho, abetos, bosque da ilha Sainte-Hélène, fileiras de choupos nas margens, bandeiras do Canadá e do Québec nos degraus. Sem marca de patrocinador: só nomes de lugar (`kit/montreal/marcas.js`).

**Conferido em Node** (sem navegador): a cena monta sem erro; invasão da pista = 0 peças; ~167 chamadas de desenho na câmera (Monza 208, Suzuka 207). Não rodei os testes nem abri o jogo. Fica de fora: Casino, Pont de la Concorde e barcos no rio.
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

