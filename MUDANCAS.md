# Carreira em grupo: passar o cargo de anfitrião

- **Antes**, quem criava a sala era o anfitrião para sempre. Se ele saísse ou não pudesse continuar, ninguém mais conseguia começar a rodada, mudar as regras ou começar a temporada.
- **Agora**, o anfitrião tem o botão **Tornar anfitrião** ao lado de cada técnico (na sala de espera e no painel Turma da sede). Depois de confirmar, o cargo passa para aquela pessoa, e quem recebe ganha um aviso.
- Se o anfitrião ficar fora da sala por 2 minutos, o cargo passa sozinho para o próximo técnico da lista que está no ar. Assim a turma não fica presa esperando.

## Como

- `carreira-online.js`: a ação `act` `anfitriao` (`pessoa`, o id), só do anfitrião, na espera ou com a carreira rolando; e `anfitriaoSumiu`, no relógio da sala, que passa o cargo quando o anfitrião está fora há mais de `CARREIRA_ANFITRIAO_MS` (120 s; os testes encurtam).
- `public/carreira/grupo.js`: `botoesDoAnfitriao` (Tornar anfitrião e Dispensar) nas duas listas, a confirmação e o aviso quando o cargo chega em você; `estilo.css` põe os dois botões lado a lado.
- Teste: `tests/carreira-online-anfitriao.test.js` (só o anfitrião passa, o novo anfitrião manda nas regras e o cargo passa sozinho quando ele some).
