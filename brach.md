# Corrida F1: excluir a carreira, sair da temporada e encerrar a sala dos amigos

A Carreira F1 (`/corrida/temporada/`) não tinha como apagar o save. Agora tem, no jeito da Carreira de futebol (`excluir` / `bd.excluirCarreira`).

## Temporada solo: "Excluir carreira"

- Botão discreto no rodapé da sede, ao lado do código de recuperação. Abre uma janela dizendo que some tudo, em todos os aparelhos, e que não dá para desfazer; só habilita o botão vermelho depois de escrever `EXCLUIR` ou o nome da equipe.
- Canal `/corrida-temporada`, evento `excluir`: só apaga com o token válido (`d.token`, ou o do socket) e `bd.excluirTemporadaCorrida` remove a linha de `corrida_temporadas`, então o token e o código de recuperação deixam de valer.
- Com um GP aberto daquela carreira, o servidor recusa ("O GP está aberto. Termine ou saia do GP antes de excluir a carreira."). GP já na tela de resultado, ou sala que já sumiu, não bloqueia.
- O navegador esquece o token e o código (`localStorage`) e volta para a tela de criar; outros navegadores conectados à mesma carreira recebem `excluida` e fazem o mesmo.

## Temporada com os amigos

- **Sair da temporada** (qualquer pessoa, no rodapé da sede): `sairDaTemporada` / `G.dispensar` em `grupo-regras.js`. A pessoa deixa a sala e o carro volta para um robô, como quem é dispensado: se dividia a equipe, o amigo fica com o carro 1 e o outro carro vai para um titular real livre; se estava sozinha, a equipe inteira volta aos robôs (dois carros). O anfitrião que sai passa o cargo. Se ninguém com carro sobrar, a sala é encerrada.
- **Encerrar a temporada** (só o anfitrião): `encerrar` apaga a sala de `corrida_temporadas_grupo`, tira da memória e emite `encerrada` para os outros, que voltam à tela inicial com um aviso. Pede confirmação.
- As duas ações recusam com GP aberto da sala (um GP abandonado, cuja sala da Corrida já sumiu, não trava mais a sala).

## Testes

`node --test tests/corrida*.test.js`. Novos: excluir com o token certo apaga e o código para de valer, token errado recusado, GP aberto recusa, `bd.excluirTemporadaCorrida`; sair da sala em grupo devolve o carro ao robô (regras e servidor); o anfitrião encerra e a sala some do banco, com os outros avisados.
