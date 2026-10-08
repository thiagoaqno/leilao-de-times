const { test, expect } = require("@playwright/test");

test("Vila: monta time de Naruto e joga um turno com chakra", async ({ browser }) => {
  const a = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const b = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const erros = [];
  a.on("pageerror", (e) => erros.push(e.message));
  b.on("pageerror", (e) => erros.push(e.message));
  try {
    for (const [page, name] of [[a, "NinjaA"], [b, "NinjaB"]]) {
      await page.addInitScript((nick) => {
        localStorage.setItem("galera:name", JSON.stringify(nick));
        localStorage.setItem("vila_spawn", JSON.stringify("tenis"));
      }, name);
      await page.goto("/#debug");
      await page.waitForFunction(() => window.__vila?.myId);
    }
    await a.locator("#bTeam").click();
    await a.locator('[data-team="naruto"]').click();
    await expect(a.locator('#mtabs [data-m="naruto"]')).toHaveClass(/on/);
    await expect(a.locator("#mgrid .mcard")).toHaveCount(30);
    await expect.poll(() => a.locator('#mgrid [data-id="naruto"] img').evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    await a.screenshot({ path: test.info().outputPath("naruto-time.png") });
    await a.locator("#teamX").click();
    await a.locator("#bTeam").click();
    await a.locator(".blist > div").filter({ hasText: "NinjaB" }).getByRole("button", { name: "Desafiar" }).click();
    await a.locator('[data-modo="naruto"]').click();
    await expect(a.locator('[data-jogo="ginasio"]')).toBeEnabled();
    await a.locator("#desafioEnviar").click();
    await expect(b.locator("#popBox")).toContainText("Naruto Shippuden");
    await b.locator("#invYes").click();
    await expect(a.locator("#bFocus")).toBeVisible();
    await expect(a.locator("#ibMe")).toContainText("Chakra 60/100");
    await a.screenshot({ path: test.info().outputPath("naruto-batalha.png") });
    await a.locator("#bFocus").click();
    await b.locator('[data-mv="0"]').click();
    await expect(a.locator("#ibMe")).toContainText("Chakra 95/100");
    expect(erros).toEqual([]);
  } finally {
    await a.close(); await b.close();
  }
});

test("Ginásio: Naruto em tempo real carrega sprites, gasta chakra e usa Substituição", async ({ page }) => {
  const erros = []; page.on("pageerror", (e) => erros.push(e.message));
  await page.goto("/ginasio/#debug");
  await expect(page.locator("#conexao")).toHaveText("Online");
  await page.locator('[data-modo="naruto"]').click();
  await expect(page.locator("#meuTime")).toContainText("Naruto");
  await page.locator("#hName").fill("Ninja");
  await page.locator("#btnRobo").click();
  await page.waitForFunction(() => window.__ginasio?.S?.phase === "play" && window.__ginasio.N.snap?.tempo > 0.1);
  await page.waitForFunction(() => {
    const g = window.__ginasio;
    return g.N.snap.entidades.every((e) => g.imagens.get(`naruto:${e.forma}`)?.pronto);
  });
  await expect(page.locator("#chakraHud")).toContainText("Chakra");
  await expect(page.locator("#btnEsquiva")).toHaveAttribute("aria-label", /Substituição/);
  await page.keyboard.press("Space");
  await expect.poll(() => page.evaluate(() => window.__ginasio.N.snap.entidades.find((e) => e.id === window.__ginasio.ME.id).substitutes)).toBe(1);
  const antes = await page.evaluate(() => window.__ginasio.N.snap.entidades.find((e) => e.id === window.__ginasio.ME.id).chakra);
  await page.keyboard.press("q");
  await expect.poll(() => page.evaluate(() => window.__ginasio.N.snap.entidades.find((e) => e.id === window.__ginasio.ME.id).cds[2])).toBeGreaterThan(0);
  const depois = await page.evaluate(() => window.__ginasio.N.snap.entidades.find((e) => e.id === window.__ginasio.ME.id).chakra);
  expect(depois).toBeLessThan(antes);
  await page.screenshot({ path: test.info().outputPath("naruto-ginasio.png") });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("naruto-ginasio-celular.png") });
  expect(erros).toEqual([]);
});

test("Vila: seleção de Naruto cabe na tela do celular", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  try {
    await page.addInitScript(() => {
      localStorage.setItem("galera:name", JSON.stringify("Ninja"));
      localStorage.setItem("vila_spawn", JSON.stringify("tenis"));
    });
    await page.goto("/#debug");
    await page.waitForFunction(() => window.__vila?.myId);
    await page.locator("#bTeam").tap();
    await page.locator('[data-team="naruto"]').tap();
    const layout = await page.locator("#team .box").evaluate((el) => ({ left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, width: el.clientWidth, scroll: el.scrollWidth }));
    expect(layout.left).toBeGreaterThanOrEqual(0);
    expect(layout.right).toBeLessThanOrEqual(375);
    expect(layout.scroll).toBeLessThanOrEqual(layout.width);
    await page.screenshot({ path: test.info().outputPath("naruto-celular.png") });
  } finally {
    await page.close();
  }
});
