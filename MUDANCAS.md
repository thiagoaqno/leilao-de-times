# Leilão: elenco com vida (voo até o time, falas, nome do time e trocas)

## 1. Animações
- **Comprou:** o jogador (ou ingrediente) sai voando da roleta até o time de quem comprou e só então pousa na vaga do
  campinho, na lista ou no prato. No futebol, o cartãozinho mostra a nota.
- **Trocou de time:** ele voa da vaga no time antigo até o novo.
- **Mudou de posição:** no campinho, o jogador desliza do lugar antigo até o novo, em vez de pular.

## 2. Nome do time
- Cada participante pode dar um nome ao time (até 20 letras), no campo "Nome do seu time" do painel.
- **Onde aparece:**
  - no cartão do time, em cima do nome de quem montou;
  - no texto do campeonato simulado, no placar ao vivo, na tabela e no card do campeão;
  - na batalha dos pratos e no texto para a IA.
- Sem nome, o time continua sendo chamado pelo nome da pessoa, como antes.

## 3. Frases no balãozinho
- **Ao chegar:** o jogador fala num balão em cima dele no campinho. São 20 frases, como "Meu sonho sempre foi jogar no
  Galáticos!", "Vou honrar cada uma das 9 moedas!" e "Primeira coisa: alguém me passa a senha do Wi-Fi?". Usa o
  nome do time e o preço.
  - Nos temas de comida, o ingrediente fala em cima do prato (12 frases). Nos outros temas, há 8 frases gerais.
  - Quem chega por troca tem as suas próprias frases ("Nem desfiz a mala e já mudei pro…").
- **Ao mudar de posição no seu campinho:** a fala depende de como ele rende no lugar novo.
  - Rende melhor: "Agora sim, professor!".
  - Rende pior: "Professor… tem certeza disso?".
  - Foi para o gol sem ser goleiro: "Alguém me empresta as luvas?".
  - Saiu do banco: "Até que enfim!".
  - Foi para o banco: a fala aparece num aviso, porque o banco não tem lugar no campinho.
- As frases não repetem até usar todas do grupo. Cada balão fica uns 3,5 segundos.

## 4. Trocas depois do leilão (opcional)
- Com o leilão encerrado, o organizador aperta **🔁 Abrir trocas**. Aparece o quadro de trocas para os participantes.
- **Propor:** escolha um jogador seu, o time e o jogador de lá. O outro vê a proposta e aceita ou recusa, e quem
  propôs pode cancelar.
- **Regras:**
  - a troca é de 1 por 1, sem moedas;
  - a composição do tema não pode piorar (por exemplo, um time obrigado a ter goleiro não fica sem);
  - quem muda de time perde a posição fixada no time antigo;
  - propostas que envolviam um jogador já trocado somem.
- **Quando fecham:** quando o organizador simula o campeonato ou abre a votação dos pratos, ou se ele apertar
  "Fechar trocas".

## Também corrigido
- Às vezes o estado do servidor chegava antes de as últimas partes da página carregarem, e a tela quebrava (um erro
  no console). Agora a página espera a última parte e desenha assim que ela chega.

## Conferido
- No navegador, com 1 pessoa e 3 robôs, no futsal e no hambúrguer:
  - nome do time;
  - o voo da roleta até o campinho e até o prato;
  - os balões de chegada no campinho e no prato;
  - a troca de posição deslizando, com a fala do gol ("Vou fechar o gol. Ou pelo menos tentar.");
  - trocas propostas e aceitas, com os dois jogadores voando e o quadro de trocas atualizado.
- `npm test` (46) e o teste de abrir as páginas (22) passando.
