# Carreira: várias temporadas, evolução dos jogadores, código de recuperação e excluir a carreira

Este é o PR 3 do plano `planos/carreira-online.md`. A carreira solo passa a ter de 1 a 5 temporadas: os jogadores
evoluem na virada, os veteranos se aposentam, a base sobe jovens e, no fim, aparece o resumo da carreira. Além disso,
a sede ganhou os botões para ver o código de recuperação de novo e para excluir a carreira.

## Várias temporadas
- **Contrato:** ao assinar, o técnico escolhe de 1 a 5 temporadas (padrão 2), e o limite fica em `save.temporadasMax`.
  As carreiras antigas ficam com 5 (ou com a temporada em que já estão), para ninguém ser cortado no meio.
- **Fim da temporada** (`registrarTemporada`): o histórico guarda a posição, a liga, os títulos e vices, o artilheiro
  do seu time, o melhor negócio (a venda de maior lucro) e a força do elenco (a média dos 11 melhores). Também paga a
  premiação da posição e R$ 15 mi por título. Roda uma vez só por temporada.
- **`novaTemporada`** agora funciona no calendário mundial (antes recusava). Ela:
  - resolve com a opção padrão os avisos que ficaram sem resposta;
  - evolui o elenco, aposenta veteranos e sobe jovens da base;
  - zera o calendário, os gols, os cartões, as lesões e o desempenho;
  - monta as copas novas com a tabela do ano: Champions com os 4 primeiros de cada liga europeia e Libertadores com os
    6 primeiros do Brasileirão, mais um sorteado entre o 7º e o 12º (o campeão da Copa do Brasil);
  - avisa na caixa de entrada quem subiu, quem caiu, quem se aposentou e quem veio da base. A base também vira post
    no feed.
- **Última temporada:** a sede mostra o resumo da carreira (as taças, a liga e o artilheiro de cada ano, a barra da
  força do elenco e o melhor negócio), sem o botão "Nova temporada". `novaTemporada` recusa.

## A evolução (`public/carreira/evolucao.js`, novo, servidor e navegador)
- **Idade:** sobe 1 por temporada (`idadeNa`). A base brasileira não tem data de nascimento, então a idade é estimada
  pelo id do jogador (sempre a mesma, de 20 a 32 anos). A ficha mostra "(estimada)".
- **Nota de cada jogo** (`notasDaPartida`): começa em 6, sobe com gol (+1), passe (+0,6), defesa do goleiro, vitória e
  jogo sem sofrer gol, e cai com cartão e derrota. Fica em `save.desempenho[pid] = [jogos, soma]`, dos dois times do
  seu jogo.
- **Evolução** (`evolucaoDe`), de **−2 a +3** por temporada, com semente:
  - até 23 anos tende a subir, de 24 a 29 fica perto de zero e a partir de 30 tende a cair;
  - quem jogou mais de 60% dos jogos do time ganha um pouco, e o jovem encostado perde;
  - a nota média pesa a partir de 3 jogos;
  - perto do 95, subir é mais difícil.

  A mudança entra em `save.bonusNota`, a mesma soma dos eventos, e também em `save.evolucao`, que é só a evolução.
- **Aposentadoria:** a partir dos 35 anos, com chance de 25% aos 35 até 85% aos 38 ou mais. O aposentado ganha o dono
  `"aposentado"` e sai de todos os elencos e do mercado. Os do seu time e os craques (nota 82+) viram post no feed.
- **Jovens da base** (`criarJovem`): 1 ou 2 por clube a cada temporada, de 17 ou 18 anos, na posição mais carente.
  A nota sai do tamanho do clube, e o nome, da língua do país. Os outros clubes param em 30 jogadores. O seu clube
  nunca fica abaixo de 18, e a escalação salva volta para a automática se alguém dela se aposentou.
  - Os jovens ficam em `save.jovens`, com o id `<clube>-t<temporada>b<n>`.
  - O navegador recebe só os que precisa (`estado.jovens`): os do seu time, os dos times do seu jogo e os que
    aparecem na artilharia, no mercado e no feed.
