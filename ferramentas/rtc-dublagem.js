// Road to Champions — importa a dublagem do pacote de produção (a pasta "Voz" do ElevenLabs) para o jogo.
//
//   node ferramentas/rtc-dublagem.js "<pasta Voz>"
//
// Lê dados/manifesto.json (as cenas), dados/falas.json (as falas, condições e Voice IDs), dados/elenco.json e
// dados/alinhamento/*.json (o tempo de cada palavra, quando o ElevenLabs devolveu), copia vo/<CODIGO>/<ID>.mp3 para
// public/jogador/dublagem/vo/ sem renomear e grava public/jogador/dublagem/manifesto.json, o que a página usa.
// A duração de cada MP3 é medida de novo com o ffprobe (FFmpeg no PATH); sem ffprobe, fica a do pacote e o aviso.
// Não gera voz, não converte formato e não mexe nos arquivos de origem. Pode rodar de novo: só copia o que mudou.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const V = require("../public/jogador/road-voz.js");

const RAIZ = path.join(__dirname, "..");
const DESTINO = path.join(RAIZ, "public", "jogador", "dublagem");
const URL_BASE = "/jogador/dublagem/";

// onde cada cena entra no jogo. As cinco primeiras são a versão dublada de um evento exclusivo que já existe
// (road-regras.js); a "Primeira noite" é um prelúdio novo do Prodígio, antes da primeira entrevista; a "Pergunta
// inconveniente" é o callback da festa do Último Romântico depois de uma derrota.
const GATILHOS = {
  RTC_A1_E01: { tipo: "preludio", capitulo: 0, id: "primeira-noite" },
  RTC_A2_E02: { tipo: "evento", evento: "aniversario" },
  RTC_A2_E03: { tipo: "evento", evento: "banco" },
  RTC_A1_E04: { tipo: "evento", evento: "despertador" },
  RTC_A2_E05: { tipo: "evento", evento: "coletiva" },
  RTC_A2_E06: { tipo: "evento", evento: "protocolo" },
  RTC_A3_E07: { tipo: "callback", id: "pergunta-inconveniente" },
};
// cenas sem ilustração própria: reaproveitam uma arte que já está no jogo (a cidade à noite) ou ficam com o fundo
// desenhado (a parede de patrocínio da coletiva)
const ARTE_RESERVA = { RTC_A1_E01: "/jogador/cenas/hub-fundo.webp" };

const lerJSON = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const normal = (t) => String(t).toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

function ffprobe(arquivo) {
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries",
      "stream=codec_name,sample_rate,channels:format=duration,bit_rate", "-of", "json", arquivo], { encoding: "utf8" });
    const j = JSON.parse(out), s = (j.streams || [])[0] || {};
    return { codec: s.codec_name, taxa: Number(s.sample_rate), canais: s.channels,
      duracaoMs: Math.round(Number(j.format?.duration) * 1000), kbps: Math.round(Number(j.format?.bit_rate) / 1000) };
  } catch (e) {
    if (e.code === "ENOENT") return null; // sem ffprobe
    return { erro: String(e.stderr || e.message).trim().slice(0, 200) };
  }
}

