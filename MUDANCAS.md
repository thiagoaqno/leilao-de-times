# Interlagos com o kit de pista

Interlagos (Autódromo José Carlos Pace) agora monta com as peças do kit, em `gps/interlagos.js`; Mônaco continua igual na tela (mesmos números de painéis, postos e placas).

**Pista (`gps/interlagos.js`)**
- Chão: margem de asfalto cinza, zebras vermelhas e brancas só nas curvas, zebra alta amarela no Mergulho, linhas SC 1 e SC 2 e o grid numerado.
- Escape (peça nova `kit/escape.js`, chave `escape`): asfalto de escape pintado de verde e amarelo (saída do S do Senna, Descida do Lago, Junção), brita (Ferradura, Pinheirinho, Bico de Pato) e muro de pilhas de pneus por fora das curvas. No lugar da brita contínua de `pista.js`.
- Beira: cerca, painéis e postos do kit com patrocinadores reais (Heineken, Pirelli, Petrobras, Rolex, Banco do Brasil, Aramco, Itaú, DHL, TAG Heuer e o GP de São Paulo), mastros com a bandeira do Brasil e placas de frenagem de 150, 100 e 50 m. Marcas novas em `kit/marcas.js`: Petrobras, Banco do Brasil, Itaú e GP de São Paulo.
- Passarela com a faixa do GP de São Paulo na reta dos boxes (mais uma depois do Mergulho), Serra da Cantareira ao norte e fachadas paulistanas nos prédios.
- Vida e som: helicóptero, fiscais com a bandeira, vento e passarinhos do autódromo, a cidade baixa lá longe e a torcida nas arquibancadas.

**Só de Interlagos (`interlagos.js`, agora bem menor):** o lago da Descida do Lago, o prédio dos boxes com os camarotes e a torre de controle, e São Paulo em volta (220 prédios de 8 a 20 andares longe da pista). O que `ambiente.js` já fazia (cercas, painéis, postos, placas) saiu daqui.

**Kit:** `escape.js` (brita, listrado, pneus), `ambiente.js` ganhou `placas` e `outdoors`, `marcas.js` quatro marcas; `kit/README.md` e `CLAUDE.md` atualizados.

Validação: testes da corrida (46) passam; Interlagos conferido no navegador com `#debug` (largada, S do Senna, Lago, Ferradura, Junção e passarela, sem erro no console); Mônaco monta com os mesmos números (136 painéis, 46 postos, 13 placas, 74 luzes do túnel).
