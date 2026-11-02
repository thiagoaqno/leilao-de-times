# Corrida: previsão de contato respeita o estado fantasma

Após uma batida, o servidor deixa os carros sem colisão por dois segundos. A previsão no navegador ignorava esse estado e ainda podia calcular outros impactos, gerando correções de posição e de velocidade enquanto o servidor considerava os carros fantasmas. A previsão agora respeita tanto o fantasma de batida quanto o do box, para o jogador e para os demais pilotos; o contato volta ao normal quando o servidor retira o estado.

Isso corrige uma divergência concreta após contatos. A causa de eventuais congelamentos completos de vários segundos ainda não foi confirmada; uma medição local isolada do cálculo de contato do servidor não reproduziu uma pausa dessa ordem.

## Verificação

- Testes de colisão, punição e fantasma aprovados, incluindo a previsão do contato durante e depois do estado fantasma.
- 24 testes de rede e reconciliação aprovados.