- **Os jogos sem você** usam os elencos do começo da temporada (`basesDaTemporada`, a partir de `save.donosInicio` e
  `save.evolucao`), que só mudam na virada. Assim os resultados já jogados nunca mudam, nem depois de reiniciar o
  servidor. Na primeira temporada, nada muda em relação ao PR 2.

## Código de recuperação e excluir a carreira
- **Ver o código de novo:** botão "Código de recuperação" na sede.
  - O banco guarda só o hash do código, então o navegador guarda o código em `carreira:codigo` (ao criar, ao entrar
    pelo código ou ao gerar outro) e mostra de novo.
  - "Gerar outro" pede um código novo ao servidor (`codigo`, `bd.novoCodigoDe`), e o antigo deixa de valer. Também
    serve para quem não tem o código guardado.
- **Sair:** antes de sair, o código aparece na tela ("Antes de sair, anote o código") no lugar do `confirm` de antes.
- **Excluir:** botão "Excluir esta carreira", que pede para escrever EXCLUIR. O servidor apaga a linha do banco
  (`excluir`, `bd.excluirCarreira`), e o token e o código param de valer em todos os aparelhos.

## Outros
- `Temporada.simularMundo` aceita `classificados` (Libertadores e os 4 de cada liga europeia).
- As transferências guardam a `temporada` (para o melhor negócio de cada ano).
- No feed das copas, o texto ficou "eliminado do Mundial" e "conquista o Mundial", em vez de "da Mundial".

## Testes
- **`tests/carreira-evolucao.test.js` (novo, no `npm test`):**
  - a evolução nunca passa de +3 nem de −2;
  - os jovens sobem em média e os veteranos caem, e quem joga muito e bem sobe mais;
  - a aposentadoria só acontece a partir dos 35 anos;
  - a nota de cada jogo e a idade;
  - o histórico é gravado uma vez só;
  - a mesma carreira evolui sempre igual (evolução, jovens, aposentados e classificados);
  - aposentados saem dos elencos e do mercado, e as copas usam a tabela do ano;
  - depois da temporada máxima, `novaTemporada` recusa.
- **`tests/bd.test.js`:** o código novo substitui o antigo, e excluir apaga a carreira de vez.
- **`tests/carreira-servidor.test.js`:** o contrato de temporadas, o código de novo pelo canal e excluir (a carreira
  some para todos os aparelhos).
- **`tests/e2e/carreira.spec.js`:** escolher as temporadas, ver o código de novo, sair com o código na tela, voltar por
  ele e excluir.
- `npm test`: 131 testes passando.
- **Instável, mas já era assim no `main`:** o teste "feed e pós-jogo" (`tests/carreira-mercado.test.js`, linha 116)
  falha de vez em quando: o extrato do último jogo às vezes vem sem a "Cota de TV". Falhou 1 de 10 vezes no `main`,
  sem este PR. Fica para outro PR.
- **O e2e da carreira não foi rodado até o fim neste PR.** O teste novo foi escrito, mas a execução foi interrompida a
  pedido do Thiago. Os mesmos fluxos (código, sair, voltar pelo código e excluir) foram conferidos no navegador do app
  e nos testes de servidor.
- Conferido no navegador do app, com duas temporadas jogadas até o fim: a virada, a ficha de um jovem da base e o
  resumo final.

## Fotos
- `planos/imagens/carreira-fim-da-carreira.png`: o resumo da carreira na sede.
- `planos/imagens/carreira-fim-celular.png`: o mesmo resumo no celular.
- `planos/imagens/carreira-codigo-de-novo.png`: o código de recuperação aberto pela sede.
- `planos/imagens/carreira-excluir.png`: a confirmação para excluir a carreira.

## Fora deste PR
- Contratos com tempo e renovação (o plano deixa para depois).
- O artilheiro do campeonato inteiro: os jogos sem você guardam só o placar, então o histórico mostra o artilheiro do
  seu time.
