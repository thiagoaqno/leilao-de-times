// Gera os áudios da partida da Carreira na ElevenLabs: as falas do narrador, os sons da torcida e os nomes dos
// jogadores e dos clubes. Roda na máquina de quem tem a chave (GERAR_NARRACAO.bat, na raiz), uma vez: o que já foi
// gerado fica em public/carreira/som/ e não é pedido de novo, então dá para parar e continuar depois.
//
//   node ferramentas/gerar-narracao.js                 tudo o que falta (nomes do Brasileirão e da Série B)
//   node ferramentas/gerar-narracao.js --estimar       só mostra quanto vai gastar, sem gerar nada
//   node ferramentas/gerar-narracao.js --testar        uma fala, um som e três nomes, para ouvir a voz antes
//   node ferramentas/gerar-narracao.js --so falas      só uma parte: falas, torcida ou nomes (pode repetir)
//   node ferramentas/gerar-narracao.js --ligas todas   nomes de todas as ligas (ou a lista: brasileirao,serieb,argentina...)
//   node ferramentas/gerar-narracao.js --refazer gol   apaga e gera de novo uma fala ou um som (pela chave)
//   node ferramentas/gerar-narracao.js --voz <id>      outra voz (padrão: Elvis, narrador brasileiro da biblioteca)
//   node ferramentas/gerar-narracao.js --sim           não pergunta antes de gastar
//
// A chave: a variável ELEVENLABS_API_KEY, ou o arquivo ferramentas/.elevenlabs-chave (fora do git). Sem nenhuma das
// duas, o script pergunta e guarda nesse arquivo.
//
// O que sai (caminhos a partir de public/carreira/som/):
//   falas/<chave>-<n>.mp3        o narrador (cada chave tem algumas versões, para não repetir sempre igual)
//   torcida/<chave>-<n>.mp3      a torcida e o apito ("ambiente" e "canto" são laços contínuos)
//   nomes/clubes/<id>.mp3        o nome do clube (o id da base)
//   nomes/jogadores/<slug>.mp3   o nome que o narrador fala (o mesmo nome falado vira um arquivo só)
//   indice.js / indice.json      window.SOM_PARTIDA: o que existe de cada coisa, e o id de cada jogador → arquivo
"use strict";
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const RAIZ = path.join(__dirname, "..");
const SAIDA = path.join(RAIZ, "public", "carreira", "som");
const ARQ_CHAVE = path.join(__dirname, ".elevenlabs-chave");
const API = process.env.ELEVENLABS_URL || "https://api.elevenlabs.io";
const VOZ_PADRAO = "zNEsdgTUa3ndwKry8Xcq"; // "Elvis": masculino, sotaque brasileiro, narração animada
// o primeiro modelo que a conta aceitar; os dois primeiros entendem as marcas de emoção entre colchetes
const MODELOS = ["eleven_v4", "eleven_v3", "eleven_multilingual_v2"];
const COM_MARCAS = new Set(["eleven_v4", "eleven_v3"]);

