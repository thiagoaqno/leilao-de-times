// Gera a base de dados dos ninjas do modo Naruto (public/galeramon/naruto-base.js) a partir da Dattebayo API.
// A Dattebayo API (https://dattebayo-api.onrender.com) reúne os dados da Narutopedia: 1.431 personagens, com vila,
// clã, classificação, patente, natureza de chakra, jutsus e ferramentas. Aqui vão só os ninjas que têm sprite no jogo
// (a tabela ELENCO, com o número de cada um na API). Os números do jogo (vida, ataque, golpes...) ficam em naruto.js.
// Uso: node ferramentas/base-naruto.js
const fs = require("node:fs");
const path = require("node:path");

const API = "https://dattebayo-api.onrender.com/characters";
const DESTINO = path.join(__dirname, "..", "public", "galeramon", "naruto-base.js");
// slug do jogo -> número na Dattebayo API
const ELENCO = {
  naruto: 1344, sasuke: 1307, sakura: 374, kakashi: 376, shikamaru: 878, itachi: 1293, kisame: 421, deidara: 193,
  lee: 739, sai: 1008, sasori: 1042, yamato: 1373, jiraiya: 515, kabuto: 1359, neji: 444, orochimaru: 928,
  tsunade: 1280, temari: 1208, kankuro: 577, guy: 344, tenten: 1216, gaara: 259, ino: 1365, shino: 13, kiba: 466,
};
const VILAS = {
  Konohagakure: "Vila da Folha", Sunagakure: "Vila da Areia", Kirigakure: "Vila da Névoa", Kumogakure: "Vila da Nuvem",
  Iwagakure: "Vila da Pedra", Otogakure: "Vila do Som", Amegakure: "Vila da Chuva", Akatsuki: "Akatsuki",
};
const PATENTES = { Genin: "Genin", "Chūnin": "Chūnin", "Jōnin": "Jōnin", Kage: "Kage" }; // o resto (Anbu...) não é patente
const LIMITE_JUTSUS = 30;
// a API é a Narutopedia por trás e às vezes traz lixo (um aviso de desambiguação no lugar do jutsu, o título de Kage no
// lugar do clã): essas linhas ficam de fora
const LIXO = /wiki|article|topic/i;
const TITULOS = new Set(["Kazekage", "Hokage", "Mizukage", "Raikage", "Tsuchikage"]);

// "Wind Release  (Affinity)" -> "Vento"; tira as notas entre parênteses
const limpa = (t) => String(t || "").replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
const primeiro = (v) => (Array.isArray(v) ? v[0] : v);
async function pega(id) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      const r = await fetch(`${API}/${id}`, { headers: { "User-Agent": "vila-da-galera-base-naruto" }, signal: AbortSignal.timeout(60000) });
      if (r.ok) return await r.json();
      throw new Error(`HTTP ${r.status}`);
    } catch (erro) {
      if (tentativa >= 4) throw new Error(`personagem ${id}: ${erro.message}`);
      await new Promise((ok) => setTimeout(ok, 3000 * tentativa)); // a API gratuita demora a acordar
    }
  }
}
function perfil(c) {
  const p = c.personal || {}, afiliacao = [].concat(p.affiliation || []).map(limpa);
  const afiliacoes = [...new Set(afiliacao.filter((a) => VILAS[a]).map((a) => VILAS[a]))];
  const rank = c.rank?.ninjaRank ? Object.values(c.rank.ninjaRank).map(limpa).filter(Boolean).reverse().find((r) => PATENTES[r]) : "";
  const cla = limpa(primeiro(p.clan));
  return {
    api: c.id, nome: c.name, aldeia: afiliacoes[0] || "", afiliacoes,
    cla: TITULOS.has(cla) ? "" : cla, patente: PATENTES[rank] || "",
    classificacao: [].concat(p.classification || []).map(limpa).filter((x) => x && !LIXO.test(x)),
    jutsus: [...new Set((c.jutsu || []).map(limpa).filter((x) => x && x !== c.name && !LIXO.test(x)))].slice(0, LIMITE_JUTSUS),
    ferramentas: [...new Set((c.tools || []).map(limpa).filter((x) => x && !LIXO.test(x)))].slice(0, 10),
  };
}
(async () => {
  const base = {};
  for (const [slug, id] of Object.entries(ELENCO)) {
    base[slug] = perfil(await pega(id));
    console.log(`${slug}: ${base[slug].nome} · ${base[slug].aldeia} · ${base[slug].jutsus.length} jutsus`);
  }
  const corpo = JSON.stringify(base, null, 2).replace(/^/gm, "  ").trimStart();
  fs.writeFileSync(DESTINO, `// Base de dados dos ninjas do modo Naruto. GERADO por ferramentas/base-naruto.js: não edite à mão.
// Fonte: Dattebayo API (https://dattebayo-api.onrender.com), dados da Narutopedia (https://naruto.fandom.com), CC-BY-SA.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NarutoBase = factory();
})(typeof self !== "undefined" ? self : this, function () {
  return ${corpo};
});
`);
  console.log(`${Object.keys(base).length} ninjas em ${path.relative(process.cwd(), DESTINO)}`);
})();
