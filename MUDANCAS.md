# Naruto: 30 ninjas, base de dados nova, sprites animados e os jutsus em 3D

O modo Naruto Shippuden ficou mais completo, nas batalhas por turnos da Vila e no Ginásio em tempo real: mais ninjas, os
ninjas se mexendo e cada jutsu com o desenho certo.

## Mais ninjas (de 12 para 30)

- **Do jogo de DS que já era a fonte** (*Naruto vs. Sasuke*): Jiraiya, Kabuto, Neji e Orochimaru; mais Ino, Shino e Kiba (com
  o Akamaru), da folha de figurantes.
- **De *Ninja Council 4*** (DS): Tsunade, Temari, Kankurō, Might Guy, Tenten e Gaara.
- **Os lendários**: Primeiro Hokage, Quarto Hokage, Madara, Obito e Shisui. Esses jogos não têm sprite deles, então por
  enquanto cada um usa o sprite de outro ninja com as cores trocadas (Minato com o casaco branco, Madara de armadura
  vermelha...). Quando houver um sprite de verdade, é só pôr no lugar (`ferramentas/sprites-naruto.py`).
- Cada ninja tem 4 jutsus, vida, ataque, defesa e velocidade próprios. Todos entram na escolha de time dos dois modos.

## A base de dados nova

- `ferramentas/base-naruto.js` busca na **Dattebayo API** (dados da Narutopedia, 1.431 personagens) a vila, o clã, a patente e
  os jutsus de cada ninja e gera `public/galeramon/naruto-base.js`. Para pôr um ninja novo, basta o número dele na tabela
  `ELENCO`.
- `NarutoDex.ficha(id)` mostra "Vila da Folha / Akatsuki · Clã Uchiha · Jōnin" na escolha do ninja, na Vila e no Ginásio.
- As imagens da API são capturas do anime (só o rosto, com fundo) e não servem de sprite, então não entraram.

## Os ninjas se mexendo

- `ferramentas/sprites-naruto.py` corta, nas folhas de sprites, os quadros do "parado" de cada ninja e monta uma tira
  (`<imagem>-idle.png`), no tamanho original (pixel por pixel). No Ginásio eles respiram em vez de ficarem congelados.
- Cada ninja tem a sua altura na arena (o Kisame é maior, a Ino e a Tenten menores), e os compridos (Sasori, Kiba com o
  Akamaru) não passam de uma largura máxima.

## Os jutsus do jeito certo

Antes, quase todo jutsu saía como uma estrela genérica, porque a regra só conhecia os tipos do Pokémon, e todo golpe de
poder abaixo de 100 era um golpe de perto. Agora:

- **Cada golpe diz como sai** (`forma`): o Rasengan é uma bola na mão de quem bate, o Chidori e o Raikiri são investidas, a Bola
  de Fogo, o Tubarão de Água e o Dragão C2 voam, o Kirin, o Amaterasu e o Funeral do Deserto caem no ponto mirado. A regra do
  Ginásio (`regras.js`) obedece a `forma`.
- **Cada jutsu tem o seu desenho em 3D** (`public/ginasio/golpes-naruto.js`):
  - o que voa: shuriken girando, Bola de Fogo com cauda, Tubarão de Água, Aranha e Dragão de Argila, ninken correndo, corvos,
    feras de tinta, cobras, lâminas e Dragão de Vento, cabeça do Tigre Diurno, chuva de armas, mão de areia, insetos, Bola
    Busca-Verdade;
  - o de perto: corte de kunai, soco, Rasengan, Samehada, bisturi de chakra, Palma Divina (com o trigrama), espada e leque;
  - o que cai: Kirin (raio do céu), Amaterasu (chamas negras), Grande Onda, explosão C3, espinhos de areia de ferro, madeira,
    prisão de madeira, o sapo Gamabunta, as 64 Palmas, Manda saindo do chão, ciclone, nuvem de veneno, Dragão Ascendente,
    Caixão e Funeral de Areia, enxame, Meteoro;
  - quem avança: Chidori e Raikiri com o raio crepitando, Ōdama Rasengan, Lótus Frontal, Tornado da Folha, Presa Sobre Presa,
    Shunshin e Hiraishin;
  - o que fortalece: fumaça dos clones, Sharingan, Portões Internos, parede de terra, Rotação Celestial, Byakugan, escudo de
    areia, cura, Modo Sábio, Susanoo, Kamui, Uivo, muralha de insetos e outros;
  - o estouro de quando o projétil acerta também é de cada jutsu (água espirra, argila explode, penas dos corvos...).
- Nos tipos do Naruto que faltavam (Taijutsu, Vento, Terra, Sombra, Medicina), o desenho de reserva usa as cores certas.
- Com "menos movimento" no sistema, não há tremor de câmera nem clarão. Nos temas de chão claro, nada usa a mistura que
  soma luz, e as luzes dos golpes são mais fracas, para não estourar em branco.

## Código

- Novos: `public/galeramon/naruto-base.js` (gerado), `public/ginasio/golpes-naruto.js`, `ferramentas/base-naruto.js` e
  `ferramentas/sprites-naruto.py` (precisa de Pillow, numpy e scipy).
- Mudaram: `naruto.js` (elenco e golpes), `regras.js` (`forma`), `animacao.js` (a tira do parado e a escala de cada ninja),
  `golpes3d.js` (chama os jutsus), `golpes.js`, `desenho.js`, `sala.js`, `public/index.html` e os `index.html` do Ginásio.
- Testes: `tests/naruto.test.js` confere o elenco, as imagens, a base e a `forma`/`fx` de todo golpe; o e2e passou a esperar 30
  ninjas.
- O The Spriters Resource passou a pedir verificação de robô enquanto este PR era feito; as folhas ficaram em cache local e o
  `NARUTO-ASSETS.md` explica como usar o `NARUTO_FOLHAS`.
- `CLAUDE.md` e `NARUTO-ASSETS.md` atualizados. Fotos em `planos/imagens/naruto-*.png`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
