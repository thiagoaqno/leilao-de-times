# Modo Jogador: transferências, empréstimos, contrato, prêmios e seleção

## O que muda no jogo

- **Fim de temporada:** um balanço (objetivos, prêmios e seleção) e a escolha do futuro. Dá para ficar, renovar (2 ou 3 anos) ou aceitar uma proposta de outro clube, de compra ou de **empréstimo de uma temporada** (que volta ao clube de origem). O empréstimo resolve o banco em clube grande. A proposta mostra o papel prometido (titular, rodízio ou reserva de luxo), a nota do titular da posição e o salário, e a confiança do treinador no clube novo começa pelo papel. Se o contrato acabou, é preciso renovar ou escolher uma proposta para seguir.
- **Contrato e empresário:** salário mensal que cai no patrimônio a cada jogo. O empresário (agente local, experiente, superagente) é liberado pela **fama**, que cresce com nota, gols, prêmios e seleção; ele fica com uma comissão do salário, melhora os salários e traz mais propostas.
- **Prêmios:** seleção do campeonato, revelação, artilheiro da liga, Bola de Ouro (e pódio) e os títulos do clube, com a sala de troféus na tela.
- **Seleção:** a convocação vem da nota, da média e da fama contra o nível da seleção do país do jogador. Em ano par tem Copa do Mundo ou Eurocopa e Copa América, com a fase alcançada, jogos e gols.
- **Casa própria na Vila:** o prédio Rumo ao Estrelato ganhou telhado de gramado com a estrela dourada e a faixa roxa.
- Fica para depois: janela do meio do ano, pedir para sair e a sala em grupo.

## Como

- Novo `jogador-mercado.js` (propostas, prêmios, seleção, empresário) e as regras de fim de temporada em `jogador.js` (`decidir`, `empresario`, `proxima`, `mudarDeClube`).
- **O modo fica separado da carreira:** `carreira.js` só ganhou um bloco no fim do arquivo (o `jogarProximoDoJogador` e as exportações do modo); o handler `jogar` da carreira e o `timeDe` voltaram a ser os de antes. A confiança do treinador entra na escalação como um efeito de nota de um jogo só (o mesmo mecanismo dos eventos), e o contrato do jogador fica em `save.jogador`, fora do clube.
- Testes em `tests/jogador.test.js` (transferência, empréstimo, renovação e contrato vencido).
