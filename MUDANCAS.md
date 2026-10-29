# Spa-Francorchamps: cenário próprio na Corrida

O GP da Bélgica (`gps/spa.js`) deixou de ser o "GP simples" do kit e ganhou cenário próprio, em cima do kit 2: `spa.js` (a montagem) e `kit/spa/` (peças exclusivas, só código, sem modelo 3D baixado). Sem marcas registradas de patrocinadores (os painéis são nomes de lugar e de comida da Bélgica). Não mexe em traçado (`pistas.js`), física, robôs, regras, HUD, menus, sala nem carreira; em `cena.js` só o `LOOK.spa` (céu nublado das Ardenas, luz mais baixa).

## Onde fica cada marco (frações da volta)
- **Reta dos boxes (0,965-1,015):** prédio das garagens com Paddock Club e torre de controle de vidro (lado de dentro da La Source); tribuna principal coberta (3 módulos, torcida laranja e belga) do outro lado, com o paddock (carretas, tendas) e o estacionamento atrás; pórtico da largada com a faixa do circuito, perpendicular à pista e de frente para os carros (conferido na malha).
- **La Source (0,037):** arquibancada por fora do grampo, casas de enxaimel, escape vermelho e amarelo, muro de pneus.
- **Descida e Eau Rouge (0,055-0,125), Raidillon (0,125-0,185):** riacho de água avermelhada sob a pista, tribuna gigante de três andares com cobertura escura por fora, arquibancada e encosta de torcida por dentro, casa branca do topo, acampamento laranja.
- **Kemmel (0,19-0,31):** corredor de abetos. **Les Combes (0,32-0,36), Malmedy (0,365), Bruxelles (0,42), Pouhon (0,515-0,575, asfalto verde-água e encosta cheia), Fagnes (0,625), Stavelot (0,69, sítio), Blanchimont (0,82-0,88, acampamento laranja), Bus Stop (0,945-0,96).**
- Em toda a volta: barreira de aço ondulada com cerca de arame verde, placas de frenagem 200/100/50, placas com o nome de cada curva, bandeiras da Bélgica nos mastros, torcida de pé e sentada nas encostas (laranja, belgas, capas de chuva) com bandeiras da Bélgica, da Holanda e laranja, abetal denso com bétulas e faias, morros verdes e mata de longe.

## Referências por imagem (Wikimedia Commons)
Fotos baixadas só para estudo (não vão no repositório):
- Tribuna do Raidillon: https://commons.wikimedia.org/wiki/File:2022_6_Hours_of_Spa-Francorchamps_-_Eau_Rouge_Corner.jpg (volume de três andares, cobertura inclinada escura, pinheiros atrás, zebras vermelhas e amarelas) e https://commons.wikimedia.org/wiki/File:2022_6_Hours_of_Spa-Francorchamps_-_Eau_Rouge_Corner_stands.jpg (casa de enxaimel, cerca, descida).
- Raidillon, casa branca e barreira: https://commons.wikimedia.org/wiki/File:Kurve_Eau_Rouge-Raidillon.jpg (armco galvanizada, cerca verde, casa de telhado escuro, pinheiros).
- La Source (escape pintado): https://commons.wikimedia.org/wiki/File:La_Source_(4948348181).jpg (listras radiais vermelhas e amarelas).
- Prédio dos boxes: https://commons.wikimedia.org/wiki/File:LaSource.jpg (pontas de tijolo, faixa de vidro, teto branco) e https://commons.wikimedia.org/wiki/File:2022_Le_Mans_Cup_-_Pit_lane_at_Spa.jpg (térreo de concreto com portões, vidro por cima).
- Kemmel: https://commons.wikimedia.org/wiki/File:24H2CV_2017_Kemmel_straight.jpg (reta entre bosque de abetos e folhosas, cerca e armco).
- Pouhon e torcida: https://commons.wikimedia.org/wiki/File:Pouhon_(4949034496).jpg (faixa verde-água, zebra vermelha e branca, cerca de arame, gente na encosta) e https://commons.wikimedia.org/wiki/File:Belgian_GP_-_Pouhon_Corner_(20718657840).jpg.
- Bus Stop e placas 200/100: https://commons.wikimedia.org/wiki/File:Bus_stop_to_Kemel_(4956806379).jpg e a foto de Les Combes (https://commons.wikimedia.org/wiki/File:GP2_Les_Combes_(4957423996).jpg).
- Panorama, floresta e sítio: https://commons.wikimedia.org/wiki/File:Spa-Francorchamps_overview.jpg e a imagem de satélite https://commons.wikimedia.org/wiki/File:Circuit_de_Spa-Francorchamps,_April_22,_2018_SkySat_(cropped).jpg (quadras de abetal escuro, folhosas claras, pastos, sítio na volta de Stavelot).
- Torcida: https://commons.wikimedia.org/wiki/File:Lewis_Hamilton_fans_2011_Belgian_GP_(17889251050).jpg (capas de chuva, bandeiras) e https://commons.wikimedia.org/wiki/File:Spa_Francorchamps_Belgique_2011.jpg (tribuna de cobertura vermelha ao fundo).

## Conferido (scripts de Node, sem navegador)
- A cena monta; **0 invasões** da pista (`tests/ajuda-cena/invasao.mjs`).
- ~203 chamadas de desenho por quadro na vista do jogo (Monza e Suzuka: 207), ~500 mil triângulos na vista, 382 malhas na cena.
- Não rodei testes nem abri o navegador (quem joga e testa é o Thiago).

## Ficou de fora
Sem modelo 3D nem textura baixada; sem animação própria; os painéis de patrocinador reais não entram; Speaker's Corner e Campus sem placa.
