const { test, expect } = require('@playwright/test');
test('intermediário na largada e teclas 5 e 6 no box', async ({ page }, info) => {
  test.setTimeout(120000);
  const erros = []; page.on('pageerror', (erro) => erros.push(erro.message));
  await page.addInitScript(() => localStorage.setItem('corrida:aviso-gpu-v1', '1'));
  await page.goto('/corrida/#debug');
  await page.locator('#mnMulti').click(); await page.locator('#hName').fill('Piloto');
  await page.locator('#btnCreate').click();
  await expect(page.locator('#lobby')).toBeVisible();
  await page.locator('#snEtapas [data-etapa-ir="carro"]').click();
  const pneu = page.locator('[data-pneu="intermediario"]');
  await expect(pneu).toBeVisible();
  await expect(pneu).toContainText('4 voltas no molhado e 2 no seco');
  await expect(page.locator('[data-pneu="macio"]')).toContainText('2,8 voltas');
  await expect(page.locator('[data-pneu="medio"]')).toContainText('3,8 voltas');
  await expect(page.locator('[data-pneu="duro"]')).toContainText('4,8 voltas');
  await pneu.click();
  await expect(pneu).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: info.outputPath('intermediario-largada.png') });
  await page.locator('#snEtapas [data-etapa-ir="gp"]').click();
  await page.locator('[data-robos="0"]').click();
  await page.locator('#gpMais summary').click();
  await page.locator('[data-quali="pular"]').click();
  await page.locator('#snEtapas [data-etapa-ir="grid"]').click();
  await page.locator('#btnStart').click();
  await expect(page.locator('#race')).toBeVisible({ timeout: 60000 });
  await expect.poll(() => page.evaluate(() => window.__corrida.race?.pneu?.composto), { timeout: 60000 }).toBe('intermediario');
  // Eventos no mesmo quadro evitam que o carro já entre no corredor antes do cancelamento.
  const pedidos = await page.evaluate(() => {
    const tecla = (code, key) => document.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true }));
    tecla('Digit5', '5'); const apos5 = window.__corrida.race.box.pedido;
    tecla('Digit6', '6'); return { apos5, apos6: window.__corrida.race.box.pedido };
  });
  expect(pedidos).toEqual({ apos5: 'intermediario', apos6: null });
  await expect(page.locator('#hMfd [data-c="intermediario"]')).toHaveCount(1);
  expect(erros).toEqual([]);
});
