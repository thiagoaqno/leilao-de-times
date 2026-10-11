# Modo Jogador: rumo ao estrelato (primeira fatia)

## O que muda no jogo

- Novo modo na Vila, o prédio **Rumo ao Estrelato** (Vila Esportiva, no terreno que estava vazio): você é um jogador, não o técnico. Cria o atleta (nome, posição, perna boa, idade de 17 a 23, nacionalidade) e escolhe o clube e de 1 a 5 temporadas. Cada clube mostra a "chance de jogar" na sua posição.
- O treinador é o computador. A **confiança do treinador** (0 a 100) decide se você começa jogando: sobe com nota boa, gols, assistências e treino bom da semana; quem está no banco continua treinando e pode convencê-lo. Nas copas o elenco é rodado e o reserva ganha uma chance a mais.
- Cada jogo da carreira (liga e copas, o mesmo calendário e motor da Carreira de Treinador) vira nota do jogador, gols, assistências e jogos sem sofrer gol. O relatório mostra a nota, o treino, a mudança de confiança e a evolução.
- A evolução vem de pontos de treino: jogar bem rende mais. A cada nível sobe +1 na nota e +1 num atributo, no foco escolhido (técnica, físico, finalização, marcação ou goleiro). Há um teto de potencial escondido, mostrado em estrelas. A virada de temporada ainda aplica idade e evolução natural.
- Três objetivos por temporada (jogos, nota média e gols, ou jogos sem sofrer gol para o goleiro), calibrados pelo papel que você tem no time. Cumprir rende bônus de evolução e confiança. O fim da carreira mostra o título (de "carreira honesta" a "lenda").
- **Fim de temporada:** um balanço (objetivos, prêmios e seleção) e a escolha do futuro. Dá para ficar, renovar (2 ou 3 anos) ou aceitar uma proposta de outro clube, de compra ou de **empréstimo de uma temporada** (que volta ao clube de origem). O empréstimo resolve o banco em clube grande. A proposta mostra o papel prometido (titular, rodízio ou reserva de luxo), a nota do titular da posição e o salário, e a confiança do treinador no clube novo começa pelo papel. Se o contrato acabou, é preciso renovar ou escolher uma proposta para seguir.
- **Contrato e empresário:** salário mensal que cai no patrimônio a cada jogo. O empresário (agente local, experiente, superagente) é liberado pela **fama**, que cresce com nota, gols, prêmios e seleção; ele fica com uma comissão do salário, melhora os salários e traz mais propostas.
- **Prêmios:** seleção do campeonato, revelação, artilheiro da liga, Bola de Ouro (e pódio) e os títulos do clube, com a sala de troféus na tela.
- **Seleção:** a convocação vem da nota, da média e da fama contra o nível da seleção do país do jogador. Em ano par tem Copa do Mundo ou Eurocopa e Copa América, com fase alcançada, jogos e gols.
- Fica para os próximos PRs: transferências com a janela do meio do ano, pedir para sair, e a sala em grupo.

## Como

- `jogador.js` (canal `/jogador`): eventos `criar`, `entrar`, `recuperar`, `foco`, `jogar`, `proxima`, `codigo`, `excluir`, `sair`. Salva no mesmo banco (`bd.js`) como uma carreira normal, com o jogador em `save.jogador` e como `save.jovens.eu` do clube; por isso escalação automática, evolução e aposentadoria da virada já valem para ele.
- `carreira.js`: o corpo do `jogar` virou a função `jogarProximo` (usada pelos dois modos), `timeDe` soma `save.jogador.ajuste` (a confiança) à nota do jogador na escolha dos titulares, e `module.exports.jogador` entrega o que o modo usa.
- Página em `public/jogador/` (`index.html`, `jogador.js`, `jogador.css`), no visual escuro da Carreira com a cor do clube.
- `tests/jogador.test.js` joga temporadas inteiras pelo canal.
