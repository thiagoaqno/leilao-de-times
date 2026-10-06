# Leilão: refeito do zero, com cara de futebol, cartas em pixel-art e 400 jogadores novos

## Como fica
- **Visual novo:** noite de estádio. Fundo quase preto puxado para o verde, refletores balançando, destaque verde-limão
  e o gramado no palco. Sem emojis: todos os ícones são desenhados (SVG). Na narração do campeonato e do júri dos pratos,
  os emojis também viram ícones.
- **Cartas de jogador estilo FUT:** cada jogador vira uma carta com nota, posição, país e o **rosto em pixel-art**,
  desenhado na hora (pele, cabelo e barba). A cor da carta segue a nota: **dourada** só para 90 ou mais (com brilho
  holográfico, raios girando e faíscas), **prata** de 87 a 89 e a **padrão** (escura, com o verde-limão) abaixo de 87.
- **A camisa mais marcante:** o jogador veste a camisa de clube mais emblemática dele, com o desenho certo (listras
  do Barça e da Juve, faixa do Vasco e do River, a faixa do Boca, os aros do Sporting...). Os atuais vestem o clube de
  agora; as lendas, o clube mais marcante da carreira, com escolhas à mão (Zico no Flamengo, Cruyff no Ajax, Henry no
  Arsenal, Riquelme no Boca...). Alguns vão com a seleção: Pelé, Maradona, Ronaldo, Romário, Baggio.
- **400 jogadores novos:** 212 lendas e 210 atuais, todos com nota (estimativa), posição, país e clubes (para a
  química) e rosto. As listas passaram para 318 lendas e 310 atuais.
- **O sorteio virou abertura de pacote:** uma fita de cartas corre pelo palco e vai freando até parar no sorteado. A
  carta escolhida gira e entra grande no meio do palco. Com a roleta oculta, as outras cartas da fita aparecem viradas.
- **Revelação com suspense:** os lances secretos viram um por um, do menor para o maior, e o carimbo **VENDIDO** bate
  com o palco tremendo. Só depois o jogador voa até o time. Quem levou ganha confete.
- **Menos informação na tela:**
  - em cima, o **placar da galera**: um cartão por pessoa, com as moedas descendo em contagem, as vagas acendendo quando
    o jogador pousa e o que cada um está fazendo (pensando, pronto, na frente, saiu);
  - ao lado do palco, **um campinho só**: o seu, ou o de quem você tocar no placar. O campinho agora fica deitado (gol à
    esquerda) e mostra ataque, defesa e química;
  - a lista, os sem dono, o histórico e as regras da sala foram para a gaveta **Lista**.
- **Lance:** botões − e +, lances rápidos e "Tudo". O tempo é uma barra que fica vermelha e pulsa nos últimos 5 s. No
  lance aberto, o maior lance pula a cada lance novo, e os últimos lances aparecem embaixo.
- **Organizador:** os botões ficam numa barra no rodapé do palco, só com o que vale naquele momento. Em tela larga, a
  carta e o lance ficam lado a lado.
- **Momentos com cena própria:** sala de espera (código grande e cada um entrando pulando), intervalo (o baralho
  respirando), fim (taça, a contratação mais cara, a pechincha e o favorito no papel) e "Hora do campeonato".
- **Tela inicial:** três lendas em leque, os temas de futebol em destaque e o resto dos ajustes recolhido em "Ajustes
  da sala". A troca da tela inicial para a sala é animada.
- Quem pede "menos movimento" no sistema fica sem as animações (o jogo ao vivo continua andando).

## Por dentro
- `public/leilao/index.html` foi reescrito, e o CSS foi para `estilo.css`.
- Arquivos novos em `public/leilao/`:
  - `icones.js`: o sprite SVG e `iconizar`;
  - `rostos.js`: os rostos 16x16 (uma tabela de 4 letras por jogador das listas; quem não está nela ganha um rosto
    sorteado pelo nome) e a camisa (`KITS` dos clubes, `PRIORIDADE` e as escolhas à mão em `EMBLEMA`);
  - `carta.js`: a carta FUT;
  - `palco.js`: o `render()` novo. A cena do meio só é remontada quando muda de momento, para as animações não
    recomeçarem a cada estado.
- `roleta.js` trocou o canvas da roleta pela fita de cartas.
- `elenco.js`: o voo espera o carimbo (`atrasoVoo`) e vai para o cartão do placar quando o time não está aberto. A fala
  de quem chegou aparece embaixo do cartão no placar.
- `aovivo.js`: a carta do gol usa a carta nova, e cada jogo tem uma barrinha com o tempo de jogo.
- `card.js` (o card do campeão) usa as cores novas.
- `ratings.js`, `quimica.js` e `presets.js`: os jogadores novos (notas, país e clubes, listas por posição).
- O servidor não mudou.

## Conferido
- `npm test` passando (46).
- Todos os 628 jogadores das listas têm nota, química e rosto (conferido por script).
- Os testes de navegador do leilão passando (`paginas.spec.js` e `salas.spec.js`).
- No navegador, com 3 robôs dando lance:
  - lance secreto e aberto;
  - sorteio, revelação e voo até o time;
  - fim e campeonato simulado (placar ao vivo, carta do gol, tabela);
  - tema de hambúrguer;
  - celular (375 px) e tela larga (1400 px).
