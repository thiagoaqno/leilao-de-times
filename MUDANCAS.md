# Naruto: quadros de combate e lendários refinados

Os ninjas do Ginásio agora usam poses próprias quando golpeiam, lançam um jutsu ou recebem dano. As regras, o dano e os efeitos 3D continuam com os mesmos responsáveis.

- `ferramentas/sprites-naruto.py` mapeia e extrai ataque, lance e dano das folhas de *Naruto vs. Sasuke* e *Ninja Council 4*. As folhas de contato numeradas podem ser geradas com `ferramentas/contato-naruto.py`. São 63 tiras novas para 21 ninjas, com contagens em `naruto.js` e quadros no tamanho original.
- `animacao.js` carrega cada tira sob demanda e escolhe o quadro pelo tempo do evento. Sem a tira, o ninja mantém o parado; com `prefers-reduced-motion`, não troca para poses de ação.
- Hashirama, Minato, Madara, Obito e Shisui ganharam sombras e luz internas, dobras, mechas, detalhes no rosto, dedos e sandálias. `ferramentas/sprites-lendarios.py` continua gerando seus PNGs e quatro quadros de respiração.
- `CLAUDE.md` e `public/galeramon/NARUTO-ASSETS.md` registram o fluxo e as exceções. As fotos da arena estão em `planos/imagens/naruto-ataque-dano.png`, `naruto-lance-dano.png` e `naruto-lendarios.png`.

**Verificação:** `node --test tests/naruto.test.js` e `npx playwright test tests/e2e/naruto.spec.js` no Chrome do Playwright. O teste do navegador também confirma as três poses e a preferência por menos movimento.
