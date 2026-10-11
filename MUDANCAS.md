# Carreira: as fotos das notícias com os escudos da API

- **Todas as artes das notícias agora usam os escudos da TheSportsDB** (os mesmos do resto da carreira). Antes, a arte era desenhada primeiro com o escudo feito à mão e ficava guardada assim: quando a imagem da API chegava, a notícia já estava pronta e não era refeita. E a imagem vinha direto do site da TheSportsDB, que pode bloquear o canvas; aí a arte nunca usava o escudo novo.
- **As cenas sem escudo ganharam o do clube no canto** (gol, lesão, cartão, festa, treino, vestiário, balada, protesto, seleção...), como a marca do perfil que posta.
- **A Série B também ganhou os escudos da API**, em todas as telas (tabela, sede, partida, notícias). Como os 20 clubes não estavam no arquivo de escudos, o servidor procura cada um pelo nome na TheSportsDB (só entre os times do Brasil) na primeira vez que alguém pede e guarda.
- Os argentinos e os outros sul-americanos que a API não achou continuam com o escudo desenhado.

## Como

- `public/carreira/escudos-busca.js` (novo, UMD, `window.ESCUDOS_BUSCA`): os nomes com que cada clube da Série B é procurado na TheSportsDB. No servidor, `urlDoEscudo` usa `escudos-api.json` ou faz a busca (uma por vez, com 2,1 s entre elas, por causa do limite da chave gratuita), prefere o time com o mesmo nome e cai no primeiro do Brasil.
- `public/carreira/inicio.js`: `escudoDaApi(id)` diz se o clube tem escudo da API e devolve `/api/escudo/<id>`; o `escudo()` de todas as telas passou a pedir a imagem ao nosso servidor também.
- `server.js`: `GET /api/escudo/:id` baixa o escudo do clube (`escudos-api.json`, versão `/small`) uma vez, guarda na memória e serve do nosso endereço, com cache de 7 dias no navegador. Clube fora das duas listas dá 404; se a TheSportsDB não responder, 502 (e tenta de novo um minuto depois).
- `public/carreira/feed.js`: `escudoDaArte` pede `/api/escudo/<id>`; enquanto a imagem da API não chega (`esperando`), a arte sai com o escudo desenhado mas não é guardada, e `refazerArtes` troca quando ela fica pronta. Se não abrir, fica o desenhado. `artePost` põe o escudo no canto das cenas que não desenharam nenhum (`comBrasao`). O post compacto também ganhou `data-arte`, para ser refeito.
- `tests/carreira-ajustes.test.js`: a lista da Série B tem exatamente os clubes da base e a página carrega o arquivo.
- `tests/e2e/carreira.spec.js`: teste novo com um escudo de mentira entregue com atraso, conferindo que a arte da apresentação é refeita com ele.
