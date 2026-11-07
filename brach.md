# A Spa com relevo e barreiras reais

O traçado e o tamanho da pista não mudaram. É o piloto: se ficar bom, a mesma ferramenta faz as outras.

## Relevo

Antes eram 25 pontos de altura com teto de altura por pista. Agora são 100 pontos da altitude real (EU-DEM de 25 m), na mesma escala do traçado:

- Desnível: de 183 para 270 unidades (cerca de 106 m reais).
- Eau Rouge até o Raidillon: cerca de 41 m de subida, com pico perto de 17%.
- Les Combes é o ponto mais alto e Stavelot o mais baixo, como na pista real.

O chão em volta desce mais devagar (`flat` 60 e `fall` 380), para não virar barranco.

## Barreiras

A Spa tem barreira em quase toda a volta: o OpenStreetMap mapeia uns 13 km de muro e guard-rail para 7 km de pista. O erro da regra automática era a distância, quase fixa. Agora são 73 trechos com a distância real, de colada em Kemmel até bem afastada nas áreas de escape. Onde não há barreira mapeada, não há muro, e o carro sai da pista.

## Ferramenta

`ferramentas/pista-real.js` calcula `hills` e `muros` para qualquer pista já existente. Usa dados do OpenStreetMap (© colaboradores do OpenStreetMap, ODbL).

## Verificação

- Prints de antes e depois na mesma câmera, em cinco pontos da volta, sem erro no console. As imagens não estão no PR.
- Conta da física: nenhum trecho faz o carro sair do chão na velocidade ideal, e a inclinação máxima é de 19,5%.
- Corrida no navegador com 21 robôs por 86 segundos: nenhum abandono, voltas de 56 a 85 s, dano médio baixo.
- Não comparei o tempo de volta dos robôs com a pista antiga, e ninguém pilotou a volta inteira. A posição das barreiras depende do OSM e não foi conferida trecho a trecho em foto.
- Só `node --check`; a suíte fica com o CI.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
