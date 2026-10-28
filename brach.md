## Tema escuro da Carreira F1 e fundos novos

A entrada, a sala e a sede da temporada usam duas imagens locais de paddock, escurecidas e levemente desfocadas. O tema compartilhado voltou ao fundo escuro, com textos claros e controles nativos no mesmo esquema de cor.

### O que mudou
- `public/corrida/fundo-carreira-entrada.webp` e `fundo-carreira-sede.webp`: novas imagens de fundo criadas para o jogo e otimizadas para WebP.
- `entrada.css`, `tema-f1.css`, `sala.css` e `temporada/sede.css`: fotos, camadas de escurecimento e contraste consistente nas telas da carreira.
- `temporada/garagem.css`: cor da equipe usada sobre base escura e nota do carro em painel escuro, mantendo legível a McLaren e as outras equipes.
- `index.html`: cartão da temporada atualizado e crédito antigo removido, pois a foto de Mônaco já não é usada.

### Verificação
- Capturas visuais da entrada, sala e sede da McLaren em desktop, e entrada no celular.
- `npx playwright test tests/e2e/corrida-carreira-f1.spec.js`: passou.
- `git diff --check`: passou.
