// Carreira: ver o elenco e a escalação de qualquer clube (fichaDoTime, evento verTime), no solo e na sala.
const test = require("node:test");
const assert = require("node:assert");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");
const Carreira = require("../carreira.js");
const G = Carreira.grupo;

test("a ficha do computador: o elenco inteiro e os 11 da escalação automática", () => {
  const save = Carreira.paraTestes.novaCarreira("Thiago", "flamengo");
  Carreira.paraTestes.completar(save);
  const f = G.fichaDoTime(save, "palmeiras");
  assert.strictEqual(f.humano, false);
  assert.strictEqual(f.tecnico, null);
  assert.strictEqual(f.campo.length, 11);
  const elenco = new Set(f.elenco);
  for (const v of f.campo) assert.ok(elenco.has(v.id), "todo titular é do elenco");
  assert.ok(f.elenco.length >= 18 && f.forca > 50);
  assert.strictEqual(G.fichaDoTime(save, "nao-existe"), "Clube não encontrado.");
  // o seu time sai com a sua escalação
  save.escalacao.formacao = "3-5-2";
  assert.strictEqual(G.fichaDoTime(save, "flamengo").formacao, "3-5-2");
  assert.strictEqual(G.fichaDoTime(save, "flamengo").tecnico, "Thiago");
});

test("a ficha de um amigo da sala usa a escalação dele", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "palmeiras", nome: "Bia" }], { temporadas: 1 });
  save.humanos.palmeiras.estado.escalacao.formacao = "4-4-2";
  const f = G.fichaDoTime(save, "palmeiras");
  assert.strictEqual(f.humano, true);
  assert.strictEqual(f.tecnico, "Bia");
  assert.strictEqual(f.formacao, "4-4-2");
  assert.strictEqual(G.fichaDoTime(save, "santos").humano, false);
});

test("o evento verTime responde no solo e na sala", async () => {
  const srv = await subirServidor();
  try {
    const s = await conectar(srv.url, "/carreira");
    await pedir(s, "criar", { nome: "Thiago", clube: "flamengo" });
    const r = await pedir(s, "verTime", { clube: "corinthians" });
    assert.strictEqual(r.time.clube, "corinthians");
    assert.strictEqual(r.time.campo.length, 11);
    assert.ok(!r.estado, "só leitura: não manda o estado");
    await assert.rejects(pedir(s, "verTime", { clube: "x" }), /não encontrado/);
    s.close();

    const a = await conectar(srv.url, "/carreira-online"), b = await conectar(srv.url, "/carreira-online");
    const sala = await pedir(a, "create", { name: "Ana" });
    await pedir(b, "join", { code: sala.code, name: "Bia" });
    await assert.rejects(pedir(a, "verTime", { clube: "santos" }), /não começou/);
    await pedir(a, "act", { type: "clube", clube: "santos" });
    await pedir(b, "act", { type: "clube", clube: "vasco" });
    await pedir(a, "act", { type: "comecar" });
    await esperarEstado(a, (st) => st.fase === "carreira");
    await pedir(b, "escalacao", { formacao: "4-4-2" });
    const v = await pedir(a, "verTime", { clube: "vasco" });
    assert.strictEqual(v.time.tecnico, "Bia");
    assert.strictEqual(v.time.formacao, "4-4-2");
    a.close(); b.close();
  } finally { await srv.parar(); }
});
