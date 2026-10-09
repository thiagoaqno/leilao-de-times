// Baixa o endereço do escudo de cada clube da carreira na API TheSportsDB (chave gratuita de teste) e grava em
// public/carreira/escudos-api.json e escudos-api.js ({ idDoClube: { url, nome } }; a página carrega o .js). Roda uma vez (node tools/baixar-escudos.js): a página usa o
// arquivo, sem chamar a API a cada abertura, e cai no escudo desenhado (escudos.js) quando o clube não está no arquivo ou a imagem não carrega.
// A chave gratuita aceita ~30 pedidos por minuto, então o script espera entre um clube e outro e guarda o que já achou (dá para rodar de novo).
const fs = require("fs");
const path = require("path");
const BASE = path.join(__dirname, "..", "public", "carreira", "base");
const SAIDA = path.join(__dirname, "..", "public", "carreira", "escudos-api.json"), SAIDA_JS = SAIDA.replace(".json", ".js");
const gravar = (obj) => {
  fs.writeFileSync(SAIDA, JSON.stringify(obj, null, 1));
  fs.writeFileSync(SAIDA_JS, `// gerado por tools/baixar-escudos.js (escudos da TheSportsDB)\nwindow.ESCUDOS_API = ${JSON.stringify(obj)};\n`);
};
const CHAVE = process.env.THESPORTSDB_KEY || "123";
const PAISES = { "brasileirao-2026": "Brazil", "inglaterra-2026": "England", "espanha-2026": "Spain", "italia-2026": "Italy", "alemanha-2026": "Germany", "franca-2026": "France", "argentina-2026": "Argentina" };

const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const SEM_SIGLAS = /\b(fc|cf|afc|sc|ac|as|ssc|rc|ud|cd|sv|vfb|vfl|tsg|fsv|1|ec|ca|cr|se|esporte clube|clube|sociedade esportiva|futebol clube)\b/g;
const miolo = (s) => semAcento(s).replace(SEM_SIGLAS, " ").replace(/\s+/g, " ").trim();

function clubes() {
  const out = [];
  for (const f of fs.readdirSync(BASE)) {
    if (!f.endsWith("-2026.js") || f === "mundo-2026.js") continue;
    const m = { exports: {} }, w = {};
    new Function("module", "exports", "window", "root", "self", fs.readFileSync(path.join(BASE, f), "utf8"))(m, m.exports, w, w, w);
    const b = m.exports.clubes ? m.exports : Object.values(w).find((x) => x && x.clubes);
    for (const c of (b && b.clubes) || []) out.push({ id: c.id, nome: c.nome, curto: c.curto, liga: c.liga || f.replace(".js", "") });
  }
  return out;
}
// clubes que a busca pelo nome da base não acha: o nome que a TheSportsDB usa (a busca com apelido aceita o primeiro resultado do país)
const APELIDOS = { athletico: "Athletico Paranaense", atleticomg: "Atletico Mineiro", "paris-saint-germain": "Paris Saint Germain", "newcastle-utd": "Newcastle United", "nottingham-forest": "Nottingham Forest",
  "inter-de-milao": "Inter Milan", "losc-lille": "Lille OSC", "athletic-club": "Athletic Bilbao", "angers-sco": "Angers", "hamburger-sv": "Hamburg SV", estudiantes: "Estudiantes de La Plata", nacional: "Club Nacional de Football", junior: "Atletico Junior", libertad: "Club Libertad", ucv: "Universidad Central de Venezuela", "celta-de-vigo": "Celta Vigo", "as-monaco": "AS Monaco FC" };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function buscar(nome) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const r = await fetch(`https://www.thesportsdb.com/api/v1/json/${CHAVE}/searchteams.php?t=${encodeURIComponent(nome)}`);
    if (r.status === 429) { await esperar(15000); continue; }
    if (!r.ok) return [];
    const j = await r.json().catch(() => ({}));
    return (j.teams || []).filter((t) => t.strSport === "Soccer");
  }
  return [];
}
// o melhor candidato: o nome (ou o alternativo) igual ao do clube, de preferência no país da liga
function escolher(c, candidatos, apelido = null) {
  const permissivo = !!apelido;
  const alvos = [semAcento(c.nome), miolo(c.nome), semAcento(c.curto), miolo(c.curto)].filter(Boolean), pais = PAISES[c.liga];
  let melhor = null, bp = 0;
  for (const t of candidatos) {
    if (!t.strBadge) continue;
    const nomes = [t.strTeam, t.strTeamAlternate, t.strTeamShort].flatMap((x) => String(x || "").split(",")).map((x) => x.trim()).filter(Boolean);
    let p = 0;
    for (const n of nomes) { if (alvos.includes(semAcento(n))) p = Math.max(p, 4); else if (alvos.includes(miolo(n))) p = Math.max(p, 3); else if (alvos.some((a) => a && miolo(n) && (a.includes(miolo(n)) || miolo(n).includes(a)))) p = Math.max(p, 1); }
    if (!p) continue;
    if (pais && t.strCountry === pais) p += 2; else if (pais && t.strCountry && t.strCountry !== pais) p -= 1.5;
    if (p > bp) { bp = p; melhor = t; }
  }
  // apelido: o time que se chama exatamente assim; senão, o primeiro do país
  if (permissivo) {
    const exato = candidatos.find((t) => t.strBadge && [t.strTeam, ...String(t.strTeamAlternate || "").split(",")].some((n) => semAcento(n) === semAcento(apelido)) || (semAcento(apelido).includes(semAcento(t.strTeam)) && t.strCountry === "Monaco" && c.id === "as-monaco"));
    melhor = exato || (melhor && bp >= 3 ? melhor : candidatos.find((t) => t.strBadge && (!pais || t.strCountry === pais)) || null);
  }
  return bp >= 3 || permissivo ? melhor : null;
}
(async () => {
  const guardado = fs.existsSync(SAIDA) ? JSON.parse(fs.readFileSync(SAIDA, "utf8")) : {}, falhas = [];
  const lista = clubes();
  for (const [i, c] of lista.entries()) {
    if (guardado[c.id]) continue;
    const tentativas = [APELIDOS[c.id], c.nome, c.curto, c.nome.replace(/^(1\. |FC |AFC |AS |AC |SSC |CF )/, "")].filter((x, k, l) => x && l.indexOf(x) === k);
    let achado = null;
    for (const nome of tentativas) { achado = escolher(c, await buscar(nome), nome === APELIDOS[c.id] ? nome : null); await esperar(2300); if (achado) break; }
    if (achado) guardado[c.id] = { url: achado.strBadge, nome: achado.strTeam }; else falhas.push(c.id);
    process.stdout.write(`${i + 1}/${lista.length} ${c.id}: ${achado ? "ok" : "SEM ESCUDO"}\n`);
    gravar(guardado);
  }
  console.log(`\nPronto: ${Object.keys(guardado).length} com escudo da API; sem escudo: ${falhas.join(", ") || "nenhum"}`);
})();
