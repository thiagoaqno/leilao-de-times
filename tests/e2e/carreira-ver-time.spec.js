// Carreira: tocar num clube (a turma da sala, a tabela) abre o elenco e a escalação dele, só para ver.
const { test, expect } = require("@playwright/test");
const fs = require("node:fs"), path = require("node:path"), fotos = process.env.CARREIRA_FOTOS;
const fotografar = async (page, nome) => { if (!fotos) return; fs.mkdirSync(fotos, { recursive: true }); await page.screenshot({ path: path.join(fotos, `${nome}.png`) }); };
const semAvisos = (page) => page.addLocatorHandler(page.locator("dialog.popup-aviso[open]"), async (d) => { await d.locator("button.primario").first().click(); });
const vigiar = (page) => { const erros = []; page.on("pageerror", (e) => erros.push(String(e))); semAvisos(page); return erros; };

test.setTimeout(120000);

test("carreira em grupo: ver o elenco do amigo e de um clube da tabela", async ({ browser }) => {
  const ca = await browser.newContext(), cb = await browser.newContext();
  const a = await ca.newPage(), b = await cb.newPage();
  const erros = [...vigiar(a), ...vigiar(b)];
  await a.setViewportSize({ width: 1440, height: 900 });
  await a.goto("/carreira/?grupo=1#debug");
  await a.fill("#hName", "Ana");
  await a.click("#btnCreate");
  await expect(a.locator("#gCodigo")).toHaveText(/^[A-Z2-9]{5}$/);
  const codigo = await a.locator("#gCodigo").textContent();
  await b.goto(`/carreira/?sala=${codigo}#debug`);
  await b.fill("#hName", "Bia");
  await b.click("#btnJoin");
  await a.click('[data-clube-sala="flamengo"]');
  await b.click('[data-clube-sala="palmeiras"]');
  await expect(a.locator("#btnComecar")).toBeEnabled();
  await a.click("#btnComecar");
  await expect(a.locator("#sede")).toBeVisible({ timeout: 30000 });
  await expect(b.locator("#sede")).toBeVisible({ timeout: 30000 });

  // a Bia muda a formação; a Ana toca nela na turma e vê o time do jeito que a Bia deixou
  await b.evaluate(() => new Promise((ok) => socket.emit("escalacao", { formacao: "4-4-2" }, ok)));
  await a.click('#cartaoTurma [data-time="palmeiras"]');
  const dlg = a.locator("#verTime");
  await expect(dlg).toBeVisible();
  await expect(dlg.locator(".vt-topo")).toContainText("Técnico: Bia");
  await expect(dlg.locator(".vt-numeros")).toContainText("4-4-2");
  await expect(dlg.locator(".gramado .peca[data-jogador]")).toHaveCount(11);
  expect(await dlg.locator(".vt-banco .figurinha").count()).toBeGreaterThan(5);
  await fotografar(a, "amigo-pc");
  // tocar num jogador abre a ficha dele por cima
  await dlg.locator(".vt-banco .figurinha").first().click();
  await expect(a.locator("#ficha")).toBeVisible();
  await a.click("#fichaFechar");
  await a.click("#vtFechar");
  await expect(dlg).toBeHidden();

  // um clube do computador, pela tabela
  await a.click('#sede .tile[data-ir="tabela"]');
  await a.waitForFunction(() => !Zoom.ocupado());
  await a.locator('#tTabela tr[data-time="corinthians"]').click();
  await expect(dlg.locator(".vt-topo")).toContainText("Comandado pelo computador");
  await expect(dlg.locator(".gramado .peca[data-jogador]")).toHaveCount(11);
  await fotografar(a, "computador-pc");
  await a.click("#vtFechar");

  // no celular
  await b.setViewportSize({ width: 390, height: 844 });
  await b.click('#cartaoTurma [data-time="flamengo"]');
  await expect(b.locator("#verTime .vt-topo")).toContainText("Técnico: Ana");
  await fotografar(b, "amigo-cel");
  expect(erros).toEqual([]);
  await ca.close(); await cb.close();
});
