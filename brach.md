# Carreira F1, PR 1: a corrida de F1 completa

Primeiro dos 5 PRs grandes da Carreira F1 (a nova divisão está em `planos/temporada-f1.md`). Tudo vale só com as regras de F1 ligadas na sala (`config.regras === "f1"`); sem elas, a corrida continua como antes.

## O que entrou nesta branch

- **Direção de prova no servidor** (`corrida-f1-direcao.js`, novo): bandeira amarela por setor (sorteada pela semente do GP, com um robô saindo da trajetória), safety car (fila na ordem, sem ultrapassar, relargada), limites de pista com advertência e penalidade, e +5 s para quem ultrapassa sob bandeira e não devolve a posição. O navegador só recebe o estado (`S.direcao`) e aplica o teto de velocidade.
- **DRS clássico:** zonas de detecção e abertura em `pistas.js` (`drs`), abre só a menos de 1 s de quem está na frente na detecção, fecha com freio, com bandeira amarela e com safety car; placas das zonas na pista (`pista.js`).
- **ERS:** bateria que carrega na frenagem e no embalo e gasta para atacar; automático ou manual (tecla e botão "ERS"), com a barra no HUD.
- **Pneus mudando o carro:** além da aderência nas curvas, o composto e o desgaste agora mexem na velocidade final, na tração (pneu frio patina na largada) e na frenagem (`F1Regras.aderencia` → `final`, `tracao`, `freio` em `fisica.js`); os robôs também (`corrida-robos.js`).
- **Robôs:** usam DRS e ERS e respeitam bandeiras e safety car; a estratégia de box de cada um continua a de `estrategia()`.
- **HUD:** o painel com a situação da pista (pista livre, amarela, safety car), o DRS (disponível, aberto, indisponível) e a barra do ERS; botões "Box" e "ERS".

## Testes

- Só os da Corrida: `node --test tests/corrida*.test.js`, 50 passando, com o novo `tests/corrida-f1-drs-ers.test.js` (zonas de DRS, carga e uso do ERS, direção de prova) e `tests/corrida-f1-box.test.js` ajustado.
- No navegador: uma corrida de 5 voltas em Interlagos com 8 robôs e regras de F1, com o HUD de pista, DRS e ERS na tela.

## O que fica para os próximos PRs

- Conferir numa corrida inteira que os robôs param em voltas diferentes com estratégias diferentes (o código já existia; não foi medido de ponta a ponta aqui).
- PR 2: classificação, grid de 20, as cinco luzes e os pilotos reais de 2026. PR 3: a construção do carro com o orçamento de cada equipe.
