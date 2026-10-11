# Carreira: ver o elenco e a escalação de qualquer clube, inclusive o dos amigos da sala

- **Antes**, só dava para ver o seu próprio time. O elenco de um amigo da sala ou de qualquer outro clube não aparecia em lugar nenhum, a não ser jogador por jogador no mercado.
- **Agora**, tocar num clube abre uma janela com o elenco dele, nas cores do clube: o campinho com os 11 que entrariam em campo agora (na formação e no estilo de jogo dele, com a nota e quem está improvisado), a força, o técnico e o banco com o resto do elenco em figurinhas. Tocar num jogador abre a ficha dele por cima, com a proposta, como no mercado.
- O time de um amigo da sala aparece com a escalação que **ele** deixou salva. O de um clube do computador é o time provável, a mesma escalação automática que o jogo usa.
- Abre pela turma da sala (o painel "Turma" na sede), pela tabela (a cheia e a mini da sede, as copas e as temporadas anteriores), pelo calendário, pelo próximo jogo e pelo último jogo. Quem só está assistindo a sala também consegue ver.
- É só para ver: nada muda no save e ninguém fica sabendo que você olhou.

## Como

- `carreira.js`: `fichaDoTime(save, id)` monta o elenco (ordenado pela nota), a escalação (`Motor.escalacaoDetalhada`), a formação, o estilo (o `auto` do computador vira o que mais combina, `Taticas.estiloIdeal`), a força, quem está fora e os jovens da base daquele clube (o navegador só conhecia os que já tinham aparecido). Na sala, o técnico humano sai da visão do clube dele (`vistaDe`). Evento `verTime` no canal `/carreira`, só de leitura (não salva e não manda o estado).
- `carreira-online.js`: o mesmo evento `verTime` na sala, para qualquer pessoa da sala depois do começo, com ou sem clube.
- `public/carreira/ver-time.js` (novo, `window.VerTime`) e o diálogo `#verTime` em `index.html`: qualquer elemento com `data-time="<clube>"` abre a janela; usa o `campinho` da prancheta e a `figurinha` do mercado. O tema do clube visto vem de `temaClube`, e `hub.css` refaz as cores do painel dentro da janela.
- `telas.js` e `grupo.js`: `data-time` nas linhas das tabelas, no calendário, nos confrontos do próximo e do último jogo, nas chaves das copas e na turma.
- Testes: `tests/carreira-ver-time.test.js` (computador, o seu time, o amigo com a escalação dele e o evento nos dois canais) e `tests/e2e/carreira-ver-time.spec.js` (a turma, a tabela, a ficha por cima e o celular).
