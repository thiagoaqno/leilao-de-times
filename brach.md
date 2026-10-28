# Corrida: Bahrein 2, o salto de riqueza no cenário de Sakhir

Segundo passo do Bahrein (o primeiro foi o #350). O Thiago achou o resultado "singelo", então o cenário foi refeito com mais densidade e fidelidade, guiado pelas fotos de referência (torre de anéis, reta de largada à noite, aérea do paddock e o modelo low poly dos boxes com cobertura em velas). Só aparência: `pistas.js` (traçado e `hills`), física, robôs, regras, HUD, menus, sala e carreira ficaram intocados. O kit 2 (#351) já está no main, então este PR não depende de mais nada.

## O que entrou (peças exclusivas em `public/corrida/kit/bahrein/`)
- `boxes.js`: prédio dos boxes de dois andares cor de areia rosada com portas de garagem (testeira na cor de cada equipe), laje branca com faixa vermelha, andar de vidro e, por cima do prédio inteiro, a cobertura em **velas brancas** enfileiradas (3 fileiras) com os mastros de treliça.
- `torre.js`: a Torre de controle de **anéis azuis** (pódio de pedra, saguão, nove andares de vidro azul com laje mais larga no meio, tambor rosado e coroa de velas com a bandeira do Bahrein), posta no pé do prédio, do lado de dentro da curva 15, como nas fotos.
- `praca.js`: praça de pedra clara em volta da torre, gramados, tendas brancas do paddock com mesas vermelhas, **heliporto**, dois **estacionamentos** com carros, e tamareiras de verdade (tronco cônico e copa de 9 folhas) em fileiras ao longo da reta, em volta da praça e entre as tendas.
- `luz.js`: torres de refletores altíssimas (130 de mastro, cabeça com dois painéis) e, **só de noite**, o brilho dos painéis e a poça de luz no asfalto debaixo de cada uma.
- `escape.js`: o asfalto de escape em **mosaico de triângulos azuis** (com uns verdes e brancos) e o muro de pneus por fora, com pilhas de cilindros de 8 lados (cerca de 100 triângulos por pilha, no lugar dos 430 dos toros do kit).
- `deserto.js`: dunas arredondadas e **dunas em degraus** (3 ou 4 terraços de tons diferentes).
- `reta.js`: mureta branca contínua com a faixa vermelha e a publicidade na reta de largada, **pórtico branco de treliça** atravessando a pista com a faixa "Gulf Air / Bahrain Grand Prix", e a cobertura em velas da arquibancada principal com a fileira de lâmpadas quentes embaixo (a estrutura dourada iluminada da foto 7).
- `base.js`: moldura que acompanha a reta, pintor de caixas/cilindros/velas, regiões (uma malha por material e por região), piso que segue o relevo e a luz da noite (janelas, lâmpadas e poças acendem quando a pista está de noite, por um laço em `tr.animarPista`).
- `bahrein.js` e `gps/bahrein.js` agora só orquestram; a refinaria com o flare ficou onde estava. README do kit e `CLAUDE.md` com uma frase.

## Desempenho
Medido com `tests/ajuda-cena/medir.mjs`: na vista do jogo, 257 mil triângulos (eram 302 mil) e 146 chamadas de desenho (eram 139). O que pagou a riqueza nova foi trocar o muro de pneus (cerca de 100 mil triângulos) por pilhas baratas. Tudo repetido é InstancedMesh ou Montador por região (cor por vértice, sem luz dinâmica nova).

## Conferido
- Conferência de invasão (cena montada no Node) do Bahrein: 0 peças dentro da pista (os pés do pórtico e as poças de luz foram ajustados).
- No navegador (Chrome com WebGL por software), de dia e de noite: reta de largada, prédio dos boxes com as velas, pórtico atravessando a pista, torre, paddock, curva 1 com o mosaico, miolo e reta de trás. Console sem erros.

## Ficou de fora
Fotos e modelos não foram baixados: tudo é código procedural, guiado pelas fotos do Thiago. A arquibancada da curva 1 continua a do kit.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
