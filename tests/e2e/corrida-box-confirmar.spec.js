const { test, expect } = require('@playwright/test');
test.use({ viewport: { width: 1280, height: 720 } });
test('Enter confirma o box sem cancelar pedido existente', async ({ page }, info) => {
  await page.goto('/corrida/#debug');
  await page.locator('#hName').fill('Piloto'); await page.locator('#btnCreate').click();
  await expect(page.locator('#lobby')).toBeVisible();
  await page.locator('#snEtapas [data-etapa-ir="gp"]').click();
  await page.locator('#gpMais summary').click(); await page.locator('[data-quali="pular"]').click();
  await page.locator('#snEtapas [data-etapa-ir="grid"]').click(); await page.locator('#btnStart').click();
  await expect(page.locator('#race')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#hMfd .mfd-topo')).toBeVisible({ timeout: 60000 });
  const resultado = await page.evaluate(async () => {
    const { abrirBoxMfd, mfd, mfdTecla } = await import('/corrida/mfd.js');
    const { escolherComposto } = await import('/corrida/box.js');
    abrirBoxMfd(); escolherComposto('macio');
    const antes = { pedido: window.__corrida.race.box.pedido, pagina: mfd.pagina, aberto: mfd.aberto };
    const tratou = mfdTecla(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    return { antes, tratou, depois: window.__corrida.race.box.pedido };
  });
  expect(resultado.antes).toEqual({ pedido: 'macio', pagina: 'box', aberto: true });
  expect(resultado.tratou).toBe(true);
  expect(resultado.depois).toBe('macio');
  await page.screenshot({ path: info.outputPath('box-confirmado.png') });
  // B ainda é a ação explícita para cancelar o pedido.
  await page.evaluate(async () => (await import('/corrida/mfd.js')).abrirBoxMfd());
  await page.keyboard.press('KeyB');
  await expect.poll(() => page.evaluate(() => window.__corrida.race.box.pedido)).toBeFalsy();
});
