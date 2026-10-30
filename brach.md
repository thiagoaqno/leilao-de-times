# Correção do MFD na corrida

O HUD chamava `montarTempo` sem importar a função: a primeira atualização parava antes de montar o MFD, deixando-o vazio e sem responder ao teclado. A importação permite montar o painel e mostrar os pneus novamente.

Teste: `npx playwright test tests/e2e/corrida-mfd.spec.js`, com verificação da página de pneus e das teclas M e N em uma corrida F1.
