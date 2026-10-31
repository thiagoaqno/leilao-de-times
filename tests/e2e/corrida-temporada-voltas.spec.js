const { test, expect } = require('@playwright/test');
test('carreira aceita dez voltas na criação', async ({ page }, info) => {
  await page.goto('/corrida/temporada/');
  await expect(page.locator('#nova')).toBeVisible();
  await page.locator('#nome').fill('Piloto');
  await page.locator('#voltas').selectOption('10');
  await page.screenshot({ path: info.outputPath('carreira-dez-voltas.png') });
  await page.locator('#nova button[type="submit"]').click();
  await expect(page.locator('#app')).toContainText('10 voltas', { timeout: 30000 });
});
