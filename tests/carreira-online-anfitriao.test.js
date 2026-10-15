// Carreira em grupo: o anfitrião passa o cargo para outro técnico, e o cargo passa sozinho quando ele some da sala.
const test = require("node:test");
const assert = require("node:assert");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

let srv;
test.before(async () => { srv = await subirServidor({ CARREIRA_ESPERA_MS: "0", CARREIRA_ANFITRIAO_MS: "500" }); });
test.after(async () => { await srv.parar(); });

const canal = () => conectar(srv.url, "/carreira-online");
const agir = (s, d) => pedir(s, "act", d);
async function sala(n) {
  const ss = [];
  for (let i = 0; i < n; i++) ss.push(await canal());
  const c = await pedir(ss[0], "create", { name: "P0" }), creds = [c];
  for (let i = 1; i < n; i++) creds.push(await pedir(ss[i], "join", { code: c.code, name: `P${i}` }));
  return { ss, creds };
}

test("o anfitrião passa o cargo; só ele pode, e o novo anfitrião manda na sala", async () => {
  const { ss: [a, b, c], creds: [ca, cb, cc] } = await sala(3);
  await assert.rejects(agir(b, { type: "anfitriao", pessoa: cb.id }), /Só o anfitrião/);
  await assert.rejects(agir(a, { type: "anfitriao", pessoa: ca.id }), /já é o anfitrião/);
  await assert.rejects(agir(a, { type: "anfitriao", pessoa: "naoexiste" }), /não está mais/);
  const r = await agir(a, { type: "anfitriao", pessoa: cc.id });
  assert.strictEqual(r.anfitriao, "P2");
  const st = await esperarEstado(b, (s) => s.host === cc.id);
  assert.ok(st.players.find((p) => p.id === cc.id).host);
  // o antigo anfitrião não manda mais; o novo, sim
  await assert.rejects(agir(a, { type: "opcoes", temporadas: 3 }), /anfitrião/);
  await agir(c, { type: "opcoes", temporadas: 3 });
  await esperarEstado(a, (s) => s.opcoes.temporadas === 3);
  a.close(); b.close(); c.close();
});

test("o anfitrião fora da sala por tempo demais: o cargo vai para o próximo que está no ar", async () => {
  const { ss: [a, b, c], creds: [, cb] } = await sala(3);
  a.close();
  const st = await esperarEstado(c, (s) => s.host === cb.id, 5000);
  assert.ok(st.players.find((p) => p.id === cb.id).host);
  b.close(); c.close();
});

test("o anfitrião sem clube controla a velocidade dos jogos dos outros", async () => {
  const { ss: [a, b], creds: [ca] } = await sala(2);
  await agir(a, { type: "clube", clube: "flamengo" });
  await agir(b, { type: "clube", clube: "liverpool" });
  await agir(a, { type: "comecar" });
  await agir(a, { type: "rodada" });
  const c = await canal(), cc = await pedir(c, "join", { code: ca.code, name: "P2" });
  await agir(a, { type: "anfitriao", pessoa: cc.id });
  await assert.rejects(agir(a, { type: "velocidade", velocidade: 3 }), /Só o anfitrião/);
  await assert.rejects(agir(c, { type: "velocidade", velocidade: 2 }), /Escolha 1× ou 3×/);
  await agir(c, { type: "velocidade", velocidade: 3 });
  const st = await esperarEstado(b, (s) => s.rodada && s.rodada.velocidade === 3);
  assert.strictEqual(st.host, cc.id);
  await agir(c, { type: "velocidade", velocidade: 1 });
  await esperarEstado(b, (s) => s.rodada && s.rodada.velocidade === 1);
  a.close(); b.close(); c.close();
});
