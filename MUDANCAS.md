# Ginásio: casinha e desafios na Vila (Fase 4)

## Como fica
- Novo prédio na Vila Esportiva, ao lado do Pingue-Pongue e abaixo do Tênis, com telhado arredondado, Pokébola e placa do Ginásio.
- A porta abre `/ginasio/`; o menu Jogos e o minimapa incluem o prédio. Voltar à Vila deixa o jogador na porta do Ginásio.
- Pelo botão Batalha ou clicando no boneco de um amigo, dá para escolher Por turnos ou Ginásio (tempo real), com Galeramon ou Pokémon e o time já salvo.
- A opção **Desafiar no Ginásio (tempo real)** envia um convite com aceite/recusa. Aceitar leva os dois à mesma sala 1x1, sem robôs, com seus times e lados reservados. O desafiante organiza e inicia a partida quando ambos chegam.
- O cabeçalho da Vila usa duas linhas no celular: o botão Jogos não fica mais fora da tela. O painel do desafio cabe em retrato e tem rolagem em paisagem.
- A batalha antiga por turnos continua na Vila e permanece a escolha padrão.

## Por dentro
- `GAMES` e `drawBuilding` em `public/index.html` ganham `ginasio: true`; cinco árvores mudam de lugar para liberar o lote. A rua existente já atende à porta, sem ampliar o mapa.
- `ginasio.js` reaproveita criação de sala/jogadores na ponte interna `criarDesafio`. A sala só nasce após o aceite, com validação dos dois times.
- `vila.js` mantém os eventos de convite e acrescenta `jogo: "ginasio"`; `irGinasio` envia somente a credencial de cada destinatário. Os jogadores ficam ocupados durante a transição, impedindo desafios duplicados.
- O navegador guarda `ginasio:<código>` antes de abrir `?sala=&entrar=1`. Tokens não aparecem na URL nem no estado público; reconectar recupera o mesmo jogador e não duplica a entrada automática.
- Sem dependências novas. Sem alteração no motor, golpes, sprites ou regras dos turnos. `CLAUDE.md` documenta a integração; `#debug` expõe `window.__vila` para testar mapa e câmera.

## Conferido
- `npm test`: 62 testes passaram, sem falhas.
- `npx playwright test tests/e2e/vila-ginasio.spec.js tests/e2e/ginasio.spec.js tests/e2e/paginas.spec.js`: 33 testes passaram, sem falhas.
- Servidor real: desafios Galeramon/Pokémon, lados e times preservados, tokens privados, invasor sem acesso aos lados reservados, recusa, aceite falso, time inválido, saída e bloqueio de convites duplicados.
- Caminhada até a porta, colisão do prédio, capacho acessível, pixels do telhado, entrada por teclado/toque e retorno à porta em 1280x800 e 375x812.
- Dois navegadores: desafio pelo sprite e pela central Batalha, recusa no celular, aceite na mesma sala, recarga sem perder identidade e partida com dois humanos. Opção padrão por turnos também testada pela interface.
- Painel do desafio em 375x812 e 480x270: texto sem transbordar e botões sem sobreposição. Regressão dos controles, sala, sprites e resultados do Ginásio, além da abertura dos outros jogos.
- Inspeção visual no navegador do app. Toque verificado por emulação Chromium, não em aparelho físico.

## Fotos
Prédio e porta na Vila, 1280x800:
![Ginásio na Vila](https://raw.githubusercontent.com/thiagoaqno/leilao-de-times/ginasio-fase-4/planos/imagens/ginasio-fase-4-vila.png)

Celular, 375x812:
![Ginásio na Vila no celular](https://raw.githubusercontent.com/thiagoaqno/leilao-de-times/ginasio-fase-4/planos/imagens/ginasio-fase-4-celular.png)

Escolha do desafio:
![Desafio no Ginásio](https://raw.githubusercontent.com/thiagoaqno/leilao-de-times/ginasio-fase-4/planos/imagens/ginasio-fase-4-desafio.png)

Convite com aceite/recusa no celular:
![Convite no celular](https://raw.githubusercontent.com/thiagoaqno/leilao-de-times/ginasio-fase-4/planos/imagens/ginasio-fase-4-convite.png)

Os dois amigos na arena:
![Amigos no Ginásio](https://raw.githubusercontent.com/thiagoaqno/leilao-de-times/ginasio-fase-4/planos/imagens/ginasio-fase-4-amigos.png)

## Limite desta fase
Somente a Fase 4 de `planos/ginasio.md`. Balanceamento e refinamentos de efeitos ficam na Fase 5. Sem banco de dados, carreira ou refatoração do desenho do mapa.
