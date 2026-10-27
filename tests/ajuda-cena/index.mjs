// Monta a cena 3D de uma pista da Corrida dentro do Node (sem navegador, sem WebGL), para os testes e as medidas:
//   const { montar } = await import("./ajuda-cena/index.mjs");  const { tr, THREE } = await montar("monaco");
// O desenho nos canvas é de mentira (nada é pintado); a geometria, os materiais e as posições são os verdadeiros.
import { register } from "node:module";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const raiz = process.env.CORRIDA_RAIZ ? path.resolve(process.env.CORRIDA_RAIZ) : path.resolve(aqui, "../.."); // CORRIDA_RAIZ: outra cópia do projeto (para comparar antes e depois)

let pronto = null;
function preparar() {
  if (pronto) return pronto;
  const g = globalThis;
  g.window = g;
  g.Pistas = require(path.join(raiz, "public/corrida/pistas.js"));
  try { g.F1Regras = require(path.join(raiz, "public/corrida/f1-regras.js")); } catch (e) { /* sem as regras de F1 */ }
  const ctx2d = () => new Proxy(function () {}, {
    get: (_, k) => (k === "measureText" ? () => ({ width: 10 }) : k === "canvas" ? null : ctx2d()),
    set: () => true, apply: () => ctx2d(),
  });
  const canvas = () => ({ width: 0, height: 0, style: {}, getContext: () => ctx2d(), toDataURL: () => "", addEventListener() {} });
  g.document = { createElement: () => canvas(), body: { appendChild() {} }, addEventListener() {} };
  g.devicePixelRatio = 1; g.matchMedia = () => ({ matches: false, addEventListener() {} });
  g.addEventListener = g.addEventListener || (() => {});
  g.__rendererFalso = {
    capabilities: { getMaxAnisotropy: () => 8 }, shadowMap: {}, info: { render: { calls: 0, triangles: 0 }, memory: { geometries: 0, textures: 0 }, programs: [] },
    setPixelRatio() {}, setSize() {}, compile() {}, render() {}, domElement: canvas(),
  };
  register(pathToFileURL(path.join(aqui, "hooks.mjs")).href);
  pronto = import(pathToFileURL(path.join(raiz, "public/corrida/pista.js")).href);
  return pronto;
}
// com `rastrear`, cada objeto guarda o arquivo:linha de quem o pôs na cena (globalThis.__origem), para achar de onde vem uma peça
let rastreando = false;
export async function montar(id, { rastrear = false } = {}) {
  const THREE = await import("three");
  if (rastrear && !rastreando) {
    rastreando = true; const origem = (globalThis.__origem = new WeakMap()), add = THREE.Object3D.prototype.add;
    THREE.Object3D.prototype.add = function (...os) {
      const quadro = new Error().stack.split("\n").slice(2, 14).filter((l) => !/node_modules|pista\.js:139:|\/three\/|Object3D\.add/.test(l)).slice(0, 3).map((l) => (/([\w-]+\.js:\d+):\d+\)?$/.exec(l) || [0, "?"])[1]).join(" < ");
      for (const o of os) if (o && !origem.has(o)) origem.set(o, quadro);
      return add.apply(this, os);
    };
  }
  const pista = await preparar();
  const { scene } = await import(pathToFileURL(path.join(raiz, "public/corrida/cena.js")).href);
  const tr = pista.buildTrack(id);
  return { tr, THREE, scene, pista };
}
