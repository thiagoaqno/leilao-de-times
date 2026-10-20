# Cozinha: dois cozinheiros no solo e troca por Q

## O que muda
- Uma partida com apenas uma pessoa cria dois cozinheiros. Q troca qual recebe movimento e ações; o outro fica no lugar, mantém o item e termina o trabalho que começou na tábua ou na pia.
- O organizador pode ligar cozinheiros extras na sala. As vagas livres até quatro viram cozinheiros controláveis, distribuídos entre as pessoas da brigada, e Q percorre os cozinheiros de cada uma.
- A troca passa pelo servidor, que valida o dono e encaminha posição, pegar e usar somente ao cozinheiro selecionado. O botão de troca também aparece no celular e no controle.

## Testes
- `node --test tests/cozinha.test.js tests/salas.test.js`: inclui troca no servidor, trabalho após trocar e ciclo de quatro cozinheiros extras.
- `npx playwright test tests/e2e/cozinha-troca.spec.js`: abriu a cozinha solo e trocou o cozinheiro com Q sem erro no navegador.
