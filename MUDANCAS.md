# Futevôlei: o toque ganha animação em 8 tempos

## O que muda

O mesmo conceito dos golpes do Ginásio, agora no toque do futevôlei. Tudo é só visual e som: as regras, o servidor e o
tempo do toque não mudam.

1. **Carga:** com o toque armado e a bola chegando, a energia junta no ponto do contato: azul fraquinho no passe,
   laranja no ataque e vermelho-fogo, com faíscas chegando de fora e um chiado subindo, no Shark, na bicicleta e no
   voleio. O saque carrega no preparo.
2. **Núcleo:** a bola chutada forte fica com uma aura na cor do golpe e um aro pulsando, que somem quando ela perde
   velocidade.
3. **Rastro:** a fita que já existia ganhou brasas no golpe forte e um fiapo de areia no ataque.
4. **Estouro:** no toque, uma onda de choque no ar e traços de velocidade saindo da bola; no golpe forte, um jorro de
   faíscas. O ataque e o golpe forte têm um congelamento curtíssimo (35 e 60 ms, só no desenho: a bola continua no
   tempo do jogo) e um tranco na câmera.
5. **Reação:** quem defende um ataque do outro time ganha "Defendeu!" (com a velocidade da bola, se ela vinha forte)
   e um anel azul; a bola do ataque que crava na areia do outro lado faz uma onda no chão e treme a câmera.
6. **Som:** cada golpe tem o seu timbre (peito abafado, cabeça seca, letra e calcanhar estalados, o saque, o
   ataque e o estalo forte do Shark/bicicleta/voleio), mais o chiado da carga, o vento da bola forte, o baque da defesa
   e a areia pela força da queda.
7. **Rescaldo:** a bola deixa a marca na areia onde caiu (some devagar), a nuvem de areia sobe e assenta, e a rede
   balança quando a bola bate nela (uma onda que sai do ponto e morre).
8. **Números:** a velocidade do ataque em km/h salta perto da bola (amarelo, laranja com "Pancada!" a partir de 75 e
   vermelho com "Bomba!" a partir de 95), o rally conta ao vivo embaixo do placar (esquenta a partir de 10 toques) e a
   mensagem do ponto diz a velocidade do ataque que fez o ponto.

Com menos movimento no sistema, nada treme, congela ou salta.

## Arquivos

- `public/futevolei/encenacao.js` (novo): `criarEncenacao` e as contas (`pesoDoToque`, `kmh`, `jeitoDaVelocidade`,
  `PAUSA`).
- `public/futevolei/jogo.js`: os ganchos (`Enc`), o hit-stop no laço e os sons novos do `Som`.
- `public/futevolei/cenarios.js`: a rede com malha que balança (`balancarRede`).
- `public/futevolei/index.html`: `#hVel` e `#hRally` e o estilo deles.
- `tests/futevolei-encenacao.test.js` (novo), `CLAUDE.md`.

## Testes

- `tests/futevolei-encenacao.test.js` e `tests/futevolei.test.js` passando.
- Conferido no navegador num treino contra robôs: a velocidade (42 a 57 km/h nos ataques dos robôs), o rally, a aura,
  a onda de choque e a marca na areia aparecem, sem erro novo na página. O E2E não foi rodado.
