# Carreira: voltar ao menu do intervalo sem se perder

- **No intervalo**, depois de abrir Tática, Substituições ou Formação, o botão "← Menu do intervalo" agora fica preso no alto da prancheta, numa faixa na cor do clube, e continua lá enquanto você rola a tela até o banco ou as formações. Antes ele era um botão pequeno e cinza, que sumia ao rolar.
- O mesmo botão também aparece embaixo, logo acima do "Voltar ao jogo", para não precisar subir a tela inteira.

## Como

- `public/carreira/partida.js`: na prancheta do intervalo, o "← Menu do intervalo" entra no alto e também antes do `#dVoltar`.
- `public/carreira/hub.css`: o botão de cima fica `position: sticky` na cor do time (`--fx-teal`); o de baixo, na faixa clara das abas.
