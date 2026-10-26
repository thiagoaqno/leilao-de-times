const { test, expect } = require('@playwright/test');

test.use({ viewport: { width: 480, height: 270 } });

test('a entrada da Carreira F1 cria sala, escolhe Mônaco e larga', async ({ page }) => {
  await page.goto('/corrida/#debug');
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#logosEquipes .equipe-mini')).toHaveCount(11);
  await expect(page.locator('#logosEquipes img')).toHaveCount(11);
  await expect.poll(() => page.locator('#logosEquipes img').evaluateAll((imgs) => imgs.every((img) => img.complete && img.naturalWidth > 0))).toBe(true);
  await expect(page.locator('a[href="/corrida/drag/"]')).toBeVisible();
  await page.locator('#hName').fill('Piloto');
  await page.locator('#btnCreate').click();
  await expect(page.locator('#lobby')).toBeVisible();
  await page.locator('#hubAbas [data-aba="garagem"]').click();
  await expect(page.locator('#carPick [data-car]').first()).toBeVisible();
  await page.locator('#hubAbas [data-aba="pintura"]').click();
  await expect(page.locator('#modPick [data-pintura="rosso"]')).toBeVisible();
  await page.locator('#modPick [data-pintura="rosso"]').click();
  await expect(page.locator('#modPick [data-pintura="rosso"]')).toHaveClass(/on/);
  await page.locator('#hubAbas [data-aba="pista"]').click();
  await page.locator('[data-pista="monaco"]').click();
  await page.locator('#hubAbas [data-aba="regras"]').click();
  await page.locator('[data-regras="f1"]').click();
  await page.locator('#hubAbas [data-aba="box"]').click();
  await page.locator('#btnStart').click();
  await expect(page.locator('#race')).toBeVisible({ timeout: 30000 });
  await expect.poll(() => page.evaluate(() => window.__corrida?.race?.tr?.id)).toBe('monaco');
});
