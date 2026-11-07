// A estante da F1 com os amigos (window.EstanteF1): lê /api/corrida/estante (bd.estanteCorrida) e desenha o selo de troféus ao lado do
// nome de cada pessoa (sala, Central do grupo); a tela inteira da estante é EntradaCarreira.estante (temporada/?estante=1).
// Só desenha: as conquistas entram no servidor, no fim de cada GP das temporadas em grupo (corrida-temporada-grupo.js).
(function (root) {
"use strict";
const h = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// a mesma chave do servidor (bd.chaveTecnico): minúsculas, sem acento e sem espaço sobrando
const chave = (nome) => String(nome || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const TACA = '<svg class="ef-taca" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3Zm0 4H6v1a2 2 0 0 0 1 1.7V7Zm10 0v2.7A2 2 0 0 0 18 8V7h-1Z"/></svg>';
let dados = null, pedido = null, quando = 0;
const porChave = new Map();

function carregar(forcar) {
  if (pedido && !forcar) return pedido;
  if (dados && !forcar && Date.now() - quando < 30000) return Promise.resolve(dados);
  pedido = fetch("/api/corrida/estante", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status)))).then((d) => {
    dados = d; quando = Date.now(); porChave.clear(); for (const t of d.ranking || []) porChave.set(t.chave, t);
    root.dispatchEvent?.(new CustomEvent("estante-f1", { detail: d })); return d;
  }).catch(() => dados).finally(() => { pedido = null; });
  return pedido;
}
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
function de(nome) { return porChave.get(chave(nome)) || null; }
// o selo curto: as duas conquistas mais fortes que a pessoa tem
function partes(t) {
  if (!t) return [];
  return [t.titulos && plural(t.titulos, "título", "títulos"), t.vitorias && plural(t.vitorias, "vitória", "vitórias"), t.podios && plural(t.podios, "pódio", "pódios"), t.construtores && plural(t.construtores, "título de construtores", "títulos de construtores")].filter(Boolean);
}
function selo(nome) {
  const t = de(nome), p = partes(t); if (!p.length) return "";
  return `<span class="ef-selo${t.titulos ? " campeao" : ""}" title="Estante de ${h(t.piloto)}: ${h(p.join(", "))}">${TACA}${h(p.slice(0, 2).join(" · "))}</span>`;
}
root.EstanteF1 = { carregar, de, selo, chave, dados: () => dados };
})(window);
