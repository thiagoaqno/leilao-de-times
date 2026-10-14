# Road to Champions: a figura do protagonista em três partes

## O que muda

- **A personalização ficou dividida em três partes**, todas só dados e sem efeito em campo:
  - **Aparência física:** tom de pele, formato do rosto (oval, redondo, quadrado, fino), cabelo, cor do cabelo, barba, altura e porte;
  - **Visual e acessórios:** número da camisa, acessório e chuteiras (pretas, brancas, douradas ou uma de cada cor);
  - **Expressão pessoal:** semblante (sério ou sorridente), comemoração de gol (8 opções) e postura nas entrevistas (6 opções).
- **O acessório do personagem é só uma sugestão.** Antes ele vinha fixo e só dava para desligar. Agora o jogador escolhe qualquer acessório, ou nenhum. O editor marca com ★ o que o personagem sugere.
- **Editor em três abas** na criação e no lobby, com a prévia mudando na hora. Trocar de aba não perde o que já foi escolhido.
- **Evolução visual por escolha.** Quatro opções de evento mudam a figura, e a mudança entra no diário de todos como **VISUAL NOVO**:
  - **O Último Romântico** pode aparecer sem a corrente e de cabelo curto (capítulo 3);
  - **A Máquina** pode ir à coletiva sem os óculos âmbar (capítulo 3);
  - **O Prodígio** pode descolorir o cabelo para a semifinal (capítulo 4);
  - **O Enigma** pode avisar que vai comemorar de verdade na final (capítulo 5).

  Cada opção só aparece quando faz sentido: quem já tirou os óculos não vê a opção de tirá-los.
- **A comemoração vira notícia.** Nas vitórias de mata-mata e nos jogos entre protagonistas, o diário mostra como o vencedor comemorou.
- **Versão nos dados:** `aparencia.versao` (hoje 1) permite que um desenho futuro, cartoon ou 3D, saiba de que formato os dados são.
- **Campanhas já criadas** no formato anterior (tudo em `aparencia`, com `numero` e `marca`) são convertidas ao carregar do banco, sem perder nada.

## As quatro exigências

- **Aparência sem efeito esportivo:** um teste joga a mesma campanha duas vezes, com figuras diferentes, e confere que placares, campeão, atributos, eixos, medidores, forma e vitórias saem iguais.
- **Personalização persistente:** um teste retoma a campanha num servidor novo, carregando do banco, e confere a figura igual.
- **Identidade compartilhada:** o estado manda a figura de todos, e um teste confere que quem cria e quem entra veem a mesma.
- **Desenhista independente:** `public/jogador/aparencia.js` lê só a figura e as cores do clube, sem regra de jogo dentro.

## Verificação

- `tests/road-to-champions.test.js`: 15 testes, 6 novos (sem efeito em campo, persistência e figura compartilhada, formato antigo, evolução visual no diário, comemoração no mata-mata e valores válidos em todas as opções).
- `tests/salas.test.js`, `jogador.test.js`, `servidor.test.js` e `bd.test.js` passando.
- 300 campanhas simuladas com figuras e escolhas sorteadas, sem erro.
- O desenho das seis sugestões e das variações renderizado em PNG.
- O editor e a tela de jogo rodados num DOM simulado (abas, prévia, envio da figura, ficha e diário). O navegador de testes não pôde ser baixado neste ambiente, então faltam as fotos da página real.
