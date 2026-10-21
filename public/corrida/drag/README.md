# Modo drag — primeira versão

Abra `/corrida/drag/` pelo botão na entrada da Corrida da Galera. O modo é local, em três pistas retas, com três faixas, aceleração pelo jogador, cinco marchas manuais, três rivais, seis carros selecionáveis e áudio sintetizado. `logic.mjs` concentra direção, motor e contato entre carros; `main.js` monta a cena e o HUD.

Controles: segure W para acelerar; setas esquerda/direita ou A/D para mudar de faixa; Shift esquerdo para subir marcha; Ctrl esquerdo para reduzir. Na tela de toque, segure GÁS e use os botões de faixa e marcha. A troca de faixa leva 0,42 s e aceita reversão. O contato com um carro à frente limita a velocidade à dele e corrige a sobreposição, sem impulso de ricochete.

O tacômetro à esquerda marca a faixa de troca perfeita. Acima dela, o tempo de giro crítico acumula até 4 segundos e o motor explode, encerrando a corrida. Em giro normal, esse tempo cai lentamente (0,35 segundo por segundo).

Os modelos em `models/` foram empacotados a partir dos seis ZIPs fornecidos, por `tools/importar-carros-drag.py`. Os textos de licença originais ficam junto dos GLB. O Skyline R33 não trouxe um arquivo de licença no pacote; verificar os direitos antes de distribuir o jogo. Os carros dos rivais continuam leves e provisórios para manter a corrida fluida.

Coloque `.mp3` em `musicas/`. A pasta é lida no início de cada corrida, sem editar uma lista. A primeira música começa na largada e as seguintes tocam em sequência; o botão de som controla a trilha e os motores.

## Próximas etapas

- Nitro com recarga por tempo no vácuo, consumo, efeitos e indicação no HUD.
- Completar a garagem até dez carros quando os demais arquivos forem disponibilizados.
- Personalização visual e quatro estágios de motor com números equilibrados por estágio.
- Ajuste fino de volume da trilha sonora quando houver músicas reais na pasta.
- Se desejado, integrar salas online ao servidor de Corrida; esta versão é uma corrida local para fechar a jogabilidade principal.
