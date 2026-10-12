# Futevôlei: apertar sem parar não salva, a bola encobre quem está na rede, e rastro na bola

Antes: apertando passar ou atacar sem parar, o toque ficava sempre armado e o "ímã" levava o jogador até a bola, então quase nunca se perdia. A bola funda passando por cima de quem estava perto da rede ainda era alcançada de longe. E a bola voava "seca", sem nenhum efeito visual.

Depois: o toque armado dura 1,1 s e apertar de novo não renova o tempo (só troca passar/atacar). Se a bola não veio a tempo, o jogador fica 0,6 s sem poder armar (o anel fica vermelho e encolhe), e armar muito antes da bola chegar deixa o toque pior. O "ímã" só faz o ajuste fino (até 1,8 m): correr até a bola é com quem joga. No alto, quanto mais alta a bola, mais embaixo dela é preciso estar, então a bola que encobre quem está na rede não volta. A bola ganhou um rastro (branco no passe, dourado no ataque, laranja-fogo no Shark, na bicicleta e no voleio), gira mais rápido no chute forte e cada toque dá um clarão.

Como: `armar`, `ESFRIA`, `alcanceNa` e `cedo` em `public/futevolei/regras.js` (as mesmas contas no servidor e no treino; o navegador repete o armado e o esfriar). O rastro e o clarão são `atualizarRastro` e `estalo` em `public/futevolei/jogo.js`, só visuais. Teste novo em `tests/futevolei.test.js`.
