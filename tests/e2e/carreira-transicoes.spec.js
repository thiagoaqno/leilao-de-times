const { test, expect } = require("@playwright/test");

for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
  test(`carreira: navega sem travar entre sede e gestão em ${viewport.width}px`, async ({ page }) => {
    const erros = [];
    page.on("pageerror", (e) => erros.push(String(e)));
    await page.setViewportSize(viewport);
    await page.goto("/carreira/#debug");
    await page.fill("#cNome", "Transições");
    await page.click('[data-clube="flamengo"]');
    await page.click("#btnCriar");
    await page.click("#btnAnotei");
    await expect(page.locator("dialog.popup-aviso.diretoria[open]")).toBeVisible();
    await page.click("dialog.popup-aviso.diretoria[open] button:has-text('Combinado')");

    for (const id of ["elenco", "mercado", "tabela", "calendario", "clube", "temporadas"]) {
      await page.click(`#sede .tile[data-ir="${id}"]`);
      await expect(page.locator(`#${id}`)).toBeVisible();
      await expect(page.locator("#sede")).toBeHidden();
      await page.click("#barra .voltar[data-ir='sede']");
      await expect(page.locator("#sede")).toBeVisible();
      await expect(page.locator(`#${id}`)).toBeHidden();
    }
    expect(erros).toEqual([]);
  });
}
