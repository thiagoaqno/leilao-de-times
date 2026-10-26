# Corrida: as pistas do calendário de F1 de 2026, convertidas de bacinger/f1-circuits

Um conversor dos circuitos do repositório [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) (GeoJSON, licença MIT) para o nosso formato de pista, e as 19 pistas do calendário de 2026 que ainda não tínhamos. Mônaco, Interlagos, Barcelona, Silverstone, Monza e as de fantasia não mudaram.

## O conversor: `ferramentas/circuitos-f1.js`

`node ferramentas/circuitos-f1.js be-1925 --id spa --nome "Spa-Francorchamps"` baixa `circuits/<id>.geojson` e imprime o bloco da pista para colar em `pistas.js`. Funciona com qualquer arquivo do repositório (ou `--arquivo` local):

- projeta as coordenadas em metros e escolhe o tamanho da volta pelo comprimento real (13 mil + os metros acima de 4,3 km: Spa fica com 15,5 mil);
- passa uma spline pelos pontos reais e **afasta os trechos que encostariam** (a nossa pista é bem mais larga que a real) e abre as curvas fechadas demais;
- põe no quadrado de 1600, simplifica em vértices `[x, y, raio]` (reta = 0, curva = o raio que casa com a curva real) e deixa a linha de chegada no vértice 0, com `largada` apontando para ela (anda um pouco para a frente se o grid de 20 não couber);
- `hills` com a **altitude real** de 100 pontos da volta (API de elevação do Open-Meteo);
- acha onde a pista passa por cima de si mesma (`cruza`, o oito de Suzuka) e confere trechos encostados, curva mais fechada e grid, como o teste de robôs;
- `--svg` desenha o traçado para conferir; `--rua`, `--volta`, `--raio-min`, `--tol`, `--sem-relevo`, `--inverter`.

A licença MIT e o crédito estão no cabeçalho dos traçados convertidos em `pistas.js` e no próprio conversor.

## As pistas novas (na ordem do calendário)

Melbourne, Xangai, Suzuka, Bahrein, Jeddah, Miami, Montreal, Red Bull Ring, Spa-Francorchamps, Hungaroring, Zandvoort, Madri, Baku, Singapura, Austin, Cidade do México, Las Vegas, Catar e Abu Dhabi.

- **Traçado** convertido (75 a 156 vértices), com `f1: true` (luz de freio e faíscas do carro de F1), `boxes` e `drs` calculados pela geometria (o lado de dentro e as duas retas mais compridas). Xangai usa `scale` 2,8 em vez dos 2,42 do conversor: o caracol e o grampo deixavam a volta lenta demais.
- **Relevo real**: Spa com 97 m de diferença (Eau Rouge embaixo, Les Combes no alto, Stavelot no fundo), Red Bull Ring 68 m, Suzuka 48 m, Hungaroring 40 m, Baku 36 m...
- **Suzuka** passa por cima de si mesma: a reta de trás ganha uma ponte 52 acima do trecho depois da Degner (`cruza` em `pistas.js`; `pista.js` baixa o chão em volta do trecho de baixo com `tr.sobPonte`; `gps/suzuka.js` desenha o tabuleiro, as muretas e os pilares).
- **Cores** em `cena.js` (`LOOK`) e `pista.js` (`THEMES`) e o céu em `ceu.js`, reaproveitando as fotos que já existem pelo clima de cada lugar (o pôr do sol para Singapura, Las Vegas e Abu Dhabi, o deserto para Bahrein, Jeddah e Catar).
- **GP simples** em `gps/<id>.js`, com a peça nova do kit `kit/gp-simples.js` (`gpSimples(id, opções)`): asfalto de GP, zebras, grid, brita do lado de fora das curvas, a tribuna da reta, o prédio dos boxes, painéis, bandeira do país, passarela e som de campo; nas de rua (`rua: true`: Baku, Singapura, Jeddah e Las Vegas, com `walls`), sarjeta, guard-rail com os painéis, postes e som de cidade. Montanha onde há serra (os Alpes no Red Bull Ring, o Popocatépetl no México, Guadarrama em Madri, as Spring Mountains em Las Vegas, os montes de Suzuka, o Mont Royal), a floresta das Ardenas em Spa (`parque`) e a torcida laranja em Zandvoort. O cenário fino de cada uma fica para depois.
- Duas chaves novas lidas por `pista.js` (e na tabela do `kit/README.md`): `beira` (árvores, palmeiras, prédios e prédios de vidro da beira e de longe; antes, pista sem tema caía nos neons de Tóquio) e `horizonte` (`false` tira os morros de longe; `{ cor }`).

## Conferido

- Só os testes da Corrida: `node --test tests/corrida*.test.js`, 64 passando (as 19 pistas novas entraram em `tests/corrida-robos.test.js` e `tests/corrida-f1-box.test.js`; o teste dos trechos encostados deixa passar o cruzamento de Suzuka). O `npm test` completo não foi rodado.
- No navegador do app com `#debug`: as 19 montam (`__corrida.buildTrack`) e largam numa sala com robôs, sem erro no console; Mônaco continua montando. As fotos foram tiradas na largada (e no trecho de Suzuka depois da Degner); a volta inteira foi conferida pelo teste de robôs.

## Faltou

- Imola não está no calendário de 2026; Sepang (que o arquivo de 2026 do bacinger lista) ficou de fora.
- As corridas noturnas (Singapura, Las Vegas, Bahrein, Jeddah, Catar, Abu Dhabi) estão de dia ou no fim da tarde.
- O cenário fino de cada pista (prédios dos boxes próprios, marcos, marcas locais em `kit/marcas.js`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
