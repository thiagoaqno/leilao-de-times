const { test, expect } = require("@playwright/test");

test("haxball: dois navegadores criam sala e começam uma partida", async ({ browser }) => {
  const host = await browser.newPage(), friend = await browser.newPage();
  await host.goto("/haxball/");
  await host.locator("#name").fill("Thiago");
  await host.locator("#create").click();
  await expect(host.locator("#room")).toBeVisible();
  const code = await host.locator("#roomCode").innerText();
  expect(code).toMatch(/^[A-Z2-9]{5}$/);
  await friend.goto("/haxball/?sala=" + code);
  await friend.locator("#name").fill("Amigo");
  await friend.locator("#join").click();
  await expect(friend.locator("#roomCode")).toHaveText(code);
  await expect(host.locator("#start")).toBeEnabled();
  await host.locator("#start").click();
  await expect(host.locator("#game")).toBeVisible();
  await expect(friend.locator("#game")).toBeVisible();
  await expect(host.locator("#scoreA")).toHaveText("0");
  if (process.env.HAXBALL_FOTO) await host.screenshot({ path: process.env.HAXBALL_FOTO, fullPage: true });
  await host.keyboard.down("ArrowRight");
  await host.waitForTimeout(350);
  await host.keyboard.up("ArrowRight");
  await expect(host.locator("#role")).toHaveText("Você joga pelo azul");
  await host.close(); await friend.close();
});
