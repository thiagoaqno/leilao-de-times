# Carreira: as fotos das notícias com os escudos da API

- **Todas as artes das notícias agora usam os escudos da TheSportsDB** (os mesmos do resto da carreira). Antes, a arte era desenhada primeiro com o escudo feito à mão e ficava guardada assim: quando a imagem da API chegava, a notícia já estava pronta e não era refeita. E a imagem vinha direto do site da TheSportsDB, que pode bloquear o canvas; aí a arte nunca usava o escudo novo.
- **As cenas sem escudo ganharam o do clube no canto** (gol, lesão, cartão, festa, treino, vestiário, balada, protesto, seleção...), como a marca do perfil que posta.
- Os clubes que não estão na API (os argentinos e outros sul-americanos, a Série B) continuam com o escudo desenhado.

## Como

- `server.js`: `GET /api/escudo/:id` baixa o escudo do clube (`escudos-api.json`, versão `/small`) uma vez, guarda na memória e serve do nosso endereço, com cache de 7 dias no navegador. Clube fora da lista dá 404; se a TheSportsDB não responder, 502 (e tenta de novo no próximo pedido).
- `public/carreira/feed.js`: `escudoDaArte` pede `/api/escudo/<id>`; enquanto a imagem da API não chega (`esperando`), a arte sai com o escudo desenhado mas não é guardada, e `refazerArtes` troca quando ela fica pronta. Se não abrir, fica o desenhado. `artePost` põe o escudo no canto das cenas que não desenharam nenhum (`comBrasao`). O post compacto também ganhou `data-arte`, para ser refeito.
- `tests/e2e/carreira.spec.js`: teste novo com um escudo de mentira entregue com atraso, conferindo que a arte da apresentação é refeita com ele.
