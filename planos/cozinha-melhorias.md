# Cozinha da Galera: o que falta para ficar com cara de Overcooked

Lista do que melhorar depois do PR da base (`planos/cozinha.md` tem a ideia e as fases). Cada bloco vira um PR. A ordem
segue a prioridade: primeiro o que se sente em toda partida (animação, som e ritmo), depois o conteúdo novo.

## 1. Animações das bancadas (o que mais falta hoje)
- **Picar:** a faca da tábua sobe e desce na mão do cozinheiro, com o ingrediente encolhendo em pedaços a cada corte
  (3 ou 4 estágios até "picado") e lasquinhas pulando. Hoje só o braço balança e a faca fica parada na tábua.
- **Fogão aceso e apagado:** a boca acende (chama azul/laranja animada, luz piscando no tampo) só com panela ou
  frigideira com comida em cima; apaga sem nada. Hoje o anel só brilha parado.
- **Cozinhando:** borbulhas no caldo da panela, vapor subindo, a carne chiando e mudando de cor aos poucos na
  frigideira (cru → dourado → frito → preto).
- **Pia:** espuma e bolhas enquanto lava, o prato girando na mão do cozinheiro, água escorrendo da torneira, e o prato
  limpo aparecendo no escorredor com um brilho. Hoje é só o braço mexendo.
- **Queimar como no Overcooked:** a fumaça escurece aos poucos, o aviso "!" pisca cada vez mais rápido com o apito, e
  no fim a panela **pega fogo** (fase 2: fogo que espalha para as bancadas vizinhas e o extintor).
- **Entrega:** o prato some pela janela/esteira, a comanda certa sai voando com o carimbo e as moedas pulam até o
  placar. Pedido errado: o prato volta com um "não".
- **Pratos sujos:** a pilha aparece no retorno com um "plim", e o número em cima quando passa de 3.
- **Cozinheiro:** pegar e soltar com um pulinho do item (hoje troca de lugar seco), segurar com as duas mãos, o
  impulso com poeirinha atrás e a cara de esforço picando.

## 2. Tutorial e começo de fase
- **Tela da receita antes de começar** (como o Overcooked): a ficha de cada prato do cardápio, com o passo a passo em
  desenho (caixa → tábua → panela → prato → entrega) e os ingredientes. Fica na tela durante a contagem e reaparece
  no menu de pausa.
- **Primeira vez em cada cozinha:** setas e balões em cima das bancadas na ordem (pegue a cebola, pique aqui, ponha
  na panela...). Some quando o primeiro prato sai. Guardar no navegador (`cozinha:visto`) o que já foi mostrado.
- **Dica contextual:** com ingrediente cru na mão, a tábua pisca de leve; com o prato vazio, a panela pronta pisca.
- Mostrar a meta das 3 estrelas no começo e uma barrinha das estrelas enchendo junto do placar (hoje elas só aparecem
  no fim).

## 3. Ritmo: tempo, pedidos e estrelas (rever as contas)
As contas de hoje (1-1, 2 cozinheiros):
- **O que dá para fazer:** cada sopa leva 3 × 2,4 s picando + 13,5 s no fogo + uns 6 s andando, servindo e lavando.
  Com 2 fogões e duas pessoas, sai uma sopa a cada ~9-10 s quando a dupla está afinada.
- **Pedidos que existem:** começam 2 e chega 1 a cada 16-24 s (máximo 4 na fila). Em 3 min isso dá só ~11 pedidos,
  então quem joga bem **fica parado esperando pedido**: o teto é o relógio dos pedidos, não a habilidade.
- **Estrelas:** 40/80/120 pontos com 2 pessoas (≈ 2, 3 e 5 sopas) e 25/50/70 sozinho. Fácil demais: 3 estrelas saem
  sem pressa.

O que mudar:
- **Fila sempre cheia, como no Overcooked:** entregou, chega outro pedido em 1-3 s até o máximo; o intervalo só vale
  enquanto a fila está abaixo do mínimo. Assim, quanto mais rápido a galera cozinha, mais ela pontua.
