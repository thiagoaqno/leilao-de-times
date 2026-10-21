# Corrida: a pista nova não trava mais na primeira volta

## O problema
Na primeira corrida numa pista, a página dava travadinhas durante a volta (medido: tarefas de 537, 549 e 618 ms logo depois da largada). Era o computador, não a conexão:
- **O céu:** a foto do céu só começava a carregar na largada. Quando chegava, com o carro já andando, a luz da foto (`scene.environment`) mudava o shader de todos os materiais, e o Three.js recompilava tudo de uma vez.
- **O resto:** o navegador só compila o shader de cada material e só sobe cada textura para a placa de vídeo na primeira vez que ela aparece, e cada curva nova trazia coisas inéditas.

## O que muda
- **No lobby:** assim que a pista é escolhida, ela já é montada, a foto do céu já carrega e as texturas sobem (`prepararPista` em `jogo.js`, chamado por `rede.js`).
- **Na contagem da largada:** com o céu aplicado, as texturas sobem e todos os shaders compilam (`aquecerPista`, com `renderer.compileAsync`, que não trava a página).
- **Com o carro andando:** a luz do céu nunca muda. Se a foto chega atrasada, entra só o fundo (que não recompila nada), e a luz entra na próxima largada (`luzPendente` em `ceu.js`).

## Também neste PR
- Migração 015: zera o quadro de recordes de Mônaco, que era do traçado antigo (a 014 só limpava a volta dos robôs).
