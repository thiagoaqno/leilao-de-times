# Carreira: dá para trocar de clube também no começo da temporada, e se candidatar

## O que muda no jogo

- **Antes não aparecia proposta.** O mercado de técnicos só abria no fim da temporada e só para quem terminava a temporada depois da novidade. Carreiras que já estavam rodando viraram a temporada sem nenhuma proposta, e a janela fechava. Além disso, técnico com pouco prestígio podia ficar sem convite nenhum.
- **Sempre sai pelo menos uma proposta.** Se nenhum clube caberia pelo prestígio do técnico, vêm os dois clubes de força mais próxima da do time dele.
- **O mercado reabre no começo de cada temporada**, antes do primeiro jogo (a partir da segunda temporada). Lá a troca é na hora: o calendário, o elenco e o caixa já são do clube novo. Carreiras que já estão com a temporada nova começada e ainda sem jogo ganham as propostas ao abrir. Depois do primeiro jogo o mercado fecha até o fim da temporada.
- **Candidatar-se.** A aba Temporada lista clubes (até 14) com a chance de o clube aceitar, pela reputação e pelos resultados do técnico. Cada clube responde uma vez, e o resultado é sempre o mesmo para a mesma carreira. Quem aceita vira a proposta escolhida (na hora, no começo da temporada; na virada, no fim).
- A Central avisa quando o mercado está aberto, e o painel Mercado de técnicos ficou no alto da aba Temporada.

## Como

`carreira-tecnicos.js`: `momentoDe` (`fim` ou `comeco`), `gerar` (garante uma proposta), `visao` (as propostas e os candidatos, gerados ao abrir o save se faltarem), `candidatar`, `escolher` e `trocarClube` (a troca de clube, agora também com o calendário). `carreira.js`: ações `vaga` e `candidatar`, e `ctxTecnicos`. Testes em `tests/carreira-tecnicos.test.js` e `tests/e2e/carreira-mercado-tecnicos.spec.js`.
