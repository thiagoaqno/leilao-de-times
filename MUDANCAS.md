# Pelada com as animações do Mixamo, voleio e bicicleta; bicicleta do futevôlei mais forte

Antes: na Pelada os bonecos corriam e chutavam com poses feitas à mão, e chutar uma bola no ar dava só cabeçada ou o chute normal. No futevôlei, depois da bicicleta o jogador levantava andando, e a animação ficava atrapalhada.

Depois: todos os bonecos da Pelada (com as skins deles) correm, chutam, cabeceiam e fazem as coisas de goleiro com as animações do Mixamo do futevôlei: o goleiro pega a bola, segura no peito, chuta da mão, rola ou lança, e se joga. Chutar a bola no ar de primeira vira voleio (forte e baixo); com a bola na altura da cabeça e de costas para onde chuta, vira bicicleta. Depois da bicicleta (nos dois jogos) o jogador fica parado 1,2 s enquanto levanta. No futevôlei a bicicleta saiu mais forte.

Como: `public/pelada/mixamo.js` liga as animações aos bonecos pelo gancho `configurarBonecos({ animar })` do `bonecos.js` (carrinho e caído continuam com as poses antigas). O voleio e a bicicleta são `acrobacia` em `public/pelada/campo.js`, a conta do chute que o servidor e o treino usam; o navegador manda `costas` no chute. No futevôlei, `CAIDO_BICICLETA` em `regras.js` para o jogador e o tempo de voo da bicicleta caiu de 0,85–0,65 s para 0,75–0,56 s. Testes novos em `tests/campo.test.js`.
