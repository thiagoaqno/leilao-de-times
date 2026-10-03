# Pelada: condução definida pelo dono da sala · Tênis: golpe armado desarma em 1,9 s

## Pelada
- **Padrões novos da condução:**
  - tempo entre toques: **0,2 s** correndo, no pique e protegendo;
  - bola na frente: **0,4 m** andando e correndo, **0,5 m** no pique.
- **Só o organizador muda, e vale para todos:** na sala de espera tem "⚙️ Condução e dribles (vale para todos)". O
  organizador mexe e cada valor vai para a configuração da sala (`config.cond`). O servidor e o navegador de cada um
  passam a usar os mesmos números, inclusive os robôs do amistoso. Os outros só veem. O que o organizador escolhe
  fica guardado e serve de ponto de partida quando ele abre a próxima sala.
- No jogo online, o painel do menu de pausa só mostra os valores da sala. No treino e contra bots ele continua
  editável, e os valores ficam guardados no navegador.
- **Correção junto:** com a bola mais perto (0,4 m do centro), ela encostava no corpo do jogador e o corpo mudava o
  rumo dela sem toque. Agora, enquanto o jogador conduz, só o toque mexe na bola, como pedido antes.
- O servidor confere os números que vêm da sala (cada um dentro de uma faixa, em `COND_FAIXA`).
- Arquivos: `public/pelada/campo.js` (`COND`, `COND_FAIXA`, `limparCond`, `usarCond`), `pelada.js`, `public/pelada/menus.js`,
  `jogo.js`, `rede.js` e `index.html`.

## Tênis
- Apertou o golpe e não bateu na bola em **1,9 s**? O golpe desarma e o jogador volta a andar normalmente (antes
  eram 2,6 s). Vale para todos, inclusive os robôs, no treino e online.
- Arquivos: `public/tenis/regras.js` (`ARMADO_MAX`) e `public/tenis/jogo.js`.

## Testes
- `npm test`: 29 passaram. No navegador (Pelada, Tênis e páginas): 28 passaram.
- Conferido no navegador com duas pessoas na mesma sala: o organizador mexe e o valor vale na hora; quem entrou depois
  vê o mesmo valor, sem poder mexer.
