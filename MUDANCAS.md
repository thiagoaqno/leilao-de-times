# Carreira online: o plano e a base do EA FC 26

Este PR não mexe no jogo. Ele só prepara a carreira online em grupo: o plano e os dados que o PR 1 do plano vai usar.

## O que entra
- **`planos/carreira-online.md`:** o plano em 8 PRs, com as decisões já tomadas:
  - notas do EA FC 26;
  - clube europeu jogável (joga a liga dele);
  - Mundial com 4 clubes;
  - de 1 a 5 temporadas;
  - aporte de até R$ 1 bi;
  - rodada ao vivo para todos, mercado disputado e olheiro.
- **`dados/ea_fc26/`:** os três CSVs do EA FC 26, para quem for fazer os PRs receber tudo pelo git.

| Arquivo | Conteúdo |
| --- | --- |
| `ea_fc26_players.csv` | 16.228 jogadores, todas as colunas (este é o que o PR 1 usa) |
| `ea_fc26_outfield.csv` | Só os jogadores de linha |
| `ea_fc26_goalkeepers.csv` | Só os goleiros |

## O que já foi conferido no CSV (está no plano)
- **Não tem nenhum clube brasileiro** (o EA FC 26 não tem a licença do Brasileirão). A Série A continua na base de hoje,
  calibrada na escala do CSV.
- **Tem:**
  - as 5 grandes ligas completas: Premier League, LaLiga, Serie A, Bundesliga e Ligue 1 (96 clubes);
  - a liga argentina (30 clubes);
  - 19 clubes sul-americanos em "Libertadores" e 19 em "Sudamericana".
- **Nomes trocados na Itália:** Lombardia FC é a Inter, Milano FC é o Milan, Latium é a Lazio e Bergamo Calcio é a
  Atalanta.
- **Nomes repetidos:** dois "Racing Club" e dois "Nacional". A chave do clube é a liga mais o nome.
- **Datas em dois formatos:** M/D/AAAA num arquivo e ISO nos outros.

## Atenção
- As notas e os atributos são do EA FC 26 e ficam visíveis no repositório público. O Thiago decidiu assim.
