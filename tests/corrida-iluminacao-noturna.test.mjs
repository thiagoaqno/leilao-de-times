import test from 'node:test';
import assert from 'node:assert/strict';
import { montar } from './ajuda-cena/index.mjs';

test('refletores noturnos iluminam sem planos sobre as rodas e sem luzes móveis', { timeout: 120000 }, async () => {
  for (const id of ['lasvegas', 'singapura', 'bahrein']) {
    const { tr } = await montar(id), nomes = [], refletores = [];
    tr.grp.traverse((o) => { nomes.push(o.name); if (o.isSpotLight && o.name.includes('luz-refletor')) refletores.push(o); });
    assert.equal(nomes.some((n) => n === `${id}-luz-no-chao`), false, id);
    assert.equal(refletores.length, 0, id);
    if (id === 'lasvegas') assert.equal(nomes.some((n) => n === 'lasvegas-reflexos-chao' || n === 'lasvegas-sphere-glow'), false);
    const luzes = tr.luzBahrein; assert.ok(luzes && luzes.quadro.length, id);
    if (id === 'lasvegas') {
      assert.equal(tr.asfaltoLV.emissiveMap, tr.asfaltoLV.map);
      const asfalto = luzes.emissivos.find((e) => e.mat === tr.asfaltoLV);
      assert.deepEqual(asfalto?.valores, [0, 2.4]);
      tr.noite = true; tr.animarPista(0, { x: 0, y: 0 }, 0);
      assert.equal(tr.asfaltoLV.emissiveIntensity, 2.4);
      tr.noite = false; tr.animarPista(0, { x: 0, y: 0 }, 0);
      assert.equal(tr.asfaltoLV.emissiveIntensity, 0);
    }
    const hemi = (await import('../public/corrida/cena.js')).hemi;
    for (const x of [0, tr.t.world]) { for (const f of luzes.quadro) f(true, { x, y: x }); assert.ok(hemi.intensity >= 1.2, `${id} iluminado longe`); }
  }
});
