# Lista de salas abertas na Vila

**Antes:** para entrar na sala de um amigo era preciso saber o código de 5 letras e digitar no jogo certo.

**Depois:** no menu **☰ Jogos** da Vila aparece a lista "Salas abertas" com todas as salas de todos os jogos: o jogo, quem está dentro (👑 é o anfitrião), quantas vagas e se está aberta, cheia ou em jogo. A lista se atualiza ao vivo e o botão do menu mostra quantas salas abertas existem. Tocar numa sala leva ao jogo e entra sozinho com o seu nick (na Carreira em grupo, abre a página com o código da sala).

**Como:** `lobby.js` guarda o registro das salas (`registrar(jogo, rooms, { max })`, uma linha em cada jogo, mais o Leilão no `server.js` e a Carreira em grupo) e o canal `/lobby`, que a cada 1,5 s monta a lista e só manda quando mudou. Só aparecem salas com alguém online. Salas já começadas aparecem como "em jogo": o link abre o jogo, onde dá para entrar para assistir. Teste: `tests/lobby.test.js`.
