# Cozinha: pedidos contínuos, sequência e metas por mapa

## O que muda
- A cozinha começa com dois pedidos. Cada entrega agenda outro em 1 a 3 s, respeitando o limite da fila; pedidos vencidos mantêm o intervalo da cozinha quando a fila cai abaixo do mínimo. Quem cozinha rápido deixa de esperar o próximo pedido.
- Entregas na ordem da fila sobem o multiplicador de pontos de ×1 até ×4. Entregar fora da ordem ou perder um pedido zera a sequência. O multiplicador aparece ao lado do placar.
- As metas deixam de usar valores fixos e `FATOR_META`. `simularPerfeito` estima a pontuação ótima para 1 a 4 cozinheiros com caminhos alcançáveis do mapa, tempo de deslocamento, preparo, cocção, montagem e lavagem. A primeira, segunda e terceira estrela ficam em aproximadamente 35%, 60% e 85% desse resultado.
- O planejador expõe `rota` para uso posterior pelo ajudante. Mantive a paciência e o tempo de queimar após conferir que duas sopas solo cabem na paciência atual com margem curta, enquanto o tempo de queimar deixa a travessia até o fogão possível.

## Testes
- `node --test tests/cozinha.test.js`: 10 testes passaram, incluindo fila, combo e as metas das três cozinhas de 1 a 4 cozinheiros.
- `npx playwright test tests/e2e/cozinha-ritmo.spec.js`: conferiu os pedidos iniciais e a meta calculada na página, sem erros no navegador.
