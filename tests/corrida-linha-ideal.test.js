const test = require("node:test"), assert = require("node:assert/strict");
const T = require("../public/corrida/pistas.js");
const Ideais = require("../public/corrida/linhas-ideais.js");
const Robos = require("../corrida-robos.js");
const Ferr = require("../ferramentas/linha-ideal.js");
const F1Equipes = require("../public/corrida/f1-equipes.js");

const ids = Object.keys(T.PISTAS);
// curvatura com sinal (1/u) do caminho, pelo círculo de três pontos a 4 pontos de cada lado
const curv = (pts, lat) => {
  const n = pts.length, X = lat.map((l, i) => pts[i].x - pts[i].ty * l), Y = lat.map((l, i) => pts[i].y + pts[i].tx * l);
  return lat.map((_, i) => { const a = (i - 4 + n) % n, b = (i + 4) % n, cz = (X[i] - X[a]) * (Y[b] - Y[i]) - (Y[i] - Y[a]) * (X[b] - X[i]);
    const da = Math.hypot(X[i] - X[a], Y[i] - Y[a]), db = Math.hypot(X[b] - X[i], Y[b] - Y[i]), dc = Math.hypot(X[b] - X[a], Y[b] - Y[a]); return 2 * cz / (da * db * dc); });
};
// as chicanes: onde a linha central vira para um lado e logo (40 pontos) para o outro, com raio < 120 u
const chicanes = (cs) => { const n = cs.length, m = new Uint8Array(n);
  for (let i = 0; i < n; i++) { let mx = 0, mn = 0; for (let j = 0; j < 40; j++) { const v = cs[(i + j) % n]; mx = Math.max(mx, v); mn = Math.min(mn, v); }
    if (mx > 1 / 120 && -mn > 1 / 120) for (let j = -10; j < 50; j++) m[(i + j + n) % n] = 1; }
  return m; };

test("o arquivo de linhas ideais está em dia com a geometria das pistas", () => {
  for (const id of ids) {
    const t = T.PISTAS[id], d = Ideais.LINHAS[id], pts = T.pontos(t, Ideais.STEP);
    assert.ok(d, `${id} sem linha ideal: rode node ferramentas/linha-ideal.js`);
    assert.equal(d.sig, Ferr.assinatura(t, pts), `${id}: a geometria mudou, rode node ferramentas/linha-ideal.js`);
    assert.equal(d.lat.length, pts.length);
  }
});

test("a linha ideal cabe na pista em toda pista", () => {
  for (const id of ids) {
    const t = T.PISTAS[id], max = t.width / 2 - Ferr.MARGEM;
    for (const v of Ideais.LINHAS[id].lat) assert.ok(Math.abs(v / 10) <= max + 0.11, `${id}: ${v / 10} passa de ${max}`);
  }
});

test("em Mônaco a linha usa a largura toda e corta as chicanes", () => {
  const t = T.PISTAS.monaco, max = t.width / 2 - Ferr.MARGEM, pts = T.pontos(t, Ideais.STEP), lat = Ideais.LINHAS.monaco.lat.map((v) => v / 10);
  const pico = Math.max(...lat.map(Math.abs));
  assert.ok(pico >= max * 0.9, `|lat| máximo ${pico} longe da meia largura útil ${max}`);
  const ci = curv(pts, lat), cc = curv(pts, lat.map(() => 0)), m = chicanes(cc); let mi = 0, mc = 0;
  m.forEach((q, i) => { if (q) { mi = Math.max(mi, Math.abs(ci[i])); mc = Math.max(mc, Math.abs(cc[i])); } });
  assert.ok(mc > 0 && mi < mc, `nas chicanes a curvatura da linha ideal (${mi}) devia ser menor que a da central (${mc})`);
});

test("o robô de F1 usa a linha ideal (sem as voltas humanas) e tem perfil de velocidade", () => {
  const pf = Robos.perfil("monaco", F1Equipes.specDaEquipe("mclaren"), 0);
  assert.ok(pf.ideal); assert.equal(pf.fator, 1); assert.equal(pf.aprendeu, false);
  assert.ok(pf.kf.every((k) => k <= 1 / 22 + 1e-9));
});
