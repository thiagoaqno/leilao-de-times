// Ganchos do carregador do Node para montar a cena da Corrida sem navegador: troca os módulos que precisam de tela, rede
// ou som (estado, menus, props, ceu, sons) por versões de mentira em tests/ajuda-cena/ e põe um renderer de mentira no cena.js.
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const aqui = path.dirname(fileURLToPath(import.meta.url));
const falsos = { "estado.js": "estado.mjs", "menus.js": "menus.mjs", "props.js": "props.mjs", "ceu.js": "ceu.mjs", "sons.js": "sons.mjs" };
export async function resolve(especificador, contexto, proximo) {
  const r = await proximo(especificador, contexto);
  const m = /\/public\/corrida\/([a-z-]+\.js)$/.exec(r.url);
  if (m && falsos[m[1]]) return { url: pathToFileURL(path.join(aqui, falsos[m[1]])).href, shortCircuit: true };
  return r;
}
export async function load(url, contexto, proximo) {
  if (/\/public\/corrida\/cena\.js$/.test(url)) {
    let src = fs.readFileSync(fileURLToPath(url), "utf8");
    src = src.replace(/new THREE\.WebGLRenderer\([^;]*\);/, "globalThis.__rendererFalso;");
    return { format: "module", source: src, shortCircuit: true };
  }
  return proximo(url, contexto);
}
