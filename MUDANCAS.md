# Carreira de Treinador: os clubes e jogadores do Brasileirão 2026 (fase 1)

A fase 1 de `planos/carreira.md`. As carreiras novas começam no Brasileirão Série A 2026, com os clubes de verdade, os
elencos atuais e escudos em pixel-art parecidos com os reais, mas desenhados por nós.

## Como fica
- **Os 20 clubes da Série A 2026:** os de 2025, menos Ceará, Fortaleza, Juventude e Sport, mais Coritiba, Athletico-PR,
  Chapecoense e Remo.
  - Cada clube tem a cidade, as cores, o estádio (pelo nome popular) e o tamanho.
- **Os elencos de agora, jogador por jogador:** 25 a 38 por clube, com os nomes, as posições e as nacionalidades da
  Wikipédia, baixados em 07/10/2026.
  - Neymar e Coutinho no Santos, Paquetá e Saúl no Flamengo, Memphis e Lingard no Corinthians, e assim por diante.
- **As notas são estimativas nossas, estilo FC**, marcadas `est`, como no `ratings.js`:
  - os jogadores conhecidos (cerca de 380) têm nota e posição detalhada (lateral, volante, meia, ponta);
  - os outros (`reserva: true`) recebem a nota-base do clube com um sorteio pequeno.
- **Os escudos em 8 bits** (16x18 pixels): forma, cores, listras e iniciais de cada clube, e um símbolo. Por exemplo:
  - a estrela solitária do Botafogo;
  - a cruz do Vasco;
  - as estrelas do Cruzeiro;
  - a âncora do Corinthians;
  - as listras do Athletico.
  São parecidos com os de verdade, mas nenhum é cópia. A foto está em `planos/imagens/carreira-escudos.jpg`.
- **As carreiras criadas antes** continuam com os clubes de teste: cada save lembra a base em que nasceu.

## Por dentro
- `ferramentas/base-brasileirao.js`: baixa os elencos da Wikipédia em inglês, aplica a tabela de notas `NOTAS` e grava
  `public/carreira/base/brasileirao-2026.js`.
  - Os nomes, posições e nacionalidades vêm da Wikipédia, com a nacionalidade traduzida.
  - Tem `--cache` para não baixar de novo, e espera e tenta outra vez quando a Wikipédia pede calma.
  - Para corrigir uma nota ou uma posição: mude a tabela e rode de novo.
- **A regra de não inventar jogador:** quando o elenco da Wikipédia não tem o mínimo para escalar, entra um jovem da
  base fictício, com nome genérico e `base: true`, para revisar.
  - Só aconteceu uma vez: o Botafogo tem 2 goleiros listados, e entrou o "Goleiro da base 3".
- **O que ainda não tem fonte:** a idade e o fim de contrato ficam `null` (a tela mostra a nacionalidade no lugar da
  idade). O valor e o salário são contas da nota.
- `public/carreira/escudos.js` (novo): a receita `escudo` de cada clube vira uma grade de pixels e um SVG.
  - As receitas aceitam: forma (escudo, redondo, triângulo), listras horizontais, verticais ou diagonais, faixa, anel, iniciais numa fonte 3x5, estrela, cruz, âncora, constelação e estrelas no topo.
  - Os clubes de teste também passam a usar esse desenho.
- `carreira.js`: as carreiras novas usam a base `brasileirao-2026`; as antigas seguem na delas.
- A página escolhe a base pelo estado (`usarBase`).

