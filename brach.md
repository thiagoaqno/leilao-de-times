# Corrida F1: carreira com peças e orçamento, garagem nova e avisos menores

Três mudanças na Corrida (F1): os avisos da transmissão ficaram compactos, o carro da carreira agora é montado escolhendo PEÇAS dentro de um orçamento, e as telas da carreira ganharam um visual novo (garagem com o carro 3D, abas, calendário com bandeiras).

## 1. Avisos estilo F1 menores (`public/corrida/hud-f1.css`)
Só tamanho e posição, o estilo é o mesmo. O cartão ficou compacto (cerca de 300 px de largura, fonte de 11 a 13 px, 32 px de altura) e saiu do centro: fica no topo, à direita da torre de posições (a 236 px da borda), sem cobrir o HUD de posição/voltas. As cinco luzes da largada também diminuíram e seguem a mesma coluna. No celular (375 px) o cartão cabe ao lado da torre, sem estourar a tela.

## 2. Carreira com peças e orçamento
Novo módulo `public/corrida/f1-pecas.js` (UMD, `window.F1Pecas`/`require`), com teste em `tests/corrida-f1-pecas.test.js`.

- 8 categorias, 3 a 4 peças cada, com nome, custo e efeito: **Unidade de potência** (V6 Cliente, Padrão, Turbo+, Especial), **ERS e bateria**, **Asa dianteira** (baixo arrasto, equilibrada, alta pressão), **Asa traseira** (baixo arrasto/DRS longo, equilibrada, alta pressão, carga máxima), **Chassi e assoalho** (robusto, equilibrado, fibra leve, ultraleve), **Suspensão**, **Freios** e **Câmbio**.
- Cada peça dá níveis nos seis atributos que já existiam (motor, aerodinâmica, chassi, freios, suspensão, confiabilidade). O custo da peça é a soma dos níveis que ela dá, então as peças viram a mesma montagem de antes (`specDaMontagem` não mudou) e cabem no mesmo orçamento em pontos (15 a 20 por equipe, mais o bônus de desenvolvimento). A física não foi tocada.
- As trocas: asa de alta pressão = mais curva e menos reta; peças de "baixo arrasto" trocam carga por motor; chassi leve = acelera/freia melhor e amassa mais; câmbio reforçado = quebra menos.
- O carro "todo médio" (as peças padrão de cada categoria) custa 18 pontos e dá os níveis 3-3-3-3-3-3, os mesmos atributos de hoje (teste).
- Servidores (`corrida-temporada.js`, `corrida-temporada-grupo.js`, `corrida.js`): os pedidos de `montagem` aceitam `pecas` (o servidor valida peça por categoria, o custo contra o orçamento e deriva os níveis) ou o `montagem` antigo (só níveis). Guardam a escolha em `s.pecas` (solo), `equipes[eq].pecas` (grupo) e `room.pecasEq` (sala de F1). A temporada solo e a em grupo (#326) seguem funcionando; o histórico da equipe em grupo registra "montou o carro".
- Entre as corridas: o prêmio de cada GP já vai para o caixa e o botão "Desenvolver" compra +1 ponto de orçamento (até +4), que libera uma peça melhor. A troca de peças é livre entre GPs (em grupo, só com o GP fechado). Comprar/melhorar cada peça individualmente com dinheiro ficou de fora (o gancho é o bônus de orçamento).

### Saves antigos
Nada precisa ser migrado no banco: a montagem de níveis continua sendo o que se guarda e o que a física usa. Save antigo (sem `pecas`) abre normalmente; na tela de peças aparece o conjunto de peças mais parecido (`migrarMontagem`: escolhe a combinação que mais se aproxima dos níveis sem passar do orçamento; as montagens padrão das 11 equipes ficam a no máximo 2 níveis do original, a maioria exatas) com um aviso. Ao trocar uma peça, o carro passa a ser montado por elas.

## 3. Visual da carreira
Novos `public/corrida/temporada/garagem.js`, `garagem.css` e `car3d.js`; usados pela temporada solo (`sede.js`), em grupo (`grupo.js`) e pela montagem na sala de F1 (`menus.js`).

- Abas no topo: Visão geral, Carro · Peças, Classificação e Equipe (mercado e box).
- Visão geral: painel escuro à esquerda com a equipe, a nota do carro e os atributos com ícones e números; o carro 3D (o mesmo modelo da corrida, girando devagar) no centro; à direita o calendário com bandeiras e o botão vermelho grande "Continuar".
- Peças: barra de orçamento fixa no topo, um cartão por peça agrupado por categoria (custo, efeito, instalada/sem orçamento) e o resultado nos atributos ao lado.
- Tipografia condensada em caixa alta, vermelho F1 com preto e cinza e cantos levemente angulados, sem logos ou marcas dos jogos de referência.
- Celular: 16 px de margem, sem rolagem horizontal, o carro e o botão "Continuar" sobem para o começo da tela, cartões em uma coluna.

## Testes
`tests/corrida-f1-pecas.test.js` (novo: custo cabe no orçamento, atributos derivados, carro médio igual ao de hoje, trocas, migração do save antigo, solo e grupo) e um caso novo em `tests/corrida-f1-equipes.test.js` (a sala de F1 aceita peças e o formato antigo). Rodei `tests/corrida*.test.js`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
