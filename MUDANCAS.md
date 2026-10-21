# Drag: carros novos, garagem à meia-noite e vácuo que vira nitro

## O que muda

- **Cinco carros novos no drag:** Nissan Skyline R34 GT-R, Lamborghini Gallardo LP560-4, Volkswagen Phideon, Polo Plus e T-Cross (onze no total), cada um com marchas, força e nitro próprios. `tools/importar-carros-drag.py` agora importa só o que estiver na pasta (ZIP com glTF, ZIP com GLB ou GLB solto) e tira a licença do próprio GLB quando o ZIP não traz `license.txt`.
- **Faróis e lanternas no lugar certo:** `modelos.js` guarda, para cada um dos onze modelos, onde ficam as lanternas e os faróis, conferidos de frente e de trás em cada carro (R33, R34 e Supra com as duas lanternas redondas de cada lado). Os carros agora têm farol aceso com o facho no asfalto, e a lanterna fica mais forte no freio (o seu e o dos rivais). Sai a busca automática de lanternas, que errava em alguns modelos.
- **O vácuo vira nitro:** colado atrás de um rival, o tanque de N2O vai enchendo (mais rápido com a barra cheia, e um bônus quando ela enche). O vácuo não deixa mais o ar mais leve. O HUD mostra "VÁCUO → N2O", o medidor de nitro brilha enquanto enche, e o resultado mostra quanto nitro veio do vácuo.
- **A garagem (casa do drag) e a oficina:** o lobby virou uma rua à meia-noite com o galpão da Garagem da Galera, letreiro e tubos de neon, poste de sódio, asfalto molhado e a galera parada em volta, com o seu carro em exposição. Dá para trocar de carro pelas setas, ver a ficha (força, final, nitro) e abrir a oficina: pintura (11 cores ou a de fábrica), neon, cor dos faróis e cor da chama do nitro, guardados por carro no navegador. Do fim da corrida dá para voltar à garagem.
- **Lobby com cara de racha:** relógio de neon que abre às 23:58, "Meia-noite. Rua vazia. Quatro faixas.", as pistas como pontos de encontro e quem está na área. O céu da garagem e das pistas é a foto noturna que a Corrida já usava (`/corrida/ceus/tokyo.jpg`, Poly Haven, CC0).
- **Câmera interna:** C (ou o botão CAM no celular) troca entre a câmera de trás e a de dentro do carro, no banco do motorista de cada um dos onze modelos (conferido olhando de dentro; o R33 e o R34 têm o volante à direita), com o painel aceso. A escolha fica guardada.
- **Garagem do Drag na Vila:** a casinha nova entre o MASP e a Consolação, com a pista de arrancada pintada no telhado, a árvore de luzes e o neon. O "← Vila" do drag volta para a porta dela.
- **Carregando:** a porcentagem do seu carro aparece na garagem, os rivais carregam logo depois e os outros carros vão baixando devagar para trocar na hora (fora do celular). Ao largar, uma tela de carregando mostra os carros chegando e a pista sendo preparada.
- **Serra à Noite:** pista nova com curvas fechadas (paredão de pedra, ribanceira com mata, guard-rail, olhos de gato e placas de curva). O carro esterça sozinho, deita na curva e o pneu canta.
- **Ponteiro 10% mais rápido:** a aceleração subiu 10% (o giro sobe mais rápido em cada marcha) e o aquecimento dos pneus também sobe o giro 10% mais rápido.
- **Som de cada motor, com pops and bangs:** sintetizado com o jeito de cada carro (4, 6, 8 ou 10 cilindros, giro, turbo ou aspirado): o assobio e a válvula do turbo, estalos no escapamento ao tirar o pé em giro alto e o estouro na troca, com a labareda saindo do escapamento.
- **Primeira corrida sem tranco (drag):** a largada espera os modelos dos rivais (antes, o carro provisório era trocado pelo modelo no meio da corrida), compila os shaders de tudo o que vai aparecer e sobe as texturas antes de o relógio andar; as partículas já nascem prontas e a pista é reaproveitada quando é a mesma.
- **Primeira corrida sem tranco (Corrida):** a preparação da largada também compila os efeitos que só nascem no meio da corrida (fumaça da derrapagem, cacos, explosão, "POW!" e os itens).

## Verificação

- `node --test tests/corrida-drag.test.mjs tests/corrida-experiencia.test.js tests/corrida-colisao.test.js tests/corrida-robos.test.js`: 33 passam (inclui o teste novo do vácuo que enche o nitro).
- Faróis e lanternas dos onze modelos conferidos em fotos de frente e de trás; fotos da garagem, da oficina e da largada (Supra, Gallardo e T-Cross) num Chrome sem janela.
- `tests/e2e/corrida-drag*.spec.js` foram atualizados (onze modelos, teste da garagem), mas não rodados.
