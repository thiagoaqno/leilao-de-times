const { test, expect } = require('@playwright/test');

test.use({ viewport: { width: 1280, height: 720 } });
test('carro em Mônaco acompanha o asfalto perto dos boxes', async ({ page }, info) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/corrida/#debug');
  await page.locator('#hName').fill('Piloto');
  await page.locator('#btnCreate').click();
  await expect(page.locator('#lobby')).toBeVisible();
  await page.locator('#snEtapas [data-etapa-ir="gp"]').click();
  await page.locator('[data-pista="monaco"]').click();
  await page.locator('#gpMais summary').click();
  await page.locator('[data-quali="pular"]').click();
  await page.locator('#snEtapas [data-etapa-ir="grid"]').click();
  await page.locator('#btnStart').click();
  await expect(page.locator('#race')).toBeVisible({ timeout: 60000 });
  await expect.poll(() => page.evaluate(() => window.__corrida?.race?.tr?.id), { timeout: 60000 }).toBe('monaco');
  const amostra = await page.evaluate(() => {
    const { race, groundH, inclinacao } = window.__corrida, tr = race.tr, i = 236, p = tr.pts[i], lat = 35;
    const x = p.x + p.nx * lat, y = p.y + p.ny * lat;
    return { diferenca: window.Sim.alturaDoChao(tr, x, y, i) - groundH(tr, x, y, i),
      ...inclinacao(tr, x, y, Math.atan2(p.ty, p.tx), i, 44, 26, 0, false, 0) };
  });
  expect(amostra.diferenca).toBeGreaterThan(20); // o terreno sob o asfalto não deve inclinar o carro
  expect(Math.abs(amostra.roll)).toBeLessThan(0.1);
  const predios = await page.evaluate(() => {
    const tr = window.__corrida.race.tr; let invadem = 0;
    for (let i = 0; i < tr.n; i += 4) {
      const p = tr.pts[i];
      for (const lat of [-tr.W / 2 + 2, 0, tr.W / 2 - 2])
        if (tr.predioEmMonaco(p.x + p.nx * lat, p.y + p.ny * lat)) invadem++;
    }
    return { novos: tr.prediosDeRuaMonaco, invadem };
  });
  expect(predios.novos).toBeGreaterThan(0);
  expect(predios.invadem).toBe(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: info.outputPath('monaco-carro.png') });
});
