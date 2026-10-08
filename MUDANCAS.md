# Futevôlei da Galera

Jogo novo: futevôlei 3D na areia, 1x1 ou em duplas, contra a galera ou contra robôs. Na Vila, a **Arena de Futevôlei**
fica na areia da praia de Santos (com a placa "Praia de Santos" e no menu de jogos).

## Como joga
- **Só dois botões:** passar (`J` / clique) e atacar (`K` / botão direito); o direcional corre e mira o ataque. No
  celular aparecem os dois botões na tela; no controle, A passa e B/X ataca.
- O toque é armado: aperte antes da bola chegar e o jogador vai sozinho até ela e toca (o "ímã").
- **O golpe sai sozinho pela altura e pelo lugar da bola:**
  - cabeceio, peito, pé de frente e pé de lado;
  - letra e pé para trás, quando a bola está atrás do corpo;
  - atacando: voleio de lado, bicicleta por cima e o **Shark Attack**. O Shark é sempre de pé, de voleio ou de
    bicicleta, no pulo lá no alto perto da rede.
- O pulo é automático.
- **Regras do futevôlei de verdade:**
  - a bola não pode cair na areia;
  - 3 toques por time, e em duplas ninguém toca duas vezes seguidas;
  - saque de chute de trás da linha de fundo;
  - ponto corrido, set de 10, 15 ou 18 com 2 de vantagem.
- O 2º toque é a levantada perto da rede, para quem ataca subir.

## Onde
- **Praia** (sala aberta): céu com sol e nuvens, mar com espuma, areia com relevo e pegadas, coqueiros, guarda-sóis,
  quiosque, salva-vidas, calçadão em ondas e os prédios da orla.
- **Arena coberta** (sala fechada): tanque de areia, refletores no teto de treliça, arquibancada, placas de LED e o
  telão com o placar.
- **A câmera** fica alta, atrás do seu time, vendo a quadra inteira, e acompanha o atleta.

## Arquitetura (pedida no PR)
- **`public/futevolei/atleta.js`:** é o "FutevoleiPlayer". Ele não cria malha nenhuma.
  - O gancho de skin é `vestir(visual)`: o sistema de skins (`bonecos.js`) monta o visual e o atleta só o pendura no
    próprio transform.
  - As animações saem por gatilhos, como num Animator: `disparar("cabeca")`, `disparar("shark", { estilo })`...
- **Skins melhoradas para a praia:** `makePlayer(..., { praia: true })` deixa os jogadores de camisa de time descalços
  e de regata, com a bermuda na cor do time.
- **Física da bola nova** (não reaproveita a de outros jogos): gravidade, arrasto do ar e efeito.

## Arquivos
- **Novos:**
  - `futevolei.js` (servidor, canal `/futevolei`);
  - `public/futevolei/` (`index.html`, `regras.js`, `atleta.js`, `cenarios.js`, `jogo.js`);
  - `tests/futevolei.test.js`.
- **Mexidos:**
  - `server.js`, `noite.js` (placar da Noite), `vila.js` e `public/index.html` (o prédio, o telhado e o bairro da
    praia);
  - `public/pelada/bonecos.js` (opção `praia`);
  - `package.json`, `tests/salas.test.js` + `salas-esperado.json` (regravado: só entrou o `/futevolei`) e
    `tests/e2e/paginas.spec.js`;
  - `CLAUDE.md`.

## Conferido
- `npm test`: 158 testes, tudo passando (o do Dominó que às vezes falha por tempo passou na repetição).
- `paginas.spec.js`: `/` e `/futevolei/` abrem sem erro.
- No navegador:
  - treino na praia e na arena;
  - uma sala online com robôs (o saque e os toques chegando do servidor);
  - o prédio na Vila;
  - fotos de cada golpe.
