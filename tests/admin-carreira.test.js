const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const Admin = require("../admin-carreira.js");

test("painel só abre para a conta GitHub permitida e exige CSRF para editar", async () => {
  const anterior = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  const app = express(), server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let id = 266817963, edicoes = 0;
  const carreira = {
    listar: () => [{ codigo: "ABCDE", tecnicos: [{ nome: "Ana", nomeClube: "Flamengo" }] }],
    detalhar: () => ({ codigo: "ABCDE", clube: "flamengo", jogadores: [] }),
    editar: (codigo, dados, ator) => { edicoes++; assert.equal(codigo, "ABCDE"); assert.equal(ator, "thiagoaqno"); return { tipo: dados.tipo, depois: 123 }; },
  };
  const buscarGitHub = async (url) => url.includes("access_token") ? Response.json({ access_token: "token-de-teste" })
    : Response.json({ id, login: "thiagoaqno" });
  Admin.attach(app, carreira, { clientId: "cliente", clientSecret: "segredo", baseUrl: base, fetch: buscarGitHub });
  const pedir = (url, opts = {}) => fetch(base + url, { redirect: "manual", ...opts });
  try {
    assert.equal((await pedir("/admin/carreira/api/inicio")).status, 401);
    assert.match(await (await pedir("/admin/carreira")).text(), /Entrar com GitHub/);
    const inicio = await pedir("/admin/carreira/entrar");
    assert.equal(inicio.status, 302);
    const urlLogin = new URL(inicio.headers.get("location"));
    assert.equal(urlLogin.searchParams.get("code_challenge_method"), "S256");
    const estado = urlLogin.searchParams.get("state");
    const estadoCookie = inicio.headers.get("set-cookie").split(";")[0];
    assert.ok(estado);
    assert.equal((await pedir(`/admin/carreira/callback?code=x&state=${estado}`)).status, 403);
    const volta = await pedir(`/admin/carreira/callback?code=x&state=${estado}`, { headers: { Cookie: estadoCookie } });
    assert.equal(volta.status, 403, "o estado não pode ser reutilizado depois de uma tentativa inválida");

    const novoInicio = await pedir("/admin/carreira/entrar");
    const novoEstado = new URL(novoInicio.headers.get("location")).searchParams.get("state");
    const novoCookie = novoInicio.headers.get("set-cookie").split(";")[0];
    id = 1;
    assert.equal((await pedir(`/admin/carreira/callback?code=x&state=${novoEstado}`, { headers: { Cookie: novoCookie } })).status, 403);

    const autorizado = await pedir("/admin/carreira/entrar");
    const codigo = new URL(autorizado.headers.get("location")).searchParams.get("state");
    const cookieEstado = autorizado.headers.get("set-cookie").split(";")[0];
    id = 266817963;
    const callback = await pedir(`/admin/carreira/callback?code=x&state=${codigo}`, { headers: { Cookie: cookieEstado } });
    assert.equal(callback.status, 302);
    const sessao = callback.headers.getSetCookie().find((c) => c.startsWith("mod_sessao=")).split(";")[0];
    assert.match(await (await pedir("/admin/carreira", { headers: { Cookie: sessao } })).text(), /CABINE DA CARREIRA/);
    const dados = await (await pedir("/admin/carreira/api/inicio", { headers: { Cookie: sessao } })).json();
    assert.equal(dados.salas[0].codigo, "ABCDE");
    const body = JSON.stringify({ tipo: "caixa", clube: "flamengo", valor: 123 });
    const editar = (headers) => pedir("/admin/carreira/api/salas/ABCDE", { method: "POST", headers: { Cookie: sessao, "Content-Type": "application/json", ...headers }, body });
    assert.equal((await editar({ "X-CSRF-Token": dados.csrf })).status, 403);
    assert.equal((await editar({ Origin: base, "X-CSRF-Token": "errado" })).status, 403);
    assert.equal((await editar({ Origin: base, "X-CSRF-Token": dados.csrf })).status, 200);
    assert.equal(edicoes, 1);
    assert.equal((await pedir("/admin/carreira/sair", { method: "POST", headers: { Cookie: sessao, Origin: base, "X-CSRF-Token": dados.csrf } })).status, 200);
    assert.equal((await pedir("/admin/carreira/api/inicio", { headers: { Cookie: sessao } })).status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    process.env.NODE_ENV = anterior;
  }
});

test("JavaScript da página administrativa tem sintaxe válida", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "admin-carreira.html"), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
});
