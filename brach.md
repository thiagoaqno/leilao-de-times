# Reduz trabalho na carreira e nas pistas

A vitrine de carro da carreira para de renderizar quando está fora da tela ou a aba está oculta e retoma ao voltar. Com movimento reduzido desenha apenas quando necessário; durante a oscilação limita a renderização a cerca de 30 quadros por segundo. No desenvolvimento, o reposicionamento dos rótulos acompanha o carro até 30 vezes por segundo, reduzindo leituras e escritas de layout.

Nas pistas, carros remotos a mais de 1.000 unidades reutilizam por até 160 ms as contas visuais de inclinação e altura do terreno. A posição interpolada, a física e as colisões continuam atualizadas normalmente; carros próximos continuam calculados a cada quadro.

## Verificação

- `node --test tests/corrida-detalhe-remoto.test.js`
- `node --test --test-name-pattern "os outros carros: interpolação" tests/corrida-f1-rede.test.js`
- `node --test --test-name-pattern "Mônaco: poucas malhas" tests/corrida-pistas-desempenho.test.js`
- Navegador: tela de desenvolvimento aberta; vitrine 3D parou de desenhar oculta e retomou ao aparecer.
- Suíte completa não executada, conforme pedido.
