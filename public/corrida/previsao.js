// Corrida da Galera — a previsão do tempo na tela (regras de F1). Só desenha: as contas (a chance, quando, o texto) estão em
// f1-regras.js (`previsaoDoGP`, `descreverPrevisao`). Usado na sala, no grid de largada, na transmissão de TV e na carreira
// (garagem e mapa do GP). Um cartão no estilo da TV: ícone (sol, sol e nuvem, nublado ou chuva), o texto e a chance em itálico;
// `compacto` é a etiqueta pequena (ícone e %) do calendário. O estilo é o `.prev` de tema-f1.css.
(function (root) {
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const NUVEM = (y = 0) => `<path transform="translate(0 ${y})" fill="var(--prev-fundo,#14161c)" d="M9 24h14a5 5 0 0 0 .5-9.97A7.5 7.5 0 0 0 9.2 15.2 4.5 4.5 0 0 0 9 24z"/>`;
const ICONES = [
  `<circle cx="16" cy="16" r="5"/><path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2.1 2.1M22.4 22.4l2.1 2.1M7.5 24.5l2.1-2.1M22.4 9.6l2.1-2.1"/>`, // sol
  `<circle cx="11" cy="11" r="4"/><path d="M11 3v2M3 11h2M5.3 5.3l1.4 1.4M16.7 5.3l-1.4 1.4"/>${NUVEM(2)}`, // sol e nuvem
  NUVEM(0), // nublado
  `${NUVEM(-3)}<path d="M11 24.5l-1.3 3.5M16 24.5l-1.3 3.5M21 24.5l-1.3 3.5"/>`, // chuva
];
const icone = (nivel) => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[Math.max(0, Math.min(3, nivel | 0))]}</svg>`;
// O HTML da previsão. `prev` é o `previsaoDoGP` (ou o `E.S.previsao` do servidor); `voltas`, o tamanho da corrida (para dizer em
// que voltas a chuva pode começar). Sem previsão (ou sem as regras carregadas), devolve "".
function html(prev, { voltas = 0, compacto = false, titulo = "Previsão do tempo" } = {}) {
  const F = root.F1Regras; if (!prev || !F || !F.descreverPrevisao) return "";
  const d = F.descreverPrevisao(prev, voltas), resumo = [d.titulo, d.quando, d.forca].filter(Boolean).join(" · ");
  if (compacto) return `<span class="prev mini n${d.nivel}" title="${esc(`${titulo}: ${resumo}`)}" role="img" aria-label="${esc(`${titulo}: ${d.pct}% de chuva. ${resumo}`)}">${icone(d.nivel)}<b>${d.pct}%</b></span>`;
  return `<div class="prev n${d.nivel}" role="group" aria-label="${esc(titulo)}"><span class="prev-ico">${icone(d.nivel)}</span>
    <div class="prev-txt"><small class="prev-rot">${esc(titulo)}</small><b>${esc(d.titulo)}</b>${d.quando ? `<span>${esc(d.quando)}${d.forca ? ` · ${esc(d.forca)}` : ""}</span>` : ""}${d.dica ? `<small>${esc(d.dica)}</small>` : ""}</div>
    <strong class="prev-pct" aria-label="${d.pct}% de chance de chuva">${d.pct}<small>%</small></strong></div>`;
}
const api = { html, icone };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PrevisaoUI = api;
})(typeof window !== "undefined" ? window : globalThis);
