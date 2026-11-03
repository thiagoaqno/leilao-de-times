# Corrida: o cenário próprio da Cidade do México (Foro Sol, parque, Peraltada e vulcões)

## O que estava faltando
O Autódromo Hermanos Rodríguez era só o GP simples do kit: nada do que faz o circuito reconhecível, e o trecho do estádio de beisebol não existia.

## O que mudou
Só código (sem modelo baixado, sem marca registrada nova); o traçado não mudou. `public/corrida/mexico.js`, `gps/mexico.js` e `kit/mexico/` (`foro.js`, `parque.js`, `horizonte.js`, `lugar.js`, `marcas.js`).
- **Foro Sol:** a arquibancada em ferradura lotada de verde, branco e vermelho, aberta onde a pista passa perto; o campo listrado com o losango; o pódio no meio, de frente para a torcida; as bandeiras do México, as torres de luz e a fumaça verde, branca e vermelha.
- **Reta principal:** prédio dos boxes com o paddock e a tribuna principal; arquibancadas nas curvas 1 a 3 e no meio.
- **Parque Magdalena Mixhuca:** lagos, quadras, jacarandás, ahuehuetes, eucaliptos e pinheiros; o Palácio dos Esportes de cúpula de cobre.
- **Peraltada antiga:** um pedaço do anel inclinado que ficou de fora, visível do lado.
- **Horizonte:** a cidade baixa, a Torre Latinoamericana e os vulcões Popocatépetl e Iztaccíhuatl na névoa.
- Painéis só com nomes de lugar e de comida do México.

## Peso e conferência
`node tests/ajuda-cena/medir.mjs mexico`: ~145 chamadas de desenho e ~236 mil triângulos na vista do jogo (antes, 101 e 164 mil); a conferência de invasão acusa 0. Rodei só a sintaxe dos módulos e essas duas conferências; o CI roda os testes. Sem mexer em `sons.js` nem em `motor-*.js`.
