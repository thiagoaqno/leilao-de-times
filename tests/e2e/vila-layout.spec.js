const { test, expect } = require("@playwright/test");

test("a Vila da Paulista mantém todos os jogos acessíveis, sem prédios sobrepostos, e dá um ginásio a cada treinador", async ({ page }) => {
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
      isolados: v.GAMES.filter((g) => !g.mats.some(([x, y]) => v.bfs(v.player.x, v.player.y, x, y))).map((g) => g.id),
      sobrepostos: v.GAMES.flatMap((a, i, games) => games.slice(i + 1)
        .filter((b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y)
        .map((b) => `${a.id}/${b.id}`)),
      ginasios: v.GAMES.filter((g) => g.lider).map((g) => [g.w, g.h, !!g.npc]),
      masp: v.GAMES.find((g) => g.id === "leilao").masp,
      mato: v.ground.flat().filter((t) => t === "h").length,
    };
  });
  expect(mapa.tamanho).toEqual([96, 60]);
  expect(mapa.isolados).toEqual([]);
  expect(mapa.sobrepostos).toEqual([]);
  expect(mapa.ginasios).toHaveLength(10); // 4 líderes e 6 treinadores, todos em prédios (nenhum parado na rua)
  expect(mapa.ginasios.every(([w, h, npc]) => w >= 6 && h === 4 && !npc)).toBe(true);
  expect(mapa.masp).toBe(true);
  expect(mapa.mato).toBe(16 * 4);
});

test("a Avenida Paulista atravessa a vila: calçadas, asfalto aberto, ciclovia no canteiro e faixas de pedestre", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("galera:name", JSON.stringify("Teste")); localStorage.removeItem("vila_spawn"); });
  await page.goto("/#debug");
  await page.waitForFunction(() => window.__vila?.myId);

  const mapa = await page.evaluate(() => {
    const { ground, player } = window.__vila;
    return {
      calcada: ground[21][40], asfalto: ground[23][40], ciclovia: ground[25][40], faixa: ground[23][25],
      ponta: [ground[25][5], ground[25][90]], inicio: [player.x, player.y],
    };
  });
  expect(mapa).toEqual({ calcada: "a", asfalto: "v", ciclovia: "b", faixa: "z", ponta: ["b", "b"], inicio: [37, 30] });
  await expect(page.locator(".avenida-label")).toHaveText("Av. Paulista");
  await expect(page.locator("#mini")).toHaveClass(/off/);
  await page.locator("#bMapa").click();
  await expect(page.locator("#mini")).not.toHaveClass(/off/);
});
