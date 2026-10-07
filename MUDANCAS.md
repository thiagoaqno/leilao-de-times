# PR 1 — A base do mundo

## O que mudou

- Cria `ferramentas/base-mundo.js`, uma ferramenta determinística que lê `dados/ea_fc26/ea_fc26_players.csv` com um parser de CSV próprio, inclusive campos entre aspas com vírgulas.
- Gera uma base separada para Premier League, La Liga, Serie A, Bundesliga e Ligue 1, além dos seis argentinos da Libertadores e dos clubes sul-americanos.
- Converte posição, nacionalidade, data de nascimento, nota e atributos do EA FC 26 para o formato da Carreira. Cada jogador mantém o ID de origem em `ea`; jovens fictícios aparecem apenas para completar o mínimo do elenco e levam `base: true`.
- Limita cada elenco a 18–28 atletas e garante pelo menos três goleiros. A chave de origem de clube usa sempre `leagueName + team`, então os dois Racing Club continuam separados.
- Corrige os nomes sem licença da Itália (Inter de Milão, Milan, Lazio e Atalanta) e outros nomes abreviados do CSV.
- Acrescenta cores, sigla, estádio, país, receita de escudo, tamanho e orçamento aos clubes. O orçamento estrangeiro vem do valor de mercado do elenco com o fator da liga.
- Calibra todo o Brasileirão com uma única diferença de escala em relação a River Plate e Boca Juniors, preserva a base estimada existente e acrescenta `liga`, `pais` e `orcamento`.
- Gera `mundo-2026.js`, com o índice das ligas e a primeira Libertadores de 32 clubes: sete brasileiros, seis argentinos e 19 dos outros países.
- Adiciona `npm run base:mundo` e amplia `tests/carreira-base.test.js` com as validações previstas no plano. As ligas novas ainda não são usadas pela carreira solo; isso fica para o PR 2.

## Arquivos gerados

- `inglaterra-2026.js`, `espanha-2026.js`, `italia-2026.js`, `alemanha-2026.js` e `franca-2026.js`;
- `argentina-2026.js` e `sulamericanos-2026.js`;
- `brasileirao-2026.js`, agora calibrado e limitado a 28 atletas por clube;
- `mundo-2026.js`, o índice das competições.

## Conferido de verdade

- `npm test`: 115 testes passaram, 0 falharam (57,7 s).
- `npm run test:e2e`: a execução completa foi interrompida no teste 50 de 61 depois de dois casos instáveis falharem durante a rodada; todos os outros executados passaram.
- Os dois casos que falharam foram repetidos isoladamente e passaram: Carreira desktop (1/1, 13,7 s) e Pelada online com dois navegadores (1/1, 12,9 s).
- A ferramenta foi executada duas vezes seguidas e gerou os mesmos hashes.
- `node_modules/` permanece ignorado e não faz parte do commit.