// os trechos da legenda com o tempo real: as frases do alinhamento (palavra a palavra, do ElevenLabs). Só vale quando
// as palavras batem com a legenda; senão a fala fica com a legenda inteira (nada de tempo inventado).
function trechosDe(alinhamento, legenda) {
  if (!alinhamento || !Array.isArray(alinhamento.words) || !alinhamento.words.length) return null;
  const palavras = alinhamento.words;
  if (normal(palavras.map((w) => w.w).join(" ")) !== normal(legenda)) return null;
  const frases = [];
  let atual = [];
  for (const w of palavras) {
    atual.push(w);
    if (/[.?!…]["”']?$/.test(w.w)) { frases.push(atual); atual = []; }
  }
  if (atual.length) frases.push(atual);
  if (frases.length < 2) return null;
  return frases.map((f, i) => ({ texto: f.map((w) => w.w).join(" "), inicioMs: i === 0 ? 0 : f[0].startMs, fimMs: f.at(-1).endMs }));
}

function importar(origem, { copiar = true } = {}) {
  const pacote = lerJSON(path.join(origem, "dados", "manifesto.json"));
  const falasPacote = lerJSON(path.join(origem, "dados", "falas.json"));
  const elenco = lerJSON(path.join(origem, "dados", "elenco.json")).characters || {};
  const vozes = (() => { try { return lerJSON(path.join(origem, "dados", "vozes.json")).vozes || {}; } catch { return {}; } })();
  const relatorio = { mp3: [], semArquivo: [], invalidos: [], duplicados: [], soltos: [], avisos: [], copiados: 0, semFfprobe: false };

  // os MP3 que estão de fato na pasta
  const naPasta = new Map();
  const vo = path.join(origem, "vo");
  for (const dir of fs.existsSync(vo) ? fs.readdirSync(vo) : []) {
    const d = path.join(vo, dir);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d)) if (/\.mp3$/i.test(f)) {
      const id = f.replace(/\.mp3$/i, "");
      if (naPasta.has(id)) relatorio.duplicados.push(id);
      naPasta.set(id, { arquivo: path.join(d, f), pasta: dir });
    }
  }

  const ids = new Set();
  const falas = {};
  for (const f of falasPacote) {
    if (ids.has(f.id)) { relatorio.duplicados.push(f.id); continue; }
    ids.add(f.id);
    const protagonista = f.kind === "protagonist";
    const cod = f.character;
    const item = {
      id: f.id, cena: f.sceneId, personagem: cod, nome: protagonista ? null : (elenco[cod]?.nome || f.characterName),
      protagonista, legenda: f.subtitleText, condicao: V.lerCondicao(f.condition),
      ramo: (/_([A-C])$/.exec(f.id) || [])[1] || null, audio: null, duracaoMs: null, trechos: null,
      voiceId: protagonista ? null : (f.voiceId || vozes[cod]?.voiceId || null),
    };
    if (!protagonista) {
      const achado = naPasta.get(f.id);
      const esperado = f.audioPath && path.basename(f.audioPath, ".mp3");
      if (esperado && esperado !== f.id) relatorio.avisos.push(f.id + ": o roteiro aponta para " + f.audioPath);
      if (!achado) relatorio.semArquivo.push(f.id);
      else {
        if (achado.pasta !== cod) relatorio.avisos.push(f.id + ": está em vo/" + achado.pasta + ", esperado vo/" + cod);
        const info = ffprobe(achado.arquivo);
        if (info === null) relatorio.semFfprobe = true;
        if (info && (info.erro || info.codec !== "mp3" || !(info.duracaoMs > 0))) relatorio.invalidos.push(f.id + ": " + (info.erro || info.codec));
        else {
          item.duracaoMs = info ? info.duracaoMs : f.durationMs;
          if (info && f.durationMs && Math.abs(info.duracaoMs - f.durationMs) > 150)
            relatorio.avisos.push(f.id + ": duração medida " + info.duracaoMs + " ms, o pacote dizia " + f.durationMs + " ms");
          item.audio = URL_BASE + "vo/" + cod + "/" + f.id + ".mp3";
          relatorio.mp3.push({ id: f.id, bytes: fs.statSync(achado.arquivo).size, ...(info || {}) });
          if (copiar) {
            const alvo = path.join(DESTINO, "vo", cod, f.id + ".mp3");
            fs.mkdirSync(path.dirname(alvo), { recursive: true });
            const igual = fs.existsSync(alvo) && fs.statSync(alvo).size === fs.statSync(achado.arquivo).size &&
              fs.readFileSync(alvo).equals(fs.readFileSync(achado.arquivo));
            if (!igual) { fs.copyFileSync(achado.arquivo, alvo); relatorio.copiados++; }
          }
        }
      }
      const al = path.join(origem, "dados", "alinhamento", f.id + ".json");
      if (fs.existsSync(al)) {
        item.trechos = trechosDe(lerJSON(al), f.subtitleText);
        item.alinhado = true;
      }
    }
    falas[f.id] = item;
  }
  for (const id of naPasta.keys()) if (!falas[id]) relatorio.soltos.push(id);

  const cenas = {};
  for (const c of pacote.scenes) {
    const gatilho = GATILHOS[c.id];
    if (!gatilho) { relatorio.avisos.push(c.id + ": cena sem lugar no jogo (fora de GATILHOS)"); continue; }
    let arte = null;
    if (gatilho.tipo === "evento" && fs.existsSync(path.join(RAIZ, "public", "jogador", "popups", "rtc-popup-" + gatilho.evento + ".webp")))
      arte = "/jogador/popups/rtc-popup-" + gatilho.evento + ".webp";
    const reserva = !arte;
    if (!arte) arte = ARTE_RESERVA[c.id] || null;
    if (reserva) relatorio.avisos.push(c.id + ": sem ilustração própria, usa " + (arte || "o fundo desenhado"));
    for (const id of [...c.intro, ...Object.values(c.branches).flat()]) if (!falas[id]) relatorio.avisos.push(c.id + ": fala " + id + " não existe");
    cenas[c.id] = {
      id: c.id, titulo: c.title, ato: c.act, campanha: c.campaign, arquetipo: V.CAMPANHAS[c.campaign], gatilho,
      arte, arteReserva: reserva, ambiente: c.environment, intro: c.intro,
      escolha: c.choice ? { id: c.choice.id, opcoes: c.choice.options.map((o) => ({ codigo: o.code, rotulo: o.label })) } : null,
      ramos: c.branches, condicao: c.trigger ? V.lerCondicao(c.trigger) : { sempre: true },
      estado: c.stateChanges || {}, sfx: c.sfx || [],
    };
  }
  const personagens = {};
  for (const [cod, p] of Object.entries(elenco)) personagens[cod] = { nome: p.nome, campanha: p.campanha, voiceId: vozes[cod]?.voiceId || null };
  const manifesto = {
    versao: 1, origem: "ElevenLabs, " + (pacote.project || "Road to Champions") + ", lote piloto " + (pacote.packageVersion || ""),
    modelo: "eleven_v4", formato: "mp3_44100_128",
    legendas: "por fala; com alinhamento do ElevenLabs, por frase no tempo real",
    personagens, cenas, falas,
  };
  return { manifesto, relatorio };
}

