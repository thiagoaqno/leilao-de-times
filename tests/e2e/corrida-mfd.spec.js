const {test,expect}=require('@playwright/test');
test.use({ viewport: { width: 1280, height: 720 } });
test('MFD na corrida', async ({page}, info) => {
 const errors=[]; page.on('pageerror', e=>errors.push(e.stack));
 await page.goto('/corrida/#debug');
 await page.locator('#hName').fill('Piloto'); await page.locator('#btnCreate').click(); await expect(page.locator('#lobby')).toBeVisible();
 await page.locator('#snEtapas [data-etapa-ir="gp"]').click();
 await page.locator('#gpMais summary').click(); await page.locator('[data-quali="pular"]').click();
 await page.locator('#snEtapas [data-etapa-ir="grid"]').click(); await page.locator('#btnStart').click();
 try { await expect(page.locator('#race')).toBeVisible({timeout:60000}); await expect(page.locator('#hMfd .mfd-topo')).toBeVisible({timeout:60000}); } finally { console.log('ERROS',JSON.stringify(errors)); await page.screenshot({path:info.outputPath('mfd.png')}); }
 await expect(page.locator('#hMfd .mfd-pg[data-pg="pneus"]')).toBeVisible();
 await expect(page.locator('[data-r="pNome"]')).toHaveText('Médio');
 await expect(page.locator('[data-r="pVidaT"]')).toHaveText(/%/);
 await expect(page.locator('[data-r="pTempT"]')).toHaveText(/Frio|Ideal|Quente/);
 await page.keyboard.press('KeyM'); await expect(page.locator('#hMfd .mfd-pg[data-pg="danos"]')).toBeVisible();
 await page.keyboard.press('KeyN'); await expect(page.locator('#hMfd .mfd-pg[data-pg="pneus"]')).toBeVisible();
 expect(errors).toEqual([]);
});

