# Carreira: comissão técnica alinhada e sem ícones

## O que muda no jogo

Na aba Técnico da tela Clube, a lista da Comissão técnica estava desalinhada (o título e o texto de cada preparador ficavam empurrados para a direita, com um buraco grande depois do ícone). Agora cada linha tem só o nome, a descrição e o botão, alinhados à esquerda, e os ícones SVG da lista saíram. No celular o botão desce para baixo do texto.

## Como

`.gc-linha.preparador` em `estilo.css` (duas colunas: texto e botão); `clube.js` não monta mais o `.gc-ic` e `clube-regras.js` não tem mais o campo `icone` dos preparadores.