if (require.main === module) {
  const origem = process.argv[2];
  if (!origem || !fs.existsSync(path.join(origem, "dados", "manifesto.json"))) {
    console.error('Uso: node ferramentas/rtc-dublagem.js "<pasta Voz do pacote de produção>"');
    process.exit(1);
  }
  const { manifesto, relatorio: r } = importar(origem);
  fs.mkdirSync(DESTINO, { recursive: true });
  fs.writeFileSync(path.join(DESTINO, "manifesto.json"), JSON.stringify(manifesto, null, 1) + "\n");
  const total = Object.values(manifesto.falas);
  const bytes = r.mp3.reduce((s, x) => s + x.bytes, 0);
  console.log("Falas: " + total.length + " (" + total.filter((f) => f.protagonista).length + " do protagonista, só legenda)");
  console.log("MP3 válidos: " + r.mp3.length + " (" + (bytes / 1048576).toFixed(2) + " MB), copiados agora: " + r.copiados);
  console.log("Com alinhamento por palavra: " + total.filter((f) => f.alinhado).length + ", com legenda em trechos: " + total.filter((f) => f.trechos).length);
  for (const [k, t] of [["semArquivo", "Sem MP3"], ["invalidos", "Inválidos"], ["duplicados", "Duplicados"], ["soltos", "MP3 sem fala no roteiro"], ["avisos", "Avisos"]])
    if (r[k].length) console.log(t + ":\n  " + r[k].join("\n  "));
  if (r.semFfprobe) console.log("Aviso: ffprobe não encontrado; as durações vieram do pacote.");
  if (r.semArquivo.length || r.invalidos.length || r.duplicados.length) process.exitCode = 2;
}
module.exports = { importar, trechosDe, GATILHOS };
