import test from 'node:test';
import assert from 'node:assert/strict';
import { montar } from './ajuda-cena/index.mjs';
import { DESTAQUES, cameraDestaque } from '../public/corrida/destaques-tv.js';

test('as câmeras dos destaques usam a geometria das pistas e produzem posições válidas', { timeout: 180000 }, async () => {
  for (const id of Object.keys(DESTAQUES)) {
    const { tr } = await montar(id);
    for (const cena of DESTAQUES[id]) for (const u of [0, 0.5, 1]) {
      const c = cameraDestaque(tr, cena, u);
      for (const k of ['x', 'y', 'z', 'ax', 'ay', 'az', 'gx', 'gz', 'fov']) assert.ok(Number.isFinite(c[k]), `${id}: ${cena[0]} ${k}`);
      assert.ok(c.y > tr.chao(c.x, c.z), `${id}: câmera abaixo do terreno`);
    }
  }
});
