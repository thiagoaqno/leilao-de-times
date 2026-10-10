// Carreira em grupo: a pausa depois da rodada (o anfitrião só puxa a próxima depois dela, para a turma mexer no time) e a
// rodada ao vivo para quem não tem jogo nela, até para quem está só assistindo, sem clube.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

const PAUSA = 1500;
let srv;
test.before(async () => { srv = await subirServidor({ CARREIRA_VEL: "20", CARREIRA_ESPERA_MS: "0", CARREIRA_DECISAO_MS: "1000", CARREIRA_PAUSA_MS: String(PAUSA) }); });
test.after(() => srv.parar());

test("a pausa: com a rodada acabada, o anfitrião espera o tempo para puxar a próxima; quem não tem clube acompanha ao vivo", async () => {
  const a = await conectar(srv.url, "/carreira-online"), b = await conectar(srv.url, "/carreira-online");
  try {
    const { code } = await pedir(a, "create", { name: "Ana" });
    await pedir(a, "act", { type: "clube", clube: "flamengo" });
    await pedir(a, "act", { type: "opcoes", aporte: 0 });
    await pedir(a, "act", { type: "comecar" });
    await esperarEstado(a, (s) => s.fase === "carreira");
    assert.strictEqual(a.ultimo.liberaEm, null, "a primeira rodada sai na hora");
    // Bia entra com a carreira rolando e fica sem clube: só assiste
    await pedir(b, "join", { code, name: "Bia" });
    const rodadasDaBia = [];
    b.on("rodada", (v) => rodadasDaBia.push(v));

    await pedir(a, "act", { type: "rodada" });
    await esperarEstado(a, (s) => !!s.rodada);
    const fim = await esperarEstado(a, (s) => !s.rodada && s.ultimaRodada && s.ultimaRodada.n === 1, 30000);
    assert.ok(fim.liberaEm > fim.now, "acabou a rodada: começa a pausa");
    assert.ok(fim.liberaEm - fim.now <= PAUSA + 50);

    // quem não tem clube recebeu a rodada ao vivo: os jogos da turma, os da semana e o relógio da rodada
    assert.ok(rodadasDaBia.length > 0, "a Bia recebeu a rodada");
    const v = rodadasDaBia[rodadasDaBia.length - 1];
    assert.strictEqual(v.meu, null, "ela não tem jogo");
    assert.ok(v.outros.some((o) => o.casa === "flamengo" || o.fora === "flamengo"), "vê o jogo da Ana");
    assert.ok(v.outros.every((o) => Array.isArray(o.gols)), "com os gols de cada um");
    assert.ok(Array.isArray(v.paralelos) && v.paralelos.length > 0, "e os outros jogos da semana");
    assert.ok(v.relogio && Number.isFinite(v.relogio.minuto) && v.relogio.vel > 0, "com o relógio da rodada");

    // durante a pausa o anfitrião não puxa a rodada
    await assert.rejects(pedir(a, "act", { type: "rodada" }), /Espere mais \d+ s/);
    // passou a pausa: a próxima sai
    await new Promise((ok) => setTimeout(ok, Math.max(0, fim.liberaEm - fim.now) + 200));
    await pedir(a, "act", { type: "rodada" });
    const st = await esperarEstado(a, (s) => !!s.rodada);
    assert.strictEqual(st.liberaEm, null);
  } finally { a.close(); b.close(); }
});
