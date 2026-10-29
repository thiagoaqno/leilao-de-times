## Som V8 e escapamento soprado na Corrida F1

### O que mudou
- O som da F1 passa de V6 turbo para uma simulação de V8 aspirado: quatro ignições por volta, harmônicos mais agudos e faixa sonora virtual de 5.000 a 18.000 rpm. A física e o câmbio existentes continuam iguais.
- O assobio de turbo sai. Uma camada de ruído filtrado representa o fluxo do escapamento; ao aliviar o acelerador em alta rotação, ela continua soprando e produz uma sequência curta de estalos.
- Os três rivais próximos também recebem o timbre de V8. O som de kart dos outros modos permanece separado.

### Referência técnica
- [Regulamento FIA de 2011](https://argent.fia.com/web/fia-public.nsf/055CFD424959A061C1257870003A02F0/%24FILE/1-2011%20TECHNICAL%20REGULATIONS%2008-03-2011.pdf): V8 aspirado, limite de 18.000 rpm.
- [Formula 1 sobre o difusor soprado](https://www.formula1.com/en/latest/article/an-innovator-and-trendsetter-adrian-neweys-greatest-f1-contributions.3tFYlbhEcckb7cJAwKFTuy): fluxo de escapamento mantido sem acelerador, inclusive por ignição atrasada.

### Verificação
- `node --test tests/corrida-som-v8.test.js tests/corrida-f1-drs-ers.test.js tests/corrida-f1-fim-de-semana.test.js`: 19 testes passaram.
- `node --check` nos arquivos alterados e `git diff --check`: passaram.
- O timbre final ainda precisa de escuta em uma corrida real no navegador.