// ---------- o que o narrador fala ----------
// Cada chave tem uma ou mais frases; cada frase sai em `vezes` versões (a mesma frase, outra interpretação).
// Os nomes entram por fora, em arquivos próprios: o jogo emenda "GOOOL!" + "Flamengo!" + "Pedro!".
const FALAS = {
  inicio: { vezes: 2, textos: ["[excited] Rola a bola! Começa o jogo!", "[excited] Bola rolando! Começa a partida!"] },
  segundo_tempo: { vezes: 2, textos: ["[excited] Bola rolando para o segundo tempo!"] },
  gol: { vezes: 4, textos: ["[shouting] [excited] GOOOOOOOOOOL!", "[shouting] [excited] GOOOOOOOOOOL! É GOL!"] },
  gol_penalti: { vezes: 2, textos: ["[excited] De pênalti!"] },
  gol_falta: { vezes: 2, textos: ["[excited] De falta! Que cobrança!"] },
  gol_contra_ataque: { vezes: 2, textos: ["[excited] No contra-ataque! Que velocidade!"] },
  empatou: { vezes: 2, textos: ["[excited] Empatou o jogo!"] },
  virou: { vezes: 2, textos: ["[shouting] [excited] VIROU! Virou o jogo!"] },
  goleada: { vezes: 2, textos: ["[excited] É goleada!"] },
  defesa: { vezes: 2, textos: ["[excited] Que defesa!", "[excited] Espalmou o goleiro!", "[excited] Pegou! Defesa segura!"] },
  perdeu: { vezes: 2, textos: ["[excited] Uuuh! Por pouco!", "[disappointed] Pra fora! Desperdiçou!", "[excited] Passou raspando!"] },
  perdeu_penalti: { vezes: 2, textos: ["[shouting] Perdeu o pênalti! Não acredito!"] },
  penalti: { vezes: 2, textos: ["[excited] Pênalti! O juiz manda marcar a cal!"] },
  cobranca: { vezes: 2, textos: ["[tense] Vai para a cobrança... bateu!"] },
  amarelo: { vezes: 2, textos: ["Cartão amarelo."] },
  vermelho: { vezes: 2, textos: ["[excited] Cartão vermelho! Está expulso!"] },
  segundo_amarelo: { vezes: 2, textos: ["[excited] Segundo amarelo! Vai mais cedo para o chuveiro!"] },
  lesao: { vezes: 2, textos: ["[concerned] Jogador caído no gramado... vai precisar sair."] },
  substituicao: { vezes: 2, textos: ["Substituição."] },
  mudanca_tatica: { vezes: 2, textos: ["O técnico mexe no esquema."] },
  contra_ataque: { vezes: 2, textos: ["[excited] Roubou a bola! Lá vai o contra-ataque!"] },
  acrescimos: { vezes: 2, textos: ["Vamos para os acréscimos."] },
  intervalo: { vezes: 2, textos: ["Fim do primeiro tempo!"] },
  fim: { vezes: 2, textos: ["[excited] Fim de jogo!", "[excited] Apita o árbitro! Termina a partida!"] },
  disputa_inicio: { vezes: 2, textos: ["[excited] Vai para os pênaltis! Coração na mão!"] },
  disputa_gol: { vezes: 2, textos: ["[excited] Gol! Bateu bem!"] },
  disputa_defesa: { vezes: 2, textos: ["[shouting] DEFENDEU! Pegou o pênalti!"] },
  disputa_fora: { vezes: 2, textos: ["[excited] Pra fora! Isolou!"] },
  classico: { vezes: 2, textos: ["[excited] É clássico! Casa cheia, clima quente!"] },
  decisivo: { vezes: 2, textos: ["[excited] Jogo decisivo! Não pode errar!"] },
  final: { vezes: 2, textos: ["[excited] É final! Vale a taça!"] },
};
// o placar falado ("Dois a um."), de 0 × 0 até 5 × 5: uma versão de cada
const POR_EXTENSO = ["zero", "um", "dois", "três", "quatro", "cinco"];
for (let a = 0; a <= 5; a++) for (let b = 0; b <= 5; b++) {
  const t = `${POR_EXTENSO[a]} a ${POR_EXTENSO[b]}.`;
  FALAS[`placar_${a}_${b}`] = { vezes: 1, textos: [t[0].toUpperCase() + t.slice(1)] };
}

// ---------- a torcida (efeitos sonoros) ----------
// `s`: duração em segundos; `laco`: o som emenda o fim no começo (o jogo toca em repetição).
const TORCIDA = {
  ambiente: { vezes: 1, s: 30, laco: true, texto: "Large football stadium crowd ambience, constant murmur of forty thousand fans, distant chanting, no music" },
  canto: { vezes: 1, s: 20, laco: true, texto: "Brazilian football stadium crowd singing in unison with drums and trumpets, rhythmic chant, no recognizable lyrics" },
  gol: { vezes: 2, s: 7, texto: "Huge football stadium crowd erupting in celebration after a goal, roaring and screaming" },
  gol_fora: { vezes: 2, s: 5, texto: "Quiet football stadium, home crowd groaning in disappointment, a small group of away fans cheering in the distance" },
  uh: { vezes: 2, s: 3, texto: "Football stadium crowd gasping ooh in disappointment after a near miss" },
  aplauso: { vezes: 2, s: 3, texto: "Football stadium crowd applauding a great save" },
  vaia: { vezes: 2, s: 4, texto: "Football stadium crowd booing and whistling at the referee" },
  tensao: { vezes: 1, s: 5, texto: "Football stadium crowd murmur rising in tension before a penalty kick" },
  apito: { vezes: 2, s: 1, texto: "Referee whistle, one sharp short blow, outdoor stadium" },
  apito_inicio: { vezes: 1, s: 2, texto: "Referee whistle, one long blow to start the match, outdoor stadium" },
  apito_fim: { vezes: 1, s: 3, texto: "Referee whistle, three long blows ending the football match, outdoor stadium" },
};

