# Torre de posições e largada da corrida

As trocas de posição aparecem nas próprias linhas da torre: cada piloto desliza até sua nova posição e recebe uma seta verde ao subir ou vermelha ao descer. A indicação funciona nas torres compacta e completa; com movimento reduzido, a seta permanece sem o deslocamento. O cartão de ultrapassagem fora da torre foi removido.

A contagem da largada agora começa depois da preparação do grid e dos robôs. Um pedido de largada repetido durante a preparação ou com a corrida já iniciada deixa de informar incorretamente que só o organizador pode largar. Ao terminar a preparação assíncrona da pista, o servidor envia o estado da corrida a todas as pessoas na sala, para ninguém ficar no lobby enquanto os bots largam.

## Verificação

- Conferência visual da torre e da transição do lobby com dois jogadores em uma corrida local e verificações de sintaxe e do diff.
- Sem testes novos; as verificações automatizadas ficam no GitHub.
