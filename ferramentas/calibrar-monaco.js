// Bancada reproduzível de Mônaco: um piloto, física real do servidor, pista seca e sem trânsito.
"use strict";
const T = require("../public/corrida/pistas.js");
const F1 = require("../public/corrida/f1-regras.js");
const Pilotos = require("../public/corrida/f1-pilotos-2026.js");
const Robos = require("../corrida-robos.js");
const Direcao = require("../corrida-f1-direcao.js");
const Sim = require("../public/corrida/sim.js");

function curvatura(pts, lat, m = 12, janela = 6) {
  const n = pts.length, x = pts.map((p, i) => p.x - p.ty * lat[(i + 2) % n]), y = pts.map((p, i) => p.y + p.tx * lat[(i + 2) % n]);
  const cru = pts.map((p, i) => { const a = (i - m + n) % n, b = (i + m) % n, ab = Math.hypot(x[i]-x[a],y[i]-y[a]), bc = Math.hypot(x[b]-x[i],y[b]-y[i]), ac = Math.hypot(x[b]-x[a],y[b]-y[a]); return ab * bc * ac > 1e-6 ? 2 * Math.abs((x[i]-x[a])*(y[b]-y[i])-(y[i]-y[a])*(x[b]-x[i])) / (ab*bc*ac) : 0; });
  return Float64Array.from(pts, (_, i) => { let k = 0; for (let j = -janela; j <= janela; j++) k += cru[(i+j+n)%n]; return Math.min(1/22, k/(2*janela+1)); });
}
function simular({ semente = 4321, voltas = 3, configurar = null, linha = 1, ritmo = 1, olhar = 1, setores = [], experimento = false, renovarPorVolta = true, coletar = false, coletarSujas = false, grampo = null } = {}) {
  const antigoAgora = Date.now, antigoRandom = Math.random, antigoPiloto = Sim.pilotoAutomatico; let agora = 1000000;
  Date.now = () => agora; Math.random = F1.sorteio(`calibrar-monaco:${semente}`);
  try {
    Robos.usarFonte(() => []);
    const room = { config: { pista: "monaco", regras: "f1", caixas: false, robos: 1, nivel: "dificil", voltas: 1 }, players: {}, order: [], phase: "race", startAt: agora - 6000, semente, finishOrder: [], pilotosTemporada: [Pilotos.PILOTOS.find((p) => p.id === "leclerc")] };
    Robos.preparar(room, ["#e8002d"], () => "a");
    const p = room.players[room.order[0]]; Object.assign(p, { grid: 0, laps: 0, sector: T.SECTORS - 1, started: false, finish: null });
    Robos.largar(room); Direcao.iniciar(room); p.ia.reacao = 0; p.ia.plano = null;
    if (!experimento) p.ia.perfilCalibrado = null;
    else if (!p.ia.perfilCalibrado) p.ia.perfilCalibrado = Robos.perfilCalibradoMonaco(p.ia.perfil); // permite reavaliar explicitamente após mudanças de física
    p.ia.sim.pneu = F1.pneuNovo("medio"); p.ia.pneu = p.ia.sim.pneu; p.pneu = p.pneuAtual = "medio";
    if (linha !== 1 || grampo !== null) { const original = p.ia.perfil, suave = (v) => { v = Math.max(0, Math.min(1, v)); return v*v*(3-2*v); };
      const lat = Float64Array.from(original.lat, (v, i) => { const f = i / original.n, peso = suave((f - 0.27) / 0.05) * (1 - suave((f - 0.40) / 0.05)); return v * (linha + ((grampo ?? linha) - linha) * peso); }); p.ia.perfil = { ...original, lat, kf: curvatura(original.pts, lat), perfisF1: new Map(), tabelas: new Map() }; }
    Sim.pilotoAutomatico = (c, tr, spec, velocidade, lat, ent, fator) => {
      const f = c.idx / tr.n, ajuste = setores.reduce((v, z) => f >= z.inicio && f <= z.fim ? Math.min(v, z.ritmo) : v, 1);
      return antigoPiloto(c, tr, spec, velocidade * ritmo * ajuste, lat, ent, (fator || 1) * olhar);
    };
    if (configurar) configurar(p, room);
    const tr = Sim.criarPista(T.PISTAS.monaco, "monaco"), tempos = [], ocorrencias = []; let batidas = 0, fora = 0, maxLat = 0, ativo = 0, amostras = 0, inativo = null, desgasteMax = 0, voltaAmostras = []; const rastros = [];
    const renovarPneu = (q) => { q.ia.sim.pneu = F1.pneuNovo("medio"); q.ia.pneu = q.ia.sim.pneu; q.pneu = q.pneuAtual = "medio"; };
    const setor = (q, s) => {
      if (s !== (q.sector + 1) % T.SECTORS) return; q.sector = s; if (s !== 0) return;
      if (!q.started) { q.started = true; q.lapStart = agora; renovarPneu(q); batidas = 0; fora = 0; maxLat = 0; ativo = 0; amostras = 0; return; }
      if (coletar && (coletarSujas || (!batidas && !fora && ativo === amostras)) && amostras > 0) rastros.push(voltaAmostras);
      voltaAmostras = [];
      tempos.push({ tempo: (agora - q.lapStart) / 1000, batidas, fora, maxLat: Math.round(maxLat * 10) / 10, recuperacoes: q.ia.recuperacoes || 0, calibracao: amostras ? +(ativo / amostras).toFixed(3) : 0, desgasteMax: +desgasteMax.toFixed(3), inativo });
      q.lapStart = agora; q.laps++; if (renovarPorVolta) renovarPneu(q); batidas = 0; fora = 0; maxLat = 0; ativo = 0; amostras = 0; inativo = null; desgasteMax = 0;
    };
    const emit = (e, d) => { if (e === "batida") { batidas++; ocorrencias.push({ tempo: (agora - room.startAt) / 1000, forca: Math.round(d.forca), fracao: +(p.ia.sim.idx / tr.n).toFixed(4), velocidade: Math.round(p.ia.sim.v) }); Direcao.bater(room, p, d.forca, d.tipo, agora, () => {}, d.chave); } };
    for (let passo = 0; passo < 12000 && tempos.length < voltas && !p.dnf; passo++) {
      agora += 50; Robos.passo(room, 0.05, setor, emit);
      if (p.started && p.ia.sim) { if (coletar) voltaAmostras.push([p.ia.sim.idx, p.ia.sim.v]); desgasteMax = Math.max(desgasteMax, p.ia.sim.pneu.desgaste); amostras++; if (p.ia.usarCalibracaoMonaco) ativo++; else if (experimento && !inativo) { const c = p.ia.sim; inativo = { fracao: +(c.idx / tr.n).toFixed(3), pneu: c.pneu.desgaste, dano: p.dano, inst: c.inst, erro: !!p.ia.erro }; } const c = p.ia.sim, f = Sim.quadro(tr, c.x, c.y, c.idx); maxLat = Math.max(maxLat, Math.abs(f.lat)); if (Math.abs(f.lat) > tr.W / 2 + 6) fora++; }
    }
    return { semente, tempos, dnf: !!p.dnf, ocorrencias, piloto: p.piloto.id, ...(coletar ? { rastros } : {}) };
  } finally { Date.now = antigoAgora; Math.random = antigoRandom; Sim.pilotoAutomatico = antigoPiloto; Robos.usarFonte(() => []); }
}
function gerarReferencia(sementes = [4321, 874, 13, 321]) {
  const C = require("../corrida-monaco-calibracao.js"), pts = T.pontos(T.PISTAS.monaco, 6), n = pts.length;
  const somas = new Float64Array(n), contagens = new Uint32Array(n); let voltas = 0;
  for (const semente of sementes) {
    const r = simular({ semente, voltas: 2, experimento: true, coletar: true });
    for (const volta of r.rastros) { voltas++; for (const [i, v] of volta) if (i >= 0 && i < n && Number.isFinite(v) && v >= 0) { somas[i] += v; contagens[i]++; } }
  }
  if (voltas < 4 || !contagens.some(Boolean)) throw new Error("Poucas voltas limpas para gerar a referência");
  const velocidades = Array.from(somas, (s, i) => contagens[i] ? s / contagens[i] : NaN);
  for (let i = 0; i < n; i++) if (!Number.isFinite(velocidades[i])) {
    let a = 1, b = 1; while (!contagens[(i - a + n) % n]) a++; while (!contagens[(i + b) % n]) b++;
    velocidades[i] = (velocidades[(i - a + n) % n] * b + velocidades[(i + b) % n] * a) / (a + b);
  }
  const filtrada = velocidades.map((_, i) => { let s = 0; for (let k = -3; k <= 3; k++) s += velocidades[(i + k + n) % n]; return Math.round(s / 7 * 10) / 10; });
  return { pista: "monaco", piloto: "leclerc", composto: "medio", sementes, voltas, pontos: n, assinatura: C.assinaturaPista(pts), assinaturaFisica: C.assinaturaFisica(), parametros: C.CALIBRACAO, velocidades: filtrada };
}
// Busca discreta e reproduzível; penaliza qualquer batida, saída ou volta não completada antes do tempo.
function buscar(sementes = [4321, 874, 13, 321]) {
  const resultados = [];
  for (const linha of [0.65, 0.75, 0.85, 1]) for (const ritmo of [0.95, 1, 1.03]) for (const z1 of [0.9, 0.93, 0.95, 1]) for (const z2 of [0.6, 0.65]) {
    const candidato = { linha, ritmo, olhar: 0.8, setores: [{ inicio: 0.20, fim: 0.25, ritmo: z1 }, { inicio: 0.82, fim: 0.91, ritmo: z2 }] };
    const ensaios = sementes.map((semente) => simular({ ...candidato, semente, voltas: 2 }));
    const voltas = ensaios.flatMap((r) => r.tempos);
    const falhas = ensaios.filter((r) => r.dnf || r.tempos.length !== 2).length + voltas.filter((v) => v.batidas || v.fora || v.recuperacoes).length;
    const media = voltas.length ? voltas.reduce((s, v) => s + v.tempo, 0) / voltas.length : Infinity;
    resultados.push({ candidato, falhas, media: +media.toFixed(3) });
  }
  return resultados.sort((a, b) => a.falhas - b.falhas || a.media - b.media);
}
function buscarGrampo(sementes = [4321, 874, 13, 321]) {
  return [0.75, 0.8, 0.85, 0.9, 0.95, 1].map((grampo) => {
    const candidato = { linha: 0.75, grampo, ritmo: 1, olhar: 0.8, setores: [{ inicio: 0.20, fim: 0.25, ritmo: 0.95 }, { inicio: 0.82, fim: 0.91, ritmo: 0.65 }] };
    const ensaios = sementes.map((semente) => simular({ ...candidato, semente, voltas: 2 }));
    const voltas = ensaios.flatMap((r) => r.tempos);
    const falhas = ensaios.filter((r) => r.dnf || r.tempos.length !== 2).length + voltas.filter((v) => v.batidas || v.fora || v.recuperacoes).length;
    const media = voltas.length ? voltas.reduce((s, v) => s + v.tempo, 0) / voltas.length : Infinity;
    return { candidato, falhas, media: +media.toFixed(3) };
  }).sort((a, b) => a.falhas - b.falhas || a.media - b.media);
}
if (require.main === module) {
  const args = process.argv.slice(2), sementes = args.filter((a) => /^\d+$/.test(a)).map(Number);
  if (args.includes("--buscar-grampo")) console.log(JSON.stringify(buscarGrampo(sementes.length ? sementes : undefined), null, 2));
  else if (args.includes("--buscar")) console.log(JSON.stringify(buscar(sementes.length ? sementes : undefined).slice(0, 10), null, 2));
  else if (args.includes("--gerar")) {
    const fs = require("node:fs"), path = require("node:path"), ref = gerarReferencia(sementes.length ? sementes : undefined);
    const arquivo = path.join(__dirname, "../public/corrida/monaco-calibracao.json"); fs.writeFileSync(arquivo, JSON.stringify(ref) + "\n");
    console.log(`Referência: ${ref.voltas} voltas limpas, ${ref.pontos} pontos, ${arquivo}`);
  } else {
    const experimento = args.includes("--calibrado");
    for (const semente of sementes.length ? sementes : [901, 902, 903, 904, 951, 952, 953, 954]) console.log(JSON.stringify(simular({ semente, voltas: 2, experimento })));
  }
}
module.exports = { simular, curvatura, gerarReferencia, buscar, buscarGrampo };
