# Ginásio: marcas no chão que vão sumindo até o fim da partida

## O que muda (`public/ginasio/marcas.js`)
- Os golpes passam a deixar marca na quadra, do jeito do tipo:

| Golpe | Marca |
| --- | --- |
| Terra, Pedra, Lutador, Normal, Aço, Voador (golpe de área) e Fly/Bounce | cratera com rachaduras e pedrinhas |
| Dig | buraco com anel de terra onde o bicho sai, e um buraquinho por onde ele entrou |
| Fogo e Dragão | chamusco, com brasas que se apagam em poucos segundos |
| Elétrico | rachaduras de raio, que piscam no começo |
| Água e mergulho | poça com marolinha |
| Gelo | gelo trincado |
| Grama e Inseto | mato arrancado |
| Psíquico, Fantasma, Venenoso, Sombrio, Fada e Shadow Force | mancha com uma runa girando |

- Cada marca nasce forte e esmaece aos poucos, de um jeito que acabe de sumir justo no **fim da partida**: uma marca
  feita aos 20 s de uma partida de 90 s fica com metade da força aos 55 s e some aos 90 s. As que nascem nos últimos 6 s
  ainda duram o mínimo para dar tempo de ver.
- Só enfeita: a marca nasce dos eventos `explosao` e `sumiu`, que o navegador já recebia. Não mexe no servidor, no dano
  nem nos acertos.
- Guarda no máximo 48 marcas (a mais velha sai primeiro) e começa limpa a cada partida.
- Fica por baixo dos bichos, dos pilares e do aviso de área, e só em cima do piso.
- Quem pede "menos movimento" no sistema fica sem o estouro ao abrir, as brasas piscando, a marolinha e a runa girando
  (a marca continua esmaecendo do mesmo jeito).
- Foto: `planos/imagens/ginasio-marcas.png`. As 8 marcas em 4 momentos (nova, 1/3, 2/3 e quase sumida), na quadra
  padrão e na do Fogo.

## Conferido
- `npm test`: 102 de 102 passaram. Teste novo, `tests/ginasio-marcas.test.js` (já no `npm test`):
  - o esmaecer vai de 1 a 0 justo no fim da partida e depois dele continua em 0;
  - a marca que nasce nos últimos segundos ainda dura o mínimo;
  - cada golpe real do jogo deixa a marca do seu jeito (inclusive Dig, Fly e Shadow Force);
  - o mesmo evento chegando duas vezes não repete a marca, e passando de 48 as mais velhas saem.
- A foto foi gerada fora do navegador: o desenho de `marcas.js` e da quadra rodou num canvas do Node. **Ainda falta
  olhar numa partida de verdade no navegador**, porque o Chromium do teste não baixou neste ambiente (os e2e do
  Playwright também não rodaram).
