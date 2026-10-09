// Carreira de Treinador: os dados da festa do campeão (o pop-up de fim de competição) e o cliente dela.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const Temporada = require("../public/carreira/temporada.js");
const { novaCarreira, estado } = require("../carreira.js").paraTestes;

function ate(save, W) {
  const meus = Temporada.jogosDoClube({ jogos: save.calendarioMundo }, save.clube);
  save.jogosJogados = meus.filter((j) => j.semana < W).map((j) => j.id); save.rodada = save.jogosJogados.length;
  return estado(save);
}

test("a festa só existe quando a competição acabou, e traz a final, a campanha e os artilheiros", () => {
  const save = novaCarreira("Teste", "flamengo", "x");
  let e = ate(save, 30);
  assert.ok(!e.competicoes.libertadores.festa && !e.competicoes["brasileirao-2026"].festa, "no meio da temporada ligas e Libertadores não têm campeão");
  e = ate(save, 200); // a temporada inteira
  const festas = Object.entries(e.competicoes).filter(([, c]) => c.festa);
  assert.ok(festas.length >= 6, "ligas e copas encerradas têm festa");
  for (const [id, c] of festas) {
    const f = c.festa;
    assert.strictEqual(f.campeao, c.campeao, id);
    assert.strictEqual(f.vice, c.vice, id);
    const cp = f.campanha;
    assert.strictEqual(cp.v + cp.e + cp.d, cp.jogos, `${id}: V+E+D = jogos`);
    assert.ok(cp.jogos > 0 && cp.gp >= 0 && cp.gc >= 0);
    if (c.tipo === "liga") {
      assert.strictEqual(f.final, null);
      assert.strictEqual(f.pontos, c.tabela[0].p, `${id}: os pontos do campeão batem com a tabela`);
      assert.ok(f.pontos >= f.pontosVice);
    } else {
      assert.ok(f.final, `${id}: a copa tem a final`);
      assert.ok([f.final.casa, f.final.fora].includes(f.campeao) && [f.final.casa, f.final.fora].includes(f.vice));
      const gols = f.final.gols.length;
      assert.strictEqual(gols, f.final.placar[0] + f.final.placar[1], `${id}: os gols da final batem com o placar`);
      for (const g of f.final.gols) assert.ok(g.jogador && (g.lado === 0 || g.lado === 1));
      const ganhou = f.final.placar[0] === f.final.placar[1] ? (f.final.penaltis[0] > f.final.penaltis[1] ? f.final.casa : f.final.fora) : (f.final.placar[0] > f.final.placar[1] ? f.final.casa : f.final.fora);
      assert.strictEqual(ganhou, f.campeao, `${id}: quem ganhou a final é o campeão`);
    }
    assert.ok(f.artilheiros.every((a, i, l) => i === 0 || l[i - 1].gols >= a.gols));
  }
});

test("o pop-up está ligado na página e na tabela", () => {
  const raiz = path.join(__dirname, "..", "public", "carreira");
  const html = fs.readFileSync(path.join(raiz, "index.html"), "utf8");
  assert.ok(html.includes('src="campeoes.js"') && html.includes('src="/card.js"'));
  assert.ok(fs.readFileSync(path.join(raiz, "inicio.js"), "utf8").includes("Campeoes.verificar"));
  assert.ok(fs.readFileSync(path.join(raiz, "telas.js"), "utf8").includes("data-rever-festa"));
  assert.ok(fs.readFileSync(path.join(raiz, "estilo.css"), "utf8").includes("dialog.festa"));
});
