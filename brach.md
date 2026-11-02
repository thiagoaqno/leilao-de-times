# Las Vegas: asfalto iluminado e grid desencontrado

O asfalto de Las Vegas recebe iluminação uniforme à noite sobre a própria textura, sem planos sobre a pista que atravessem os carros. O efeito desliga durante o dia e funciona também nos gráficos baixos.

Na F1, as posições das duas colunas do grid ficam intercaladas; carros, robôs e marcas no asfalto usam a mesma posição. O grid do modo comum permanece igual.

## Verificação

- Testes de grid, largada e iluminação noturna passaram.
- Corrida de Las Vegas com 20 carros e gráficos baixos conferida visualmente no navegador.
- Os testes de tráfego e robôs passaram, salvo um teste de freio que também falha na main; o teste de turbo passou ao repetir.
