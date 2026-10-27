# Corrida F1: sala reestruturada no estilo da carreira (entrada, painel e telas de cartões)

O PR #336 só pôs uma camada de CSS por cima da estrutura antiga. Agora o HTML e o JS da sala foram refeitos, então a tela é outra.

## O que mudou
- **Entrada:** fundo escuro, título gigante, dois cartões com imagem (Temporada e Drag), cartão "Sala com amigos" (nome, código + Entrar/Só assistir, botão grande "Abrir sala nova") e faixa das equipes.
- **Topo da sala:** código da sala, abas em caixa alta com ícones e o botão LARGAR grande à direita (sempre visível).
- **Painel (dashboard):** cartão da pista com o mapa grande, cartão do meu carro (foto 3D, piloto, atalhos Garagem/Pintura), cartão de regras com as opções em pílulas, cartão da equipe (F1) e, na coluna da direita, a tabela de jogadores zebrada (posição, piloto, equipe, estado) e o cartão de status.
- **Pistas:** grade de cartões com o mapa de cada pista e o detalhe da escolhida sempre à direita.
- **Garagem:** lista de carros, carro grande no centro com a ficha em LEDs, cor e avatar à direita.
- **Pintura:** carro grande e grade de pinturas. **Equipe:** as 11 equipes em cartões e a montagem ao lado. **Regras:** cartões por opção em três grupos (Corrida, Fórmula 1, Grid e robôs) com pílulas.
- **Celular (375 px):** uma coluna, 16 px de margem, abas viram a barra inferior com ícones, sem rolagem horizontal.
- `sala-f1.css` removido; `sala.css` novo. CSS morto do box antigo saiu de `entrada.css` e `tema-f1.css`. `carPreview` ganhou foto grande (720x405) para a garagem e a pintura.
- Mesmos eventos de socket e ações; os ids usados pelos testes foram mantidos (`#hubAbas [data-aba]`, `#btnStart`, `#carPick`, `#modPick`, `[data-pista]`, `[data-regras]`).

## Conferido
- Capturas antes/depois em 1440 px e 375 px; criar sala, todas as abas, escolher pista/carro/cor/avatar/pintura/regras/robôs, equipe (F1) e largada contra robôs, sem erro no console.
- `tests/e2e/corrida-carreira-f1.spec.js` passa. `node --test tests/corrida*.test.js`: só falhou o teste de ritmo dos robôs por nível (sensível a tempo, sem relação com a interface).

## Fora do escopo
- O lobby não tem "pronto" por jogador no servidor; a coluna Estado mostra Org./Pronto (online)/Offline.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
