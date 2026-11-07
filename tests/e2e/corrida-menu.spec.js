const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('corrida:aviso-gpu-v1', '1')); });

test('o menu da Corrida abre os painéis, troca a equipe e larga o contrarrelógio', async ({ page }) => {
  await page.goto('/corrida/');
  await expect(page.locator('#mnCarreiraT')).toHaveText('Carreira solo');
  await expect(page.locator('#mnAmigos')).toHaveAttribute('href', '/corrida/temporada/?amigos=1');
  await expect(page.locator('a[href="/corrida/drag/"]')).toBeVisible();
  await page.locator('#mn [data-painel="garagem"]').click();
  await page.locator('[data-equipe-menu="mclaren"]').click();
  await expect(page.locator('[data-equipe-menu="mclaren"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#mnPainel')).toBeHidden();
  await page.locator('#mn [data-painel="contra"]').click();
  await page.locator('#hName').fill('Piloto');
  await page.locator('#mnContraLargar').click();
  await expect(page.locator('#race')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#mnPalco canvas')).toHaveCount(0); // a garagem solta a GPU antes da corrida
});

test('a Central da carreira segue a cor da equipe e troca de aba', async ({ page }) => {
  await page.goto('/corrida/temporada/');
  await page.locator('#nome').fill('Piloto');
  await page.locator('#equipe').selectOption('mclaren');
  await page.locator('#nova button[type=submit]').click();
  await expect(page.locator('.cx-faixa h1')).toHaveText('McLaren');
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--eq'))).toBe('#ff8000');
  for (const aba of ['calendario', 'classif', 'analise', 'desenvolvimento', 'contratos', 'central']) {
    await page.locator(`.cx-abas [data-cx-aba="${aba}"]`).click();
    await expect(page.locator('.cx')).toHaveAttribute('data-aba', aba);
  }
  await page.locator('.cx-abas [data-cx-aba="desenvolvimento"]').click();
  await page.locator('.cx-dv-abas [data-cx-attr="motor"]').click();
  await page.locator('.cx-dv-painel [data-ponto="motor"][data-delta="1"]').click();
  await expect(page.locator('.cx-dv-mini.on b')).toContainText('1');
});
