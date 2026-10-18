const { test, expect } = require("@playwright/test");

test("prédio de tênis de mesa abre o Table Tennis Pro original", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const entrada = page.locator('#menuList a[data-id="pingpong"]');
  await expect(entrada).toHaveAttribute("href", "/table-tennis-pro/");
  await page.goto("/table-tennis-pro/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("Table Tennis Pro · Vila da Galera");
  const jogo = page.locator("#tableTennisPro");
  await expect(jogo).toHaveAttribute("src", /html5\.gamedistribution\.com\/45aade9b6c15481ab6c0e449b4440f40\/\?gd_sdk_referrer_url=/);
  await expect(page.locator("#abrirFora")).toHaveAttribute("href", await jogo.getAttribute("src"));
  await expect(page.getByText("Partidas aqui não entram no placar da Noite da Galera.")).toBeVisible();
  if (process.env.TENNIS_PRO_FOTO) await page.screenshot({ path: process.env.TENNIS_PRO_FOTO, fullPage: true });
});
