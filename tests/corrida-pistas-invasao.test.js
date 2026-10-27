// Nada sólido do cenário pode ficar dentro da pista: postes, painéis, arquibancadas, prédios, árvores, passarelas, o pórtico,
// as bandeiras dos checkpoints... Monta a cena 3D de cada GP dentro do Node (tests/ajuda-cena/: canvas e WebGL de mentira, a
// geometria é a verdadeira) e confere cada vértice (e cada instância) que está de 22 cm a 2,4 m acima do asfalto contra a
// distância a TODOS os pontos da linha central, inclusive os trechos vizinhos de um grampo ou de um cruzamento. A folga é de 10
// unidades (1 m) além da meia largura. O que passa por cima (ponte, pórtico, copa) e o que é rente ao chão (zebra) não conta.
// As fitas que acompanham a pista (zebra, margem, brita, guard-rail) ficam de fora: num grampo mais fechado que a meia
// largura elas se dobram sobre a própria curva, e isso é a geometria do traçado, não um enfeite fora do lugar.
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/pistas.js");

const resumo = (e) => `${e.nome} (${e.geo}${e.instanciada ? ", instâncias" : ""}) ${e.n}x a ${e.pior.toFixed(0)} da linha central, a ${(e.frac * 100).toFixed(0)}% da volta, ${e.alt.toFixed(1)} acima do asfalto`;

test("nada sólido do cenário invade a pista, em nenhum GP", { timeout: 900000 }, async (t) => {
  const { montar } = await import("./ajuda-cena/index.mjs");
  const { invasoes } = await import("./ajuda-cena/invasao.mjs");
  for (const id of Object.keys(T.PISTAS)) {
    await t.test(id, async () => {
      const { tr, THREE } = await montar(id, { rastrear: true });
      const achados = invasoes(THREE, tr);
      assert.deepEqual(achados.map(resumo), [], `${id}: ${achados.length} peça(s) dentro da pista (meia largura ${tr.W / 2} + folga)`);
    });
  }
});

test("a conferência acusa um poste e uma caixa postos em cima da pista e deixa passar uma passarela", async () => {
  const { montar } = await import("./ajuda-cena/index.mjs");
  const { invasoes } = await import("./ajuda-cena/invasao.mjs");
  const { tr, THREE } = await montar("melbourne");
  const p = tr.pts[300], q = tr.pts[900];
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 30, 6, 4), new THREE.MeshBasicMaterial()); poste.name = "poste-de-teste"; poste.position.set(p.x + p.nx * 20, p.h + 15, p.y + p.ny * 20); tr.grp.add(poste);
  const caixa = new THREE.Mesh(new THREE.BoxGeometry(30, 20, 30), new THREE.MeshBasicMaterial()); caixa.name = "caixa-de-teste"; caixa.position.set(q.x + q.nx * (tr.W / 2 + 4), q.h + 10, q.y + q.ny * (tr.W / 2 + 4)); tr.grp.add(caixa);
  const ponte = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 200), new THREE.MeshBasicMaterial()); ponte.name = "ponte-de-teste"; ponte.position.set(p.x, p.h + 80, p.y); ponte.rotation.y = Math.atan2(p.nx, p.ny); tr.grp.add(ponte);
  const nomes = invasoes(THREE, tr).map((e) => e.nome);
  assert.ok(nomes.some((x) => x.includes("poste-de-teste")), "poste no meio da pista");
  assert.ok(nomes.some((x) => x.includes("caixa-de-teste")), "caixa na zebra");
  assert.ok(!nomes.some((x) => x.includes("ponte-de-teste")), "a ponte a 8 m de altura passa");
});
