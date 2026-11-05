# Mônaco: linha única e grid de 22

Em Mônaco, os carros de F1 seguem a geometria da volta de 48,4195 s salva em `public/corrida/monaco-volta-referencia.json`. O carro e a montagem daquela volta não foram registrados; o tempo não é uma meta diretamente comparável. Os pilotos mantêm as diferenças de estilo e o limite de velocidade considera a montagem e a aderência de cada carro. No macio, em pista seca, sem trânsito próximo, dano ou bandeiras, o ajuste experimental antecipa a frenagem no trecho crítico e diferencia fácil, médio e difícil. Com chuva, a mesma linha é usada com margens conservadoras; a velocidade depende do composto e da água.

A gravação recente de 52,95 s com McLaren padrão e macio possui comandos e é outra referência útil. Ela não foi usada como dado de treino do protótipo.

Em pista seca e livre, nas duas voltas com o mesmo pneu macio e semente 951, foram simulados os 22 pilotos, um por vez: quatro contatos e nenhuma saída detectada em 44 voltas. Uma medição adicional com um piloto de cada equipe e sementes 951 e 952 registrou um contato em 44 voltas. Contatos ocasionais são aceitáveis conforme o pedido; esses testes não representam trânsito real nem todas as configurações de carro. O teste de chuva usa 22 carros no pelotão.

A corrida rápida e as temporadas usam até 22 carros. Os resultados antigos de 20 continuam aceitos quando um GP já estava em andamento; a contagem para desempate considera as 22 posições. Em caso de contratação, a temporada solo realoca o piloto deslocado à vaga aberta na outra equipe. Na temporada em grupo, pilotos livres completam assentos vagos.

Verificações focadas: `node --test tests/corrida-monaco-referencia.test.js`, `node --test --test-name-pattern "Mônaco molhado" tests/corrida-monaco-chuva.test.js`, testes selecionados de sala, classificação, temporada solo e temporada em grupo. A suíte completa não foi executada.
