# Relevo real em mais seis pistas, e as 24 pistas na carreira

## Pistas

`ferramentas/pista-real.js` passou por mais seis pistas. O traçado e o tamanho não mudaram.

| Pista | Relevo real | Inclinação máxima | Barreiras |
|---|---|---|---|
| Baku | 86 unidades (antes 75) | 11,8% (antes 8%) | as que já tinha |
| Zandvoort | 19 unidades | 2,7% | novas, por trecho |
| Silverstone | 35 unidades | 3% | novas, por trecho |
| Monza | 49 unidades | 5,8% | regra automática |
| Xangai | 20 unidades | 5,1% | regra automática |
| Melbourne | 21 unidades | 2,3% | regra automática |

Monza, Xangai e Melbourne seguem com a regra automática porque o OpenStreetMap mapeia poucas barreiras nelas (faltam em 49% a 90% da volta, conforme a pista e o lado). Com esses dados, a pista ficaria sem muro em quase toda a volta.

Baku já usava altitude real. Mudou a suavização, e o exagero saiu porque a escala agora é a do traçado. O terreno em volta se ajusta sozinho à altura da pista. Em Melbourne, o relevo foi mais suavizado, porque o SRTM conta as árvores do parque como ladeira.

A ferramenta agora procura o início da volta na volta inteira, o que corrigiu o encaixe de Silverstone.

## Carreira

As 24 pistas recriadas estão no calendário, na ordem do calendário real de 2026, e todas entram no sorteio de 4 e 8 GPs. A temporada completa passa de 15 para 24 GPs. Entram Xangai, Miami, Red Bull Ring, Hungaroring, Madri, Cidade do México, Catar, Abu Dhabi e Austin no sorteio.

Temporadas já salvas continuam com o tamanho delas. O desafio semanal também usa essa lista, então as pistas dele mudam.

## Verificação

- Conta da física nas seis pistas: nenhum trecho faz o carro sair do chão.
- No jogo, com 21 robôs e sem erro no console: Baku, Zandvoort e Silverstone, por cerca de 40 s cada, com prints nos pontos da volta. Nenhuma volta completa dos robôs foi registrada nesse tempo. Monza, Xangai e Melbourne não foram abertas no jogo.
- O calendário de 24 GPs foi criado pelas regras, mas nenhuma temporada foi jogada, nem as telas da carreira foram abertas com ele.
- Só `node --check`; a suíte fica com o CI.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
