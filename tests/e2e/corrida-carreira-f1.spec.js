const { test, expect } = require('@playwright/test');

test.use({ viewport: { width: 480, height: 270 } });

test('a entrada da Carreira F1 cria sala, passa pelas etapas da sala, escolhe Mônaco e larga', async ({ page }) => {
  await page.goto('/corrida/#debug');
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#logosEquipes .equipe-mini')).toHaveCount(11);
  await expect(page.locator('#logosEquipes img')).toHaveCount(11);
  await expect.poll(() => page.locator('#logosEquipes img').evaluateAll((imgs) => imgs.every((img) => img.complete && img.naturalWidth > 0))).toBe(true);
  await expect(page.locator('a[href="/corrida/drag/"]')).toBeVisible();
  await page.locator('#hName').fill('Piloto');
  await page.locator('#btnCreate').click();
  await expect(page.locator('#lobby')).toBeVisible();
  // a sala nova nasce com as regras de F1, 5 voltas e o pneu médio; o fluxo é em etapas (sem abas): Equipe, Carro e pneu, GP e Grid
  await expect(page.locator('#snEtapas [data-etapa-ir]')).toHaveCount(4);
  await expect(page.locator('#eqFaixa [data-equipe]')).toHaveCount(11);
  await page.locator('#eqFaixa [data-equipe="ferrari"]').click();
  await expect(page.locator('#eqFaixa [data-equipe="ferrari"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#btnContinuar').click();
  await expect(page.locator('#pneuCartao [data-pneu="medio"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#pneuCartao [data-pneu="macio"]').click();
  await expect(page.locator('#pneuCartao [data-pneu="macio"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#btnGaragem').click();
  await expect(page.locator('#modPick [data-pintura="rosso"]')).toBeVisible();
  await page.locator('#modPick [data-pintura="rosso"]').click();
  await expect(page.locator('#modPick [data-pintura="rosso"]')).toHaveClass(/on/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#snGaveta')).toBeHidden();
  await page.locator('#snEtapas [data-etapa-ir="gp"]').click();
  await page.locator('[data-pista="monaco"]').click();
  await expect(page.locator('[data-v="5"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#snEtapas [data-etapa-ir="grid"]').click();
  await page.locator('#btnStart').click();
  await expect(page.locator('#race')).toBeVisible({ timeout: 30000 });
  await expect.poll(() => page.evaluate(() => window.__corrida?.race?.tr?.id)).toBe('monaco');
});
