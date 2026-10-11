# Carreira: os atributos passam a contar nas partidas

## O que muda no jogo

Antes, só a nota e a finalização mexiam no resultado: ritmo, drible, passe, marcação e físico ficavam de enfeite. Um ponta de ritmo saía prejudicado frente a um ponta de finalização e físico de mesma nota, porque a finalização pesava duas vezes e o ritmo, nenhuma. Agora cada função tem o seu perfil de atributos e o jogador rende pelo que a vaga pede.

- **Medido antes (6 mil jogos por teste, nota igual, +15 em cada atributo dos titulares):** nos atacantes, só a finalização mudava o saldo (+0,5 gol por jogo); ritmo, drible, passe, defesa e físico davam 0,00. No meio e na defesa, igual: a defesa dos zagueiros e laterais não tinha efeito algum. O ponta de ritmo perdia por cerca de 0,4 gol por jogo para o ponta de finalização e físico (nota igual e perfis de mesmo valor na função).
- **Rendimento por função:** a nota do jogador na vaga ganha ou perde até 8 pontos (60% do desvio) conforme o perfil da função: ponta = drible, ritmo e finalização; centroavante = finalização, físico, ritmo e drible; meia = passe, drible e finalização; volante = marcação, físico e passe; zagueiro = marcação e físico; lateral = marcação, ritmo e drible; goleiro = luvas. A escalação automática, o olheiro e a prancheta usam esse rendimento.
- **Finalização e luvas na conversão** bem mais leves (0,03 para 0,006 e 0,012 por ponto), porque já entram no rendimento: antes a finalização contava em dobro.
- **Depois:** o ponta de ritmo contra o de finalização e físico fica em 0,08 gol por jogo de diferença (era cerca de 0,4); +15 de ritmo nos atacantes vale +0,10 gol por jogo, +15 de marcação nos defensores +0,18, +15 de finalização +0,20 (era +0,5), goleiro +15 em luvas +0,29. A calibragem geral (2,5 gols, mandante 46%) não muda.
- **As porcentagens dos lances decisivos conferem:** medi cada opção em 2 mil jogos e a chance mostrada bate com a que sai (ex.: driblar 23,4% mostrado, 23,1% real). Agora há um teste que garante isso.

## Como

- `public/carreira/motor.js`: `PERFIL_VAGA`, `DESVIO` e `ajusteDePerfil` (usado em `valorNa`), `AJUSTE.PERFIL`, `AJUSTE.FIN` e `AJUSTE.GOL`; `prepararJogador` guarda `base` (a nota da base, sem evolução nem efeitos) e `temAtr`; sem atributos, o jogador rende só a nota.
- `carreira.js`: `comNota` e `timeDe` mandam `base` (a evolução e os efeitos continuam valendo inteiros, só o perfil muda o rendimento).
- Testes novos em `tests/carreira-motor.test.js` (atributos contam, ritmo contra finalização e físico, peso da finalização e as chances mostradas).
