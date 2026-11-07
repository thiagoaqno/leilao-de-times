const { test, expect } = require('@playwright/test');
test('vitrine troca de equipe e a sala preserva o carro nas atualizações', async ({ browser }) => {
  const a = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await a.addInitScript(() => localStorage.setItem("corrida:aviso-gpu-v1", "1"));
  const page = await a.newPage();
  await page.goto('/corrida/temporada/');
  await page.locator('[data-vitrine="ferrari"]').click();
  await expect(page.locator('#equipe')).toHaveValue('ferrari');
  await expect(page.locator('[data-vitrine="ferrari"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-en-aba="amigos"]').click();
  await page.locator('#gnome').fill('Ana');
  await page.locator('#gnova button').click();
  await page.locator('[data-equipe="ferrari"]').click();
  await expect(page.locator('[data-equipe="ferrari"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#cxeFaixa')).toHaveText('Ferrari'); // a sala usa o estúdio da entrada, com o carro da equipe escolhida
  await page.locator('#gcomecar').click();
  await expect(page.locator('.cx-faixa h1')).toHaveText('Ferrari'); // a temporada em grupo usa a mesma Central da solo
  const b = await browser.newContext(); await b.addInitScript(() => localStorage.setItem("corrida:aviso-gpu-v1", "1")); const amigo = await b.newPage();
  await amigo.goto(page.url()); await amigo.locator('#gnome').fill('Bia'); await amigo.locator('#gnomeconv button').click();
  await page.locator('.cx-abas [data-cx-aba="contratos"]').click();
  await expect(page.locator('.pessoas')).toContainText('Bia');
  await b.close(); await a.close();
});
