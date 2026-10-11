// Carreira: o botão Guia da barra abre o "como jogar" por assunto, sem tirar nada do lugar, no PC e no celular.
const { test, expect } = require("@playwright/test");
const fs = require("node:fs"), path = require("node:path"), fotos = process.env.CARREIRA_FOTOS;
const fotografar = async (page, nome) => { if (!fotos) return; fs.mkdirSync(fotos, { recursive: true }); await page.screenshot({ path: path.join(fotos, `${nome}.png`) }); };

test.setTimeout(120000);

for (const [nome, largura, altura] of [["pc", 1440, 900], ["cel", 375, 740]]) {
  test(`guia da carreira (${nome})`, async ({ page }) => {
    const erros = []; page.on("pageerror", (e) => erros.push(String(e)));
    await page.setViewportSize({ width: largura, height: altura });
    await page.goto("/carreira/#debug");
    await expect(page.locator("#btnGuia")).toBeVisible();
    await page.click("#btnGuia");
    await expect(page.locator("#guia")).toBeVisible();
    await expect(page.locator('#guia [data-guia="visao"]')).toHaveAttribute("aria-selected", "true");
    await fotografar(page, `guia-${nome}-basico`);
    await page.click('#guia [data-guia="partida"]');
    await expect(page.locator("#guiaCorpo")).toContainText("Só o resultado");
    await fotografar(page, `guia-${nome}-partida`);
    // nada sai do lugar: sem rolagem de lado e a janela cabe na tela
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const caixa = await page.locator("#guia").boundingBox();
    expect(caixa.x).toBeGreaterThanOrEqual(0); expect(caixa.x + caixa.width).toBeLessThanOrEqual(largura); expect(caixa.y + caixa.height).toBeLessThanOrEqual(altura);
    await page.keyboard.press("Escape");
    await expect(page.locator("#guia")).toBeHidden();
    expect(erros).toEqual([]);
  });
}
