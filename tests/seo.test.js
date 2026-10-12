const test = require("node:test");
const assert = require("node:assert");
const { subirServidor } = require("./ajuda.js");

test("SEO: robots, sitemap e tags nas páginas", async (t) => {
  const srv = await subirServidor({ SITE_URL: "https://vila.exemplo.com.br/" });
  t.after(() => srv.parar && srv.parar());
  const pegar = async (c) => (await fetch(srv.url + c)).text();
  const robots = await pegar("/robots.txt");
  assert.match(robots, /Sitemap: https:\/\/vila\.exemplo\.com\.br\/sitemap\.xml/);
  const mapa = await pegar("/sitemap.xml");
  assert.match(mapa, /<loc>https:\/\/vila\.exemplo\.com\.br\/truco\/<\/loc>/);
  const home = await pegar("/");
  assert.match(home, /<link rel="canonical" href="https:\/\/vila\.exemplo\.com\.br\/">/);
  assert.match(home, /og:image" content="https:\/\/vila\.exemplo\.com\.br\/og\.png"/);
  assert.match(await pegar("/uno/"), /name="description"/);
});