// as ligas da base (public/carreira/base/<liga>-2026.js)
const LIGAS = ["brasileirao", "serieb", "argentina", "sulamericanos", "inglaterra", "espanha", "italia", "alemanha", "franca"];
const LIGAS_PADRAO = ["brasileirao", "serieb"];

// ---------- o nome que o narrador fala ----------
const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "del", "della", "la", "le", "van", "von", "der", "den", "di", "du", "e", "y", "mac", "ten", "ter"]);
const DE_PORTUGUES = new Set(["de", "da", "do", "das", "dos", "e"]);
// os nomes que a regra erra: ferramentas/narracao-nomes.json, { "nome completo da base": "como o narrador fala" }
const ARQ_APELIDOS = path.join(__dirname, "narracao-nomes.json");
const APELIDOS = (() => { try { return JSON.parse(fs.readFileSync(ARQ_APELIDOS, "utf8")); } catch (e) { return {}; } })();
// "Pedro" fica "Pedro"; "Lucas Paquetá" vira "Paquetá"; "Nicolás de la Cruz" vira "De la Cruz", "Virgil van Dijk" vira
// "Van Dijk" e o brasileiro "Vinícius de Souza" vira "Souza"; nomes curtos de duas palavras ("Léo Ortiz", "Alex Sandro")
// ficam inteiros, que é como o narrador fala.
function nomeFalado(nome, nat) {
  if (APELIDOS[nome]) return APELIDOS[nome];
  const p = String(nome).trim().split(/\s+/);
  if (p.length === 1) return p[0];
  if (p.length === 2 && p[0].length <= 4) return p.join(" ");
  let i = p.length - 1;
  while (i > 1 && PARTICULAS.has(p[i - 1].toLowerCase())) i--;
  let fim = p.slice(i);
  if (fim.length === 2 && DE_PORTUGUES.has(fim[0].toLowerCase()) && (nat === "Brasil" || nat === "Portugal")) fim = fim.slice(1);
  if (fim.length === 1 && fim[0].length <= 2) return p.join(" "); // o sobrenome curto demais ("Jr"): melhor o nome todo
  const r = fim.join(" ");
  return r[0].toUpperCase() + r.slice(1);
}
const slug = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ø/g, "o").replace(/[đð]/g, "d").replace(/ł/g, "l").replace(/ß/g, "ss")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";

// ---------- linha de comando ----------
function opcoes(argv) {
  const o = { so: new Set(), ligas: LIGAS_PADRAO, refazer: new Set(), voz: VOZ_PADRAO, estimar: false, testar: false, sim: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => argv[++i] || "";
    if (a === "--estimar") o.estimar = true;
    else if (a === "--testar") o.testar = true;
    else if (a === "--sim" || a === "-s") o.sim = true;
    else if (a === "--so") v().split(",").forEach((x) => o.so.add(x.trim()));
    else if (a === "--ligas") { const l = v(); o.ligas = l === "todas" ? LIGAS : l.split(",").map((x) => x.trim()).filter(Boolean); }
    else if (a === "--refazer") v().split(",").forEach((x) => o.refazer.add(x.trim()));
    else if (a === "--voz") o.voz = v();
    else if (a === "--ajuda" || a === "-h") { console.log(fs.readFileSync(__filename, "utf8").split("\n").filter((l) => l.startsWith("//")).slice(0, 24).map((l) => l.slice(3)).join("\n")); process.exit(0); }
    else { console.error(`Opção desconhecida: ${a} (use --ajuda)`); process.exit(1); }
  }
  for (const l of o.ligas) if (!LIGAS.includes(l)) { console.error(`Liga desconhecida: ${l}. As ligas: ${LIGAS.join(", ")}`); process.exit(1); }
  if (!o.so.size) o.so = new Set(["falas", "torcida", "nomes"]);
  for (const s of o.so) if (!["falas", "torcida", "nomes"].includes(s)) { console.error(`--so aceita falas, torcida ou nomes (veio "${s}")`); process.exit(1); }
  return o;
}

