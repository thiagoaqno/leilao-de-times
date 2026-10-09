# Carreira: os escudos dos 96 clubes europeus refeitos à mão

Depois dos brasileiros, as cinco ligas europeias ganham o mesmo cuidado: cada clube com as suas cores e um elemento que
lembra o escudo, sem copiar o desenho de verdade. Nenhum dos 96 se repete.

## Premier League (20)
Bournemouth, Arsenal (o canhão), Aston Villa (a coroa), Brentford, Brighton, Chelsea, Coventry, Crystal Palace, Everton (a
torre), Fulham, Hull City (as listras de tigre), Ipswich, Leeds, Liverpool (a chama), Manchester City, Manchester United,
Newcastle, Nottingham Forest (a árvore), Sunderland e Tottenham (a bola).

## La Liga (20)
Alavés, Athletic Club, Atlético de Madrid (as sete estrelas), Osasuna (a cruz), Celta, Deportivo, Elche, Barcelona (a
faixa dourada e o azul-grená), Getafe, Levante, Málaga (a torre), Racing, Rayo (o raio), Espanyol, Betis, Real Madrid (a
coroa), Real Sociedad, Sevilla, Valencia (o morcego) e Villarreal (o submarino amarelo).

## Serie A (20)
Roma (SPQR), Atalanta, Bologna, Cagliari, Como, Fiorentina (a flor-de-lis), Frosinone, Genoa, Inter (redondo, com o FCIM),
Juventus (as duas estrelas), Lazio (a estrela), Lecce, Milan, Monza, Parma (a cruz azul), Sassuolo, Napoli (o N), Torino (o
touro), Udinese e Venezia.

## Bundesliga (18)
Köln, Mainz (o 05), Leverkusen (o 04), Dortmund (BVB 09), Gladbach, Frankfurt, Elversberg, Augsburg, Bayern (redondo, com os
losangos), Hamburgo (o losango azul), Paderborn, Leipzig (RB), Freiburg, Schalke (S04), Werder (o W redondo), Hoffenheim,
Union Berlin e Stuttgart (o V vermelho).

## Ligue 1 (18)
Auxerre, Angers, Monaco (a diagonal e a coroa), Lorient (a âncora), Le Havre, Le Mans, Lille (a flor-de-lis), Lyon, Nice,
Marseille (OM), Paris FC, PSG (redondo, com a torre Eiffel), Lens, Brest (o 29), Rennes, Strasbourg, Toulouse (a flor) e
Troyes.

## Peças novas
- Camadas: `cruz`, `chevron`, `metade` e `losangos`.
- Símbolos: `canhao`, `chama`, `torre`, `arvore`, `morcego`, `submarino`, `flordelis`, `flor`, `touro` e `eiffel`.
- Os clubes da Argentina e os sul-americanos seguem com o desenho automático (a receita da base, com um de 7 jeitos).

## Conferido
- `npm test`: 176 de 176. O e2e da carreira não foi rodado (a mudança é só o desenho dos escudos).
- Folhas de contato das cinco ligas no navegador, sem erro no console. Fotos: `planos/imagens/carreira-escudos-*.png`.
- `tests/carreira-base.test.js`: os 96 europeus têm desenho próprio, nenhum desenho sobra sem clube, e nenhum clube repete o
  desenho de outro.
