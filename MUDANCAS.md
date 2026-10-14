# Road to Champions: as telas no jeito de "A Jornada"

## O que muda

A página `/jogador/` foi redesenhada a partir das referências do modo "A Jornada" (FIFA 17–19) e da carreira do FIFA 16. As regras, os eventos e o servidor não mudaram: a página manda os mesmos comandos.

- **Entrada em três etapas** (Protagonista, Visual, Sala):
  - **Protagonista:** os seis lado a lado num palco com a cidade do clube ao fundo, o escolhido em destaque e a placa com escudo, posição e idade. Embaixo, a **linha do tempo** dos cinco capítulos, com a cabeça do protagonista nos dois eventos que são só dele.
  - **Visual:** o editor no jeito da personalização do FIFA 18: as categorias à esquerda (com o valor atual), a grade de opções desenhadas com o próprio boneco (o rosto recortado para cabelo, barba e semblante) e a prévia grande à direita. ★ marca a sugestão do personagem.
  - **Sala:** nome na sala, nome do jogador, criar campanha ou entrar com código. Se o protagonista já tiver dono na sala, a tela avisa e volta para a escolha.
- **Vestiário (lobby):** seis armários, um por protagonista, com quem já entrou e as vagas abertas. O ajuste do protagonista abre na mesma tela, com o palco e o editor.
- **Central (o apartamento):** o protagonista em pé na sala, com a janela para a cidade do clube, e os blocos ao lado:
  - **Avançar:** o confronto da jornada com os escudos, o calendário dos cinco capítulos com os resultados, e a ação do momento (abrir a cena, jogar a jornada ou esperar);
  - **Atributos** em anéis, **Estilo de vida** com o medidor do personagem, **Social** (o diário como posts, com a cabeça de quem postou), **Classificação** do grupo e **Destinos cruzados** (os laços, numa barra de -100 a 100).
  - Abas **Classificação** (os dois grupos completos, semifinais, final e as jornadas) e **Diário**.
- **A decisão vira cena:** abre sozinha uma vez por capítulo, como uma entrevista (parede de patrocínio, microfone, o texto em legenda e as respostas com o tom). Depois vem o **pré-jogo**, separado: o confronto e as três estratégias com o desenho de cada uma. "Decidir depois" fecha e o bloco Avançar reabre.
- **Espaço para as artes dos pop-ups:** a cena procura `/jogador/popups/rtc-popup-<id do evento>.png`; sem o arquivo, fica a parede desenhada.
- **Escudos da Carreira** em todas as telas (o desenho de `escudos.js` e a imagem da API por cima).
- **Epílogo:** o campeão com o escudo e um cartão por protagonista, com a figura, o título e o texto.
- No celular: a fileira de protagonistas rola de lado e centraliza o escolhido, as categorias do editor viram uma faixa, os capítulos usam nomes curtos (J1, J2, J3, Semi, Final).

## Verificação

- `tests/road-to-champions.test.js`, `tests/salas.test.js` e `tests/servidor.test.js` passando (34 testes).
- Uma campanha inteira com dois jogadores (um no computador, um no celular) no Chromium, do protagonista ao epílogo, sem erro de script. Fotos em `planos/imagens/rtc-*.png`.
