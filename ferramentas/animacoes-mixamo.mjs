// Converte as animações do Mixamo (FBX "with skin", todas com o mesmo personagem) para o que o Futevôlei carrega:
//   public/futevolei/modelo/atleta.glb    o boneco (malha com ossos), do primeiro arquivo, sem textura
//   public/futevolei/modelo/clipes.json   as animações (só rotação dos ossos, a posição só do quadril), valores arredondados
// Uso: node ferramentas/animacoes-mixamo.mjs <pasta com os .fbx> [outras pastas...] (o mesmo nome em duas pastas vale o primeiro)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const raiz = path.dirname(require.resolve("three"));
const THREE = await import(path.join(raiz, "../build/three.module.js").replace(/\\/g, "/").replace(/^/, "file://").replace("file:///", "file:///"));
const { GLTFExporter } = await import("file://" + path.join(raiz, "../examples/jsm/exporters/GLTFExporter.js").replace(/\\/g, "/"));
const { FBXLoader } = await import("file://" + path.join(raiz, "../examples/jsm/loaders/FBXLoader.js").replace(/\\/g, "/"));
const pastas = process.argv.slice(2), saida = "public/futevolei/modelo";
if (!pastas.length) { console.error("Uso: node ferramentas/animacoes-mixamo.mjs <pasta> [outras pastas...]"); process.exit(1); }
fs.mkdirSync(saida, { recursive: true });
const vistos = new Set(), arq = [];
for (const p of pastas) for (const f of fs.readdirSync(p).filter((f) => /\.fbx$/i.test(f)).sort()) if (!vistos.has(f)) { vistos.add(f); arq.push(path.join(p, f)); }
// nome do clipe: minúsculo, sem espaços (Running Jump → runningJump)
const nome = (f) => f.replace(/\.fbx$/i, "").split(/\s+/).map((p, i) => (i ? p[0].toUpperCase() + p.slice(1) : p[0].toLowerCase() + p.slice(1))).join("");
const r = (v) => Math.round(v * 10000) / 10000;
const clipes = {};
let modelo = null;
for (let f of arq) {
  const buf = fs.readFileSync(f); f = path.basename(f);
  const obj = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
  if (!modelo) modelo = obj;
  const clip = obj.animations[0]; if (!clip) { console.warn("sem animação:", f); continue; }
  const tracks = [];
  for (const t of clip.tracks) {
    const [osso, prop] = t.name.split(".");
    if (prop === "scale") continue;
    if (prop === "position" && !/Hips$/.test(osso)) continue;
    if (/Hand(Thumb|Index|Middle|Ring|Pinky)|_End$|Toe_End|HeadTop_End/.test(osso)) continue; // os dedos não aparecem no futevôlei
    const esc = prop === "position" ? 0.01 : 1; // o Mixamo vem em centímetros
    tracks.push({ n: osso.replace("mixamorig", ""), p: prop === "position" ? "p" : "q", t: Array.from(t.times, r), v: Array.from(t.values, (x) => r(x * esc)) });
  }
  clipes[nome(f)] = { dur: r(clip.duration), tracks };
  console.log(nome(f), clip.duration.toFixed(2) + "s", tracks.length, "trilhas");
}
// o boneco: só a malha do corpo (sem as bolinhas das juntas), vértices juntos, sem textura. Cada vértice leva a "região"
// (0 pele, 1 camisa, 2 bermuda) pelo osso que mais pesa nele; o jogo pinta com as cores do time (futevolei/modelo.js)
const { mergeVertices } = await import("file://" + path.join(raiz, "../examples/jsm/utils/BufferGeometryUtils.js").replace(/\\/g, "/"));
globalThis.FileReader = class { readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend && this.onloadend(); this.onload && this.onload({ target: this }); }); } readAsDataURL(b) { b.arrayBuffer().then((r) => { this.result = "data:application/octet-stream;base64," + Buffer.from(r).toString("base64"); this.onloadend && this.onloadend(); }); } };
const REGIAO = (n) => (/^(Spine|Spine1|Spine2|LeftShoulder|RightShoulder)$/.test(n) ? 1 : /^(Hips|LeftUpLeg|RightUpLeg)$/.test(n) ? 2 : 0);
modelo.updateMatrixWorld(true);
for (const o of [...modelo.children, ...modelo.children.flatMap((c) => c.children)]) if (o.isSkinnedMesh && o.name === "Beta_Joints") o.parent.remove(o);
modelo.traverse((o) => {
  if (!o.isSkinnedMesh) return;
  const g = o.geometry;
  for (const k of Object.keys(g.attributes)) if (!["position", "normal", "skinIndex", "skinWeight"].includes(k)) g.deleteAttribute(k);
  const nomes = o.skeleton.bones.map((b) => b.name.replace("mixamorig", ""));
  const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, reg = new Float32Array(si.count);
  for (let v = 0; v < si.count; v++) { let m = 0; for (let k = 1; k < 4; k++) if (sw.getComponent(v, k) > sw.getComponent(v, m)) m = k; reg[v] = REGIAO(nomes[si.getComponent(v, m)]); }
  g.setAttribute("_regiao", new THREE.BufferAttribute(reg, 1));
  o.geometry = mergeVertices(g, 1e-3);
  o.material = new THREE.MeshStandardMaterial({ color: 0xffffff, name: "corpo" });
  console.log(o.name, "vértices:", o.geometry.attributes.position.count);
});
modelo.animations = [];
fs.writeFileSync(path.join(saida, "clipes.json"), JSON.stringify(clipes));
const glb = await new GLTFExporter().parseAsync(modelo, { binary: true, onlyVisible: false });
fs.writeFileSync(path.join(saida, "atleta.glb"), Buffer.from(glb));