## Os clubes
| Clube | Jogadores | Média dos titulares | Os 5 melhores |
| --- | --- | --- | --- |
| Flamengo | 27 | 80.1 | Giorgian de Arrascaeta 84, Lucas Paquetá 83, Agustín Rossi 81, Pedro 81, Jorginho 81 |
| Palmeiras | 25 | 78.3 | Jhon Arias 81, Vitor Roque 80, Gustavo Gómez 80, Felipe Anderson 79, Andreas Pereira 79 |
| Cruzeiro | 34 | 76.9 | Gerson 80, Matheus Pereira 80, Kaio Jorge 79, Fabrício Bruno 78, Luis Sinisterra 78 |
| Mirassol | 32 | 71.6 | Reinaldo 73, Shaylon 72, Chico Kim 72, Negueba 72, Walter 72 |
| Fluminense | 30 | 76.4 | Thiago Silva 79, Hulk 78, Jefferson Savarino 77, Guilherme Arana 77, Lucho Acosta 77 |
| Botafogo | 33 | 75 | Hakim Ziyech 78, Alex Telles 77, Cristian Medina 76, Arthur Cabral 76, Vitinho 75 |
| Bahia | 29 | 75 | Caio Alexandre 77, Éverton Ribeiro 77, Jean Lucas 76, Luciano Juba 76, Kanu 75 |
| São Paulo | 38 | 75.5 | Lucas Moura 78, Jonathan Calleri 77, Rafael 77, Robert Arboleda 76, Marcos Antônio 76 |
| Grêmio | 34 | 74.5 | Weverton 78, Mathías Villasanti 77, Martin Braithwaite 76, Fabián Balbuena 75, Juan Nardoni 75 |
| Bragantino | 32 | 73.6 | Cleiton 75, Isidro Pitta 75, Eric Ramires 74, Vanderlan 74, Tiago Volpi 74 |
| Atlético-MG | 32 | 75.6 | Renan Lodi 77, Fred 77, Gustavo Scarpa 77, Alexsander 76, Alan Franco 76 |
| Santos | 37 | 76.3 | Neymar 85, Philippe Coutinho 78, Gabriel Barbosa 77, Arthur 76, Everton Cebolinha 76 |
| Corinthians | 33 | 76.5 | Memphis Depay 81, Hugo Souza 78, Rodrigo Garro 78, Yuri Alberto 78, Jesse Lingard 77 |
| Vasco | 33 | 74.7 | Léo Jardim 77, Lucas Piton 76, Puma Rodríguez 75, Thiago Mendes 75, Carlos Cuesta 75 |
| Vitória | 37 | 72.4 | Lucas Arcanjo 74, Tomás Pochettino 73, Walace 73, Emanuel Brítez 72, Camutanga 72 |
| Internacional | 26 | 75.4 | Alan Patrick 79, Sergio Rochet 77, Guillermo Maripán 76, Johan Carbonero 76, Alexandro Bernabei 76 |
| Coritiba | 33 | 71.5 | Fabricio Bustos 73, Pedro Morisco 72, Joaquín Lavega 72, Lucas Ronier 72, Brian Ocampo 72 |
| Athletico-PR | 31 | 72.8 | Kevin Viveros 74, Kerwin Vargas 74, Santos 74, Stiven Mendoza 73, Bruno Zapelli 73 |
| Chapecoense | 37 | 70.1 | Yannick Bolasie 71, Dylan Borrero 71, Yago Felipe 71, Rafael Santos 70, Eduardo Doma 70 |
| Remo | 32 | 70.1 | Yago Pikachu 72, Vitor Bueno 71, Jajá 70, Patrick 70, Gabriel Poveda 70 |

### Uma temporada simulada com a base (só o motor, sem ninguém decidindo)
| # | Clube | Pts | V-E-D | SG |
| 1 | Palmeiras | 85 | 26-7-5 | 30 |
| 2 | Flamengo | 76 | 24-4-10 | 40 |
| 3 | Cruzeiro | 68 | 20-8-10 | 23 |
| 4 | Vasco | 65 | 18-11-9 | 13 |
| 5 | Fluminense | 65 | 18-11-9 | 9 |
| 6 | Corinthians | 64 | 19-7-12 | 15 |
| 7 | Santos | 60 | 17-9-12 | 5 |
| 8 | São Paulo | 59 | 16-11-11 | 8 |
| 9 | Vitória | 57 | 16-9-13 | 13 |
| 10 | Grêmio | 56 | 15-11-12 | 2 |
| 11 | Athletico-PR | 51 | 15-6-17 | -3 |
| 12 | Internacional | 50 | 14-8-16 | -1 |
| 13 | Atlético-MG | 45 | 11-12-15 | 0 |
| 14 | Bragantino | 41 | 10-11-17 | -9 |
| 15 | Coritiba | 40 | 12-4-22 | -12 |
| 16 | Botafogo | 40 | 10-10-18 | -15 |
| 17 | Bahia | 39 | 9-12-17 | -12 |
| 18 | Chapecoense | 35 | 8-11-19 | -28 |
| 19 | Mirassol | 34 | 9-7-22 | -26 |
| 20 | Remo | 22 | 5-7-26 | -52 |

## Conferido
- `npm test`: 85 passaram, 0 falharam. Numa das rodadas, um teste dos que às vezes falham por tempo falhou; na seguinte,
  tudo passou.
  - Os testes novos de `tests/carreira-base.test.js`:
    - são os 20 clubes;
    - todo elenco tem pelo menos 3 goleiros, 8 defensores, 7 meias e 5 atacantes;
    - não há nome repetido no clube nem id repetido na base;
    - as notas vão de 50 a 92 e os atributos de 20 a 95;
    - todo escudo é uma grade de 16x18 com contorno.
  - Os testes do servidor agora criam carreiras com Flamengo, Palmeiras e Corinthians e escalam os 11 do Corinthians.
- No navegador:
  - os 20 escudos ampliados (a foto);
  - a carreira nova com o Flamengo: a sede, com São Paulo × Flamengo no Morumbi na rodada 1;
  - o elenco com os jogadores de verdade, as notas e as nacionalidades.
