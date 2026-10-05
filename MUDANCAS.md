# Rumi: a regra dos 30 pontos da primeira descida virou opção da sala

## Como fica
- Na sala de espera, o organizador escolhe **Primeira descida: Precisa de 30** ou **Livre**. O padrão continua
  "Precisa de 30", então para quem já joga nada muda.
- **Livre:** todo mundo começa como se já tivesse aberto. Vale baixar qualquer combinação válida (sem mínimo de
  pontos) e mexer nas combinações da mesa desde a primeira jogada. Os robôs seguem a mesma regra.
- **Na tela, com "Livre":**
  - some o "· não abriu" embaixo de cada jogador;
  - some a conta "Primeira descida: X/30";
  - a mesa vazia não fala mais em 30 pontos;
  - não aparece a mensagem "abriu o jogo".
- As regras da página explicam a opção. A escolha fica salva para as próximas salas.

## Por dentro
- `rumi.js`: a configuração `abertura` (ligada por padrão). Na hora de conferir a jogada (de gente e de robô), o
  servidor trata quem ainda não abriu como já aberto quando a regra está desligada. O servidor continua conferindo
  tudo.
- `public/rumi/jogo.js` e `public/rumi/index.html`: a opção na sala, o aviso e a regra explicada.

## Conferido
- **Servidor de verdade**, primeira jogada de 15 pontos: recusada na sala "Precisa de 30" ("a primeira descida
  precisa de 30 pontos (tem 15)") e aceita na sala "Livre".
- **Teste novo da regra:** sem a regra dos 30, 9 pontos valem e pode encostar na mesa.
- **No navegador:** a opção na sala de espera.
- `npm test` e o teste de abrir as páginas passando.
