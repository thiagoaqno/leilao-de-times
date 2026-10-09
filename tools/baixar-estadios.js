// Baixa o endereço da foto do estádio de cada clube na API TheSportsDB (chave gratuita de teste) e grava em
// public/carreira/estadios-api.json e estadios-api.js ({ idDoClube: { url, nome } }; a página carrega o .js). Roda depois de
// tools/baixar-escudos.js: usa o escudo já achado (escudos-api.json) para reconhecer o time certo na busca, pega o estádio
// dele (idVenue) e busca a foto (strThumb). Clube sem foto fica de fora e a sede usa o estádio desenhado (estadios.js).
// A chave gratuita aceita ~30 pedidos por minuto: o script espera entre os pedidos e continua de onde parou.
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..", "public", "carreira");
const ESCUDOS = JSON.parse(fs.readFileSync(path.join(RAIZ, "escudos-api.json"), "utf8"));
const SAIDA = path.join(RAIZ, "estadios-api.json"), SAIDA_JS = path.join(RAIZ, "estadios-api.js");
const CHAVE = process.env.THESPORTSDB_KEY || "123";
const gravar = (obj) => {
  fs.writeFileSync(SAIDA, JSON.stringify(obj, null, 1));
  fs.writeFileSync(SAIDA_JS, `// gerado por tools/baixar-estadios.js (fotos de estádio da TheSportsDB)\nwindow.ESTADIOS_API = ${JSON.stringify(obj)};\n`);
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function pedir(url) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const r = await fetch(url);
    if (r.status === 429) { await esperar(15000); continue; }
    if (!r.ok) return {};
    return r.json().catch(() => ({}));
  }
  return {};
}
(async () => {
  const guardado = fs.existsSync(SAIDA) ? JSON.parse(fs.readFileSync(SAIDA, "utf8")) : {}, vistos = new Set(Object.keys(guardado)), semFoto = [];
  const ids = Object.keys(ESCUDOS);
  for (const [i, id] of ids.entries()) {
    const feito = fs.existsSync(SAIDA + ".visto") ? new Set(fs.readFileSync(SAIDA + ".visto", "utf8").split("\n")) : new Set();
    if (vistos.has(id) || feito.has(id)) continue;
    const e = ESCUDOS[id];
    const busca = await pedir(`https://www.thesportsdb.com/api/v1/json/${CHAVE}/searchteams.php?t=${encodeURIComponent(e.nome)}`);
    await esperar(2300);
    const times = (busca.teams || []).filter((t) => t.strSport === "Soccer");
    const time = times.find((t) => t.strBadge === e.url) || times.find((t) => t.strTeam === e.nome) || null;
    let achado = null;
    if (time && time.idVenue) {
      const v = await pedir(`https://www.thesportsdb.com/api/v1/json/${CHAVE}/lookupvenue.php?id=${time.idVenue}`);
      await esperar(2300);
      const venue = (v.venues || [])[0];
      if (venue && venue.strThumb) achado = { url: venue.strThumb, nome: venue.strVenue || time.strStadium || "" };
    }
    if (achado) guardado[id] = achado; else { semFoto.push(id); fs.appendFileSync(SAIDA + ".visto", id + "\n"); }
    process.stdout.write(`${i + 1}/${ids.length} ${id}: ${achado ? "ok" : "sem foto"}\n`);
    gravar(guardado);
  }
  gravar(guardado);
  try { fs.unlinkSync(SAIDA + ".visto"); } catch {}
  console.log(`\nPronto: ${Object.keys(guardado).length} com foto de estádio; sem foto: ${semFoto.join(", ") || "nenhum"}`);
})();
