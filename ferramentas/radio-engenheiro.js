#!/usr/bin/env node
// Gera as vozes do engenheiro de equipe (public/corrida/radio/<id>.mp3) com a ElevenLabs.
// Uso: ELEVENLABS_API_KEY=... node ferramentas/radio-engenheiro.js [--refazer] [--estimar] [--voz <id>]   (ou rode GERAR-VOZES-CORRIDA.bat)
//   --estimar  só conta as falas e os caracteres que seriam gastos; não precisa de chave e não chama a API
// ELEVENLABS_VOICE_ID é opcional. A chave só é lida do ambiente: nunca é gravada nem impressa. Node 18+.
const fs = require("fs");
const path = require("path");
const { FALAS } = require("../public/corrida/radio/falas.js");

const PASTA = path.join(__dirname, "..", "public", "corrida", "radio");
// a voz: --voz <id> (o GERAR-VOZES-CORRIDA.bat passa), senão ELEVENLABS_VOICE_ID, senão a padrão do engenheiro
const argv = process.argv.slice(2), iv = argv.indexOf("--voz");
const VOZ = (iv >= 0 ? String(argv[iv + 1] || "").trim() : "") || (process.env.ELEVENLABS_VOICE_ID || "").trim() || "pNInz6obpgDQGcFmaJgB";
const refazer = argv.includes("--refazer"), estimar = argv.includes("--estimar");

async function gerar(chave, f) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(VOZ)}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": chave, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: f.texto, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.8, similarity_boost: 0.75, style: 0, use_speaker_boost: true } }),
  });
  if (!r.ok) {
    const erro = new Error(r.status === 401 ? "chave da ElevenLabs recusada (401): confira se copiou a chave certa" : r.status === 429 ? "limite da ElevenLabs atingido (429): espere um pouco ou veja o seu plano e rode de novo (as já feitas são puladas)" : `a ElevenLabs respondeu ${r.status}`);
    erro.status = r.status; throw erro;
  }
  fs.writeFileSync(path.join(PASTA, `${f.id}.mp3`), Buffer.from(await r.arrayBuffer()));
}

async function main() {
  if (estimar) {
    const fazer = FALAS.filter((f) => refazer || !fs.existsSync(path.join(PASTA, `${f.id}.mp3`)));
    const chars = (l) => l.reduce((a, f) => a + f.texto.length, 0), milhar = (n) => n.toLocaleString("pt-BR");
    console.log(`Falas do engenheiro: ${FALAS.length} · a gerar: ${fazer.length} · ${milhar(chars(fazer))} caracteres no plano da ElevenLabs (tudo de novo: ${milhar(chars(FALAS))})`);
    return;
  }
  const chave = (process.env.ELEVENLABS_API_KEY || "").trim();
  if (!chave) { console.error("Falta a chave: defina ELEVENLABS_API_KEY (ou use o GERAR-VOZES-CORRIDA.bat)."); process.exit(1); }
  fs.mkdirSync(PASTA, { recursive: true });
  let feitas = 0, puladas = 0, falhas = 0;
  for (const [i, f] of FALAS.entries()) {
    const arq = path.join(PASTA, `${f.id}.mp3`), n = `[${i + 1}/${FALAS.length}] ${f.id}`;
    if (!refazer && fs.existsSync(arq)) { puladas++; console.log(`${n}: já existe, pulei`); continue; }
    try { await gerar(chave, f); feitas++; console.log(`${n}: ok`); }
    catch (e) {
      falhas++; console.error(`${n}: ${e.message}`);
      if (e.status === 401 || e.status === 429) break; // não adianta insistir
    }
  }
  console.log(`\nGeradas: ${feitas} · puladas: ${puladas} · com erro: ${falhas} · total de falas: ${FALAS.length}`);
  process.exit(falhas ? 1 : 0);
}
main();
