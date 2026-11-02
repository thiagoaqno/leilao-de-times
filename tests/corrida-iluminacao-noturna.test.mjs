import test from 'node:test';
import assert from 'node:assert/strict';
import { montar } from './ajuda-cena/index.mjs';
import { luzEm, luzEmTodas, ambienteDaNoite } from '../public/corrida/kit/luz-postes.js';

// A luz dos postes e holofotes é de verdade (poças de luz no asfalto, escuro entre os postes), não asfalto emissivo nem luz geral
// uniforme. Aqui: o registro das luzes, a grade que as leva ao sombreador e a continuidade (nada de salto = nada de piscada).
test('postes noturnos viram luzes registradas, sem asfalto emissivo e sem luzes móveis', { timeout: 120000 }, async () => {
  for (const id of ['lasvegas', 'singapura', 'bahrein']) {
    const { tr } = await montar(id), nomes = [];
    tr.grp.traverse((o) => { nomes.push(o.name); assert.ok(!o.isLight, `${id}: nenhuma luz real do three.js na pista (${o.name})`); });
    assert.equal(nomes.some((n) => n === `${id}-luz-no-chao`), false, id);
    assert.equal(tr.asfaltoLV, undefined, 'o asfalto de Las Vegas não é mais emissivo');
    assert.ok(tr.luzesPista.length > 20, `${id}: luzes registradas`);
    const P = tr.luzPostes; assert.ok(P && P.tex, id);
    assert.equal(P.cheias, 0, `${id}: nenhuma célula da grade estourou as 12 luzes`);
    assert.ok(P.cobertura > 0.5, `${id}: os postes cobrem a volta`);
    const am = ambienteDaNoite(tr); assert.ok(am.hemi < 0.95 && am.hemi >= 0.38, `${id}: a luz geral da noite baixou`);
  }
});

test('Singapura: poças embaixo dos postes, mais escuro entre eles, sem salto', { timeout: 120000 }, async () => {
  const { tr } = await montar('singapura'), P = tr.luzPostes;
  // a grade dá o mesmo que a soma de todas as luzes, em pontos da pista e da beira
  let pior = 0;
  for (let i = 0; i < tr.n; i += 7) for (const lat of [-30, 0, 30]) {
    const p = tr.pts[i], x = p.x + p.nx * lat, z = p.y + p.ny * lat, a = luzEm(tr, x, p.h + 0.4, z), b = luzEmTodas(tr, x, p.h + 0.4, z);
    pior = Math.max(pior, Math.abs(a - b) / Math.max(1, b));
  }
  assert.ok(pior < 0.02, `a grade perde luz que importa: ${pior}`);
  // o contraste ao longo do eixo: mais claro sob os cones que entre eles, mas nunca preto (a luz geral e a dos vizinhos)
  let min = 1e9, max = 0, salto = 0, ant = null;
  for (let k = 0; k < tr.n * 4; k++) {
    const f = k / 4, a = Math.floor(f) % tr.n, b = (a + 1) % tr.n, u = f - Math.floor(f), pa = tr.pts[a], pb = tr.pts[b];
    const v = luzEm(tr, pa.x + (pb.x - pa.x) * u, pa.h + 0.4, pa.y + (pb.y - pa.y) * u);
    min = Math.min(min, v); max = Math.max(max, v); if (ant != null) salto = Math.max(salto, Math.abs(v - ant)); ant = v;
  }
  assert.ok(max / Math.max(min, 0.01) > 2.5, `há poças e trechos escuros: ${min} a ${max}`);
  assert.ok(salto < 0.1 * max, `a luz muda de modo contínuo ao andar (maior salto ${salto} de ${max})`);
  assert.ok(P.maxPorCelula <= 12);
});
