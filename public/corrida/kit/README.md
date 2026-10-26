# Kit de pista (Corrida)

Peças reaproveitáveis para montar o cenário de qualquer GP. Cada pista de F1 tem uma configuração em `../gps/<pista>.js`,
registrada em `../gps/index.js`; `../pista.js` lê a configuração e chama as peças. Nada daqui muda a física: é cenário e
som. Mônaco (`../gps/monaco.js`) usa todas as peças e é o exemplo completo; Silverstone (`../gps/silverstone.js`) é o de autódromo plano com `escape`.

## Como fazer um GP novo

1. **O traçado** em `../pistas.js` (vértices `[x, y, raio]` no quadrado de 1600, `scale`, `width`, `hills`, `walls`, `muro`,
   `wall`, `largada`). Desenhe em cima do mapa oficial do circuito, curva por curva, como Mônaco e Interlagos. Pista com
   guard-rail colado (rua) usa `walls: true, muro: true`; autódromo com área de escape, `walls: false`.
2. **As cores** em `../cena.js` (`LOOK.<id>`) e `../pista.js` (`THEMES.<id>`): céu, neblina, chão, zebra.
3. **A configuração** em `../gps/<id>.js` e uma linha em `../gps/index.js`.
4. **Conferir:** `npm test` (o teste de robôs dá uma volta em todas as pistas: o traçado precisa fechar sem sair da pista)
   e uma volta no navegador com `#debug` (`window.__corrida.race.tr` tem os números de cada peça: `chaoGP`, `ambienteGP`,
   `somGP`...).

## A configuração (todas as chaves são opcionais)

| Chave | Peça | O que faz |
| --- | --- | --- |
| `asfalto: true` | `../asfalto-gp.js` | Asfalto de GP com relevo fino, linhas de borda e a borracha nas curvas (tira os cones). |
| `chao: {...}` | `chao.js` → `chaoGP` | `margem` (`"sarjeta"` de rua ou `{ cor }`), `zebra` (`cores`, `dentro`, `fora`: raios das curvas que ganham zebra), `amarelas` (trechos `[f0, f1]` com zebra amarela alta), `faixasPedestre`, `tracejado`, `sc` (`[[f, "SC 1"]]`), `grid: true`, `remendos`, `bueiros`. Grava `tr.zebras` (as faíscas só saem ali). |
| `escape: {...}` | `escape.js` → `escapeGP` | A área de escape depois da zebra: `brita`, `listrado` (asfalto pintado, `cores` padrão verde e amarelo) e `pneus` (pilhas de 3 pneus), cada um uma lista `[f0, f1, lado]` (`lado`: 1, -1, 0 = os dois, `"fora"` ou `"dentro"` da curva). `britaCurvas` (raio, ex.: `450`: brita automática do lado de fora das curvas mais fechadas que ele, sem listar trechos) e `corBrita`. `largura` (23). Com `escape`, a brita de pista.js sai. |
| `guardrail: {...}` | `beira.js` → `guardRail` | O guard-rail em 8 painéis de 6 m: `paineis` (nomes de `marcas.js`, `null` = listras) e `cores` das listras. Só em pista com `walls`. |
| `arquibancadas: {...}` | `arquibancadas.js` → `arquibancadas` | Arquibancadas lotadas em rampa, com fundo, marquise (`cobertura`) e colunas: `trechos` `[{ de, ate, lado, degraus, cor, encosto, cobertura }]` (`de`/`ate` são frações da volta, `lado` 1 ou -1). Põem `tr.arquibancadas` (o som da torcida) e `tr.reservado`. Roda antes do `cenario`. |
| `cenario(tr, ctx)` | a pista | O que só ela tem, antes de tudo (Mônaco: porto, piscina, túnel, Cassino). Pode definir `tr.coberto(i)` (túnel), `tr.ocupado(x, z, i)`, `tr.arquibancadas` (`[[i0, i1]]`, para o som da torcida) e pôr lugares em `tr.reservado` (`[x, z, raio]`). |
| `ambiente: {...}` | `ambiente.js` → `ambienteGP` | Cerca sobre o guard-rail, painéis de patrocinador (`marcas`), mastros com a `bandeira` (duas cores), postos de fiscais (`posto`: a marca), placas de frenagem (`placas`: 100 e 50 m, ou 150, 100 e 50), `outdoors` (as marcas dos outdoors de `vida.js`), placas de 100/50 m, guias de luz no túnel. Grava `tr.postosGP` e `tr.marcasGP` (os outdoors de `vida.js` passam a ter as marcas). |
| `passarelas: {...}` | `marcos.js` → `passarelas` | Passarelas com faixas de patrocinador: `candidatos` (frações, em ordem), `marcas`, `max`. Tiram as bandeirolas coloridas. |
| `marcos(tr, ctx)` | a pista | Marcos próprios depois das passarelas (Mônaco: a capela de Sainte Dévote). |
| `postes: {...}` | `marcos.js` → `postes` | Postes de rua atrás do guard-rail: `passo`, `cor`. |
| `montanha: {...}` | `marcos.js` → `montanha` | Serra no horizonte: `angulo` (-π/2 = norte), `afastamento`, `altura`, `largura`, `rocha`, `mato`, `longe`. |
| `vida: {...}` | `vida.js` → `vidaGP` | `helicoptero` (padrão sim), `gaivotas` (lista ou função `(tr) => [{ x, z, raio }]`), `fiscais` (padrão sim), `som` (as regiões de `som.js`). |
| `fachadas: {...}` | `beira.js` → `fachadas` | Prédios com sacadas, venezianas, toldos e telhados: `cores` (`[parede, veneziana]`), `toldos`, `telhas` (0 a 1). `FACHADAS_MEDITERRANEO` é o padrão. |
| `depois(tr, ctx)` | a pista | Por cima dos enfeites soltos (Interlagos: `../interlagos.js`). |

