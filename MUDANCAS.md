# Ginásio: motor da Fase 1

## Como fica
- O plano do Ginásio entrou no repositório em `planos/ginasio.md`, junto com o plano de carreira em `planos/carreira.md`.
- O Codex agora também lê as regras do projeto: `AGENTS.md` manda seguir o `CLAUDE.md`.
- O Ginásio ganhou o primeiro motor compartilhado em `public/ginasio/regras.js`, ainda sem tela e sem servidor:
  - cria partidas 1x1 ou 2x2, em Galeramon ou Pokémon;
  - roda a arena vista de cima, com paredes e 4 pilastras que bloqueiam projéteis;
  - transforma automaticamente os golpes em corpo a corpo, projétil, área com aviso, investida, reforço, debuff, cura ou exceção;
  - aplica dano com STAB, tipo, crítico, atributos físicos/especiais, Huge Power e Wonder Guard;
  - tem esquiva com invulnerabilidade curta, troca de bicho, entrada após desmaio, reforços temporários, cura canalizada e fim por nocaute ou tempo;
  - inclui um robô simples que mira, anda para uma distância boa, desvia de projéteis e escolhe golpe com vantagem de tipo.

## Por dentro
- O sorteio com semente foi copiado do simulador para as partidas repetirem igual nos testes.
- `habilidadeDeGolpe` e `habilidadesDoDex` expõem a conversão dos golpes, para o servidor e a futura tela usarem a mesma tabela.
- `criarPartida(config, lados)` monta os times de 3 bichos por jogador e `passo(partida, dt, comandos)` avança o jogo sem depender de DOM ou Socket.io.
- `calcularDano` fica exportado para testes e para ajustes finos da constante de dano.
- `tests/ginasio.test.js` cobre a conversão de todos os golpes dos dois dex, esquiva, vantagem de tipo e partidas inteiras de robô contra robô.

## Conferido
- `node --test tests/ginasio.test.js`: 4 passaram, 0 falharam.
- `npm test`: 51 passaram, 0 falharam.
- Um teste à parte rodou 1000 partidas de robô contra robô sem erro, média de 110,57 s.
