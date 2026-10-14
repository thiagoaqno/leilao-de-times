// O workflow do GitHub prova sua identidade com um JWT OIDC curto, assinado pelo próprio GitHub.
const crypto = require("node:crypto");
const express = require("express");
const AUDIENCIA = "leilao-de-times-moderacao";
const JWKS_URL = "https://token.actions.githubusercontent.com/.well-known/jwks";
const WORKFLOWS = new Set(["moderar-carreira.yml", "desfazer-transferencia.yml"].map((nome) =>
  `thiagoaqno/leilao-de-times/.github/workflows/${nome}@refs/heads/main`));
let chaves = null, chavesAte = 0, ultimaBuscaDesconhecida = 0;
const usados = new Map();

async function buscarChaves() {
  const url = process.env.NODE_ENV === "test" && process.env.MODERACAO_TEST_JWKS_URL || JWKS_URL;
  const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error("Não foi possível consultar as chaves do GitHub.");
  const dados = await r.json();
  if (!Array.isArray(dados.keys)) throw new Error("Chaves OIDC inválidas.");
  chaves = dados.keys; chavesAte = Date.now() + 3600e3;
  return chaves;
}
async function verificarGitHub(token) {
  if (typeof token !== "string" || token.length > 12000) throw new Error("Token inválido.");
  const partes = token.split(".");
  if (partes.length !== 3) throw new Error("Token inválido.");
  const cabecalho = JSON.parse(Buffer.from(partes[0], "base64url").toString("utf8"));
  if (cabecalho.alg !== "RS256" || typeof cabecalho.kid !== "string") throw new Error("Assinatura inválida.");
  const cacheValido = chaves && chavesAte > Date.now();
  let lista = cacheValido ? chaves : await buscarChaves();
  let jwk = lista.find((k) => k.kid === cabecalho.kid && k.kty === "RSA");
  if (!jwk && cacheValido && Date.now() - ultimaBuscaDesconhecida > 60000) {
    ultimaBuscaDesconhecida = Date.now();
    lista = await buscarChaves(); jwk = lista.find((k) => k.kid === cabecalho.kid && k.kty === "RSA");
  }
  if (!jwk || !crypto.verify("RSA-SHA256", Buffer.from(`${partes[0]}.${partes[1]}`), crypto.createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(partes[2], "base64url")))
    throw new Error("Assinatura inválida.");
  const p = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8")), agora = Math.floor(Date.now() / 1000);
  if (p.iss !== "https://token.actions.githubusercontent.com" || p.aud !== AUDIENCIA ||
      String(p.repository_id) !== "1400392364" || p.repository !== "thiagoaqno/leilao-de-times" ||
      String(p.actor_id) !== "266817963" || p.actor !== "thiagoaqno" ||
      p.event_name !== "workflow_dispatch" || p.ref !== "refs/heads/main" ||
      !WORKFLOWS.has(p.workflow_ref) ||
      !Number.isInteger(p.iat) || !Number.isInteger(p.nbf) || !Number.isInteger(p.exp) ||
      p.iat > agora + 30 || p.nbf > agora + 30 || p.exp <= agora - 30 || p.exp - p.iat > 600)
    throw new Error("Origem do workflow inválida.");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  for (const [k, ate] of usados) if (ate <= agora) usados.delete(k);
  if (usados.has(hash)) throw new Error("Token já utilizado.");
  usados.set(hash, p.exp);
  return { ator: p.actor, desfazerSomente: p.workflow_ref.includes("/desfazer-transferencia.yml@") };
}

function attach(app, carreira, verificar = verificarGitHub) {
  app.post("/api/moderacao/carreira", express.json({ limit: "4kb" }), async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const identidade = await verificar(String(req.get("Authorization") || "").replace(/^Bearer /, ""));
      const ator = typeof identidade === "string" ? identidade : identidade.ator;
      if (!req.is("application/json") || !req.body || typeof req.body !== "object" || Array.isArray(req.body)) return res.status(400).json({ erro: "Edição inválida." });
      const d = req.body;
      if (identidade.desfazerSomente && d.tipo !== "desfazer_transferencia") return res.status(403).json({ erro: "Este workflow só pode desfazer transferências." });
      if (d.tipo === "listar") return res.json({ salas: carreira.listar() });
      if (!/^[A-Z2-9]{5}$/.test(String(d.sala || ""))) return res.status(400).json({ erro: "Código de sala inválido." });
      if (d.tipo === "consultar") {
        const sala = carreira.detalhar(d.sala, String(d.clube || ""));
        return sala ? res.status(sala.erro ? 400 : 200).json(sala) : res.status(404).json({ erro: "Sala não encontrada." });
      }
      const r = carreira.editar(d.sala, d, ator);
      res.status(r.erro ? 400 : 200).json(r);
    } catch { res.status(401).json({ erro: "Workflow do GitHub não autorizado." }); }
  });
}
module.exports = { attach, verificarGitHub, AUDIENCIA };
