---
name: nova-pista
description: Passo a passo para criar uma pista nova de GP de F1 na Corrida da Galera (traçado, cores e configuração do kit de pista) ou para melhorar o cenário, as marcas no chão, o som ambiente e as animações de uma pista que já existe (Mônaco, Interlagos, Barcelona...). Use sempre que o pedido for criar, refazer ou deixar mais real uma pista da Corrida, ou mexer em public/corrida/kit, public/corrida/gps ou no traçado em public/corrida/pistas.js.
---

# Nova pista (ou pista melhor) na Corrida da Galera

A Corrida é o jogo de F1 em 3D (Three.js, sem build) de `public/corrida/`. Cada GP é montado com as peças reaproveitáveis
de `public/corrida/kit/` a partir de uma configuração em `public/corrida/gps/<id>.js`. O guia completo das peças é
`public/corrida/kit/README.md`: leia antes de começar, junto com a linha da Corrida no `CLAUDE.md` e
`public/corrida/gps/monaco.js` (o exemplo que usa todas as peças).

## 0. Onde trabalhar

- Uma branch nova a partir de `origin/main` (regra do projeto: nada de PR em cima de PR). Se o clone principal tiver
  alterações que não são suas, use um worktree próprio: `git worktree add -b <branch> ../<pasta> origin/main`.
- No worktree, `node_modules` pode ser um link para o do clone principal (no Windows: `cmd /c mklink /J node_modules
  ..\leilao-de-times\node_modules`). Suba o servidor numa porta livre: `PORT=<porta> node server.js`.

## 1. Pesquisar o circuito de verdade

Antes de desenhar, procure na internet: o mapa oficial da F1 com as curvas numeradas e os nomes, o perfil de altura,
fotos de cada setor (zebras e as cores delas, área de escape, muros ou guard-rail, arquibancadas, passarelas, prédios e
paisagem em volta) e os patrocinadores de pista daquele GP. Anote as frações da volta (0 a 1, a partir da linha de
chegada) de cada coisa que vai pôr.

## 2. O traçado (`public/corrida/pistas.js`)

- Vértices `[x, y, raio]` no quadrado de 1600, desenhados em cima do mapa oficial, curva por curva e na mesma posição
  (veja os comentários de Mônaco e Interlagos). Raio 0 = só um ponto numa reta.
- `scale`, `width`, `hills` (o relevo real: `[fração, altura]`), `largada`.
- Rua (guard-rail colado): `walls: true, muro: true, wall`. Autódromo com área de escape: `walls: false`.
- O teste de robôs (`tests/corrida-robos.test.js`) dá uma volta em todas as pistas: o traçado tem que fechar sem os
  robôs saírem da pista. Rode cedo, antes do cenário.

## 3. As cores

`LOOK.<id>` em `public/corrida/cena.js` (céu, neblina, luz, chão, zebra) e `THEMES.<id>` em `public/corrida/pista.js`
(prévia do menu, céu, neblina, fora da pista).

## 4. A configuração do GP (`public/corrida/gps/<id>.js` + uma linha em `gps/index.js`)

Use as chaves da tabela do `kit/README.md`. Em geral:
- `asfalto: true` e `chao` (rua: `margem: "sarjeta"`, faixas de pedestre, tracejado, bueiros; autódromo: `margem: { cor }`
  sem nada de rua), com as `amarelas` onde a pista real tem zebra anticorte, `sc` e `grid: true`.
- `guardrail` (só com `walls`), `ambiente` (marcas e a `bandeira` do país), `passarelas`, `postes` (só em rua),
  `montanha` (a serra real no horizonte, na direção certa), `fachadas` (as cores dos prédios de lá).
- `vida`: helicóptero e fiscais; gaivotas só onde tem água; `som` com as regiões que existem ali (`porto`, `campo`,
  `cidade`, `fonte`, `sinos`). O túnel, a torcida (`tr.arquibancadas`) e o helicóptero o kit acha sozinho.
- `cenario(tr, ctx)` para o que só aquela pista tem (como `monaco.js` faz o porto e o túnel): defina `tr.arquibancadas`,
  `tr.coberto` e `tr.reservado` lá. `marcos(tr, ctx)` para marcos próprios; `depois(tr, ctx)` para o que vem por último.
- Marcas reais que faltarem entram em `kit/marcas.js` (`MARCAS`), desenhadas no canvas, sem baixar imagem.

## 5. Peça que serve para outras pistas vai para o kit

Se você precisou de algo que outra pista também usaria (brita, área de escape listrada, arquibancada genérica, prédio
de boxes...), faça em `public/corrida/kit/`, com uma chave nova na configuração lida por `pista.js` e uma linha na tabela
do `kit/README.md`. Regras: português nos nomes e comentários; peças repetidas em `InstancedMesh` ou numa malha por
material (`comum.js`); sem luz dinâmica nova; antes de pôr algo na beira, `livre(tr, x, z, folga)` e `ocupado(tr, x, z)`.
Nada do cenário muda a física.

## 6. Conferir

- `node --test tests/corrida*.test.js` (e `npm test` antes do commit) e `git diff --check`.
- No navegador do app, `/corrida/#debug`: abra uma sala, escolha a pista e largue. `window.__corrida.race.tr` tem os
  números das peças (`chaoGP`, `ambienteGP`, `somGP`, `zebras`...). Para fotografar vários pontos, mova o carro:
  `car = __corrida.race.car`, ponha `x`, `y`, `z`, `a` num ponto de `tr.pts` e zere `race.cam.pos`. Tire fotos da
  largada, de cada setor e das curvas famosas; confira que não há erro no console.
- Confira que Mônaco continua montando (`__corrida.buildTrack('monaco')` sem erro) se você mexeu no kit.
- Mudar o `#` da URL não recarrega a página: para pegar código novo, mude a query (`&v=2`).

## 7. Entregar

- `MUDANCAS.md` reescrito com o resumo (é o corpo do PR) e a linha da Corrida no `CLAUDE.md` atualizada.
- Mantenha os finais de linha de cada arquivo (vários são CRLF).
- Commit na branch e `git push -u origin <branch>`. Abra o PR para `main` se o `gh` ou o GitHub MCP estiver disponível;
  senão, passe o link `https://github.com/thiagoaqno/leilao-de-times/pull/new/<branch>`.
- No fim, diga o que ficou pronto, o que foi conferido no navegador e o que ficou faltando.
