// Tiro da Galera — treino: alvos que andam de um lado para o outro (só no seu navegador).
import { AR, store, G, now } from "./estado.js";
import { Sound } from "./sons.js";
import { scene } from "./cena.js";
import { makePlayer } from "./bonecos.js";
import { blood } from "./efeitos.js";
import { pushFeed, hitMarker } from "./hud.js";

// ======================================================================
// Treino: alvos que andam de um lado para o outro (só no seu navegador)
// ======================================================================
const BOT_SPOTS = [[20, 0, 0], [12, 0, 10], [12, 0, -10], [22, 0, 12], [18, 0, -12], [7, 0, 3], [26, 0, -5], [3, 0, -16.5], [9, 0, 16.4]];
export function spawnBots() {
  G.bots = [];
  for (let i = 0; i < 5; i++) {
    const b = { id: "bot" + i, name: "Alvo " + (i + 1), team: "B", model: makePlayer("B", "", false), hp: 100, alive: true, x: 0, y: 0, z: 0, yaw: Math.PI / 2, pitch: 0, w: i % 2 ? "awp" : "ak", speed: 0, stepT: 0, g: 1 };
    placeBot(b); scene.add(b.model); G.bots.push(b); G.remotes.set(b.id, b);
  }
}
function placeBot(b) {
  const used = new Set(G.bots.filter((o) => o !== b && o.alive).map((o) => o.spot));
  const free = BOT_SPOTS.map((s, i) => i).filter((i) => !used.has(i));
  b.spot = free[Math.floor(Math.random() * free.length)];
  const s = BOT_SPOTS[b.spot]; b.home = s; b.x = s[0]; b.y = s[1]; b.z = s[2]; b.phase = Math.random() * 6; b.amp = Math.random() < 0.3 ? 0 : 1.2 + Math.random() * 1.5;
  b.hp = 100; b.alive = true; b.model.visible = true;
}
export function updateBots(dt, t) {
  for (const b of G.bots) {
    if (!b.alive) { if (t > b.respawnAt) placeBot(b); continue; }
    const nz = b.home[2] + Math.sin(t * 1.6 + b.phase) * b.amp;
    b.speed = Math.abs(nz - b.z) / Math.max(dt, 1e-3); b.z = nz;
    b.yaw = Math.atan2(-(G.me.x - b.x), -(G.me.z - b.z)); // olha para você
  }
}
export function botHit(b, part, point, fixed) {
  const dmg = fixed ?? AR.damage(G.me.w, part); b.hp -= dmg; blood(point);
  const kill = b.hp <= 0; hitMarker(kill); Sound.hit(part === "head");
  if (kill) {
    b.alive = false; b.model.visible = false; b.respawnAt = now() + 1.5; G.kills++; if (part === "head") G.hs++;
    const dl = Math.hypot(b.x - G.me.x, b.z - G.me.z) || 1; b.lastHit = { dir: { x: (b.x - G.me.x) / dl, z: (b.z - G.me.z) / dl }, head: part === "head", t: now() }; // o corpo cai em updateRemotes
    setTimeout(() => Sound.kill(), 90);
    pushFeed({ byName: store.get("galera:name") || "Você", toName: b.name, w: G.me.w, head: part === "head" });
  }
}
