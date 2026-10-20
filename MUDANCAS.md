# Corrida de F1: carros, pistas, robôs, céu e cenário vivo

## O que muda

### Carro e pilotagem
- O kart com boneco virou um **carro de Fórmula 1** em 3D (`public/corrida/f1/f1.glb`, CC0). O modelo original de 37 MB foi reduzido para 1,3 MB e teve todos os logotipos apagados: a pintura agora é uma máscara de cores.
- **Pinturas inspiradas nas equipes de F1** (só as cores, sem nomes nem marcas): Clássico 88, Rosso, Papaia, Flecha de Prata, Touro Azul, Verde Inglês, Azul Francês, Preto e Ouro, Azul Marinho, ou a cor do piloto com branco.
- Rodas que giram cada uma no próprio eixo, dianteiras que esterçam e volante que vira junto, inclusive nos carros dos outros.
- **Física de F1**: 0–100 km/h em ~2 s, 0–200 em ~5 s e máxima perto de 340 km/h, com aderência, freio e esterço maiores na mesma proporção.
- **Câmbio de 8 marchas**, com as marchas mais longas para o motor encher. Há uma opção de **câmbio manual** para todos: Shift sobe e Ctrl direito reduz; no controle, X e B; no celular, botões + e −. Os robôs continuam no automático. As luzes de troca ficam em cima do velocímetro.
- **Som de F1 de verdade**: gravação CC0 de um F1 V8 no Freesound. Toca em loop, e o tom acompanha a rotação de cada marcha. O motor dos carros por perto também se ouve, mais baixo conforme a distância. Há um **controle de volume** no cabeçalho e na tela da corrida.
- O kart inclina com o relevo (sobe o bico na subida, desce na descida) e a câmera acompanha.

### Pistas
- **Os nove traçados foram redesenhados** com mais curvas: grampos, chicanes, esses e retas longas. Agora todos têm ~19,5 mil de volta (cerca de 1 min no F1). O relevo foi refeito em cada um, com lombadas para voar em Interlagos, Tóquio e no Deserto, e dunas na reta do Deserto. O Arco-íris manteve o traçado e ficou mais longo.
- **Céus de verdade**: fotos de céu do Poly Haven (CC0), uma por pista. A foto também ilumina e reflete nos carros, a neblina pega a cor do horizonte e o sol fica onde está na foto.
- **Cenário vivo pela volta inteira**: torcida pulando na reta e nas curvas, bandeirolas, mastros com bandeiras balançando, balizas e setas nas curvas, postes, outdoors, cata-ventos, roda-gigante, trem, barcos, pássaros, dirigível, balões, helicóptero de TV seguindo a corrida, avião com rastro, água mexendo, neve, bolas de feno, fogos e holofotes em Tóquio.

### Corrida
- **Robôs** (0 a 7, fácil, médio ou difícil). Eles **aprendem com a galera**: a melhor volta limpa de cada pista fica guardada no banco (`corrida_voltas`) e eles copiam a linha e as velocidades dela. Sem volta guardada, seguem um traçado de corrida calculado (abrem antes da curva e cortam no ápice). Também pegam caixas e usam itens.
- **Caixas e poderes em 3D**: cubo de vidro furta-cor com "?", banana, cascos, cogumelo, estrela e bomba. O botão do item mostra a foto 3D do poder e a roleta gira as fotos.
- Banana e bomba vão sempre para trás. Os cascos perseguem a 1,7× a velocidade máxima do carro alvo.
- Quem é atingido dá um pulo, gira e fica com estrelinhas na cabeça, com um "POW!". Derrapagem solta fumaça dos pneus. Turbo e estrela têm chama e arco-íris.
- **Sensação de velocidade**: desfoque radial na placa de vídeo (o centro e o carro ficam nítidos), faixa tracejada no asfalto e câmera que treme no fim de reta. Se o computador ficar abaixo de ~45 quadros por segundo, a qualidade baixa sozinha.
- **HUD novo**: progresso em %, posição e tempo, minimapa redondo que gira com o carro e mostra o caminho à frente, velocímetro em arco com a marcha e etiquetas de nome nos carros.
- **A sala virou um menu de blocos coloridos**: Garagem, Mapa das pistas, Largar, Regras, Pintura e Na sala, com abas (Q/E) e Esc para voltar.

## Verificação

- `node --test tests/corrida-robos.test.js tests/corrida-experiencia.test.js tests/corrida-colisao.test.js`: 10 testes passaram. Eles cobrem os traçados novos sem trechos encostando, os robôs fechando a volta na pista, as caixas e os itens, o casco a 1,7× e os robôs copiando uma volta gravada.
- `node --test tests/salas.test.js tests/servidor.test.js tests/bd.test.js`: 25 passaram (o formato do estado da Corrida foi regravado).
- `npx playwright test tests/e2e/paginas.spec.js tests/e2e/salas.spec.js`: 39 passaram, inclusive a sala da Corrida. Para isso, a montagem da pista ficou 3× mais rápida.
- Conferido no navegador: as 10 pistas, a sala, a pintura, a primeira pessoa, o câmbio manual, os robôs, os itens e o desfoque.
- As falhas da Carreira no `npm test` já existiam no `main`.
