// Cada página abre sem erro de JavaScript, e no celular o toque duplo não dá zoom.
const { test, expect, devices } = require("@playwright/test");

const PAGINAS = ["/", "/leilao/", "/banco/", "/uno/", "/sinuca/", "/truco/", "/domino/", "/ludo/", "/botao/", "/corrida/", "/tiro/", "/pelada/", "/rocket/", "/batalha/", "/tenis/"];

for (const url of PAGINAS) {
  test(`a página ${url} abre sem erro`, async ({ page }) => {
    const erros = [];
    page.on("pageerror", (e) => erros.push(String(e)));
    await page.goto(url);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500);
    expect(erros).toEqual([]);
  });
}

test.describe("celular", () => {
  const { defaultBrowserType, ...celular } = devices["Pixel 5"]; // o navegador continua o mesmo (Chromium)
  test.use(celular);
  for (const url of ["/", "/domino/", "/pelada/", "/botao/"]) {
    test(`toque duplo não dá zoom em ${url}`, async ({ page }) => {
      await page.goto(url);
      await page.waitForTimeout(800);
      const vp = page.viewportSize();
      for (let i = 0; i < 3; i++) {
        await page.touchscreen.tap(vp.width / 2, vp.height * 0.85);
        await page.waitForTimeout(60);
        await page.touchscreen.tap(vp.width / 2, vp.height * 0.85);
        await page.waitForTimeout(400);
      }
      expect(await page.evaluate(() => window.visualViewport.scale)).toBe(1);
    });
  }
});
