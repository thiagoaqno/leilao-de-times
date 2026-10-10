# Carreira: voltar sem se perder (menu do intervalo e botão do topo)

- **No intervalo**, depois de abrir Tática, Substituições ou Formação, o botão "← Menu do intervalo" agora fica preso no alto da prancheta, numa faixa na cor do clube, e continua lá enquanto você rola a tela até o banco ou as formações. Antes ele era um botão pequeno e cinza, que sumia ao rolar.
- O mesmo botão também aparece embaixo, logo acima do "Voltar ao jogo", para não precisar subir a tela inteira.
- **O botão de voltar do topo** virou uma placa no tema: nas telas de gestão (Elenco e tática, Mercado, Tabela...) o "← Sede" fica maior e na cor do clube; na Sede, o "← Vila" é uma placa clara, menor.
- **Sem sair sem querer:** o "← Vila" aparece no mesmo lugar do "← Sede" assim que você volta à Sede, e o segundo toque rápido levava à Vila. Agora um toque logo depois de voltar (menos de 1 s) é ignorado.

## Como

- `public/carreira/partida.js`: na prancheta do intervalo, o "← Menu do intervalo" entra no alto e também antes do `#dVoltar`.
- `public/carreira/hub.css`: o botão de cima fica `position: sticky` na cor do time (`--fx-teal`); o de baixo, na faixa clara das abas.
- `public/carreira/zoom.js`: o botão do cabeçalho ganha a classe `para-sede` nas telas de gestão, e o clique no "← Vila" é ignorado por 900 ms depois de voltar à Sede.
- `public/carreira/hub.css`: o estilo do `#barra .voltar` (placa clara; `para-sede` na cor do time).
