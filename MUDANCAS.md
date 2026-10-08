# Carreira: a base do EA FC 27

A Carreira de Treinador trocou a base do EA FC 26 pela do EA FC 27 (temporada 2026/27).

## De onde vêm os dados
- **O CSV:** `dados/ea_fc27/ea_fc27_players.csv`, o conjunto "EA SPORTS FC 27 Player Ratings" do Kaggle, que é a API
  oficial de notas da EA, com foto tirada em 12/09/2026. Tem 19.789 jogadores, 17.849 deles no futebol masculino.
  - O `README.md` do conjunto vem junto.
  - O `dados/ea_fc26/` saiu.
- **As colunas mudaram de nome** (`player_id`, `overall_rating`, `club`, `league`...). A ferramenta traduz para os nomes
  de antes (`jogadoresDoCSV`) e fica só com o futebol masculino (o arquivo traz as ligas femininas também).
  - Altura e peso ainda vêm vazios (a EA não publicou), mas a Carreira não usa.
- **A Libertadores e a Sul-Americana** se chamam "CONMEBOL Libertadores" e "CONMEBOL Sudamericana" no CSV novo.

## O que mudou no mundo
- **Subidas e quedas de 2026/27:**
  - **Premier League:** saem Burnley, West Ham e Wolves; entram Coventry, Hull e Ipswich.
  - **La Liga:** saem Girona, Mallorca e Real Oviedo; entram Málaga, Racing de Santander e Deportivo La Coruña.
  - **Serie A:** saem Cremonese, Hellas Verona e Pisa; entram Frosinone, Monza e Venezia.
  - **Bundesliga:** saem St. Pauli, Heidenheim e Wolfsburg; entram Schalke, Paderborn e Elversberg.
  - **Ligue 1:** saem Metz e Nantes; entram Troyes e Le Mans.
- **Sul-americanos da Libertadores:** entram, entre outros, Junior, Tolima, Independiente Medellín, Santa Fe,
  Universidad Católica e Coquimbo. Saem Colo-Colo, Atlético Nacional, Universidad de Chile, Alianza Lima, Olimpia e
  outros. Continuam 32 clubes, sem repetir.
- **Todo clube novo tem sigla, estádio e cores.** As nacionalidades novas (Quênia, Iraque, Tailândia...) foram
  traduzidas.
- **O Racing uruguaio saiu** (ele não está no FC 27). O Racing argentino continua `racing-club-argentina`, e o Racing
  de Santander não se confunde com ele.
- **O Brasileirão continua** sendo a base brasileira estimada (o FC 27 só tem o Bahia), recalibrada na escala do
  FC 27: ajuste de −1.
- **As médias dos 11 melhores por liga** ficaram parecidas com as do FC 26 (por exemplo, Premier League de 80,4 para
  80,3).

## As carreiras antigas
- Os saves apontam para a base pelos ids de clube e de jogador. Com a base nova, uma carreira do FC 26 apontaria para
  clubes que caíram e para jogadores trocados.
- Por isso a `VERSAO` dos saves subiu para 2.
  - Quem abre uma carreira antiga recebe: "Essa carreira é da base antiga (EA FC 26). A Carreira agora usa o EA FC 27:
    comece uma carreira nova." Isso vale para entrar, para o código de recuperação e para qualquer ação.
  - As salas de carreira em grupo que já tinham começado no FC 26 são apagadas ao carregar.

## Arquivos
- `dados/ea_fc27/` (novo) e `dados/ea_fc26/` (saiu);
- `ferramentas/base-mundo.js`;
- as bases geradas em `public/carreira/base/*-2026.js`;
- `carreira.js` (a versão e a mensagem);
- `carreira-online.js` (as salas antigas);
- `public/carreira/inicio.js` (o texto e a mensagem);
- os testes `tests/carreira-base.test.js` (os homônimos) e `tests/carreira-temporada.test.js` (a semente que leva o
  Flamengo à final da Libertadores mudou para `calendario-1`);
- `CLAUDE.md`.

## Conferido
- Os 74 testes da Carreira (`tests/carreira*.test.js` e `tests/bd.test.js`) passam.
- Os 7 testes no navegador da Carreira (`carreira.spec.js` e `paginas.spec.js`) passam, inclusive celular e grupo.
- Num servidor de verdade, uma carreira nova com o Coventry funciona, e um save de versão 1 recebe a mensagem ao
  entrar e ao recuperar.
