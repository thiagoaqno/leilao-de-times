# Corrida: cenários de Melbourne e Bahrein

Cenários 3D dedicados e imersivos para os GPs de **Melbourne (Albert Park Circuit)** e **Bahrein (Bahrain International Circuit - Sakhir)**, substituindo as configurações genéricas `gpSimples` por ambientações ricas, fiéis aos circuitos reais da Fórmula 1 e construídas em Three.js nativo sem imagens ou modelos externos.

---

## 1. GP de Melbourne (Albert Park Circuit)

- **Lago Albert Park e Ilha Gunn (`public/corrida/melbourne.js`)**:
  - Polígono suave de 20 vértices definindo o contorno do lago central, com água dinâmica em tempo real (`tr.agua`).
  - Ilha Gunn arborizada no centro do lago.
  - Albert Park Yacht Club & Rowing Sheds: deque de madeira, estacas, galpão náutico e veleiros com velas em Three.js.
- **Skyline de Melbourne (Southbank / CBD ao norte)**:
  - Eureka Tower (297 m, topo em ouro 24k, faixa vermelha vertical e vidro azul profundo).
  - Australia 108 (316 m, torre curva com anel starburst dourado).
  - 101 Collins Street (torre clássica em pedra com antena de 65 m).
  - Rialto Towers (vidro escuro espelhado) e mais 65 edifícios em vidro e aço ao horizonte.
- **Cenário de Pista e Kit (`public/corrida/gps/melbourne.js`)**:
  - Zebras tradicionais verde e amarelo ouro (`#007a3d` e `#f4c300`), além de zebras banana amarelas anticorte nas chicanes.
  - Áreas de escape em brita bege clara (`#d8caa2`), asfalto de desaceleração verde/branco e barreiras de pneus triplas.
  - Arquibancadas oficiais nomeadas: Fangio (reta principal, coberta), Brabham e Jones (curvas 1 e 2), Moss, Clark, Waite, Hill, Prost e Senna.
  - Complexo dos boxes com garagens, camarotes, torre de cronometragem, pórtico de largada Rolex e árvores do parque via `parque.js`.

---

## 2. GP do Bahrein (Bahrain International Circuit - Sakhir)

- **Torre Al Sakhir VIP (`public/corrida/bahrein.js`)**:
  - Modelagem procedural fiel da icônica torre circular de 8 andares que domina o paddock e a reta principal de Sakhir.
  - Pódio circular em pedra calcária do deserto (`#cfc1a5`).
  - 8 andares cilíndricos com vidro fumê reflexivo e anéis arquitetônicos externos brancos (brise-soleil) com pilares e faixas luminosas de LED (vermelho do Bahrein e dourado).
  - Lounge panorâmico no 8º andar com terraço cantilever saliente.
  - Cobertura icônica em tenda beduína branca (tensile fabric canopy) encimada por torreão em aço, mastro de transmissão e sinalizador aéreo vermelho.
- **Postes de Iluminação Noturna do Deserto (Floodlight Pylons)**:
  - Sistema de postes altos treliçados de 32 m de altura com bancos de holofotes halógenos/LED retangulares inclinados sobre a pista, cobrindo o perímetro do circuito em `InstancedMesh` (baixo impacto no draw call).
- **Oásis e Jardins de Palmeiras**:
  - Pátios ajardinados no paddock e na reta de trás com tamareiras (*Phoenix dactylifera*) e palmeiras do deserto.
- **Cenário de Pista e Cores (`public/corrida/gps/bahrein.js`)**:
  - Zebras vermelho e branco do Bahrein (`#d62828` e `#f4f4f4`) e zebras amarelas anticorte nos ápices das curvas 1/2 (Schumacher), 4, 8 (grampo), 10 e 14/15.
  - Áreas de escape características de Sakhir com asfalto pintado em listras vermelhas e brancas nas saídas rápidas, caixas de brita cor de areia do deserto (`#d8c49a`) e muros de pneus.
  - Arquibancadas oficiais:
    - *Main Grandstand*: tribuna principal coberta com assentos em vermelho e branco ao longo de toda a reta dos boxes.
    - *Turn 1 Grandstand*: na freada forte da curva Michael Schumacher.
    - *Batelco Grandstand*: na ferradura interna das curvas 8 a 10.
    - *Victory Grandstand*: na aproximação da curva 14.
  - Complexo dos boxes com friso vermelho do Bahrein, patrocinadores e pórtico de largada com marcas `gulfair` e `rolex`.
  - Marcas reais adicionadas em `kit/marcas.js`: `gulfair` (patrocinador título oficial do GP do Bahrein) e `bahrain`.
  - Som ambiente de deserto com vento suave, helicóptero e multidão nas arquibancadas.

---

## Fontes das fotos e referências

- Fotos e mapas oficiais da Formula 1 e da Bahrain International Circuit (bic.com.bh):
  - A arquitetura da Torre Al Sakhir VIP e seus anéis exteriores com iluminação noturna.
  - O layout das arquibancadas Main Grandstand, Batelco e Turn 1.
  - As listras vermelhas e brancas nas áreas de escape de asfalto e as zebras da Curva 1 (Michael Schumacher) e Curva 10.
  - A disposição das torres de refletores noturnos instaladas no circuito desde 2014.
- Referências do GP de Melbourne (Australian Grand Prix Corporation).

---

## Validações e Testes

- **Invasões de pista**: 0 invasões em Melbourne e 0 invasões no Bahrein (`tests/ajuda-cena/invasao.mjs` limpo).
- **Suíte de testes de pista**: 36/36 testes aprovados em `tests/corrida-pistas-invasao.test.js` e checkpoints 100% validados em `tests/corrida-pistas-volta.test.js`.
- **Desempenho**:
  - Melbourne: 322 malhas na cena, 165 chamadas de desenho.
  - Bahrein: 268 malhas na cena, 130 chamadas de desenho da câmera (limite do jogo é 520).
- **Zero alterações em física e traçado**: traçados, largadas, relevo (`hills`), limites e regras mantidos estritamente intactos.
