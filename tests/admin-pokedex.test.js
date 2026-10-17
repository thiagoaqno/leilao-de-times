// O painel da Pokédex dos treinadores (/admin/pokedex, admin-pokemon.js): só com a sessão do GitHub do painel da carreira e o
// CSRF; muda o nível (com ou sem a evolução), a espécie, dá e tira Pokémon, põe todos num nível e registra cada edição.
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const crypto = require("node:crypto");
const express = require("express");
const bd = require("../bd.js");
const Admin = require("../admin-carreira.js");
const AdminPokemon = require("../admin-pokemon.js");

test("Pokédex dos treinadores: sessão, CSRF, nível, evolução, dar, tirar e o nível de todos", async () => {
  const anterior = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  const app = express(), server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const buscarGitHub = async (url) => (url.includes("access_token") ? Response.json({ access_token: "t" }) : Response.json({ id: 266817963, login: "thiagoaqno" }));
  Admin.attach(app, { listar: () => [] }, { clientId: "c", clientSecret: "s", baseUrl: base, fetch: buscarGitHub, solo: {}, historico: () => [] });
  AdminPokemon.attach(app);
  const t = crypto.createHash("sha256").update("0123456789abcdef0123456789abcdef").digest("hex");
  bd.garantirIniciais(t, "Ana", [["bulbasaur", "comum"], ["charmander", "comum"], ["squirtle", "comum"]]);
  const pedir = (url, opts = {}) => fetch(base + url, { redirect: "manual", ...opts });
  try {
    assert.equal((await pedir("/admin/pokedex/api")).status, 401);
    assert.equal((await pedir("/admin/pokedex")).status, 302, "sem sessão, vai para o login");
    const entrar = await pedir("/admin/carreira/entrar?destino=/admin/pokedex");
    const estado = new URL(entrar.headers.get("location")).searchParams.get("state"), cookieEstado = entrar.headers.get("set-cookie").split(";")[0];
    const volta = await pedir(`/admin/carreira/callback?code=x&state=${estado}`, { headers: { Cookie: cookieEstado } });
    assert.equal(volta.headers.get("location"), "/admin/pokedex", "o login volta para a Pokédex");
    const sessao = volta.headers.getSetCookie().find((c) => c.startsWith("mod_sessao=")).split(";")[0];
    assert.match(await (await pedir("/admin/pokedex", { headers: { Cookie: sessao } })).text(), /Pokédex de todos/);
    const inicio = await (await pedir("/admin/pokedex/api?busca=ana", { headers: { Cookie: sessao } })).json();
    assert.equal(inicio.treinadores.length, 1); assert.equal(inicio.treinadores[0].treinador, t);
    const ficha = await (await pedir(`/admin/pokedex/api/${t}`, { headers: { Cookie: sessao } })).json();
    assert.equal(ficha.pokemons.length, 3);
    const charmander = ficha.pokemons.find((p) => p.bicho === "charmander");
    const postar = (url, corpo, csrf = inicio.csrf, metodo = "POST") => pedir(url, { method: metodo, headers: { Cookie: sessao, Origin: base, "X-CSRF-Token": csrf, "Content-Type": "application/json" }, ...(corpo && { body: JSON.stringify(corpo) }) });
    assert.equal((await postar(`/admin/pokedex/api/${t}/pokemon/${charmander.id}`, { nivel: 40 }, "errado")).status, 403);
    assert.equal((await postar(`/admin/pokedex/api/${t}/pokemon/${charmander.id}`, { nivel: 101 })).status, 400);
    // o nível sem evoluir, e depois com a evolução: Charmander no nível 40 vira Charizard (passa das duas fases)
    let r = await (await postar(`/admin/pokedex/api/${t}/pokemon/${charmander.id}`, { nivel: 40 })).json();
    assert.equal(r.pokemon.nivel, 40); assert.equal(r.pokemon.bicho, "charmander");
    r = await (await postar(`/admin/pokedex/api/${t}/pokemon/${charmander.id}`, { evoluir: true })).json();
    assert.equal(r.pokemon.bicho, "charizard");
    assert.ok(bd.pokedexDe(t).includes("charizard"), "a espécie nova entra na Pokédex");
    assert.equal(bd.pokemonsDe(t).find((p) => p.id === charmander.id).nivel, 40, "vale no banco (a Vila e o Ginásio leem de lá)");
    // a experiência do nível: dentro do que falta para subir
    assert.equal((await postar(`/admin/pokedex/api/${t}/pokemon/${charmander.id}`, { xp: 999999 })).status, 400);
    // dar e tirar
    r = await (await postar(`/admin/pokedex/api/${t}/pokemon`, { bicho: "mewtwo", nivel: 70, brilhante: true })).json();
    assert.equal(r.pokemon.bicho, "mewtwo"); assert.equal(r.pokemon.raridade, "lendario"); assert.ok(r.pokemon.brilhante);
    assert.equal((await postar(`/admin/pokedex/api/${t}/pokemon`, { bicho: "nao-existe" })).status, 400);
    assert.equal((await postar(`/admin/pokedex/api/${t}/pokemon/${r.pokemon.id}`, null, inicio.csrf, "DELETE")).status, 200);
    assert.ok(!bd.pokemonsDe(t).some((p) => p.bicho === "mewtwo"));
    // todos num nível
    r = await (await postar(`/admin/pokedex/api/${t}/nivel`, { nivel: 25 })).json();
    assert.equal(r.alterados, 3);
    assert.ok(bd.pokemonsDe(t).every((p) => p.nivel === 25 && p.xp === 0));
    const hist = bd.historicoPokemon(t);
    assert.deepEqual(hist.map((h) => h.tipo), ["nivel-todos", "tirar", "dar", "editar", "editar"]);
    assert.ok(hist.every((h) => h.ator === "thiagoaqno"));
  } finally {
    process.env.NODE_ENV = anterior;
    await new Promise((resolve) => server.close(resolve));
  }
});
