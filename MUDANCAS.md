# Corrida: Mônaco refeito em cima de dados reais (traçado, relevo e construções)

## O que estava errado
Mônaco parecia arcade: o traçado era desenhado à mão em cima da imagem do mapa oficial (que é girado e esticado), o relevo era um perfil
com 20 pontos num morro de cone, a cidade eram caixas sorteadas pelo `pista.js` e a pista recebia as peças genéricas do kit (olhos de gato no
guard-rail, placas de seta de autódromo, mastros de bandeira coloridos, roda-gigante, dirigível e morros de longe) que Mônaco não tem.

## O que mudou
- **Traçado real:** a linha central do circuito (bacinger/f1-circuits, MIT, conferida contra as ruas e a pista dos boxes do OpenStreetMap), girada para a linha de
  chegada na Boulevard Albert 1er (230 m antes da Sainte Dévote), norte em cima e na proporção de verdade (a de antes era 3,9 × 1; a real é 0,76 × 1). Convertida
  por `ferramentas/circuitos-f1.js` (afasta os trechos que se tocariam na pista larga do jogo) em 87 vértices; raio mínimo 74 (o guard-rail de dentro pede 66). Volta de 12 504 (era 12 918).
- **Relevo real:** a altitude de EU-DEM 25 m e SRTM 30 m (média, via opentopodata.org) ao longo da volta (2 a 53 m, 2,4 unidades por metro) em `hills`, e o chão em volta
  agora é o morro de verdade (`tr.relevoGP` em `pista.js`): o porto no nível do mar, o Rochedo em falésia, a cidade em degraus e a encosta subindo até 290 m ao noroeste. A cor
  do terreno vem dos vértices (jardins, mata, pedra, paredão, mato do morro).
- **Construções reais:** ~1 600 plantas de prédios do OpenStreetMap com a altura de `height`/`building:levels` (palpite pelo tipo onde não há), fachada de Mônaco
  (creme, ocre, rosa, salmão, com janelas, venezianas e sacadas), terraços com casa de máquinas e telhado de telha nos prédios baixos. As paredes de cada região são uma malha só.
  Marcos em código: Casino de Monte-Carlo (torres e cúpulas de cobre), Hôtel de Paris, Café de Paris, Hermitage, Fairmont sobre o túnel, capela de Sainte Dévote, Museu
  Oceanográfico, Palácio do Príncipe e catedral no Rochedo, Port Hercule com os píeres reais e ~215 iates, Piscina Rainier III onde há piscina grande, arquibancadas só onde há calçada livre.
- **Túnel** de 276 m sob o Fairmont, coberto (`tr.coberto`: não chove dentro), com o morro por cima.
- **Detalhes de pista:** guard-rail duplo de aço (`guardrail.estilo: "duplo"`, novo no kit, padrão igual ao de antes), cerca de proteção, zebras vermelhas e brancas, palmeiras, plátanos e pinheiros-de-alepo nas posições do OSM.
- **Removido de Mônaco (só nele, pela chave nova `sem` e `horizonte: false`):** olhos de gato, placas de seta, 14 mastros coloridos, roda-gigante, dirigível, bandeirolas coloridas e os morros genéricos.
  O kit compartilhado só ganhou opções novas com o padrão de antes.
- **Dados:** `node ferramentas/monaco-dados.js` gera `kit/monaco/dados.js` (146 KB) e o bloco de `pistas.js`, com as frações da volta de cada curva, do túnel, das faixas e do DRS.
- **Consequências:** `migracoes/020-monaco-real.sql` zera voltas, traçados e recordes de Mônaco (o traçado mudou); `f1-pneus-tabela.js` medida de novo para Mônaco (volta média 73,8 s → 54,3 s: o traçado real é mais corrido);
  `tests/ajuda-cena` consertado (`toast`, `$`, `getContext` que o `qualidade.js` passou a pedir) e o teste de desempenho não exige mais roda-gigante em Mônaco (usa a do Rio).

## Como foi conferido
Sem testes nem navegador (o dono joga): só scripts de Node. A cena de Mônaco monta sem erro (312 malhas, 160 chamadas por quadro na vista do jogo, 272 mil triângulos, 123 materiais, dentro dos tetos
de `corrida-pistas-desempenho`); nada sólido invade a pista (a conferência de `invasao.mjs` dá 0); o robô difícil dá 3 voltas sem bater nem sair da pista; as conferências de
estilo de carro de `corrida-f1-equipes` (Mônaco de curva, Monza de reta) continuam valendo; o corredor dos boxes e a grade cabem na reta (600 de reta atrás da linha).

## Fontes
bacinger/f1-circuits (MIT); © colaboradores do OpenStreetMap (ODbL), Overpass API; EU-DEM 25 m e SRTM 30 m via opentopodata.org.
