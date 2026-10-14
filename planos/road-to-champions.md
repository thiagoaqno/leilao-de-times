# Road to Champions — Destinos Cruzados

Substitui a entrada visual do antigo **Rumo ao Estrelato** (rota /jogador/) por uma campanha online de até seis protagonistas. A Carreira de Treinador em /carreira/ permanece intacta. O código antigo de /jogador (jogador.js, jogador-historia.js e suas páginas auxiliares) continua no repositório para consulta/rollback; seus saves antigos não são apagados, mas a nova página não os abre.

## Primeira versão jogável
- Criar sala com código de 5 caracteres ou entrar na sala de um amigo.
- Cada amigo cria avatar/atleta (nome e posição), seleciona clube europeu único do catálogo EA FC 27 já presente no projeto.
- Um universo compartilhado com **1 a 6** participantes e times restantes controlados pela CPU.
- **Torneio experimental de 8 clubes:** dois grupos de quatro (3 partidas por clube), semifinal e final. O objetivo é testar a narrativa; não representa o regulamento oficial de 36 clubes da Champions.
- Antes de cada jornada, todos escolhem 1 resposta entre 3 a um evento e uma tática; a escolha atualiza prestígio, respeito, ambição, disciplina e relações de rivalidade.
- O anfitrião só pode avançar quando todos enviaram suas decisões. O servidor resolve partidas de forma determinística com base em força dos onze melhores do time, tática e aleatoriedade previsível pela semente da partida. Eventos narrativos não forçam vitória/derrota.
- Resumo dos capítulos e resultados, tabelas e seis epílogos individuais ao final.
- Salas persistidas em tabela separada no SQLite pela migração 007, não misturadas aos saves de Carreira Online. Tokens individuais aleatórios são guardados no banco apenas em hash, e o navegador grava seu token para reconectar.

## Arquivos
- Servidor: road-to-champions.js (namespace /road-to-champions).
- Página: public/jogador/index.html, public/jogador/road.js, public/jogador/road.css.
- Persistência: migracoes/007-road-to-champions.sql.
- Entrada na Vila: public/index.html.
- Testes: tests/road-to-champions.test.js.

## Próximas fases necessárias
1. Substituir o torneio de oito times pelo formato oficial de 36 na fase de liga com potes, restrições de sorteio e acesso ao mata-mata.
2. Integrar a execução das partidas ao motor completo da Carreira (escalação/lances/notas) em vez da simulação tática simplificada.
3. Criar elenco/avatar 3D e cenas animadas, com escolhas em sequências cinematográficas.
4. Aumentar o catálogo de capítulos e consequências entre rivais (incluindo reações personalizadas), relatórios de pós-jogo e conquistas por jogador.
5. Adicionar gestão de salas abandonadas e a possibilidade de jogadores ausentes serem substituídos por CPU sob consentimento do anfitrião.
