# Imagens de Naruto Shippuden

Os ícones dos ninjas em `naruto-sprites/` são prévias dos sprites de
*Naruto Shippuden: Naruto vs. Sasuke* (Nintendo DS) no
[The Spriters Resource](https://www.spriters-resource.com/ds_dsi/narutoshippudennarutovssasuke/).
Os sprites foram extraídos e enviados pelos colaboradores indicados em cada página do site.
As cópias locais evitam que uma falha temporária do site deixe a batalha sem personagens.

O [site informa](https://www.spriters-resource.com/page/tou/) que esses recursos são
protegidos por direitos autorais e não podem ser usados em projetos comerciais sem autorização.

## Os sprites animados e os ninjas novos

`ferramentas/sprites-naruto.py` gera, para cada ninja, a tira com os quadros do "parado" (`<imagem>-idle.png`) e, nos novos, a
imagem parada. As folhas vêm do The Spriters Resource:

- *Naruto Shippuden: Naruto vs. Sasuke* (DS): Naruto, Sasuke, Sakura, Kakashi, Shikamaru, Itachi, Kisame, Deidara, Lee,
  Sai, Sasori, Yamato, Jiraiya, Kabuto, Neji e Orochimaru; mais Ino, Shino e Kiba (com o Akamaru), da folha de figurantes.
- *Naruto Shippuden: Ninja Council 4* (DS), rips de "Naruto: Saikyo Ninja Daikesshu 5" (Pakis Pride): Tsunade, Temari,
  Kankurō, Might Guy, Tenten e Gaara.
- Primeiro Hokage, Quarto Hokage, Madara, Obito e Shisui não têm sprite nesses jogos: usam o sprite de outro ninja com as
  cores trocadas (função `troca` da ferramenta), até haver um sprite de verdade.

## A base de dados

`public/galeramon/naruto-base.js` é gerada por `ferramentas/base-naruto.js` a partir da
[Dattebayo API](https://dattebayo-api.onrender.com) (dados da [Narutopedia](https://naruto.fandom.com), licença CC-BY-SA):
vila, clã, patente e jutsus de cada ninja. As imagens da API são capturas do anime e não servem de sprite, então ficaram de fora.
