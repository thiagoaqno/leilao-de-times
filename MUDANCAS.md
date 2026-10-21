# Corrida: Mônaco refeito em cima do traçado oficial

O circuito de Mônaco foi redesenhado do zero, em cima do mapa oficial da F1 (as 19 curvas, os 3 setores e o perfil de
relevo), e ganhou o cenário de verdade: o porto com os iates, a piscina, as arquibancadas azuis, o túnel embaixo do
hotel, a Place du Casino e o Rochedo.

## O traçado
- Na ordem: reta dos boxes (Boulevard Albert 1er) → Sainte Dévote → subida da Beau Rivage → Massenet e Casino, em volta
  do canteiro redondo da Place du Casino → Mirabeau Haute → o grampo do Grand Hotel → Mirabeau Bas → Portier → o túnel
  (curva longa à direita) → Nouvelle Chicane → Tabac → Piscine (as duas chicanes) → La Rascasse → Anthony Noghès.
- Os vértices foram tirados do mapa oficial, na mesma posição (dá para pôr um em cima do outro). Volta de ~13 mil, como
  as outras pistas; os robôs fecham em 66–74 s, na faixa de Tóquio (a outra pista de rua).
- Relevo do perfil oficial: plano na reta, sobe da Sainte Dévote até o Cassino (o ponto mais alto, curvas 3 e 4), desce
  por Mirabeau e o grampo até Portier, e do túnel até o fim fica ao nível do mar.
- Rua estreita: guard-rail colado na pista o tempo todo, sem área de escape e sem barreira de pneus (`muro: true` em
  `pistas.js`; as outras pistas continuam sem muro). A largada fica a 30% da reta dos boxes (`largada`), como no mapa.
- A melhor volta guardada de Mônaco era do traçado antigo e os robôs copiariam uma linha que não existe mais: a migração
  `014-monaco-novo.sql` apaga essa volta, e a próxima volta limpa passa a valer.

## O cenário (`public/corrida/monaco.js`)
- O mar e o porto Hercule: o chão afunda onde é água, com o cais em linha lisa (`fundoMonaco`), a marina com píeres e
  iates presos dos dois lados (casco com proa e cabine de dois andares) e os superiates na boca do porto.
- A piscina entre a Piscine e o porto, e a beira do porto aberta, sem prédio entre a pista e os iates.
- Arquibancadas azuis lotadas na reta dos boxes, na Sainte Dévote, no cais da chicane ao Tabac e na Piscine.
- O túnel coberto, com as luzes amarelas no teto, embaixo do hotel (que avança sobre o mar) e do terraço com jardim.
  Com o carro lá dentro, o teto e o hotel ficam transparentes, senão a câmera de cima não veria nada.
- A Place du Casino: o canteiro redondo florido, com palmeiras e o chafariz, dentro da curva do Cassino, e o Cassino
  (fachada creme, torres e telhado de cobre) de frente para a praça.
- O Rochedo (Monaco-Ville) do outro lado do porto, com o Palácio, a catedral, a cidade velha e os jardins.
- Prédios mais altos colados na rua, as árvores no morro lá atrás e o chão de pedra clara no lugar da areia.
- Postes, outdoors, bandeirolas e torcida de `vida.js` não caem mais na água, em cima do túnel nem no meio do grampo.

## Conserto de passagem
- Quem voltava para a sala no meio da corrida via Interlagos: a capa do menu era redesenhada por cima e trocava a pista
  da cena. Agora a capa não redesenha com a corrida andando.

## Testes
- `npm test` e os E2E da Corrida (`tests/e2e/paginas.spec.js` e `tests/e2e/salas.spec.js`).
- `tests/corrida-robos.test.js` cobre Mônaco (trechos sem encostar, robôs fecham a volta pelos 12 checkpoints sem sair
  da pista). O teste do turbo do cogumelo já falhava no `main` antes desta mudança.
