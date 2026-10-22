const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { LIGAS, urlDeTrofeu, buscarTrofeu } = require('../ferramentas/trofeus-carreira');

test('as competições da carreira apontam para ligas da TheSportsDB', () => {
  assert.equal(LIGAS['brasileirao-2026'], 4351);
  assert.equal(LIGAS.champions, 4480);
  assert.equal(LIGAS.copadomundo, 4429);
});

test('usa strTrophy e aceita somente a pasta de taças da TheSportsDB', async () => {
  const url = 'https://www.thesportsdb.com/images/media/league/trophy/abc.png';
  const buscar = async (endpoint) => {
    assert.match(endpoint, /lookupleague\.php\?id=4480$/);
    return { ok: true, json: async () => ({ leagues: [{ strTrophy: url }] }) };
  };
  assert.equal(await buscarTrofeu('champions', buscar), url.replace('www.', 'r2.'));
  assert.equal(urlDeTrofeu('https://outro-site.com/images/media/league/trophy/x.png'), null);
  assert.equal(urlDeTrofeu('https://www.thesportsdb.com/images/media/team/badge/x.png'), null);
  assert.equal(await buscarTrofeu('desconhecido', buscar), null);
});

test('todos os troféus mapeados estão salvos como PNGs locais', () => {
  const raiz = path.join(__dirname, '..', 'public', 'carreira');
  const fontes = require(path.join(raiz, 'trofeus-api.json'));
  assert.deepEqual(Object.keys(fontes).sort(), Object.keys(LIGAS).sort());
  for (const [id, fonte] of Object.entries(fontes)) {
    assert.equal(fonte.liga, LIGAS[id]);
    assert.match(fonte.url, /^https:\/\/r2\.thesportsdb\.com\/images\/media\/league\/trophy\/[^/]+\.png$/);
    const dados = fs.readFileSync(path.join(raiz, 'trofeus-locais', `${id}.png`));
    assert.ok(dados.length > 100);
    assert.deepEqual([...dados.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});
