# Limpeza: o que não roda mais sai do projeto

Segundo passo da refatoração. Nada muda na tela: sai só o que nenhuma página, rota ou jogo usava.

## O que sai

- **Rumo ao Estrelato (o Modo Jogador):** o `server.js` não liga esse canal desde que o Road to Champions ocupou o
  `/jogador/`. Saem:
  - `jogador.js`, `jogador-historia.js` e `jogador-mercado.js`;
  - a página antiga (`public/jogador/jogador.js` e `jogador.css`);
  - o bloco do fim do `carreira.js` que só servia a ele (`jogarProximoDoJogador` e `module.exports.jogador`);
  - o teste `tests/jogador.test.js`.

  As carreiras desse modo que já estão no banco continuam lá. O painel de moderação ainda as mostra como "Rumo ao
  Estrelato", e a estante guarda os títulos delas.
- **`index.antigo.html`:** a página antiga do Leilão, que ficava fora da `public`. Ela continua no histórico do Git
  (`PROJETO.md` e `.dockerignore` acertados).
- **A música da "Vila 3D":** um MP3 de 14 MB em `public/vila3d/`, a rota `/api/musicas-vila3d` e o teste dela. Não
  existe página da Vila 3D.
- **`/pelada/campo.js` na Corrida:** a página carregava 900 linhas que nenhum script dela usa.

## O que muda de lugar

- **`tools/` entrou em `ferramentas/`:** eram duas pastas para a mesma coisa, os scripts que rodam fora do site
  (`baixar-escudos`, `baixar-escudos-locais`, `baixar-estadios`, `baixar-trofeus` e `importar-carros-drag.py`). Os
  comentários "gerado por" e o `CLAUDE.md` apontam para o lugar novo.
- **`trofeus-carreira.js`** foi para `ferramentas/`: só a ferramenta dos troféus e o teste dela usam.

## O que ficou

- **A tabela `rtc_campanhas`** (as campanhas do Road to Champions) continua no banco. Apagar dados do banco de
  produção precisa de uma liberação à parte.

## Testes

- `musica`, `carreira-trofeus-api`, `carreira-servidor` e `salas`: passando.
- No navegador, `paginas.spec.js` abre `/corrida/` sem erro sem o `campo.js`. Nenhum script da Corrida usa `Campo`.
