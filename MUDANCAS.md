# Carreira em grupo: a decisão não some mais antes da hora · Corrida: recordes de volta para sempre

## O bug
Na carreira em grupo, o servidor dá 20 s para cada decisão, contados de quando o jogo **dele** chega no lance (`parado.ate`). A página contava os seus próprios 20 s a partir de quando ela **mostrava** o lance. Como a tela costuma estar um pouco atrás do servidor (a animação, ou a aba escondida no celular), o servidor desistia primeiro:
- a janela da decisão fechava sozinha antes de a barra acabar, e valia a decisão padrão;
- o relógio da página continuava armado e, ao disparar, quebrava (`Cannot read properties of null (reading 'id')` em `enviarDecisao`);
- a parada tática do grupo tinha o mesmo prazo, mas sem nenhum contador na tela: fechava "do nada".

Reproduzido com a sala real 5B8B5 copiada da produção: o lance abriu com 14 s restantes no servidor e fechou sozinho, com o erro no console.

## O que muda
- No grupo, a barra de tempo usa o prazo do servidor e já começa no pedaço que sobrou (`armarTempo` em `partida.js`). A parada tática do grupo também ganha a barra.
- No grupo, a página não manda mais a decisão automática: quem aplica é o servidor, no fim do prazo dele, com a mesma `Motor.decisaoAutomatica`. Sozinho, continua como antes (20 s e a opção de maior chance).
- Quando a parada fecha ou muda, o relógio da anterior é desarmado (`grupo.js`), e `enviarDecisao` não quebra se a parada já fechou.

## Testes
- No navegador, com a sala 5B8B5 e o anfitrião sem responder: o lance abriu com a barra em 68% (14 s restantes) e fechou junto com o prazo; a parada tática mostrou a barra e fechou em 19,9 s; nenhum erro no console.

# Corrida: os 5 melhores tempos de cada pista, para sempre

## O que muda
- Tabela nova `corrida_recordes` (migração 013): os 5 melhores tempos de volta de cada pista ficam guardados para sempre. Cada piloto aparece uma vez por pista, com o melhor tempo dele ("Ana" e "ana" contam como a mesma pessoa), para ninguém ocupar o pódio inteiro. A tabela começa com a volta recorde que já estava guardada (`corrida_voltas`, a que os robôs copiam).
- O tempo que vale é o medido pelo servidor (pelos 12 setores, ao fechar a volta), não o que o navegador manda. Robô não entra.
- Quem entra no quadro gera um aviso para todos da sala ("Thiago bateu o recorde da pista: 1:11.42!") e uma linha no registro da sala.
- **Na Vila:** uma torre de cronometragem, como as da F1, ao lado do Autódromo. Ela mostra P1 a P5 de uma pista por vez, trocando a cada 5 s. Parado na frente dela, abre o quadro com todas as pistas que têm tempo (as vazias numa linha só), e o botão leva para o Autódromo. Os dados vêm de `GET /api/recordes-corrida`, atualizados a cada minuto, como o telão da estante.

## Testes
- `node --test tests/corrida-recordes.test.js`: o top 5 com um por piloto, a migração que traz o recorde antigo, a API e uma corrida de verdade pelo servidor (a volta fecha pelos setores, entra no quadro e a sala recebe o aviso).
- Conferido no navegador: a torre na Vila e o quadro aberto na frente dela.

## Também neste PR
- `tests/e2e/admin-carreira.spec.js`: a resposta falsa do teste não tinha os comandos da sala (`sala`), que o painel desenha desde o controle da ausência (15/10). O painel de verdade estava certo; o teste estava desatualizado.
