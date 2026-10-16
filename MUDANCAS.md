# Estante de troféus por clube na Carreira

- A tela **Estante** agora mostra uma vitrine de cada clube, com busca, total de títulos e uma prateleira para as taças conquistadas. Inclui clubes controlados pelo computador e seleções da Copa, além do clube do técnico.
- Títulos já concluídos na temporada atual aparecem sem esperar o arquivamento. Ao arquivar a temporada, cada título continua contado uma só vez; resultados futuros não aparecem.
- As fotos das taças vêm do campo `strTrophy` da API da [TheSportsDB](https://www.thesportsdb.com/docs_artwork). O servidor consulta a liga correspondente e guarda o endereço em cache; se a imagem não existir ou falhar, a vitrine usa uma ilustração local. A fonte aparece na própria tela.
- O ranking dos técnicos e as páginas de temporadas anteriores continuam abaixo da vitrine.

## Verificação

- Testes determinísticos de agregação por clube, títulos atuais, ausência de spoilers e não duplicação.
- Testes do mapeamento das competições e validação dos endereços das imagens da API.
