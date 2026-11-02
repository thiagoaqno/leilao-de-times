# Corrida: iluminação noturna e carros nas bordas

Las Vegas deixa de desenhar faixas de luz e reflexos acima do asfalto, que manchavam a pista e cobriam os pneus. Os refletores passam a usar iluminação ambiente contínua e as lâmpadas permanecem visíveis à distância também nos gráficos baixos; o mesmo vale para os refletores do Bahrein e as lâmpadas de Singapura.

Em F1, a inclinação visual acompanha o asfalto enquanto o carro ainda o toca, evitando que o relevo abaixo da beirada incline o carro em direção ao chão. Fora da pista, continua acompanhando o terreno.

O brilho do pós-processamento é preparado antes da compilação dos sombreadores, para evitar uma recompilação tardia. Isso aborda uma possível origem da pausa inicial de Las Vegas, mas a causa dos dois segundos relatados ainda precisa ser confirmada em jogo no aparelho afetado.

## Verificação

- 18 testes aprovados: inclinação na borda e fora dela, iluminação de Las Vegas, Singapura e Bahrein e escapes.
- Las Vegas à noite conferida no navegador com gráficos baixos: asfalto sem faixas e lâmpadas visíveis ao longo da reta.
