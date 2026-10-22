const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { subirServidor } = require("./ajuda.js");

test("/api/musicas lista os áudios da pasta, em ordem, sem número no nome", async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "musica-"));
  for (const f of ["10 - Final.mp3", "2 - Começo.mp3", "capa.png"]) fs.writeFileSync(path.join(pasta, f), "x");
  const srv = await subirServidor({ MUSICA_DIR: pasta });
  try {
    const l = await (await fetch(srv.url + "/api/musicas")).json();
    assert.deepStrictEqual(l.map((m) => m.nome), ["Começo", "Final"]);
    assert.strictEqual((await fetch(srv.url + l[0].url)).status, 200);
  } finally { await srv.parar(); fs.rmSync(pasta, { recursive: true, force: true }); }
});
