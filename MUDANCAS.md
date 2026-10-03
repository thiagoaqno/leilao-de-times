# Palavra Proibida da Galera (novo jogo, estilo Tabu)

Em `/proibida/`. Dois times (Azul e Laranja), com pelo menos 2 pessoas em cada.

- Na vez de um time, quem explica vê a carta: a palavra e as **5 palavras proibidas**. O **time adversário também vê**,
  para fiscalizar. O time de quem explica não vê.
- **Acertaram:** quem explica aperta "Acertaram!", o time ganha 1 ponto e sai outra carta do monte.
- **Não conseguiu:** "Não consegui" passa a vez para o outro time.
- **Falou uma proibida:** o time adversário aperta "Falou palavra proibida!" e confirma. O time dele ganha 1 ponto e a
  vez passa.
- **Tempo:** quando acaba o tempo da vez (45 s, 1 min ou 1,5 min), a vez passa. Quem explica vai mudando dentro de cada
  time, em rodízio.
- **Vitória:** ganha quem chegar primeiro a 10, 15, 20 ou 30 pontos (o organizador escolhe).
- **Baralho:** 100 cartas próprias, em português, de coisas do dia a dia e do Brasil, em `public/proibida/cartas.js`.

## Arquivos
- `proibida.js` (servidor, canal `/proibida`): só quem explica e o time adversário recebem a carta.
- `public/proibida/index.html` (a página), `public/proibida/cartas.js` (as cartas) e `server.js`.
- `/proibida` entrou no teste das salas e no de abrir as páginas.

## Ficou para depois
- Um lugar na vila (por enquanto, entra por `/proibida/`) e mais cartas.

## Testes
- Teste das salas regravado: só entrou o bloco de `/proibida`.
- Testado com 4 pessoas no servidor: quem vê a carta, o acerto dando ponto, e o "falou proibida" dando ponto ao outro
  time e passando a vez.
