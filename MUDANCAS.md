# Estante da Vila só com carreiras em grupo

Antes: a estante (e o top 5 do telão da Praça) somava títulos de carreiras solo e do Rumo ao Estrelato junto com as da sala em grupo.

Depois: só entram as carreiras feitas em grupo. As solo e do Rumo ao Estrelato continuam sendo guardadas, mas não aparecem no ranking nem nas últimas conquistas.

Como: `bd.estante()` lê só as linhas com `modo = 'grupo'`. Teste novo em `tests/carreira-rivais.test.js`.
