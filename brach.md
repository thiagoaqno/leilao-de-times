# Corrida F1: farol da largada, quebra de 0,5% e avisos com cara de F1

Dois bugs da Corrida (regras de F1) e a interface dos avisos refeita no estilo da transmissão oficial.

## Largada: o carro só sai quando as luzes apagam

- **Causa:** com as cinco luzes, o "freio de mão" que segura o carro no grid (`amb.segurar`) soltava assim que o piloto acelerava (`room.luzes ? t < startAt && !ent.gas : ...` no servidor, em `corrida-humanos.js`, e a mesma conta na previsão e na reconciliação de `fisica.js`; `physics` ainda liberava tudo se `race.luzes` existisse). Então dava para sair antes do "go" e o único freio era a punição, que só olhava a velocidade.
- **Agora:** o carro fica parado até `startAt` pelo relógio, sem olhar o acelerador, no servidor (a autoridade) e na previsão do navegador, então não há carro que anda e volta. Vale para humanos e robôs (os robôs já só saem depois de `startAt`) e para a classificação.
- **Queimar a largada continua punido** (`corrida-f1-direcao.js`): como o carro não anda mais, a direção de prova pune o pé: acelerar por mais de 250 ms seguidos com as luzes acesas (`p.gasNasLuzes`, contado pelo servidor), com 150 ms de folga para o relógio, dá +5 s, uma vez só. Quem anda mais de 45 u/s antes do go (caso antigo) também é punido.

## Quebra de carro: 0,5% por carro por corrida

- A chance mora em `f1-equipes.js`: `specDaMontagem` calculava `quebra = 1% + 0,8% por nível de motor + 1% por nível que falta de confiabilidade` (de 1% a 17%), e `sortearFalha` a sorteia pela semente do GP (`sortearFalhas` em `corrida.js`).
- Agora `quebraDaConfiab`: 0,5% com a confiabilidade padrão (nível 3, a da maioria das equipes), subindo até 1% sem a peça e caindo até 0,25% com ela no máximo. O motor não mexe mais na chance. A nota de confiabilidade da ficha acompanha.

## Avisos no estilo da transmissão de F1 (só com `config.regras === "f1"`)

- Faixas retas com a cor da bandeira (amarela, azul, vermelha, verde, laranja do Safety Car, branca para limites/punição/bandeirada, vermelha para quebra/incidente, roxa para volta mais rápida, azul-claro para box, verde para DRS), ícone, o logo F1 pequeno e tipografia condensada em caixa alta (Titillium Web, a do HUD). As mensagens da direção levam o cabeçalho "DIREÇÃO DE PROVA · RACE CONTROL"; as outras, o próprio rótulo (BOX, ABANDONO, FALHA MECÂNICA, VOLTA MAIS RÁPIDA...).
- Entram pela lateral em 0,26 s (sem animação com `prefers-reduced-motion`). Fila de até 3 faixas por vez, as outras esperam por prioridade (vermelha, SC, amarela, azul...) sem um tapar o outro. O estado que dura (bandeira, box, perda total, contagem) é uma faixa fixa que troca o texto no lugar. O DOM só muda quando a fila ou um texto muda.
- Tudo o que o servidor já registrava no log (bandeiras, pista liberada, SC e relargada, limites, punições, quebra, perda total, batidas, largada) passa a aparecer na tela; ruído (robôs, paradas e limites dos outros, quem sai da sala) fica de fora. Novos: DRS liberado, volta mais rápida, "luzes apagadas: é largada!" e a bandeirada.
- Os toasts da corrida (box, conexão, recorde...) viram faixas da fila; as cinco luzes ganharam o pórtico de F1; a tela de resultado ganhou a faixa de bandeirada (com os acréscimos de tempo). Arcade e telas fora da pista ficam como antes.
- Lógica pura e testável em `public/corrida/avisos-f1.js` (`AvisosF1`: tipos, cores, `deLinha`, `novosDoLog`, `criarFila`); o desenho está em `hud.js` e `hud-f1.css`.

## Testes

- Novos: `tests/corrida-f1-largada.test.js` (sem movimento antes do go no servidor e na previsão, queima por pé, folga do relógio, taxa de quebra de 0,5% em 60 mil sorteios com a semente, de 1% a 0,25% pela confiabilidade) e `tests/corrida-avisos-f1.test.js` (tipos, cores, log, fila e prioridade).
- Ajustados os testes de quebra em `tests/corrida-f1-equipes.test.js`.
- Rodados só os da Corrida: `node --test tests/corrida*.test.js` (220 passam).