- **Calibrar as estrelas por conta, não no chute:** um "cozinheiro perfeito" no `regras.js` (o mesmo planejador do robô
  da seção 4) joga cada cozinha sozinho e em dupla, com o tempo de andar real do mapa, e dá o máximo de pontos. As
  estrelas viram frações desse máximo: **1★ ≈ 35%, 2★ ≈ 60%, 3★ ≈ 85%**. Um teste confere que toda cozinha do
  catálogo tem 3 estrelas possíveis e que a 3ª exige pelo menos ~80% do ótimo.
- **Ajustar por número de cozinheiros** com a mesma simulação (1, 2, 3 e 4), no lugar do `FATOR_META` fixo.
- **Gorjeta do Overcooked 2:** entregar em sequência na ordem da fila sobe um multiplicador (×1 a ×4); errar a ordem
  ou deixar um pedido vencer zera. É o que separa 2 de 3 estrelas.
- Rever a paciência dos pedidos (75 s pode ser muito para sopa) e o tempo de queimar (11 s depois de pronto), com a
  mesma simulação, para dar margem a quem esqueceu mas não para sempre.

## 4. Jogar sozinho: dois cozinheiros, trocando entre eles
- Igual ao Overcooked 1: **sozinho, você tem dois cozinheiros** e troca entre eles com uma tecla (Q / botão no
  celular). O que fica para trás para onde estava, **mas continua o trabalho de bancada** que começou: se deixou picando
  ou lavando, termina sozinho.
- Na sala com robôs ligados, as vagas livres viram cozinheiros para trocar (como a troca de jogador da Pelada).
- Depois (fase 5 do plano): um **robô ajudante** de verdade, que faz tarefas simples sozinho (picar o que está na
  tábua, lavar louça, levar prato pronto), usando o mesmo planejador da calibração.

## 5. Controles e sensação (física)
- **Arremessar ingrediente** (Overcooked 2): segurar o botão de usar com ingrediente na mão mira e joga; cai na
  bancada, na panela ou na mão do colega. Pegar no ar.
- Impulso empurrando o colega (hoje só se afastam).
- A bancada da frente acesa com um contorno mais claro (hoje é uma placa amarela por cima) e o item que vai ser pego
  piscando.
- Andar na diagonal sem "grudar" na quina das bancadas (escorregar pela borda).
- Câmera: em tela em pé, chegar mais perto e seguir um pouco o grupo; em tela deitada, ok como está.

## 6. Som e música
- Música de cozinha animada que acelera no último minuto, como no Overcooked.
- Sons de faca na tábua, fritura, água da pia, sino da entrega, o "tic-tac" dos últimos 10 s e a voz/efeito de
  "pedido novo".
- Botão de volume e de música separados na pausa.

## 7. Conteúdo novo (depois das animações e do ritmo)
- **Receitas:** sopa de cogumelo (já existe nos dados), sushi (peixe + arroz + alga, o arroz na panela), sashimi,
  burrito (tortilha, arroz, carne), pizza (massa, tomate, queijo e forno). Cada uma só pede dado novo e, quando tiver
  forno, um recipiente novo.
- **Cozinhas que mexem:** bancadas que andam, gelo que escorrega, a cozinha que se divide no meio da partida, mesa
  rolante. O mapa ganha "eventos" com o tempo.
- **Mapa das fases** com as estrelas guardadas no navegador destravando a próxima (como o mapa do Overcooked).
- **Visual de cada cozinha** (restaurante, food truck, cozinha de navio...), com o chão e as paredes por tema.

## 8. Fechar o que já existe
- Mostrar no prato montando o que ainda falta (ícones fantasmas dos ingredientes da receita mais próxima).
- Nome do item na mão ao segurar (pequeno, em cima do cozinheiro), para quem está aprendendo.
- Testes E2E da página: entrar, abrir a cozinha, pegar e entregar com o teclado (hoje a página só é aberta sem erro).
