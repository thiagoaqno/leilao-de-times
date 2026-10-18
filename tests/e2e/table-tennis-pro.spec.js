const { test, expect } = require('@playwright/test');

test('entra na mesa, saca, pontua e pausa a partida', async ({ page }) => {
  const erros = [];
  page.on('pageerror', (erro) => erros.push(String(erro)));
  await page.goto('/table-tennis-pro/#debug');
  await page.getByRole('button', { name: 'Entrar na mesa' }).click();
  await page.evaluate(() => { window.__tableTennisPro.estado.sacadorInicial = 0; });
  await expect(page.locator('#sacar')).toBeVisible();
  await page.locator('#sacar').click();
  await expect.poll(() => page.evaluate(() => !!window.__tableTennisPro.estado.bola)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__tableTennisPro.estado.pontos.reduce((a, b) => a + b, 0)), { timeout: 10000 }).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pausar jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Pausado' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { name: 'Pausado' })).toBeHidden();
  expect(erros).toEqual([]);
});
