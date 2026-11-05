const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('corrida:aviso-gpu-v1', '1')); });

test('carreira mostra a ficha de GP da sala e destaca a curva escolhida', async ({ page }) => {
  await page.goto('/corrida/temporada/');
  await page.locator('#nome').fill('Piloto');
  await page.locator('#tamanho').selectOption('15');
  await page.locator('#nova button[type=submit]').click();
  await page.locator('[data-cx-aba="calendario"]').click();
  await page.locator('.cx-gp[data-gp="0"]').click();
  const ficha = page.locator('#cxSobreDlg');
  await expect(ficha.locator('.sn-sobre-svg .sn-marca')).toHaveCount(17);
  await ficha.locator('[data-curva="3"]').click();
  await expect(ficha.locator('[data-n="3"]')).toHaveClass(/hi/);
  await expect(ficha.locator('[data-curva="3"]')).toHaveClass(/hi/);
  await page.keyboard.press('Escape');
  await page.locator('.cx-gp[data-gp="1"]').click();
  await expect(ficha.locator('.sn-sobre-svg')).toBeVisible();
});

test('a tela Sobre o GP da sala continua abrindo e destacando curvas', async ({ page }) => {
  await page.goto('/corrida/');
  await page.locator('#mnMulti').click(); await page.locator('#hName').fill('Piloto'); await page.locator('#btnCreate').click();
  await page.locator('#snEtapas [data-etapa-ir="gp"]').click();
  await page.locator('[data-sobre]').click();
  const sobre = page.locator('#snSobre');
  await expect(sobre).toBeVisible();
  await sobre.locator('[data-curva="1"]').click();
  await expect(sobre.locator('[data-n="1"]')).toHaveClass(/hi/);
  await page.keyboard.press('Escape'); await expect(sobre).toBeHidden();
});

test('temporada em grupo também mostra os mapas numerados em tela estreita', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/corrida/temporada/');
  await page.locator('#gnome').fill('Piloto'); await page.locator('#gnova button[type=submit]').click();
  await page.locator('[data-equipe="mclaren"]').click();
  await page.locator('#gcomecar').click();
  await page.locator('[data-cx-aba="calendario"]').click();
  await page.locator('.cx-gp[data-gp="0"]').click();
  const ficha = page.locator('#cxSobreDlg');
  await expect(ficha.locator('.sn-sobre-svg')).toBeVisible();
  await ficha.locator('.sn-curva').first().click();
  await expect(ficha.locator('.sn-marca.hi')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
