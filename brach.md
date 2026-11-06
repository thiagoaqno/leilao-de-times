# Refaz a pilotagem dos robôs de F1

Os robôs das pistas de GP ganham um piloto novo, em `corrida-piloto.js`: linha, ritmo e comandos feitos em cima dos limites reais do carro, sem depender de volta gravada. Vale para qualquer pista e qualquer carro. As pistas de fantasia seguem como estavam.

## O que estava errado

- **Velocidade acima do que o pneu segura:** `passoF1` multiplicava a curva por `√pneu.grip` (1,38 no macio, +17%), e o `EMPURRAO_F1` somava até +42%. Daí as ~3 batidas por volta.
- **Linha perto do meio:** o limite era simétrico (o muro de um lado encolhia o outro) e o `folgaLinha` de Mônaco parava a linha em ~27 u, com o carro podendo ir a ~34 u.
- **Pedal liga/desliga:** `dinamica.js` transformava qualquer valor de gás em 1, e o gás parcial do `pilotoLinha` nunca funcionou.
- **Oscilação à toa:** um desvio fixo e uma senoide somados à linha empurravam o carro de um lado para o outro.

## O que mudou

- **Pedal parcial:** `dinamica.js` aceita gás e freio de 0 a 1. `true`/`false` de quem joga continuam valendo 1/0.
- **Linha:** curvatura mínima com limite por lado (`corrida-linha.js`) refinada por tempo de volta. Fica pronta em `corrida-linhas-f1.json`, gerado por `ferramentas/gerar-linhas-f1.js` (rodar de novo se um traçado ou muro mudar).
- **Margem:** a linha passa a 4 u do ponto em que o carro encosta na barreira. A margem não é mais contada da beira (`largura/2 - 4` poria o carro dentro do muro). Os limites da disputa e do trânsito não mudaram.
- **Box:** a linha fica fora da boca do box, onde a física entendia que o carro queria entrar.
- **Ritmo:** velocidade pelo limite real do pneu e do freio; o gás só obedece à curva e à freada.
- **Volante:** mira um ponto 0,5 s (rua estreita) ou 0,6 s adiante.
- **Níveis:** `EMPURRAO_F1` agora é 0,86 / 0,96 / 1.
- **Sem desvio fixo nem senoide na linha, e sem linhas de humanos nas pistas de GP:** a variedade passa a vir dos perfis de piloto (próximo PR).

## Medição

`ferramentas/medir-monaco.js`, seco, macio, robô sozinho (sementes 951 e 952), e grid de 22 robôs em 5 voltas (semente 952 nos números do novo).

| Mônaco, difícil | Antes | Depois |
| --- | --- | --- |
| Melhor volta sozinho | 55,0 s | 49,9 s |
| Batidas por volta sozinho | 3 | 2 |
| Aspereza do volante | 9 | 2,2 |
| Trocas de lado do volante por volta | 28 | 30 |
| Pedal parcial (gás / freio) | 8% / 5% | 25% / 15% |
| Mediana da volta com 22 carros | ~62 s | 57,9 s |
| Batidas no muro por volta com 22 carros | ~3 | 2,3 |
| Batidas entre carros por volta com 22 carros | ~1,2 | 0,5 |

Sozinho em Mônaco, por nível: fácil 56,3 s, médio 50,8 s, difícil 50,35 s.

Difícil sozinho, melhor volta, antes → depois: Interlagos 39,3 → 38,4; Spa 54,1 → 52,0; Suzuka 49,5 → 44,7; Baku 46,5 → 44,5 (2 batidas, antes 0); Singapura 59,5 → 59,8; Silverstone 47,6 → 45,3; Jeddah 44,0 → 43,3; Las Vegas 46,0 → 45,5; Barcelona 44,0 → 41,9.

## O que falta

- **Trânsito:** com 22 carros, a mediana ainda fica ~8 s acima da volta sozinho. Seguir mais perto só dobrou os toques; o ganho deve vir de decidir a ultrapassagem antes e usar DRS, ERS e vácuo (próximo PR).
- **Perfis de piloto com tela no admin e recuperação depois da batida:** PRs seguintes.
- Medido na bancada; ainda não jogado por uma pessoa. Grid com chuva e pneu gasto não foi medido.

## Testes

- Removido `tests/corrida-monaco-referencia.test.js`: testava a referência fixa de 48 s, removida no #559 e descartada.
- Não rodei a suíte local (regra do projeto); o CI confere.
