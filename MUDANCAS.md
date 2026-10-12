# Futevôlei: atletas com esqueleto (Mixamo) e impulso na corrida e no pulo

Antes: os atletas eram bonecos de caixas e as poses eram feitas à mão; corriam e pulavam "de uma vez", sem agachar, sem aterrissar e sem sentir arrancada ou freada.

Depois: a skin padrão (a do jogador) usa um esqueleto de verdade com as animações do Mixamo: corrida, corrida de costas, passos laterais, passe, cabeçada, voleio, bicicleta (Scissor Kick) e comemoração. As cores da pele e do time são pintadas por região. As outras skins (e os robôs) continuam de caixinhas, agora também com impulso: arrancar joga o corpo para a frente, frear inclina para trás e o pulo agacha, sobe em arco e amortece.

Como: `ferramentas/animacoes-mixamo.mjs <pasta com .fbx>` converte os FBX em `public/futevolei/modelo/atleta.glb` e `clipes.json` (leves, ~2,6 MB). `public/futevolei/atleta-mixamo.js` carrega o modelo, mistura os clipes pela velocidade e dispara cada golpe no tempo do toque (`GOLPES_M`: clipe, início, impacto, fim). A física e as regras (`regras.js`) não mudaram; sem o modelo carregado, cai nas caixinhas. Testei só em imagens de capturas e `tests/futevolei.test.js`; vale jogar para acertar o tempo dos golpes.

Falta: gestos de lamentar e manias, e skins de personagem com esqueleto.
