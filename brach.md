# Austin ganhou cenário próprio: a torre vermelha, Big Red e a paisagem seca do Texas

O GP dos Estados Unidos (Circuit of the Americas) usava só o cenário genérico do kit. Agora tem peças só dele, no nível de Mônaco e Spa, tudo feito em código (sem modelo baixado e sem marca registrada: os painéis são nomes de lugar e de comida do Texas).

## O que mudou na pista

- **A subida até a curva 1 ("Big Red"):** a pista agora tem o relevo real. Sobe 10,6% da linha de chegada até o topo da curva 1 (a real é de 11%), desce pelos S rápidos e sobe de novo até a curva 9. No topo do morro, a arquibancada vermelha, a colina de torcida, a bandeira dos Estados Unidos gigante e o nome "BIG RED" pintado no asfalto de escape.
- **A Torre de Observação vermelha**, com o véu de 18 tubos de aço, a escada em dupla hélice e o mirante de vidro. Aos pés dela, o anfiteatro (palco coberto, bancos vermelhos e brancos, gramado em rampa). Perto, a Grande Praça, com o espelho d'água e a aleia de treliça, e as duas passarelas, sobre as curvas 3 e 16.
- **A reta dos boxes:** prédio das garagens com a torre de controle e a tribuna principal coberta de membrana branca, de frente uma para a outra, com as tendas do paddock atrás.
- **O resto da volta:** arquibancadas nas curvas 4, 12, 15 e 19, o palco do miolo na reta de trás, as tendas do Fan Zone, placas com o número de algumas curvas, galera de chapéu de vaqueiro e bandeiras dos Estados Unidos e do Texas.
- **A paisagem do Texas:** chão de capim dourado e terra clara, carvalhos-vivos, cedros, mesquites, nopais, pedras de calcário, manchas de bluebonnet e os morros baixos do Hill Country no horizonte.
- **O escape** agora é de asfalto liso, com brita só na curva 11. O traçado e o tamanho da pista não mudaram.

## Relevo e barreiras

Rodei `node ferramentas/pista-real.js us-2012 austin --dem srtm30m --raio 4`. Com `--raio 4` a inclinação máxima ficou em 10,6%, plausível (o SRTM contando árvore como ladeira não apareceu). Apliquei `hills`, `hillsSuave: true`, `flat: 60` e `fall: 380`. A curvatura da altura é suave (sem lombada que faça o carro decolar). A ferramenta achou barreira mapeada nos dois lados quase a volta toda (lado 1 sem barreira em 0% e lado -1 em 3%, bem abaixo de 30%), então usei os `muros` dela, sem mexer.

## O que ficou de fora de propósito

- **O asfalto de escape pintado de vermelho e azul não entrou.** Procurei e não achei fonte que confirme as cores nem os lugares. A única pintura que confirmei foi o nome "Big Red" no escape da curva 1; a cor das letras não está nas fontes, então escolhi branco com contorno vermelho.
- **Suzuka:** só confirmei a referência a Silverstone (curvas 3 a 6); não confirmei a de Suzuka, então ela só aparece no comentário do cabeçalho como "S rápidos".
- O que não achei fonte (a fachada do prédio dos boxes, por exemplo) usa as peças genéricas do kit.

## Como foi conferido

- `node --check` em todos os arquivos que mudaram.
- A cena monta no Node sem erro. Medido com `node tests/ajuda-cena/medir.mjs austin`: 381 malhas, ~210 chamadas de desenho e ~515 mil triângulos na vista do jogo (Spa: 194 chamadas e 426 mil). A conferência de invasão (`tests/ajuda-cena/invasao.mjs`, rodada só para o Austin) acusa 0.
- No navegador (`/corrida/#debug`, placa de vídeo de verdade), prints da largada, da subida da curva 1, do nome pintado, da torre, dos S, do anfiteatro, da praça, do palco, do estádio e de uma vista geral, sem erro no console.
- **Não rodei a suíte de testes:** o CI faz isso. **Não conferi** uma volta jogada de ponta a ponta nem os robôs com os `muros` novos.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