`ctx` traz `{ add, r, hAt, size, aguaTex, palms, yachts, jungle, blds }`: `add` põe na cena da pista, `hAt(x, z)` dá a
altura do chão e as listas recebem palmeiras, iates, árvores e prédios (desenhados por `pista.js`).

## O som (`som.js`)

Regiões que o kit acha sozinho: **túnel** (`tr.coberto`: zumbido e eco do motor; o resto quase some), **torcida**
(`tr.arquibancadas`) e **helicóptero**. Regiões que o GP diz em `vida.som`, funções `(tr, x, y) => 0 a 1`
(`pertoDe((tr) => ponto, raio)` ajuda): `porto` (ondas, gaivotas, buzina de iate), `fonte`, `sinos`, `campo` (vento e
passarinhos de autódromo) e `cidade` (número ou função; sem ela, `1 - 0,7 × porto`). Tudo passa por `Sound.ambiente()`.

## As marcas (`marcas.js`)

Os patrocinadores reais desenhados no canvas (o jogo é só para os amigos): `MARCAS` (fundo, cor, letra e o traço de
cada logo), `PATROCINIO` (a ordem padrão), `desenharMarca(ctx, nome, x, y, w, h)` e `marcaTex(nome, w, h)`. Marca nova:
uma entrada em `MARCAS` (e, se o logo pedir, um traço novo em `desenharMarca`).

## Regras

- Português nos nomes e comentários, no tom do resto.
- Peça repetida vai em `InstancedMesh` ou numa malha só por material (`comum.js`: `lotes`, `tira`, `instancias`); sem
  luz dinâmica nova.
- Antes de pôr algo na beira, confira `livre(tr, x, z, folga)` (o grampo vizinho) e `ocupado(tr, x, z)`.
- Peça nova que serve para mais de uma pista entra aqui, com a sua chave na configuração e uma linha nesta tabela.