const perguntar = (q) => new Promise((ok) => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, (r) => { rl.close(); ok(r.trim()); }); });
async function chave() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  if (fs.existsSync(ARQ_CHAVE)) return fs.readFileSync(ARQ_CHAVE, "utf8").trim();
  const c = await perguntar("Cole a chave da API da ElevenLabs (fica guardada em ferramentas/.elevenlabs-chave, fora do git): ");
  if (!c) { console.error("Sem chave, não dá para gerar."); process.exit(1); }
  fs.writeFileSync(ARQ_CHAVE, c + "\n");
  return c;
}

// ---------- a lista do que gerar ----------
function tarefas(o) {
  const lista = [];
  const arq = (rel) => path.join(SAIDA, rel);
  if (o.so.has("falas")) for (const [k, f] of Object.entries(FALAS)) {
    let n = 0;
    for (const t of f.textos) for (let v = 0; v < f.vezes; v++) lista.push({ tipo: "fala", chave: k, texto: t, rel: `falas/${k}-${++n}.mp3` });
  }
  if (o.so.has("torcida")) for (const [k, s] of Object.entries(TORCIDA)) for (let v = 1; v <= s.vezes; v++) lista.push({ tipo: "som", chave: k, texto: s.texto, s: s.s, laco: !!s.laco, rel: `torcida/${k}-${v}.mp3` });
  const jogadores = {}, clubes = {};
  if (o.so.has("nomes")) {
    const feitos = new Set();
    for (const liga of o.ligas) {
      const base = require(path.join(RAIZ, "public", "carreira", "base", `${liga}-2026.js`));
      for (const c of base.clubes) {
        clubes[c.id] = `nomes/clubes/${c.id}.mp3`;
        lista.push({ tipo: "nome", chave: c.id, texto: `[excited] ${c.nome}!`, rel: clubes[c.id] });
        // dois do mesmo clube com o mesmo nome falado (os dois "Silva"): o narrador fala o nome todo
        const vezes = {};
        for (const j of c.jogadores) { const f = nomeFalado(j.nome, j.nat); vezes[f] = (vezes[f] || 0) + 1; }
        for (const j of c.jogadores) {
          if (j.base) continue; // os garotos fictícios que completam o elenco: o narrador fala sem o nome
          const curto = nomeFalado(j.nome, j.nat), falado = vezes[curto] > 1 && !APELIDOS[j.nome] ? j.nome : curto, s = slug(falado);
          jogadores[j.id] = `nomes/jogadores/${s}.mp3`;
          if (feitos.has(s)) continue;
          feitos.add(s);
          lista.push({ tipo: "nome", chave: s, texto: `[excited] ${falado}!`, rel: jogadores[j.id] });
        }
      }
    }
  }
  for (const t of lista) {
    t.arq = arq(t.rel);
    if (o.refazer.has(t.chave) && fs.existsSync(t.arq)) fs.unlinkSync(t.arq);
    t.feito = fs.existsSync(t.arq);
  }
  if (o.testar) { // um de cada tipo (os nomes: um clube e dois jogadores), refeitos para ouvir
    const pega = (f, n) => lista.filter(f).slice(0, n);
    const t = [...pega((x) => x.chave === "gol" && x.tipo === "fala", 1), ...pega((x) => x.chave === "gol" && x.tipo === "som", 1), ...pega((x) => x.tipo === "nome", 3)];
    for (const x of t) { x.rel = `teste/${x.tipo}-${path.basename(x.rel)}`; x.arq = arq(x.rel); x.feito = false; }
    return { lista: t, jogadores: {}, clubes: {}, teste: true };
  }
  return { lista, jogadores, clubes };
}

