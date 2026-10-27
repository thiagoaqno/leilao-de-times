# Carreira F1: a temporada com os amigos

A temporada solo (PR #323) agora também se joga em grupo: uma sala com código, cada amigo com a sua equipe (ou dois na mesma), o GP ao vivo para todos, a gestão e o mercado entre os GPs e o fim da noite. Pilotos reais de 2026, DRS clássico, 4 ou 8 GPs.

## A sala da temporada em grupo

- Canal novo `/corrida-temporada-grupo` (`corrida-temporada-grupo.js`), no caminho da Carreira de futebol em grupo: o criador vira o **anfitrião**, os amigos entram pelo código, cada pessoa tem o **seu token** (fica no navegador; no banco vai só o hash), quem sai vira ausente e volta com o token.
- Cada amigo escolhe uma das 11 equipes. **Dois amigos podem dividir a mesma equipe**, um em cada carro: os dois titulares reais saem do grid e vão para o mercado; o carro, o caixa, os engenheiros e o desenvolvimento são um só. As equipes sem humano ficam com os robôs. Quem não escolhe equipe acompanha e assiste.
- O anfitrião define 4 ou 8 GPs, as voltas (2, 3 ou 5) e o nível dos robôs, e começa a temporada. Até 8 pessoas por sala. Se o anfitrião fica 2 minutos fora, o cargo passa sozinho; ele também pode passar o cargo.
- **A sala inteira fica no banco** (`migracoes/019-corrida-temporada-grupo.sql`, tabela `corrida_temporadas_grupo`): o servidor pode reiniciar no meio da noite sem perder a temporada. A sala se apaga 72 h depois do último uso. O GP aberto vive na memória: se o servidor cair no meio dele, a temporada volta ao GP que não terminou.

## O GP ao vivo para todos

- `abrirGPGrupo` (em `corrida.js`) abre uma sala de F1 privada com **todos os humanos** da temporada e os robôs completando 20 carros. Só o anfitrião abre; as telas dos amigos vão para a pista sozinhas (quem estava fora entra por "Entrar no GP"). A classificação e a corrida são juntas, com a mesma física e as mesmas regras do GP solo.
- A classificação começa quando todos chegam à pista (ou 30 s depois do primeiro). Quem não tem carro **assiste** com um acesso de espectador.
- **Quem cai no meio da corrida tem o carro levado por um robô** (`corrida-temporada-robo.js`): o robô pega o carro que o servidor já andava e o pilota com o piloto automático dos outros robôs, com a estratégia de pneus do que falta (sempre dois compostos); quando a pessoa volta, retoma o carro de onde estiver. O resultado continua sendo dela.
- O resultado entra na temporada de todos **de uma vez, uma vez por GP** (guardado pelo número do GP e do ano).

## A gestão entre os GPs e o mercado disputado

- Cada equipe humana monta o carro e gasta o **seu** orçamento (peças, desenvolvimento, caixa e teto de gastos, como na solo).
- **Equipe dividida: qualquer um dos dois confirma** os gastos, e cada ação vai para o **histórico da equipe** com o nome de quem fez e o valor. Para dois não se atropelarem, o servidor aplica um pedido por vez e a montagem leva a `versao` da equipe: quem mexeu em cima de uma versão velha é avisado em vez de desfazer o que o companheiro acabou de fazer. Com dois pilotos humanos a equipe não tem vaga para piloto contratado.
- **Mercado disputado:** um piloto real só corre por uma equipe (quem pegou primeiro fica; o piloto que corre por outra equipe de amigo não sai; o que a equipe larga volta ao mercado) e cada engenheiro (mecânico ou estrategista de cada nível) só trabalha para uma equipe.
- Após cada GP: patrocínio, prêmio pelos pontos da equipe e salários, por equipe.

## O fim da noite

- Tabelas de pilotos e construtores para todos (os amigos aparecem marcados), resumo do último GP com o dinheiro da sua equipe, o campeão no fim do calendário, o quadro dos amigos (pontos, vitórias e pódios), a lista de campeões da noite e a próxima temporada pelo anfitrião.

## A sede

- `/corrida/temporada/` ganha "Temporada com os amigos" (abrir sala / entrar pelo código) e o `?sala=CÓDIGO` (convite), no mesmo visual (`grupo.js`, `grupo-regras.js`, CSS em `sede.css`). Na pista, "← Voltar à sede" e o botão de sair levam de volta à sala (`salaTemporada` no estado).

## Testes

- Novo `tests/corrida-temporada-grupo.test.js`: as regras (mesma equipe, versão, histórico, mercado, resultado, campeão) e o servidor de verdade: dois ou mais clientes criam/entram e escolhem equipes (inclusive a mesma, e a terceira pessoa é recusada), o mercado recusa o piloto e o engenheiro já contratados, só o anfitrião abre o GP, o GP abre com os quatro humanos e 20 carros, o resultado entra uma vez e todos veem as mesmas tabelas, reconexão com o token (e token errado), o servidor reiniciando com a sala vinda do banco, e o robô que assume o carro de quem caiu e o devolve.
- Rodados só os da Corrida: `node --test tests/corrida*.test.js`.

## Ficou de fora

- Entrar numa equipe no meio da temporada (quem chega depois do início só acompanha); leilão com lances e o dono aceitando a saída do piloto (aqui vale a ordem de chegada e quem corre por equipe de amigo não sai); rádio da equipe e HUD do companheiro; janela de mercado no meio do ano; passar o placar para a Noite da Galera; o teste na mão com amigos de verdade (só automatizado).
