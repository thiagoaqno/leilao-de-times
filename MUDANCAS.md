# Ginásio: os golpes ganham animação em 8 tempos

## O que muda

Cada golpe de Pokémon e Galeramon passa por 8 tempos, cada um no jeito da família do tipo (fogo, água, raio, gelo,
planta, pedra, psíquico, fantasma, veneno, aço, voador, lutador, fada, dragão, sombrio, inseto, terra e normal):

1. **Carga:** a energia junta em quem vai atacar: as partículas vêm de fora para dentro (subindo no fogo, em espiral
   na água e no psíquico, faiscando no raio), o brilho cresce na boca e o anel no chão fecha. Nos golpes com preparo
   (feixe, sopro, agarrão), a carga dura o preparo inteiro, cada vez mais forte, e acende o chão.
2. **Núcleo:** todo projétil ganhou um miolo branco-quente que pulsa por dentro do desenho do tipo.
3. **Rastro:** uma fita na cor do tipo fica atrás do projétil (e de quem avança na investida), afinando e sumindo.
4. **Estouro:** o impacto do jeito da família: línguas de fogo, coroa de gotas, estrela de raios, estilhaços de
   gelo, entulho, folhas em redemoinho, anéis de energia, fumaça escura (com o corte em lua no sombrio), gosma, faíscas
   de metal, rajadas de vento e o "pow" do soco, com a onda no chão. Os golpes de perto, o feixe, o sopro, o tremor e
   a onda agora também estouram em quem apanhou.
5. **Reação:** quem apanha pisca branco e depois na cor do golpe, treme e fica um instante com o efeito do tipo em
   volta (queimando, molhado, eletrizado, congelado, envenenado, assombrado, tonto...). No acerto, os dois bichos
   congelam por um instante (hit-stop, mais longo no golpe forte) e a câmera treme mais no crítico e no super efetivo.
6. **Som:** cada família tem o seu timbre (rugido do fogo, respingo da água, estalo do raio, tilintar do gelo, baque
   da pedra e da terra, o eco do fantasma, o metal do aço...), em três momentos: carga, disparo e impacto. O super
   efetivo toca um sobe-sobe, o pouco efetivo um tom caído e o crítico um estalo. Rajadas e combos não viram barulho.
7. **Rescaldo:** depois do impacto, o chão fica com o resto por um ou dois segundos: chaminhas e fumaça no fogo,
   cristais que derretem no gelo, pedrinhas que afundam na pedra e na terra, poça respingando na água, faíscas no
   raio e no aço, folhas e penas caindo, bolhas no veneno e brilhos no psíquico e na fada.
8. **Números de dano:** saltam passando do ponto e assentam, sobem de lado e somem. Laranja e maiores no super
   efetivo, cinza e menores no pouco efetivo, amarelo e tremendo no crítico, azul no bloqueado, "Imune" quando não
   pega, com a legenda embaixo. Golpes seguidos no mesmo bicho (rajada, combo, redemoinho) somam no mesmo número com
   "×3"; números ao mesmo tempo no mesmo bicho vão em degraus, sem cobrir um ao outro.

Os jutsus do Naruto continuam com os desenhos deles; neles valem a reação, o som e os números. Com menos movimento no
sistema, nada treme, salta ou congela.

## Arquivos

- `public/ginasio/encenacao.js` (novo): os 8 tempos (`TEMPOS`, `REACAO`, `encenarEvento`, `encenarQuadro`,
  `desenharNumeros`).
- `public/ginasio/sons.js`: `somDoTempo` e os timbres por família (ruído filtrado e tons).
- `public/ginasio/animacao.js`: o hit-stop, a piscada na cor do golpe (`silhuetaColorida`) e mais partículas (420).
- `public/ginasio/golpes3d.js`, `golpes.js`, `desenho.js`, `rede.js`, `marcas.js`, `index.html`: os ganchos.
- `public/ginasio/regras.js`: o evento `dano` leva o tipo e o jeito do golpe.
- `tests/ginasio-encenacao.test.js` (novo), `CLAUDE.md`.

## Testes

- `tests/ginasio-encenacao.test.js`: toda família tem os tempos, os números somam e separam como devem, cor e
  legenda por efetividade, a piscada e o hit-stop, e o limite do rescaldo.
- `tests/ginasio.test.js`, `tests/ginasio-fisica.test.js`, `tests/ginasio-servidor.test.js` e
  `tests/ginasio-marcas.test.js` passando. `tests/salas.test.js` falha no canal `/carreira-online` igual na `main`.
- Conferido no navegador: carga do Hyper Beam, Shadow Ball e Fire Blast com números de crítico e super efetivo,
  rajada do Volt Switch, investida e rescaldo, sem erro na página. O E2E não foi rodado.
