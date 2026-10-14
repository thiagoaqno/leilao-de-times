const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

test("painel permite escolher jogador e desfazer transferência pela própria lista", async ({ page }) => {
  const html = fs.readFileSync(path.join(__dirname, "..", "..", "admin-carreira.html"), "utf8");
  const edicoes = [];
  const detalhe = {
    codigo: "ABCDE", nomeClube: "Flamengo", clube: "flamengo", caixa: 75000000, jogoAoVivo: false,
    clubes: [{ id: "flamengo", nome: "Flamengo", humano: true }, { id: "palmeiras", nome: "Palmeiras", humano: true }],
    jogadores: [{ id: "flamengo-10", nome: "Giorgian de Arrascaeta", pos: "MEI", overall: 86, energia: 89,
      atr: { rit: 72, fin: 81, pas: 88, dri: 89, def: 44, fis: 62 } }],
    transferencias: [{ jogador: "palmeiras-9", nome: "Pedro", de: "Palmeiras", deNome: "Palmeiras",
      para: "Flamengo", paraNome: "Flamengo", valor: 1000000, revertida: false, especial: false }],
  };
  await page.route("**/admin/carreira", (r) => r.fulfill({ status: 200, contentType: "text/html", body: html }));
  await page.route("**/admin/carreira/api/inicio", (r) => r.fulfill({ json: { csrf: "teste", salas: [{ codigo: "ABCDE", temporada: 1, rodada: 2, jogoAoVivo: false,
    tecnicos: [{ nome: "Ana", clube: "flamengo", nomeClube: "Flamengo" }] }] } }));
  await page.route("**/admin/carreira/api/salas/ABCDE*", async (r) => {
    if (r.request().method() === "POST") {
      edicoes.push(r.request().postDataJSON());
      return r.fulfill({ json: { depois: "ok" } });
    }
    return r.fulfill({ json: detalhe });
  });
  await page.goto("/admin/carreira");
  await expect(page.getByRole("heading", { name: "Flamengo · sala ABCDE" })).toBeVisible();
  await page.getByPlaceholder("Digite o nome do jogador").fill("Arrascaeta");
  await page.getByRole("button", { name: /Giorgian de Arrascaeta/ }).click();
  await expect(page.getByRole("heading", { name: "Giorgian de Arrascaeta" })).toBeVisible();
  await page.locator("#energia").fill("76");
  await page.getByRole("button", { name: "Salvar energia" }).click();
  await expect(page.getByText("Energia de Giorgian de Arrascaeta atualizada.")).toBeVisible();
  assertEdicao(edicoes[0], "energia", "flamengo-10");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByText("Transferência de Pedro desfeita.")).toBeVisible();
  assertEdicao(edicoes[1], "desfazer_transferencia", "palmeiras-9");
  await page.screenshot({ path: "test-results/admin-carreira.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/admin-carreira-mobile.png", fullPage: true });
});

function assertEdicao(edicao, tipo, jogador) {
  expect(edicao).toMatchObject({ tipo, jogador, clube: "flamengo" });
}
