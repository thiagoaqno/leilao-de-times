const { test, expect } = require('@playwright/test');

test.use({ viewport: { width: 1280, height: 720 } });
test('chuva variável e classificação com carros que terminaram', async ({ page }, info) => {
  const erros = []; page.on('pageerror', e => erros.push(e.message));
  await page.goto('/corrida/#debug');
  await page.locator('#hName').fill('Piloto');
  await page.locator('#btnCreate').click();
  await expect(page.locator('#lobby')).toBeVisible();
  await page.locator('#snEtapas [data-etapa-ir="gp"]').click();
  await page.locator('[data-clima="variavel"]').click();
  await page.locator('#gpMais summary').click();
  await page.locator('[data-quali="pular"]').click();
  await page.locator('#snEtapas [data-etapa-ir="grid"]').click();
  await page.locator('#btnStart').click();
  await expect(page.locator('#race')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#hMfd .mfd-topo')).toBeVisible({ timeout: 60000 });
  const r = await page.evaluate(async () => {
    const { race, cam } = window.__corrida, tr = race.tr;
    const { clima } = await import('/corrida/clima.js');
    const { passoClima } = await import('/corrida/clima-visual.js');
    const { standings } = await import('/corrida/hud.js');
    const { E } = await import('/corrida/estado.js');
    const S = E.S;
    const antes = { ...clima }, chao = tr.chao; let consultas = 0;
    tr.chao = (x, y) => { consultas++; return chao(x, y); };
    Object.assign(clima, { chuva: 1, agua: 1, chove: true });
    const c = race.car, src = { x: c.x, y: c.y, z: c.z, a: c.a, v: c.v };
    try { passoClima(1, race, cam, 'perseguicao', src, c); } finally { tr.chao = chao; Object.assign(clima, antes); }
    const original = S.players, order = S.finishOrder, gs = race.ghosts, prog = race.progServidor;
    try {
      const eu = original.find(p => !p.bot), p1 = { ...eu, id: 'bot1', bot: true, finish: 100, acrescimo: 0, laps: 3, dnf: false }, p2 = { ...eu, id: 'bot2', bot: true, finish: 110, acrescimo: 0, laps: 3, dnf: false };
      S.players = [{ ...eu, finish: null, laps: 2 }, p1, p2]; S.finishOrder = ['bot1', 'bot2'];
      race.ghosts = new Map([['bot1', { prog: 999999 }], ['bot2', { prog: -999999 }]]); race.progServidor = 1;
      const durante = standings().map(x => x.id);
      const final = window.F1Regras.classificacaoFinal([{ id: p1.id, laps: 3, finish: 100 }, { id: p2.id, laps: 3, finish: 110 }, { id: eu.id, laps: 3, finish: 150 }], 3).map(x => x.id);
      return { consultas, durante, final, eu: eu.id };
    } finally { S.players = original; S.finishOrder = order; race.ghosts = gs; race.progServidor = prog; }
  });
  expect(r.consultas).toBeLessThanOrEqual(25);
  expect(r.durante).toEqual(['bot1', 'bot2', r.eu]);
  expect(r.final).toEqual(['bot1', 'bot2', r.eu]);
  expect(erros).toEqual([]);
  await page.screenshot({ path: info.outputPath('chuva.png') });
});
