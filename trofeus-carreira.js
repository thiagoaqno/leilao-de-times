// IDs das competições da Carreira na TheSportsDB. A API devolve strTrophy,
// a foto da taça (quando cadastrada), e o navegador usa o SVG local se faltar.
const LIGAS = Object.freeze({
  'brasileirao-2026': 4351,
  'serieb-2026': 4404,
  'inglaterra-2026': 4328,
  'espanha-2026': 4335,
  'italia-2026': 4332,
  'alemanha-2026': 4331,
  'franca-2026': 4334,
  champions: 4480,
  libertadores: 4501,
  copadobrasil: 4725,
  sulamericana: 4724,
  supermundial: 4503,
  mundial: 5696,
  copadomundo: 4429,
});

function urlDeTrofeu(valor) {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    if (url.protocol !== 'https:' || !/(^|\.)thesportsdb\.com$/i.test(url.hostname)) return null;
    if (!/^\/images\/media\/league\/trophy\//i.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

async function buscarTrofeu(id, buscar = fetch) {
  const liga = LIGAS[id];
  if (!liga) return null;
  const resposta = await buscar(`https://www.thesportsdb.com/api/v1/json/${process.env.THESPORTSDB_KEY || '123'}/lookupleague.php?id=${liga}`, { signal: AbortSignal.timeout(8000) });
  if (!resposta.ok) return null;
  const dados = await resposta.json();
  return urlDeTrofeu(dados.leagues?.[0]?.strTrophy);
}

module.exports = { LIGAS, urlDeTrofeu, buscarTrofeu };