// o custo aproximado em créditos: a fala gasta ~1 crédito por letra e o efeito sonoro ~20 por segundo
const semMarcas = (t) => t.replace(/\[[^\]]*\]\s*/g, "").trim();
const custo = (t) => (t.tipo === "som" ? t.s * 20 : semMarcas(t.texto).length);

// ---------- a API ----------
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function pedirAudio(url, corpo, k) {
  for (let tentativa = 1; ; tentativa++) {
    let r;
    try {
      r = await fetch(url, { method: "POST", headers: { "xi-api-key": k, "content-type": "application/json", accept: "audio/mpeg" }, body: JSON.stringify(corpo) });
    } catch (e) {
      if (tentativa >= 4) throw new Error(`sem conexão com a ElevenLabs (${e.message})`);
      await espera(2000 * 2 ** tentativa); continue;
    }
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    const txt = await r.text(); let det = {};
    try { det = JSON.parse(txt).detail || {}; } catch (e) { /* resposta sem JSON */ }
    const status = typeof det === "object" ? det.status || det.code || "" : "", msg = typeof det === "object" ? det.message || txt : String(det);
    if ((r.status === 429 || r.status >= 500) && tentativa < 6) { await espera(3000 * tentativa); continue; } // muitos pedidos juntos ou a API piscou
    const e = new Error(`${r.status} ${status} ${msg}`.trim()); e.status = r.status; e.codigo = String(status); throw e;
  }
}
let modelo = null, comLingua = true; // descobertos no primeiro pedido de fala
async function falar(t, o, k) {
  const fila = modelo ? [[modelo, comLingua]] : MODELOS.flatMap((m) => (m === "eleven_multilingual_v2" ? [[m, false]] : [[m, true], [m, false]]));
  for (const [m, lingua] of fila) {
    const corpo = { text: COM_MARCAS.has(m) ? t.texto : semMarcas(t.texto), model_id: m };
    if (lingua) corpo.language_code = "pt";
    try {
      const audio = await pedirAudio(`${API}/v1/text-to-speech/${encodeURIComponent(o.voz)}?output_format=${t.tipo === "nome" ? "mp3_22050_32" : "mp3_44100_128"}`, corpo, k);
      if (!modelo) { modelo = m; comLingua = lingua; console.log(`  (modelo de voz: ${m})`); }
      return audio;
    } catch (e) {
      const deModelo = (e.status === 400 || e.status === 422) && /model|language/i.test(e.message);
      if (!modelo && deModelo) continue; // a conta não tem esse modelo (ou ele não aceita o idioma): tenta o próximo
      throw e;
    }
  }
  throw new Error("nenhum dos modelos de voz foi aceito pela conta");
}
const som = (t, k) => pedirAudio(`${API}/v1/sound-generation?output_format=mp3_44100_128`, { text: t.texto, duration_seconds: t.s, prompt_influence: 0.5, loop: t.laco, model_id: "eleven_text_to_sound_v2" }, k);

// ---------- o índice que o jogo lê ----------
function escreverIndice(o, jogadoresNovos, clubesNovos) {
  fs.mkdirSync(SAIDA, { recursive: true });
  const ant = (() => { try { return JSON.parse(fs.readFileSync(path.join(SAIDA, "indice.json"), "utf8")); } catch (e) { return {}; } })();
  const existe = (rel) => fs.existsSync(path.join(SAIDA, rel));
  const pasta = (dir) => { try { return fs.readdirSync(path.join(SAIDA, dir)).filter((f) => f.endsWith(".mp3")); } catch (e) { return []; } };
  const porChave = (dir) => {
    const r = {};
    for (const f of pasta(dir).sort((a, b) => a.localeCompare(b, "en", { numeric: true }))) { const k = f.replace(/-\d+\.mp3$/, ""); (r[k] = r[k] || []).push(`${dir}/${f}`); }
    return r;
  };
  // o que já estava no índice (de outras ligas, de outra rodada do script) continua, se o arquivo ainda existe
  const jogadores = {}, clubes = {};
  for (const [id, rel] of Object.entries({ ...(ant.jogadores || {}), ...jogadoresNovos })) if (existe(rel)) jogadores[id] = rel;
  for (const [id, rel] of Object.entries({ ...(ant.clubes || {}), ...clubesNovos })) if (existe(rel)) clubes[id] = rel;
  const indice = { versao: 1, voz: o.voz, modelo: modelo || ant.modelo || null, gerado: new Date().toISOString().slice(0, 10), falas: porChave("falas"), torcida: porChave("torcida"), clubes, jogadores };
  fs.writeFileSync(path.join(SAIDA, "indice.json"), JSON.stringify(indice) + "\n");
  fs.writeFileSync(path.join(SAIDA, "indice.js"), "// Gerado por ferramentas/gerar-narracao.js (GERAR_NARRACAO.bat). Não edite à mão.\n" +
    `window.SOM_PARTIDA = ${JSON.stringify(indice)};\n`);
  return indice;
}

