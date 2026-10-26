# Emblemas da Carreira F1

Os onze PNGs desta pasta são cópias locais dos emblemas encontrados na [TheSportsDB](https://www.thesportsdb.com/). `index.json` guarda o nome, a sigla, a cor, o arquivo e a URL de origem de cada equipe. `index.js` expõe o mesmo índice ao navegador.

Para atualizar as imagens e o índice, execute `node ferramentas/baixar-logos-f1.js --refresh` na raiz do projeto. A página usa `/api/corrida/logo/:id`, que serve o PNG local. Se faltar um arquivo ou ele não carregar, o menu mostra a sigla nas cores da equipe.
