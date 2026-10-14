const env = process.env;
if (!env.ACTIONS_ID_TOKEN_REQUEST_URL || !env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) throw new Error("O job precisa da permissão id-token: write.");
const url = new URL("/api/moderacao/carreira", env.MODERACAO_URL);
if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("MODERACAO_URL precisa usar HTTPS.");
const identidadeURL = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
identidadeURL.searchParams.set("audience", "leilao-de-times-moderacao");
const identidade = await fetch(identidadeURL, { headers: { Authorization: `Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` }, signal: AbortSignal.timeout(10000) });
if (!identidade.ok) throw new Error("O GitHub não forneceu a identidade do workflow.");
const token = (await identidade.json()).value;
if (!token) throw new Error("Identidade do workflow vazia.");
const body = {
  tipo: env.MOD_ACAO, sala: (env.MOD_SALA || "").trim().toUpperCase(), clube: (env.MOD_CLUBE || "").trim(),
  jogador: (env.MOD_JOGADOR || "").trim(), destino: (env.MOD_DESTINO || "").trim(),
  atributo: env.MOD_ATRIBUTO === "nenhum" ? "" : env.MOD_ATRIBUTO || "", valor: env.MOD_VALOR, ator: env.MOD_ATOR,
};
const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
const resposta = await r.json().catch(() => ({ erro: `Resposta HTTP ${r.status} sem JSON.` }));
if (!r.ok) throw new Error(resposta.erro || `HTTP ${r.status}`);
console.log(JSON.stringify(resposta, null, 2));