async function main() {
  const o = opcoes(process.argv.slice(2));
  const { lista, jogadores, clubes, teste } = tarefas(o);
  const falta = lista.filter((t) => !t.feito);
  const soma = (f) => falta.filter(f).reduce((s, t) => s + custo(t), 0);
  const conta = (tipo) => `${falta.filter((t) => t.tipo === tipo).length} de ${lista.filter((t) => t.tipo === tipo).length}`;
  console.log("Narração e torcida da Carreira (ElevenLabs)");
  console.log(`  falas do narrador: ${conta("fala")} a gerar (~${soma((t) => t.tipo === "fala")} créditos)`);
  console.log(`  sons da torcida:   ${conta("som")} a gerar (~${soma((t) => t.tipo === "som")} créditos)`);
  console.log(`  nomes (${o.ligas.join(", ")}): ${conta("nome")} a gerar (~${soma((t) => t.tipo === "nome")} créditos)`);
  console.log(`  total aproximado: ${soma(() => true)} créditos · voz ${o.voz}`);
  if (o.estimar) return;
  if (!falta.length) { escreverIndice(o, jogadores, clubes); console.log("Nada a gerar: está tudo pronto. O índice foi refeito."); return; }
  const k = await chave();
  if (!o.sim && (await perguntar("Continuar? (s/n) ")).toLowerCase() !== "s") return;

  let feitos = 0, erros = 0, i = 0;
  const parar = () => { if (!teste) escreverIndice(o, jogadores, clubes); };
  process.on("SIGINT", () => { console.log("\nParado. O que já foi gerado fica; rode de novo para continuar."); parar(); process.exit(0); });
  for (const t of falta) {
    i++;
    const rot = `[${i}/${falta.length}] ${t.rel}`;
    try {
      const audio = t.tipo === "som" ? await som(t, k) : await falar(t, o, k);
      fs.mkdirSync(path.dirname(t.arq), { recursive: true });
      fs.writeFileSync(t.arq, audio);
      feitos++;
      console.log(`${rot}  ok`);
    } catch (e) {
      erros++;
      console.log(`${rot}  ERRO: ${e.message}`);
      if (e.status === 401 && /quota|credit/i.test(e.codigo + e.message)) { console.log("Os créditos da conta acabaram. O que já saiu fica; rode de novo quando tiver créditos."); break; }
      if (e.status === 401) { console.log(`A chave foi recusada. Confira a chave (ou apague ${path.relative(RAIZ, ARQ_CHAVE)} para colar outra).`); break; }
      if (/voice/i.test(e.message) && t.tipo !== "som") { console.log("A voz não foi encontrada na conta: abra a voz na Biblioteca de vozes da ElevenLabs e toque em \"Adicionar às minhas vozes\", ou use --voz <id>."); break; }
      if (erros >= 10) { console.log("Erros demais seguidos; parando."); break; }
    }
    await espera(250); // sem pressa: a conta tem limite de pedidos ao mesmo tempo
  }
  parar();
  console.log(`\nPronto: ${feitos} arquivo(s) novo(s)${erros ? `, ${erros} erro(s)` : ""}. Arquivos em public/carreira/som/${teste ? "teste/ (ouça e apague a pasta depois)" : ""}.`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { FALAS, TORCIDA, nomeFalado, slug };
