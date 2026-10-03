# Mudanças — Pelada: condução com toques curtos e dribles (parte 3)

Em cima do PR #24.

## Placa do gol
- Saiu a placa (faixa) em cima de cada gol. Fica só a faixa no chão, na boca do gol, com a cor do time.

## Condução refeita (ideias do modo Volta)
- A bola **não fica presa** no jogador: ela rola, e o jogador dá **toques curtos e frequentes**: ~4,5 por
  segundo correndo (a cada 0,22 s), um pouco menos no pique (0,27 s) e mais protegendo (0,17 s).
- **A bola só muda de rumo quando é tocada.** Entre um toque e outro ela só rola (com o atrito do chão). Virou o
  corpo? A bola segue por um instante e o próximo toque puxa ela para o lado novo: curva suave, sem teletransporte.
  Saiu o "girar a bola junto com o corpo" que existia antes.
- **Ritmo ligado à velocidade:** andando, a bola fica a ~0,55 m do jogador; correndo, ~0,8 m; no pique, ~1,15 m
  (mais longe e mais fácil de perder).
- **Pé alternado:** cada toque sai um pouco para a esquerda ou para a direita.
- **Ímã de domínio:** bem perto do pé (0,6 m) e sem toque naquele instante, uma força fraca segura a bola na frente
  dele (só para a frente e para trás, nunca de lado). Parado, a bola descansa na frente do pé.
- Cada toque balança a perna e faz um "toc" baixo, com o som mudando conforme a força. A câmera abre um pouco no pique.

## Dribles (com a bola)
| Drible | Teclado | Controle |
|---|---|---|
| Proteger a bola (anda devagar, toques bem curtos) | F (sem a bola continua segurando a camisa) | LT |
| Arrastada para o lado (tranco curto com a bola) | Q / E (carregando o chute, continua sendo efeito) | ← / → no direcional |
| Corte seco (para, vira para onde você manda ou para trás, e puxa a bola) | V | L3 |
- Tudo remapeável em "⌨️ Remapear teclado e mouse".

## Painel "⚙️ Ajustar condução (teste)"
- No menu de pausa: controles deslizantes para o tempo entre toques (correndo, no pique e protegendo), a distância
  da bola em cada situação, o alcance do pé, o pé alternado, o raio e a força do ímã, o tranco da arrastada e a
  saída do corte seco. A mudança vale na hora, fica salva no navegador e tem "Voltar ao padrão".

## Ficou de fora (dá para fazer depois)
- Elástico, finta de corpo e lençol; poeira nos pés, rastro da bola e tremida da câmera no chute.

## Arquivos
- `public/pelada/campo.js` (`conduz` e `COND`), `bola.js`, `bots.js`, `jogo.js` (dribles e zoom), `controles.js`,
  `teclas.js`, `menus.js` (painel), `estado.js` (`DRIBLE`), `sons.js` (som do toque), `arenas.js` (placa), `index.html`.
- Teste novo em `tests/campo.test.js`: toques por segundo, a bola não muda de rumo sem toque, vai mais longe no pique
  e não escapa numa curva de 90°.

## Testes
- `npm test`: 28 passaram. Testes no navegador da Pelada (`pelada.spec.js` e `pelada-modos.spec.js`): 7 passaram.
