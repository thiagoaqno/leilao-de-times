# Interlagos: protótipo de ambiente de Fórmula 1

Interlagos ganha luz traseira vermelha em matriz de LEDs, com pulso de 0,8 s, discos dianteiros incandescentes sob frenagem forte e faíscas do assoalho em alta velocidade sobre zebras ou trechos inclinados. Com menos movimento, a lanterna fica acesa e as novas faíscas são desativadas.

A ambientação percorre a volta: 82 painéis de Interlagos/São Paulo/GP da Galera, 16 postos cobertos, 21 placas de aproximação de curvas, cercas e novas arquibancadas em trechos intermediários. Menos árvores junto à pista deixam as estruturas visíveis; o asfalto de Interlagos perde a faixa tracejada central. Peças repetidas usam InstancedMesh e materiais compartilhados, e o posicionamento verifica a distância aos outros trechos do circuito.

O protótipo e os novos efeitos só são ativados em Interlagos. Mônaco continua com o visual anterior. Os elementos novos são cenográficos, sem mudar colisões ou regras.

Validação: 29 testes de corrida passaram (colisão, experiência, poderes, recordes e robôs); sintaxe dos módulos e git diff --check sem erros. Inspeção no navegador do app em quatro posições da volta, com verificações do pulso dos LEDs, aquecimento dos discos, contagem da ambientação e isolamento de Mônaco.

Refino do asfalto: textura de agregado fino de 1024 × 1024, repetida a cada 8 metros, com relevo sutil e variação de desgaste; marcas de borracha acompanham as curvas em uma camada própria e as linhas de borda ficam em geometria separada. Os cones foram removidos de Interlagos. Resultado conferido durante a corrida no navegador do app.
