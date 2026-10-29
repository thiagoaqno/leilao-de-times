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
