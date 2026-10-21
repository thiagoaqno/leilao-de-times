const { test, expect } = require("@playwright/test");

const largar = async (page, pista) => {
  await page.goto("/corrida/drag/#debug");
  await expect(page.locator("#carStatus")).toHaveText("Modelo pronto", { timeout: 90000 });
  if (pista) await page.getByRole("button", { name: pista }).click();
  await page.getByRole("button", { name: /largar nesta pista/i }).click();
};

test("drag: aquece os pneus, larga, troca marcha e muda de faixa", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/corrida/drag/");
  await expect(page.locator(".track")).toHaveCount(3);
  await expect(page.locator("#carSelect option")).toHaveCount(6);
  await expect(page.locator("#carStatus")).toHaveText("Modelo pronto", { timeout: 90000 });
  await page.screenshot({ path: testInfo.outputPath("corrida-drag-menu.png") });
  await largar(page, /debaixo do elevado/i);
  await expect(page.locator("#hud")).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-phase", "burnout");
  await expect(page.locator("#preparoTitulo")).toHaveText("AQUEÇA OS PNEUS");
  await expect(page.locator("#gear")).toHaveText("N");
  await page.keyboard.down("w");
  await expect.poll(() => page.evaluate(() => window.__drag.corrida.jogador.pneu)).toBeGreaterThan(0);
  await page.keyboard.up("w");
  await expect(page.locator("body")).toHaveAttribute("data-phase", "race", { timeout: 60000 });
  await expect(page.locator("#preparo")).toBeHidden();
  await page.keyboard.down("w");
  await expect(page.locator("#speed")).not.toHaveText("000");
  await page.keyboard.press("ShiftLeft");
  await expect(page.locator("#gear")).toHaveText("2");
  await page.waitForTimeout(500);
  await page.keyboard.press("KeyQ");
  await expect(page.locator("#gear")).toHaveText("1");
  // com um rival do lado a troca de faixa é recusada: tenta até a faixa liberar
  await expect.poll(async () => {
    if (await page.evaluate(() => window.__drag.corrida.jogador.targetLane) === 1) await page.keyboard.press("ArrowRight");
    return page.evaluate(() => window.__drag.corrida.jogador.targetLane);
  }, { timeout: 60000 }).toBe(2);
  await expect(page.locator("#lane")).toHaveText("FAIXA 3");
  await page.keyboard.up("w");
  const tracks = await (await page.request.get("/api/corrida/drag/musicas")).json();
  if (tracks.length) await expect(page.locator("#song")).toContainText("♪");
  else await expect(page.locator("#song")).toBeEmpty(); // pasta vazia não impede a corrida
  await page.screenshot({ path: testInfo.outputPath("corrida-drag.png") });
  expect(errors).toEqual([]);
});

test("drag: segurar W sem trocar marcha explode o motor", async ({ page }) => {
  await largar(page);
  await expect(page.locator("body")).toHaveAttribute("data-phase", "race", { timeout: 60000 });
  await page.keyboard.down("w");
  await expect(page.locator("body")).toHaveAttribute("data-phase", "finish", { timeout: 90000 });
  await expect(page.locator("#result")).toHaveText("MOTOR EXPLODIU");
  await page.keyboard.up("w");
});

test("drag: nitro na terceira e bater de frente é perda total", async ({ page }, testInfo) => {
  await largar(page, /porto à noite/i);
  await expect(page.locator("body")).toHaveAttribute("data-phase", "race", { timeout: 60000 });
  await page.evaluate(() => { const j = window.__drag.corrida.jogador; j.gear = 3; j.speed = 120; });
  await page.keyboard.down("w");
  await page.keyboard.down("Space");
  await expect(page.locator("body")).toHaveClass(/nitro/);
  await expect.poll(() => page.evaluate(() => window.__drag.corrida.jogador.nitro)).toBeLessThan(3.85); // o Supra sai com 4,2 s de nitro
  await page.screenshot({ path: testInfo.outputPath("corrida-drag-nitro.png") });
  await page.keyboard.up("Space");
  // um carro parado logo à frente, na mesma faixa
  await page.evaluate(() => {
    const c = window.__drag.corrida, j = c.jogador;
    c.obstaculos.push({ kind: "obstaculo", lane: j.lane, x: j.x, z: j.z + 12, speed: 0, w: 3.3, len: 1.6 });
  });
  await expect(page.locator("body")).toHaveAttribute("data-phase", "finish", { timeout: 60000 });
  await expect(page.locator("#result")).toHaveText("PERDA TOTAL");
  await expect(page.locator("#tabela tr")).toHaveCount(4);
  await page.keyboard.up("w");
});
