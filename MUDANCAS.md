# Site pronto para domínio novo e Google (SEO)

**Antes:** o site não tinha `robots.txt`, `sitemap.xml`, descrição nem imagem de compartilhamento, e a Vila era só um canvas sem texto para o Google ler.

**Depois:** `/robots.txt` e `/sitemap.xml` (as 24 páginas dos jogos), e toda página sai com descrição, endereço canônico e tags de compartilhamento (imagem `public/og.png`). A Vila ganhou uma lista escondida de links para os jogos, que o Google lê. O endereço vem de `SITE_URL`, então trocar de domínio não exige código.

**Como:** `seo.js` (ligado em `server.js` antes do `express.static`) injeta as tags ao servir o HTML; teste em `tests/seo.test.js`; passo a passo em `DEPLOY-FLY.md`.
