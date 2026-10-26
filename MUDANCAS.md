# Mônaco, fase 2: marcas reais, som de cada região e cenário vivo

Começo da fase 2 (imersão nas pistas), com Mônaco como piloto. Tudo é cenário e som: a física não muda, e as outras pistas continuam iguais.

**Marcas de verdade** (`public/corrida/marcas.js`)
- Os patrocinadores da F1 desenhados no canvas, sem baixar imagem: Rolex (com a coroa), Pirelli (o P comprido), Aramco, Heineken (a estrela vermelha), DHL (as faixas), TAG Heuer, Lenovo, AWS (o sorriso), Formula 1, Qatar Airways, MSC, Crypto.com, Louis Vuitton e o Automobile Club de Monaco.
- Estão no guard-rail (entre as listras vermelhas e brancas), nos painéis colados nele, nos postos dos fiscais, nos outdoors e nas passarelas (a da reta dos boxes é a da Rolex, como no GP).

**Som ambiente que muda pela pista** (`public/corrida/monaco-vida.js`, tudo sintetizado)
- Porto: ondas, gaivotas e de vez em quando a buzina de um iate.
- Arquibancadas: a torcida, com os gritos subindo e descendo.
- Cidade: o ronco da rua e lambretas passando; na Place du Casino, a fonte.
- Túnel: o zumbido dos exaustores e o eco do motor; lá dentro o som de fora quase some.
- Sainte Dévote: os sinos da capela tocam de tempos em tempos.
- O helicóptero da TV, mais alto quanto mais perto.
- O som ambiente segue o volume e o botão de som da corrida e só toca durante a corrida.

**Cenário vivo**
- O helicóptero da TV acompanha a corrida, à frente de quem a câmera segue, com o rotor girando.
- Gaivotas planando sobre o porto.
- Os fiscais dos 46 postos agitam a bandeira verde quando o carro passa perto.
- Com "menos movimento" ligado no sistema, as animações param.

Validação: 29 testes da corrida passaram; `git diff --check` sem erros. Conferido no navegador do app: marcas na reta, na Sainte Dévote, no cais e no grampo; o peso de cada região do som medido no #debug (`tr.somMonaco`) no grid, no Cassino, no túnel, no cais e na Sainte Dévote; o helicóptero e os fiscais com a bandeira.
