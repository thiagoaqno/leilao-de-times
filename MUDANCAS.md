# Escudos da Carreira salvos no repositório

- Salva 158 escudos de clubes em `public/carreira/escudos-locais/` (cerca de 5 MB). A Carreira, o Rumo ao Estrelato e o Road to Champions carregam esses PNGs pelo nosso servidor, sem consultar a TheSportsDB durante o jogo.
- Corrige seis endereços antigos que apontavam para equipes femininas ou de base. Para clubes sem imagem confiável (Botafogo-SP, Athletic-MG e Deportivo La Coruña), permanece o escudo SVG desenhado pelo jogo.
- `GET /api/escudo/:id` agora entrega apenas um arquivo local previsto no catálogo. A imagem SVG continua visível enquanto o PNG carrega e se ele falhar.
- `node tools/baixar-escudos-locais.js` permite buscar os escudos faltantes e baixar os arquivos ao preparar uma atualização. Use `--refresh` para baixar novamente os escudos existentes. A rede só é necessária nesse processo de manutenção.

## Verificação

- `node --test tests/carreira-ajustes.test.js`: 6 testes passaram, incluindo presença e assinatura PNG de todos os 158 arquivos.
- `npx playwright test tests/e2e/carreira.spec.js --grep "arte das notícias usa o PNG local"`: endpoint e arte das notícias passaram.
