# Carreira: preparadores técnicos

## O que muda no jogo

Na tela Clube, aba **Técnico**, agora existe a **Comissão técnica**: dá para contratar até 3 preparadores (um de cada perfil) que mexem na velocidade com que os jogadores sobem ou caem de overall na virada de temporada.

- **Especialista em jovens:** garotos de até 24 anos têm 30% de chance de ganhar +1 a mais.
- **Fisiologista de veteranos:** quem tem 30 anos ou mais tem 30% de chance de perder 1 ponto a menos.
- **Preparador geral:** o elenco inteiro tem 15% de chance de ganhar +1 a mais (ou perder 1 a menos).
- **Gestor de carga:** o contrário, segura os garotos de até 24 anos (30% de chance de evoluir 1 a menos), barato, para quem quer ritmo lento.

Cada um cobra um salário anual (proporcional ao tamanho do clube) descontado do caixa na virada, junto da manutenção. Dá para dispensar a qualquer momento. A contratação vale a partir da próxima virada, e nada passa de 95.

## Como

`clube-regras.js` tem `PREPARADORES` e `ajustePreparadores`; `carreira-clube.js` guarda `gestao.preparadores`, a ação `preparador` (`contratar`/`demitir`) e cobra a folha; `virarTemporada` (`carreira.js`) aplica o ajuste depois do bônus do CT. Vale para o solo e a sala em grupo. Testes em `tests/carreira-clube.test.js`.
