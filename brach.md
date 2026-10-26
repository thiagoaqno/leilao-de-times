# Carreira F1: batidas com punição e dano, box com três tempos e robôs mais espertos

Tudo vale só com as regras de F1 ligadas na sala (`config.regras === "f1"`); sem elas, nada muda (as caixas, o pelotão e os robôs do modo arcade seguem como estavam).

## O que entrou nesta branch

- **Batidas: punição e dano.** Cada batida (no muro, no guard-rail ou em outro carro) tem uma força, a velocidade de aproximação (`hit` em `fisica.js`; `baterNoOutro` em `colisao.js` para os carros). `F1.batida(forca)` (em `f1-regras.js`) diz o nível: abaixo de 50 é só encostão; de 50 a 110, leve (+1 s); de 110 a 180, média (+2 s); a partir de 180, forte (+5 s). O dano é proporcional à força (0,12% por unidade, com teto em 360), acumula, e o carro danificado anda pior: até 15% menos de velocidade final e 20% menos de aderência (`F1.efeitoDoDano`, em `fisica.js` e nos robôs). Em 100% é **perda total**: o carro para, o piloto sai da corrida e aparece como DNF no resultado, sem pontos.
- **O servidor manda.** O navegador manda o `act` `batida` com a força e o tipo; o servidor segura o intervalo entre batidas (1,2 s, para o mesmo toque não contar duas vezes), limita a força pelo carro e pela velocidade da última posição, e a batida com outro carro só vale com alguém perto. `Direcao.bater` (`corrida-f1-direcao.js`) soma a punição em `p.acrescimo` (como o pit stop), acumula `p.dano`, anuncia no log da direção de prova e decide a perda total (a corrida também acaba se os que ainda corriam foram todos destruídos). O estado público ganhou `dano`, `dnf` e `ultimaBatida`.
- **HUD.** A barra "DANO" fica acima do anel do pneu (verde, laranja e vermelha), o aviso "Batida média: +2 s · dano +14%" aparece na hora, a tela de perda total diz que o piloto está fora e o resultado do GP mostra "DNF" e o dano de cada um.
- **Box com três tempos.** `tempoDeParada` agora sorteia, pela semente do GP, 2,0 s (perfeito, 25%), 2,7 s (normal, 55%) ou 3,3 s (ruim, 20%): mesma semente, mesmo resultado. O HUD mostra "Box perfeito · 2,0 s" durante a troca (e no fim da parada), e o log do GP também.
- **IA melhor** (`corrida-robos.js`, só nas regras de F1):
  - *Respeita os carros:* `transito` freia a tempo atrás de quem vai à frente (a velocidade dele mais o que dá para frear até chegar, com uma distância de segurança maior nas curvas fechadas), não vai para cima de quem está ao lado e só ultrapassa na reta (ou diante de um carro parado), pelo lado livre, até deixar o outro para trás.
  - *Traçados variados:* cada robô tem o seu jeito (`ia.estilo`, sorteado pela semente do GP): mais por dentro ou por fora das curvas, mais para um lado da linha, freando mais cedo ou mais tarde.
  - *Sem derrapar:* a velocidade de curva e a frenagem levam em conta o pneu, o ar sujo de quem vem colado, o vácuo na reta (o mesmo ganho aerodinâmico de quem joga) e o dano.
  - *Erros realistas:* de vez em quando (mais no fácil e nos pilotos menos constantes) o robô trava a roda na frenagem e sai largo da curva; raramente chega a bater no muro. Os erros só custam tempo: a velocidade nunca passa do carro, e o ritmo continua o do nível.
  - *Batem como os outros:* o servidor mede o contato dos robôs entre si e com os humanos (`contatos`, os mesmos três círculos de `colisao.js`), e eles também levam punição e dano. Usam o DRS, o ERS e a estratégia de box que já existiam.

## Testes

- Só os da Corrida: `node --test tests/corrida*.test.js`, 74 passando, com o novo `tests/corrida-f1-dano-ia.test.js`: a punição e o dano por força, o teto do dano, o efeito do dano no carro, o intervalo entre batidas, a perda total e o DNF no resultado, o servidor de verdade conferindo a batida (sem alguém perto, intervalo, teto de força e perda total), os três tempos de box (mesma semente, mesmo resultado; a distribuição 25/55/20) e a IA (10 robôs numa corrida de F1 no servidor: terminam com poucas batidas e ninguém destruído; fácil mais lento que o médio, que é mais lento que o difícil, sem passar do carro; jeitos diferentes pela semente; para atrás de um carro parado sem encostar). O teste de box antigo deixou de exigir tempos diferentes em duas paradas seguidas, porque com três tempos elas podem coincidir.
- Medi também (fora dos testes) corridas de 15 robôs em 3 voltas em Interlagos, Mônaco, Monza e Silverstone, nos três níveis: de 0 a 4 batidas em Interlagos e de 2 a 9 contatos nas outras, nenhum robô destruído, de 1 a 6 erros por corrida e os tempos de volta dos níveis separados (em Interlagos, mediana de 63,9 s no fácil, 59,6 s no médio e 55,6 s no difícil).
- No navegador do app com `#debug`: uma batida forte no muro (+5 s, dano de 26% no HUD e o aviso), uma parada ("Box normal · 2,7 s" no HUD) e os robôs disputando posição e parando nos boxes ("Box perfeito", "Box ruim" no log), sem erro no console.

## O que fica para os próximos PRs

- A batida entre dois humanos pune os dois (cada navegador manda a sua metade); quem foi atingido por trás leva a mesma punição de quem bateu. Separar "culpado" e "vítima" fica para uma próxima.
- A perda total de um humano deixa o carro parado na pista (os outros desviam dele); não tem safety car por causa disso.
- Em Mônaco, com 15 robôs, ainda tem batidas leves nos pontos mais apertados.
- O PR 3 (equipes e montagem do carro) vai mexer no `spec` do carro; o dano e a IA usam o `spec` que a física já recebe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
