const { test, expect } = require('@playwright/test');
test('Silverstone tem escape livre, sem balizadores, e barreira afastada', async ({ page }, info) => {
  test.setTimeout(180000);
  const erros = []; page.on('pageerror', e => erros.push(e.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/corrida/#debug'); await page.locator('#hName').fill('Piloto'); await page.locator('#btnCreate').click();
  await page.locator('#snEtapas [data-etapa-ir="gp"]').click(); await page.locator('[data-pista="silverstone"]').click();
  await page.locator('#gpMais summary').click(); await page.locator('[data-quali="pular"]').click();
  await page.locator('#snEtapas [data-etapa-ir="grid"]').click(); await page.locator('#btnStart').click();
  await expect.poll(() => page.evaluate(() => window.__corrida?.race?.tr?.id), { timeout: 90000 }).toBe('silverstone');
  const pista = await page.evaluate(() => { const tr = window.__corrida.race.tr; return { livre: tr.t.escapeLivre, cones: tr.cones.length, balizadores: tr.vida.balizadores, muros: tr.murosEscape[1].reduce((a, b) => a + b, 0), pneus: tr.pneus.reduce((a, b) => a + Math.abs(b), 0) }; });
  expect(pista.livre).toBe(true); expect(pista.cones).toBe(0); expect(pista.balizadores).toBe(0); expect(pista.muros).toBeGreaterThan(0); expect(pista.pneus).toBe(0);
  expect(erros).toEqual([]); await page.screenshot({ path: info.outputPath('silverstone-escape.png') });
  // Leva o carro à aproximação de Maggotts e deixa a câmera do jogo acompanhá-lo.
  await page.evaluate(() => {
    const { race } = window.__corrida, i = Math.floor(race.tr.n * 0.57), p = race.tr.pts[i];
    race.net = null; race.idx = i; race.tvAte = 0;
    Object.assign(race.car, { x: p.x, y: p.y, z: p.h, a: Math.atan2(p.ty, p.tx), v: 0, vx: 0, vy: 0 });
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: info.outputPath('maggotts-escape.png') });
});
