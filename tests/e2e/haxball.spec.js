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

// a Noite da Galera chama a turma para o Haxball: a página abre com ?sala=&entrar=1 e entra sozinha com o nome da galera
test("haxball: chegando pela Noite (?entrar=1), entra sozinho na sala com o nome salvo", async ({ browser }) => {
  const host = await browser.newPage(), amigo = await browser.newPage();
  await host.goto("/haxball/");
  await host.locator("#name").fill("Thiago");
  await host.locator("#create").click();
  const code = await host.locator("#roomCode").innerText();
  expect(await host.evaluate(() => JSON.parse(localStorage.getItem("galera:name")))).toBe("Thiago");
  await amigo.goto("/haxball/");
  await amigo.evaluate(() => localStorage.setItem("galera:name", JSON.stringify("Amigo")));
  await amigo.goto(`/haxball/?sala=${code}&entrar=1`);
  await expect(amigo.locator("#roomCode")).toHaveText(code);
  await expect(amigo.locator("#noiteAba")).toBeVisible(); // a aba 🌙 da Noite agora aparece no Haxball, dentro da sala
  await host.close(); await amigo.close();
});
