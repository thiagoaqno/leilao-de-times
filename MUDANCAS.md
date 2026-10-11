# Carreira: ler o jogo (tática contra o rival, cansaço que pesa, lances com situação)

## O que muda no jogo

A carreira virava um ciclo de "escala, joga, escolhe o maior número". Três peças para a bola rolar com mais cabeça:

- **Tática contra o rival.** A prévia do jogo na Sede ganhou a **Leitura do rival**: como o adversário joga (formação e estilo, também o do amigo na sala), a força dele, os craques e o que a SUA formação rende contra ele (por exemplo: "mais gente no meio", "os pontas esbarram na linha de 5", "contra-ataque contra tiki-taka"). Os botões de **Respostas melhores** trocam a formação na hora. Na parada tática do jogo, a prancheta mostra o mesmo, e a conta muda a cada formação ou estilo que você escolhe. Vale no motor: o confronto soma até ±12% nos lances que cada time cria (e ±8% na conversão).
- **Cansaço que pesa de verdade.** Até 90% de energia o jogador rende a nota; abaixo disso, cada 10 pontos de energia tiram 1 ponto de nota (até 6). Vale na hora de escalar, na prancheta e minuto a minuto durante o jogo: quem chega cansado já entra abaixo, e o time desgastado perde força no fim. A prancheta, os cartões e o aviso antes do jogo mostram o desconto.
- **Lances com situação.** Nos lances decisivos de ataque e de defesa aparece "Leia o lance" (zaga sem fôlego, zagueiro de amarelo, goleiro adiantado, linha alta, o seu craque esgotado...). O número mostrado continua sendo o da força de quem está no lance; a situação muda a chance de verdade, e as opções que ela favorece (▲) ou atrapalha (▼) ficam marcadas. Só olhar o maior número já não basta.

## Como

`taticas.js`: `penalidadeEnergia`, `confronto` (regras por contagem de vagas, com memória) e `respostas`. `motor.js`: `cansaco` entra em `valorNa` e no `fit`; `confrontoDe` multiplica a chance dos lances e a conversão; `situacoesDoLance`/`situacaoDoLance`/`comSituacao` guardam a chance `real` (que não vai para a tela) e o pedido da parada leva `rival` e `confronto`. `carreira.js`: `leituraDoRival` (usa `fichaDoTime`) em `estado().rival`. Tela: `leituraRivalHTML` (`sede-hub.js`), `rivalDaParadaHTML` e as setas do lance (`partida.js`), `penalidadeCansaco` (`inicio.js`, `elenco.js`, `popups.js`). Testes em `tests/carreira-leitura.test.js`.

Fica para as próximas fatias: entrevistas coletivas e pressão da torcida, viagem e recepção nos jogos fora, mercado de técnicos e personalidade dos jogadores.
