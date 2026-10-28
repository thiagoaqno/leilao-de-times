// Corrida da Galera, regras de F1: a transmissão de TV tem tempo próprio antes das luzes (`room.tvAte`, corrida.js). A largada
// só vem depois dela; pular manda `tvpular`, que antecipa tudo quando todos os humanos presentes pulam (uma vez por piloto),
// e o navegador esconde as luzes e o resto do HUD enquanto ela está no ar.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { subirServidor, conectar, pedir } = require("./ajuda.js");

const LUZES_MS = 3500; // (corrida.js) o tempo parado no grid antes da primeira luz acender
const espera = (cond, ms = 15000) => new Promise((ok, erro) => { const t0 = Date.now(), k = setInterval(() => { if (cond()) { clearInterval(k); ok(); } else if (Date.now() - t0 > ms) { clearInterval(k); erro(new Error("tempo esgotado")); } }, 20); });

test("servidor: a transmissão vem antes das luzes e pular antecipa a largada (uma vez só)", { timeout: 40000 }, async () => {
  const srv = await subirServidor({ CORRIDA_TV_MS: "" }), s = await conectar(srv.url, "/corrida");
  try {
    await pedir(s, "create", { name: "Ana", config: { regras: "f1", robos: 2, classificacao: "pular", voltas: 3, pista: "interlagos" } });
    const antes = Date.now();
    await pedir(s, "act", { type: "start" });
    await espera(() => s.ultimo && s.ultimo.phase === "race" && s.ultimo.startAt);
    const st = s.ultimo, luzes = st.luzes.espera;
    assert.ok(st.tvAte && st.tv, "o estado traz o fim da transmissão e os dados dela");
    assert.ok(st.tvAte - antes > 15000 && st.tvAte - antes < 22500, `transmissão avulsa de ~20 s: ${st.tvAte - antes}`);
    assert.ok(Math.abs(st.startAt - (st.tvAte + LUZES_MS + (4 + luzes) * 1000)) < 5, "as luzes só começam depois da transmissão");
    // pular: sozinho na sala, antecipa a largada para daqui a (3,5 s + as cinco luzes)
    const t1 = Date.now();
    await pedir(s, "act", { type: "tvpular" });
    await espera(() => s.ultimo.startAt < st.startAt);
    const dep = s.ultimo;
    assert.ok(dep.tvAte <= Date.now() + 50, "a transmissão acabou");
    assert.ok(Math.abs(dep.startAt - (t1 + LUZES_MS + (4 + luzes) * 1000)) < 1500, `largada antecipada: ${dep.startAt - t1} ms`);
    // uma vez só por piloto, e depois do fim ela não faz nada
    const r = await new Promise((ok) => s.emit("act", { type: "tvpular" }, ok));
    assert.equal(r.ignored, true);
    await new Promise((ok) => setTimeout(ok, 150));
    assert.equal(s.ultimo.startAt, dep.startAt, "o segundo pulo não mexe na largada");
  } finally { s.close(); await srv.parar(); }
});

test("navegador: nada de luzes nem HUD durante a transmissão, e o pulo tem botão, Esc e toque", () => {
  const raiz = path.join(__dirname, "..", "public", "corrida"), ler = (f) => fs.readFileSync(path.join(raiz, f), "utf8");
  const hud = ler("hud.js"), tv = ler("transmissao.js"), jogo = ler("jogo.js"), css = ler("transmissao.css");
  assert.ok(/race\.tvAte > 0 && sNow\(\) < race\.tvAte/.test(hud), "as luzes ficam escondidas até o fim da transmissão");
  assert.ok(/#race\.tvOn>\*:not\(#screen\)/.test(css), "o resto do HUD some enquanto a TV está no ar");
  assert.ok(/key === "Escape"\) pularTV/.test(jogo) && /el\.onclick = pularTV/.test(tv) && /tvPular/.test(tv), "Esc, toque e botão");
  assert.ok(/act\("tvpular"\)/.test(tv), "pular avisa o servidor");
  assert.ok(/reduzMov\) \{ pularTV\(\)/.test(tv), "movimento reduzido: sem voo de câmera");
});
