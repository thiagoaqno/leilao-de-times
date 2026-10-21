# Carreira em grupo: a decisão não some mais antes da hora

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
