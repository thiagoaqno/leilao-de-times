# O aviso de chuva por volta passa a ser de quem contratou o estrategista

Até aqui, contratar o estrategista só reduzia o tempo de box, e o aviso "chuva prevista na volta N" valia para todo mundo.

- **Sem estrategista (e fora da carreira):** sem esse aviso. Continuam a previsão do GP e o aviso do engenheiro uma volta antes da chuva, que já existiam.
- **Estrategista experiente:** diz em que volta a chuva vem.
- **Estrategista de elite:** também diz em que volta a chuva para.
- A volta é refeita pelo seu ritmo: se a previsão mudar, ele avisa de novo. Continua sendo estimativa, e o aviso só começa depois da primeira volta completa.

O nível vai do save para a sala (`room.estrategistas`, por equipe) e daí para a tela (`publicState`), na carreira solo e em grupo. A redução no tempo de box não mudou.

## Verificação

Só sintaxe conferida: não houve corrida de teste com chuva nem GP de carreira com cada nível. O CI confere a suíte. O contrato das salas (`tests/salas-esperado.json`) ganhou o campo novo, `estrategistas`. Este branch já inclui o #569, que corrige o teste do rádio.
