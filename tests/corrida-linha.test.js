const test = require("node:test");
const assert = require("node:assert/strict");
const { otimizar } = require("../corrida-linha.js");

test("a otimização continua depois que pontos sucessivos chegam à borda", () => {
  const n = 20, max = 10;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = i * 2 * Math.PI / n, dx = -100 * Math.sin(a), dy = 60 * Math.cos(a), d = Math.hypot(dx, dy);
    return { x: 100 * Math.cos(a), y: 60 * Math.sin(a), tx: dx / d, ty: dy / d };
  });
  const lat = otimizar(pts, max);
  assert.ok(Array.from(lat).every((v) => Math.abs(v) <= max + 1e-8));
  assert.ok(Array.from(lat).filter((v) => Math.abs(v - max) < 1e-6).length >= 10);
  for (let i = 0; i < n / 2; i++) assert.ok(Math.abs(lat[i] - lat[i + n / 2]) < 0.01, "a linha deve respeitar a simetria da pista");
});
