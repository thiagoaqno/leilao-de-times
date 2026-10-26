# Interlagos e Mônaco: ambiente de Fórmula 1

Os dois circuitos ganham luz traseira vermelha em matriz de LEDs, discos dianteiros incandescentes sob frenagem forte e faíscas do assoalho em alta velocidade sobre zebras ou trechos inclinados. Com menos movimento, a lanterna fica acesa continuamente e as novas faíscas são desativadas.

O asfalto compartilhado usa textura de agregado fino de 1024 × 1024, repetida a cada 8 metros, com relevo sutil, desgaste e marcas de borracha que acompanham as curvas. As linhas de borda ficam separadas da textura; a faixa central tracejada e os cones foram removidos desses dois circuitos.

Interlagos recebe 82 painéis, 16 postos cobertos, 21 placas de aproximação de curvas, cercas e arquibancadas adicionais em trechos intermediários. Menos árvores junto à pista deixam as estruturas visíveis.

Mônaco recebe ambientação própria para ruas estreitas: 136 painéis no guard-rail, cercas de proteção, 46 bandeiras vermelhas e brancas, 46 postos compactos com fiscais e 13 placas de frenagem. O túnel recebe 74 guias luminosas baixas. A decoração acompanha toda a volta (40/32/24/40 painéis por quarto do circuito); os postos respeitam as áreas reservadas do porto, piscina, hotel e arquibancadas, e os novos postes e painéis verificam a distância ao traçado vizinho.

Peças repetidas usam InstancedMesh e materiais compartilhados, sem novas luzes dinâmicas. As adições são cenográficas e não alteram as regras ou colisões. Os demais circuitos mantêm o visual anterior.

Validação: 29 testes de corrida passaram na etapa de Interlagos; os 5 testes de colisão e experiência foram executados novamente após estender a Mônaco. Sintaxe dos módulos e git diff --check sem erros. Inspeção no navegador do app em quatro posições de Interlagos e cinco de Mônaco, incluindo túnel; contagens da ambientação e ausência de cones conferidas, além do pulso dos LEDs e aquecimento dos discos na etapa inicial.
