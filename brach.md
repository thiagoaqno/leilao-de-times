# Corrida: reparo nos boxes e som do túnel

Cada visita concluída aos boxes reduz em 90% o dano acumulado, para jogadores e robôs. O reparo também ocorre numa visita dedicada a cumprir stop-and-go; essa visita continua sem registrar uma troca de pneus. Uma parada inválida não repara.

A reverberação existente no túnel fica mais presente, com reflexões iniciais estéreo e cauda difusa, entrando e saindo suavemente conforme a câmera passa pelo trecho coberto. O arquivo de prévia foi renderizado com o sintetizador de motor e a mesma resposta de reverberação do jogo: primeiro ao ar livre, depois dentro do túnel e por fim na saída.

## Verificação

- 32 testes de box e punições aprovados. Teste do servidor cobre reparo de humano, robô e stop-and-go, além de parada inválida.
- Prévia de áudio renderizada no Chromium com Web Audio e os módulos reais do jogo.
