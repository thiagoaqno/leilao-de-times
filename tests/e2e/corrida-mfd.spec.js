const {test,expect}=require('@playwright/test');
test.use({ viewport: { width: 1280, height: 720 } });
test('MFD na corrida', async ({page}, info) => {
 const errors=[]; page.on('pageerror', e=>errors.push(e.stack)); page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram/i.test(m.text())) errors.push(m.text()); });
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
 // B pede o box e mostra a página de estratégia, sem capturar as setas de direção.
 await page.locator('#hMfd .mfd-x').click();
 await page.keyboard.press('KeyB');
 await expect(page.locator('#hMfd .mfd-pg[data-pg="box"]')).toBeVisible();
 await expect(page.locator('#hMfd .mfd-abas [data-pg="box"]')).toHaveClass(/on/);
 await expect(page.locator('#hMfd .mp-box .mr').last()).toBeInViewport();
 await expect(page.locator('#hMfd [data-r="bJogos"]')).toBeVisible();
 expect(await page.locator('#hMfd [data-r="bJogos"]').evaluate(el => el.getBoundingClientRect().bottom <= el.closest('.mfd-corpo').getBoundingClientRect().bottom)).toBe(true);
 // o primeiro B só abre a página (sem pedir); 1-4 escolhem o pneu; o segundo B (ou Enter) confirma o pedido
 expect(await page.evaluate(() => window.__corrida.race.box.pedido)).toBeFalsy();
 await page.keyboard.press('Digit3'); await expect(page.locator('#hMfd .mr').first().locator('b')).toHaveText('Duro');
 expect(await page.evaluate(() => window.__corrida.race.box.pedido)).toBeFalsy();
 await page.keyboard.press('KeyB');
 await expect.poll(() => page.evaluate(() => window.__corrida.race.box.pedido)).toBe('duro');
 // o relógio anda no alto à direita desde a largada
 await expect(page.locator('#htVolta')).not.toHaveText('0:00.000');
 await expect(page.locator('#htCorrida')).not.toHaveText('0:00.0');
 await expect(page.locator('#hMfd')).not.toHaveClass(/foco/);
 await page.keyboard.press('Digit4');
 await expect.poll(() => page.evaluate(() => window.__corrida.race.box.pedido)).toBe('chuva');
 await page.screenshot({path:info.outputPath('mfd-box.png')});
 const pneus = await page.evaluate(async () => {
   const { trocarComposto, f1Pronto } = await import('/corrida/f1.js'); await f1Pronto;
   const k = window.__corrida.race.kart.kt, u = k.pneu.userData.faixa;
   trocarComposto(k, 'chuva'); const molhado = u.pneuChuva.value;
   trocarComposto(k, 'macio'); const seco = u.pneuChuva.value;
   return { molhado, seco, rodas: k.rodas.length, atributos: k.rodas.every(r => r.gira.children.some(o => !!o.geometry?.attributes?.pneuLat)) };
 });
 expect(pneus).toEqual({ molhado: 1, seco: 0, rodas: 4, atributos: true });

 expect(errors).toEqual([]);
});

