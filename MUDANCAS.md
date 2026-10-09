# Carreira: ajustes de jogo (impulso, formação, pós-jogo, cansaço no canto) e escudos da TheSportsDB

## Defesa arriscada compensa
- Nos lances de defesa, quem escolhe a opção mais arriscada (menor chance de evitar o gol) ganha um **impulso**: se der certo, a chance do seu próximo lance de ataque
  sobe (por uns 10 minutos). Cada opção mostra o bônus: bloco baixo +4%, linha de impedimento +32%, mano a mano +36%, contra-ataque +63%. Ficou parecido na conta: o bloco baixo
  é o seguro, e as outras valem o risco. Em dois técnicos humanos funciona igual.
- O pop-up do lance explica o impulso e, quando ele está valendo, diz no ataque que "já inclui +X% do impulso da sua defesa".

## Correções
- **Formação no meio do jogo:** trocar a formação na parada agora refaz o campinho **na hora**, com os mesmos jogadores que estão em campo (sem o expulso) cada um na vaga em que rende mais.
  (O desenho estava usando a formação antiga.) As vagas abertas ocupadas depois da troca valem no desenho novo.
- **Pós-jogo do jogo certo:** o pop-up só abre com o pós-jogo do jogo que acabou de terminar. Se o estado novo ainda não chegou (principalmente na sala), ele espera em vez de
  mostrar o da rodada anterior. O título agora diz de que jogo é ("Brasileirão Série A · rodada 4", "Libertadores · fase de grupos, rodada 2", "Copa do Brasil · quartas de final"),
  e não mais o número do jogo do clube, que contava as copas e não batia com a rodada da liga.
- **Cansaço no canto da carta:** o −1, −2 ou −3 aparece em cima, à direita, na carta do campinho e no banco.

## Escudos da TheSportsDB
- Os escudos agora vêm da **API da TheSportsDB** (chave gratuita de teste): `tools/baixar-escudos.js` achou o escudo de 141 dos 142 clubes e gravou os endereços em
  `public/carreira/escudos-api.js` (a página não chama a API a cada abertura). O escudo desenhado continua por baixo: aparece enquanto a imagem carrega e no lugar dela se faltar
  (hoje só o Nottingham Forest, que a busca da API não acha) ou se não houver internet. Para atualizar: `node tools/baixar-escudos.js`.

## Conferido
- `tests/carreira-ajustes.test.js`: os bônus das opções de defesa (quanto menor a chance, maior o bônus), o contra-ataque fazendo e levando mais gols que o bloco baixo, a formação trocada com
  um jogador a menos (os mesmos 10 em campo e a vaga aberta ocupada no desenho novo), o pós-jogo do jogo certo com o rótulo e o arquivo de escudos.
