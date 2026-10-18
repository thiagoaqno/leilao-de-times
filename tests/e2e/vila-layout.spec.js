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
      sobrepostos: v.GAMES.filter((g) => !g.npc).flatMap((a, i, games) => games.slice(i + 1)
        .filter((b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y)
        .map((b) => `${a.id}/${b.id}`)),
    };
  });
  expect(mapa.tamanho).toEqual([64, 64]);
  expect([mapa.haxball.x, mapa.haxball.y, mapa.haxball.w, mapa.haxball.h]).toEqual([6, 42, 7, 4]);
  expect(mapa.isolados).toEqual([]);
  expect(mapa.sobrepostos).toEqual([]);
  await expect(page.locator("#menuList")).not.toContainText("Estádios");
});

test("a Paulista Aberta une a praça aos jogos com ciclovia e travessias", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("galera:name", JSON.stringify("Teste")));
  await page.goto("/#debug");
  await page.waitForFunction(() => window.__vila?.myId);

  const mapa = await page.evaluate(() => {
    const { ground, player } = window.__vila;
    return {
      passeio: ground[29][23],
      ciclovia: ground[31][23],
      travessia: ground[31][13],
      praca: ground[25][32],
      inicio: [player.x, player.y],
    };
  });
  expect(mapa).toEqual({ passeio: "a", ciclovia: "b", travessia: "z", praca: "o", inicio: [32, 28] });
  await expect(page.locator(".avenida-label")).toHaveText("Av. Paulista");
  await expect(page.locator("#mini")).toHaveClass(/off/);
  await page.locator("#bMapa").click();
  await expect(page.locator("#mini")).not.toHaveClass(/off/);
});
