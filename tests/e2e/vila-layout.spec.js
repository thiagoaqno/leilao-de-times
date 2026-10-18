const { test, expect } = require("@playwright/test");

test("a Vila compacta mantém todos os jogos acessíveis e põe Haxball no lote antigo", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("galera:name", JSON.stringify("Teste"));
    localStorage.setItem("vila_spawn", JSON.stringify("haxball"));
  });
  await page.goto("/#debug");
  await page.waitForFunction(() => window.__vila?.myId);

  const mapa = await page.evaluate(() => {
    const v = window.__vila;
    return {
      tamanho: [v.ground[0].length, v.ground.length],
      haxball: v.GAMES.find((g) => g.id === "haxball"),
      isolados: v.GAMES.filter((g) => !g.npc && !g.mats.some(([x, y]) => v.bfs(v.player.x, v.player.y, x, y))).map((g) => g.id),
    };
  });
  expect(mapa.tamanho).toEqual([64, 64]);
  expect([mapa.haxball.x, mapa.haxball.y, mapa.haxball.w, mapa.haxball.h]).toEqual([6, 42, 7, 4]);
  expect(mapa.isolados).toEqual([]);
  await expect(page.locator("#menuList")).not.toContainText("Estádios");
});

test("a Avenida Paulista une a praça aos jogos com ciclovia e travessias", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("galera:name", JSON.stringify("Teste")));
  await page.goto("/#debug");
  await page.waitForFunction(() => window.__vila?.myId);

  const mapa = await page.evaluate(() => {
    const { ground, player } = window.__vila;
    return {
      pista: ground[29][23],
      ciclovia: ground[31][23],
      travessia: ground[31][13],
      calcada: ground[33][23],
      inicio: [player.x, player.y],
    };
  });
  expect(mapa).toEqual({ pista: "a", ciclovia: "b", travessia: "z", calcada: "p", inicio: [27, 24] });
  await expect(page.locator(".avenida-label")).toHaveText("Av. Paulista");
});
