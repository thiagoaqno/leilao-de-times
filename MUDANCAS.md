# Carreira: a gestão do clube (contratos, base, estrutura, vestiário, técnico, rivais, legado e tensão)

Uma tela nova, **Clube**, e oito sistemas que fazem cada decisão pesar nas próximas temporadas. Vale para a carreira solo e para a sala.

## 1. Contratos e multas
- Todo jogador tem contrato (1 a 3 temporadas; quem chega, três). Quem chega ao último ano aparece em alerta; no fim da temporada ele **sai de graça**.
- **Renovar** custa luvas e aumenta o salário: o preço depende da nota, dos anos (contrato longo é mais barato) e da **multa rescisória** (sem multa, multa baixa 1,5× ou alta 3,5× do valor). O navegador mostra o preço antes de fechar.
- Com multa baixa, um clube grande pode pagar e levar o craque no meio do contrato (o dinheiro entra no caixa).

## 2. Categoria de base
- O clube não ganha mais jovens de graça: a cada virada chegam garotos à base (2 + nível), com **potencial escondido**. Só a rede de olheiros mostra: sem olheiros, só uma impressão ("tem futuro"); nível 1 mostra ±7, 2 mostra ±3, 3 mostra o número exato.
- Promover cedo (barato) ou segurar para crescer até o potencial; vender ou dispensar. Os melhores podem ser levados por um clube rival aos 19 anos ou mais (ou blindados), e aos 21 quem não subiu vai embora.

## 3. Estrutura do clube
- Estádio (bilheteria +12% por nível), centro de treinamento (jovens evoluem mais, veteranos caem menos), departamento médico (lesões mais curtas e mais energia por rodada), rede de olheiros e base. Níveis 1 a 3, **uma obra por vez, paga na hora e pronta na virada**, com manutenção anual.

## 4. Vestiário
- **Capitão** (liderança de 1 a 10): segura a moral depois das derrotas; sem ele em campo a derrota pesa.
- **9 dilemas** na caixa de entrada que **cobram a conta depois**: a panelinha, o reserva que pede vaga (a promessa é conferida), o patrocínio polêmico, o racha do capitão com o craque, o convite de clube grande, a renovação cobrada, a oferta irrecusável, a joia da base cobiçada e as consequências agendadas (voltam como aviso: "A torcida não perdoou o patrocínio").

## 5. Carreira do técnico
- **Reputação** (0 a 100) sobe com meta cumprida e títulos e rende patrocínio na virada; a partir de 40 chegam convites de clubes grandes.
- 2 pontos de habilidade por temporada (+1 por título): formador, negociador, motivador e preparador físico (3 níveis cada).

## 6. Rivais
- O **clássico** da liga (e os outros técnicos da sala) rende bilheteria +35%, moral e peso na confiança. Entre os técnicos da sala, o confronto direto fica registrado (vitórias, empates, derrotas, gols, últimos jogos), o feed ganha a **provocação** e quem vence 3 vezes abrindo 2 de vantagem vira o **freguês** do outro.

## 7. Legado
- **Hall da Fama** (gols, jogos e títulos acumulados; raro, no máximo 2 por temporada), **camisa aposentada** (moral, confiança e dinheiro de loja), recordes do clube, linha do tempo e o **cartão do clube** para baixar (imagem 4:5 com as cores do clube) ou copiar como texto.

## 8. Tensão
- **Confiança da diretoria** no cabeçalho: cai com derrotas (feias pesam mais). Abaixo de 30 a diretoria dá um **ultimato** (5 pontos em 4 jogos); sem eles, a carreira solo termina em **demissão** e, na sala, a diretoria intervém e vende o jogador mais bem pago.
- A **janela com relógio** ("fecha em 2 jogos", "último jogo") e a **oferta irrecusável** no último jogo dela.

## Conferido
- `tests/carreira-clube.test.js` (27 testes): as contas de renovação, contratos e multa, base escondida, obras, capitão, dilemas e consequências, ultimato e demissão, Hall da Fama e camisa, reputação, clássico, confronto entre técnicos e a gestão separada por técnico na sala.
- `tests/carreira-evolucao.test.js` ajustado: o clube humano recebe garotos na base, não no elenco.
- No navegador: sede com a confiança e os alertas, a tela Clube (contratos, estrutura, vestiário, base, legado) e o cartão do clube.
