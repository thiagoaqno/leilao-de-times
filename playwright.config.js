// Testes no navegador (npm run test:e2e). Sobe o servidor de verdade numa porta própria.
// Navegador: o Chromium do Playwright (npx playwright install chromium) ou, se ele não estiver instalado, o Chrome
// do sistema (ou o Edge, que também é Chromium). Com PLAYWRIGHT_BROWSERS_PATH apontando para outro lugar, o
// Playwright procura o Chromium lá.
const fs = require("fs");
const { defineConfig, chromium } = require("@playwright/test");

const PORTA = +process.env.E2E_PORT || 3917;
let temChromium = false;
try { temChromium = fs.existsSync(chromium.executablePath()); } catch {}
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  (process.env.LOCALAPPDATA || "") + "/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
const canal = temChromium ? null : CHROME.some((c) => fs.existsSync(c)) ? "chrome" : "msedge";

module.exports = defineConfig({
  testDir: "tests/e2e",
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1, // o navegador de teste é lento (poucos quadros por segundo): um teste por vez
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    ...(canal ? { channel: canal } : {}),
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] },
  },
  webServer: {
    command: "node server.js",
    url: `http://localhost:${PORTA}/`,
    env: { PORT: String(PORTA), DOMINO_PASS_MS: "300" },
    reuseExistingServer: false,
    timeout: 30000,
  },
});
