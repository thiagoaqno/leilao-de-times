// Carreira em grupo: o anfitrião já terminou os jogos dele, mas os amigos ainda têm. Ele precisa conseguir liberar as rodadas deles
// (antes a sede só mostrava "Começar a temporada", que não abre com jogo pendente).
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const G = require("../carreira.js").grupo;
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

test("o servidor já monta a rodada só com os jogos dos amigos quando o anfitrião não tem mais nenhum", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Host" }, { clube: "palmeiras", nome: "Amigo" }], { temporadas: 2 });
  const meus = (c) => save.calendarioMundo.filter((j) => j.casa === c || j.fora === c);
  save.humanos.flamengo.estado.jogosJogados = meus("flamengo").map((j) => j.id); // o host terminou a temporada
  const p = G.proximaRodadaGrupo(save);
  assert.ok(p && p.jogos.length, "ainda há rodada para jogar");
  assert.ok(p.jogos.every((j) => !save.humanos.flamengo.estado.jogosJogados.includes(j.id)));
  assert.ok(p.jogos.some((j) => j.casa === "palmeiras" || j.fora === "palmeiras"), "são os jogos do amigo");
  assert.ok(!p.jogos.some((j) => (j.casa === "flamengo" || j.fora === "flamengo") && save.humanos.flamengo.estado.jogosJogados.includes(j.id)));
  assert.ok(G.vistaDe(save, "flamengo") && G.temporadaAcabou(G.vistaDe(save, "flamengo")), "para o host, a temporada acabou");
  assert.match(G.novaTemporadaGrupo(save), /Ainda tem jogo/, "a temporada nova não abre com jogo do amigo pendente");
});

test("o estado de cada técnico diz se ainda faltam jogos na sala, e a sede do anfitrião oferece liberar a rodada", async () => {
  const srv = await subirServidor({ CARREIRA_ESPERA_MS: "0" });
  try {
    const a = await conectar(srv.url, "/carreira-online");
    await pedir(a, "create", { name: "Host" });
    await pedir(a, "act", { type: "clube", clube: "flamengo" });
    await pedir(a, "act", { type: "opcoes", aporte: 0 }); await pedir(a, "act", { type: "comecar" });
    await esperarEstado(a, (s) => s.fase === "carreira");
    const e = (await pedir(a, "entrar", {})).estado;
    assert.strictEqual(e.faltamJogos, true, "no começo todo mundo tem jogo");
    assert.strictEqual(e.anfitriao, true);
    a.close();
  } finally { await srv.parar(); }
  const telas = fs.readFileSync(path.join(__dirname, "../public/carreira/telas.js"), "utf8");
  assert.match(telas, /EM_GRUPO && E\.faltamJogos/);
  assert.match(telas, /Liberar a rodada dos amigos/);
  assert.match(telas, /agirGrupo\(\{ type: "rodada" \}\)/);
});
