# Carreira: os títulos antigos da sala entram na estante sem ninguém mexer nela

- **O problema:** o conserto anterior (o Mundial e o Super Mundial na estante) só mandava os títulos antigos para a estante quando alguém da sala fazia alguma coisa (escalar, jogar, abrir o mercado). Só abrir a sala e olhar a estante não bastava, e o título do Vasco continuava fora.
- **Agora:** quando o servidor sobe e carrega as salas do banco, cada técnico de cada sala manda as conquistas do histórico dele para a estante (`estanteDaSala`, em `carreira.js`, chamada por `carreira-online.js`). A mesma conquista continua entrando uma vez só.

Conferido: `tests/carreira-rivais.test.js` (uma sala guardada no banco com o Mundial e o Super Mundial do Vasco: ao carregar, os dois títulos aparecem na estante com o nome do técnico; sem o conserto o teste falha) e os testes da carreira em grupo e do banco.
