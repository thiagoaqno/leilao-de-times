# Vila em bairros, +2026 cartas na Palavra Proibida, Rumi ao vivo e bola alcançável no Pingue-Pongue

## Vila reorganizada em bairros
- Os prédios agora ficam juntos por tema, em ruas retas, com uma avenida no meio ligando tudo:
  - **Rua das Cartas** (em cima): Leilão, Cassino, Uno, Truco, Sinuca, Dominó, Rumi e Palavra Proibida, em duas
    ruas de paralelepípedo;
  - **Praça da Galera** (no meio): a fonte, os quiosques do Ludo e do Botão e o lugar onde todo mundo chega;
  - **Vila Esportiva** (embaixo, à esquerda): Pelada, Tênis e Pingue-Pongue;
  - **Autódromo** (embaixo, à direita): Corrida, Tiro, Rocket e Batalha.
- **O chão de cada bairro é do material do tema:**
  - Rua das Cartas: paralelepípedo;
  - Praça: pedra portuguesa em ondas pretas e brancas, como o calçadão de Copacabana;
  - Vila Esportiva: pista de atletismo cor de tijolo com as raias;
  - Autódromo: asfalto com a faixa amarela tracejada.
- **Placas de rua:** na entrada de cada bairro tem uma placa azul esmaltada (como as de esquina) com o nome do bairro.
- **Menu "Jogos":** separado pelos mesmos bairros, com a mesma placa azul.
- **Tamanho do mapa:** passou de 34x45 para 40x44 quadradinhos (o servidor da vila acompanha). Quem entra chega na
  praça, embaixo da fonte.

## Palavra Proibida: mais 2026 cartas
- O baralho foi de 200 para **2226 cartas**, em português, de vários temas:
  - comida, bichos, casa, profissões e lugares;
  - esporte e festas, tecnologia e internet, corpo e natureza;
  - transporte e roupa, escola e cultura (filmes, desenhos, música, história);
  - o dia a dia do Brasil.
- Sem palavra repetida (nem com as que já existiam) e sempre 5 proibidas diferentes por carta.
- Ficam em `public/proibida/cartas-mais.js`, uma por linha ("palavra|5 proibidas"); `cartas.js` junta com as primeiras.

## Rumi: ver a jogada dos outros antes de confirmar
- O servidor já mandava o rascunho de quem está na vez, mas na tela dos outros quase não dava para perceber. Agora:
  - as peças que vieram da mão aparecem **em verde**;
  - as peças da mesa que ele está pegando aparecem **levantadas**;
  - em cima aparece "fulano está mexendo na mesa · já pôs N peças da mão · só vale quando confirmar".
- Quem entra (ou volta) no meio da vez já vê o rascunho.

## Pingue-Pongue: a bola não sobe mais fora do alcance
- Uma batida simples (raquete parada, bloqueio) mandava a bola num arco de 1,1 a 1,4 m acima da mesa, e ela quicava
  alto demais para pegar.
- Agora o voo não passa de ~0,45 m acima da mesa: a bola sai mais reta e rápida, sem deixar bater na rede.
- A raquete também alcança um pouco mais alto (até ~1 m acima da mesa).
- No pior caso, a bola chega em quem recebe a uns 0,47 m acima da mesa (antes chegava a 1 m).

## Testes
- `tests/servidor.test.js`: o rascunho do Rumi chega ao vivo para os outros (com as peças pegas da mesa).
- `tests/pingpong.test.js`: de qualquer altura e com qualquer batida, a bola chega no alcance de quem recebe.
- `npm test` (42) e os testes no navegador das páginas, das salas e do Pingue-Pongue passando.
