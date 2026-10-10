# Carreira: conserta o que o PR #133 quebrou na interface

O PR #133 entrou no `main` sem a correção do CSS (ela ficou só na branch). Este PR traz essa correção e o resto do que a revisão encontrou.

- **CSS quebrado:** sobrou uma linha solta de uma regra apagada (uma chave `}` a mais), e o navegador ignorava várias regras seguintes.
- **Card "Próxima partida" da Sede desmontado** (escudos sobrepostos, botão espremido): a classe nova `.destaque` do cartão do jogador já era usada por esse card. Virou `.cartao-jog`.
- **Foto do elenco na festa do campeão:** a classe nova `.reserva` (cartão do banco) colidia com a dos reservas da foto. Virou `.carta-reserva` (e `.ponto` virou `.ponto-pos`).
- **Caixa escura atrás da camisa** ao passar o mouse num jogador do campinho (a regra geral de botão ganhava).
- **Improvisado e selecionado** ficavam com a mesma etiqueta amarela: o improvisado agora só tem o contorno.
- **Parada tática:** a janela rolava sozinha e escondia o título ("Intervalo", "Tomamos um gol").
- **Sede invisível depois do jogo** (bug antigo do `zoom.js`, de antes do #133): o esmaecer da Sede ficava preso com opacidade 0 quando a volta não era pelo zoom.
- **E2E da carreira** (já falhava antes do #133): fecha os avisos que aparecem sozinhos (reunião com a diretoria), usa o "← Sede" do cabeçalho esperando o zoom, a formação em duas linhas, os 7 blocos da Sede e os posts no lugar da manchete. Agora os 8 testes de `carreira.spec.js` e `carreira-transicoes.spec.js` passam.

Conferido: o CSS regra por regra no Chromium (só saíram as regras da prancheta antiga), fotos da Sede, prancheta, parada tática, mercado e notícias no PC e no celular, `npm test` (287 de 288; a que falha, os dilemas de `carreira-clube.test.js`, é instável e falha também antes do #133) e os E2E da carreira.
