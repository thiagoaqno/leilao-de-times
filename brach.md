# Refaz a pilotagem dos robôs de F1 e dá um perfil a cada piloto

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
- **Sem desvio fixo nem senoide na linha, e sem linhas de humanos nas pistas de GP:** a variedade vem dos perfis de piloto.
- **Classificação:** a volta lançada usa o limite real do pneu; a pole em Mônaco fica em ~49 s, perto do que os robôs fazem em pista.

## Perfis dos pilotos

- Os 22 pilotos ganham agressividade na entrada, retomada do acelerador, uso de zebra e taxa de erro em `corrida-estilos.js`, além do que já existia (frenagem, ataque, defesa, paciência, pneus, box). A consistência parte da constância de `f1-pilotos-2026.js`. São interpretação de jogo.
- Na pilotagem (`Piloto.jeitoDe`), cada piloto freia em um ponto, entra na curva em uma velocidade e retoma o gás em um ritmo; o tempo varia de volta para volta e, de vez em quando, ele erra a freada. O ritmo base já é o limite do pneu, então o perfil só tira: somar velocidade fazia o mais agressivo bater e ficar por último.
- **Tela `/admin/pilotos`** (`admin-pilotos.js`, `admin-pilotos.html`): mesmo login do painel da carreira, edita cada valor de 0 a 1 e a estratégia de box, salva em `corrida_perfis_piloto` (`migracoes/026`) e restaura o original. Vale a partir da próxima corrida. Conferida com uma sessão falsa em servidor de teste (salvar, recusar valor inválido, restaurar); o login real pelo GitHub não foi testado.

Mônaco, difícil, sozinho, média de 4 voltas: Norris 50,9 s, Leclerc 51,0 s, Hamilton 51,1 s, Verstappen 51,2 s, Alonso 51,4 s, Stroll 51,6 s, Colapinto 52,2 s, Bottas 52,6 s. A ordem não segue o ritmo de cada um à risca: dá para ajustar no admin.

## Medição

`ferramentas/medir-monaco.js`, seco, macio, robô sozinho (sementes 951 e 952), e grid de 22 robôs em 5 voltas (semente 952 nos números do novo).

| Mônaco, difícil | Antes | Depois |
| --- | --- | --- |
| Melhor volta sozinho | 55,0 s | 50,0 s |
| Batidas por volta sozinho | 3 | 2 |
| Aspereza do volante | 9 | 2,1 |
| Trocas de lado do volante por volta | 28 | 30 |
| Pedal parcial (gás / freio) | 8% / 5% | 12% / 15% |
| Mediana da volta com 22 carros | ~62 s | 57,4 s |
| Batidas no muro por volta com 22 carros | ~3 | 2,5 |
| Batidas entre carros por volta com 22 carros | ~1,2 | 0,3 |

Sozinho em Mônaco, por nível: fácil 56,5 s, médio 51,0 s, difícil 50,5 s.

Difícil sozinho, melhor volta, antes → depois: Interlagos 39,3 → 38,6; Spa 54,1 → 52,1; Suzuka 49,5 → 44,8; Baku 46,5 → 44,6 (2 batidas, antes 0); Singapura 59,5 → 59,9; Silverstone 47,6 → 45,3; Jeddah 44,0 → 43,4; Las Vegas 46,0 → 45,5; Barcelona 44,0 → 41,9.

## O que falta

- **Trânsito:** com 22 carros, a mediana ainda fica ~8 s acima da volta sozinho. Seguir mais perto só dobrou os toques; o ganho deve vir de decidir a ultrapassagem antes e usar DRS, ERS e vácuo (próximo PR).
- **Recuperação depois da batida:** PR seguinte.
- Medido na bancada; ainda não jogado por uma pessoa. Grid com chuva e pneu gasto não foi medido.

## Testes

- Removido `tests/corrida-monaco-referencia.test.js`: testava a referência fixa de 48 s, removida no #559 e descartada.
- Novo `tests/corrida-perfis-piloto.test.js`: perfis completos, ajuste do admin validado e restaurável, e o perfil que nunca passa do limite do pneu.
- Apagados, a pedido, os testes antigos que falhavam: os do jeito e do carro por equipe dos robôs (`corrida-f1-dano-ia`, `corrida-f1-equipes`), os tempos ideais de antes (`corrida-robos-curvas`, `corrida-robos-ritmo`), o caso de F1 de `corrida-travada-perfis` e `tests/corrida-imersao.test.js` (metas e saves da carreira; já falhava no `main`, com "Resultado inválido"). Com isso, metas e confiança da carreira ficam sem teste.
- Em `corrida-f1-dano-ia`, os limites da pole foram ajustados para os tempos novos.
- Não rodei a suíte local (regra do projeto); o CI confere.
