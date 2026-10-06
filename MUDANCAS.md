# Ginásio: servidor e salas da Fase 2

## Como fica
- O motor da Fase 1 agora roda no servidor, no canal `/ginasio`. Jogadores criam uma sala, escolhem seus 3 bichos e disputam batalhas em tempo real.
- O organizador escolhe Galeramon ou Pokémon, 1x1 ou 2x2 e se os robôs completam as vagas. Cada pessoa pode trocar de lado e escolher os bichos no lobby.
- Os times escolhidos ficam separados por modo durante a sala, para alternar entre Pokémon e Galeramon sem perder a seleção.
- Quem cai pode voltar pelo mesmo id e token durante a batalha. Também é possível assistir ou entrar para jogar a próxima.
- O resultado chega ao placar da Noite da Galera, contando os humanos do lado vencedor. Robôs e empates não ganham pontos.
- Esta fase entrega o servidor e o protocolo. A página jogável, os controles visuais e as animações entram na Fase 3.

## Por dentro
- `ginasio.js` reutiliza as peças de `salas.js`: códigos, nomes, reconexão, ping e limpeza das salas. O canal está registrado em `server.js`, `noite.js` e na lista de jogos do `vila.js`.
- O servidor calcula movimento, dano, recargas e trocas a 60/s. Manda um `snap` a 20/s para cada cliente, com a última sequência de comando processada; `state` traz o lobby, os participantes e o resultado.
- Os comandos `cmd` carregam `{seq, dx, dy, mira, golpe?, esquiva?, troca?, alvo?}`. Valores inválidos e sequências repetidas são ignorados, a fila é limitada e ataques/esquivas/trocas são consumidos uma vez. Sem comandos novos por 250 ms, o movimento para.
- Os pacotes incluem vida, mira, recargas, efeitos ativos, projéteis e avisos de área. Eventos de lançamento, impacto e explosão levam posição, elemento e trajetória para a futura tela.
- O motor compartilhado atualiza a mira mesmo quando a pessoa não ataca, permitindo desenhar a direção correta e reconciliar os comandos.
- Só o organizador configura, começa, remove alguém ou volta ao lobby. Os times são validados contra o dex do modo, e nenhum estado público inclui tokens.

## Conferido
- `node --test tests/ginasio.test.js tests/ginasio-servidor.test.js`: 9 testes passaram.
- `npm test`: 56 testes passaram, sem falhas.
- Os testes usam o servidor real e clientes Socket.io: permissões, capacidade dos lados, seleção por modo, comandos inválidos/repetidos, espectadores, remoção, reconexão durante a luta e retorno ao lobby.
- Uma partida Pokémon 2x2 com dois clientes e dois robôs terminou com ataques, dano e nocautes; as vitórias dos dois humanos chegaram à Noite.
- O relógio é acelerado somente em ambiente de teste, mantendo o mesmo passo do motor e os 4 minutos de duração máxima.
- O contrato de salas foi regravado e revisado: apenas `/ginasio` entrou em `tests/salas-esperado.json`; os outros canais continuam iguais.
