const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LIGAS, urlDeTrofeu, buscarTrofeu } = require('../trofeus-carreira');

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
  assert.equal(await buscarTrofeu('champions', buscar), url);
  assert.equal(urlDeTrofeu('https://outro-site.com/images/media/league/trophy/x.png'), null);
  assert.equal(urlDeTrofeu('https://www.thesportsdb.com/images/media/team/badge/x.png'), null);
  assert.equal(await buscarTrofeu('desconhecido', buscar), null);
});
