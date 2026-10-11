# Carreira: fotos recortadas dos jogadores nas cartas

## O que muda no jogo

- As figurinhas, o elenco, o mercado, a artilharia e os outros retratos da Carreira mostram o recorte real do jogador quando a TheSportsDB tem uma imagem. O retrato em pixel art aparece primeiro e continua quando não há foto ou a imagem falha.
- As fotos são procuradas só quando aparecem na tela. A busca é feita no servidor, com intervalo entre pedidos, e o resultado fica guardado no SQLite para não repetir a consulta em cada visita.
- O nome da resposta precisa coincidir com o do jogador da base. Para nomes de uma palavra, o clube também precisa coincidir; isso evita mostrar o rosto de um homônimo.

## Como

- `fotos-jogadores.js` consulta `searchplayers.php` da TheSportsDB e expõe `/api/foto-jogador/:id`.
- `migracoes/005-fotos-jogadores.sql` guarda a URL ou a ausência de foto. Resultados com foto vencem em 30 dias; buscas sem foto, em 7 dias.
- `public/carreira/cartas.js` observa os retratos visíveis, carrega o recorte e mantém o retrato desenhado como alternativa. As outras telas usam o mesmo componente; a arte das notícias continua usando o retrato desenhado no canvas.
- Testes cobrem a correspondência de jogadores e a troca visual no navegador.
