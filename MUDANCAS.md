# Carreira: os botões do menu da sede sem os ícones

- **Antes**, os botões da gestão na faixa da sede (Elenco e tática, Mercado, Tabela, Calendário, Trocas, Clube e Estante) tinham um quadradinho com um ícone em SVG na frente do nome, e as abas ao lado (Central, Meu time, Temporada) não tinham.
- **Agora**, todos os botões da faixa ficam no mesmo padrão das abas: só o nome, com o mesmo espaço dos lados.
- Com a janela de transferências aberta, o Mercado continua com a bolinha verde, agora logo depois do nome.

## Como

- `public/carreira/index.html`: saíram os `<span class="tile-ic">` dos `.tile` da sede.
- `public/carreira/hub.css`: o `.tile` da sede ganhou o espaço das abas (`padding: 0 16px`); a bolinha do mercado aberto foi para `.tile-txt b::after`; saíram as regras do `.tile-ic`.
- `public/carreira/estilo.css`: saíram as regras antigas do `.tile-ic`, que nada mais usa.
