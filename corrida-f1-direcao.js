// Direção de prova da F1. O servidor mantém bandeiras, DRS e penalidades; o navegador só as mostra.
const F1 = require('./public/corrida/f1-regras.js');
const T = require('./public/corrida/pistas.js');
const Contato = require('./corrida-contato.js'); // o impacto de cada par de carros (velocidades de ANTES do impulso)

const penalizar = (p, segundos, motivo, log) => {
  p.penal = (p.penal || 0) + segundos;
  p.acrescimo = (p.acrescimo || 0) + segundos;
  log(`⏱️ ${p.name}: ${motivo}, +${segundos} s.`);
};
// A largada queimada: o carro fica preso no grid até as luzes apagarem, então vale o pé: acelerar (por mais de GAS_QUEIMA_MS seguidos,
// medidos por corrida-humanos.js em `p.gasNasLuzes`) enquanto as luzes estão acesas. Quem anda antes (mais de 45 u/s, com 150 ms de
// folga para o relógio) também queimou.
const GAS_QUEIMA_MS = 250;
function largada(room, p, pos, agora, log) {
  if (p.queimou) return;
  const andou = agora < room.startAt - 150 && pos.v > 45, acelerou = !!room.luzes && (p.gasNasLuzes || 0) >= GAS_QUEIMA_MS;
  if (!andou && !acelerou) return;
  p.queimou = true; penalizar(p, 5, 'queimou a largada', log);
}
// ---------- as punições (escala em f1-regras.js: leve +3 s, média +6 s, grave stop-and-go de 8 s, reincidência, bandeira preta) ----------
const ROTULO = { leve: 'leve', media: 'média', grave: 'grave' };
// Stop-and-go: o piloto tem STOPGO_VOLTAS voltas para entrar no box, parar STOPGO_S s sem trocar pneu e voltar (o box faz a parada: sim.js,
// `amb.stopGo`; quem cumpre é `cumprirStopGo`). Se a punição cai na última volta, ou não sobra volta com box aberto, vira +20 s no tempo final.
// Sem cumprir em 3 voltas, bandeira preta. Uma visita cumpre o stop-and-go pendente de 8 segundos.
function stopGoRestante(p, voltas) { const sg = p.stopGo; return sg ? Math.max(0, Math.min(sg.ate, voltas) - (p.laps || 0)) : 0; }
function aplicarStopGo(room, p, motivo, log) {
  if (!F1.stopGoCabe(p.laps, room.config.voltas)) { penalizar(p, F1.STOPGO_CONVERSAO_S, `${motivo}: sem voltas para o stop-and-go`, log); return 'convertido'; }
  const sg = p.stopGo || (p.stopGo = { n: 0, s: 0, ate: (p.laps || 0) + F1.STOPGO_VOLTAS });
  sg.n++; sg.s = F1.STOPGO_S;
  const v = stopGoRestante(p, room.config.voltas);
  log(`🛑 ${p.name}: ${motivo}. Stop-and-go ${sg.s} s: cumpra em ${v} volta${v > 1 ? 's' : ''}.`);
  return 'stopgo';
}
function preta(room, p, motivo, log) {
  if (p.dsq) return false;
  p.dsq = true; p.dnf = true; p.stopGo = null;
  log(`🏴 ${p.name}: bandeira preta! Desclassificado (${motivo}).`);
  return true;
}
// O piloto entrou no box e cumpriu o stop-and-go
function cumprirStopGo(room, p, log) {
  const sg = p.stopGo; if (!sg) return false;
  p.stopGo = null; p.sgFeitos = (p.sgFeitos || 0) + 1; log(`✅ ${p.name} cumpriu o stop-and-go de ${sg.s} s.`); return true;
}
// A volta fechou (p.laps já subiu): sobrou stop-and-go sem voltas para cumprir, vira +20 s; passou do prazo de 3 voltas, bandeira preta.
// Devolve true se o piloto foi desclassificado (quem chama confere se a corrida acabou).
function voltaFechada(room, p, log) {
  const sg = p.stopGo; if (!sg || p.dsq) return false;
  if (!F1.stopGoCabe(p.laps, room.config.voltas)) {
    p.stopGo = null; penalizar(p, F1.STOPGO_CONVERSAO_S, 'stop-and-go não cumprido e sem voltas para cumprir', log); return false;
  }
  if ((p.laps || 0) >= sg.ate) return preta(room, p, `stop-and-go de ${sg.s} s não cumprido em ${F1.STOPGO_VOLTAS} voltas`, log);
  return false;
}
// Uma batida (no muro ou em outro carro) de `forca` (F1.batida diz o nível do dano). No muro: 1% de dano, sem punição de tempo (e cada 1%
// de dano tira 1% de desempenho: F1.efeitoDoDano). Com 100%, perda total (`dnf`: o piloto está fora). Quem decide é o servidor, que
// vê o contato na física do carro. O mesmo contato não conta duas vezes: cada par (o muro, ou cada outro carro: `chave`) só volta
// a valer depois de BATIDA_INTERVALO (4 s). Quem já recebeu a bandeirada (fantasma) não bate nem leva batida.
// Entre carros, a gravidade vem da velocidade de aproximação no impacto (`forca`, medida antes do impulso trocar as velocidades) e a
// culpa, do impacto guardado em corrida-contato.js: quem se aproximou claramente mais que o outro causou (a traseira, quem fecha a
// porta); sem culpado claro (lado a lado) ninguém é punido. O causador leva a punição e a maior parte do dano; o batido nunca é punido
// e quase não leva dano.
// Um carro DERRAPANDO antes do impacto (rodando, atravessado ou com guinada forte), pelo que o impacto guardou (as velocidades de antes do
// impulso): bater nele é infração leve, qualquer que seja a velocidade, porque ele não tinha como evitar. `idDoOutro`: o carro atingido.
const DERRAPA_ANGULO = 0.6, DERRAPA_GUINADA = 1.5, DERRAPA_V = 40; // rad entre o rumo e a velocidade; rad/s; u/s
function derrapando(imp, idDoOutro) {
  if (!imp || !imp.pre) return false;
  const q = imp.pre, ele = imp.de === idDoOutro, vx = ele ? q.vx : q.ovx, vy = ele ? q.vy : q.ovy, a = ele ? q.a : q.oa, r = ele ? q.r : q.orr;
  if (!Number.isFinite(vx) || !Number.isFinite(a)) return false;
  const v = Math.hypot(vx, vy);
  if (Math.abs(r || 0) > DERRAPA_GUINADA) return true;
  if (v < DERRAPA_V) return false;
  return Math.abs(Math.atan2(Math.sin(Math.atan2(vy, vx) - a), Math.cos(Math.atan2(vy, vx) - a))) > DERRAPA_ANGULO;
}
const FREADA_BRUSCA = 140; // u/s² (~3 g): o atingido freando mais que isto na frente do causador não conta como batida proposital
const DANO_CAUSADOR = { leve: 1, media: 2, grave: 3 }, DANO_BATIDO = { leve: 0, media: 0, grave: 0.5 };
function bater(room, p, forca, tipo, agora, log, chave = tipo) {
  if (!room.direcao || room.phase !== 'race' || !p || p.dnf || p.finish != null || p.box || agora < room.startAt) return null;
  const cd = p.batidaPares || (p.batidaPares = {});
  if (agora < (cd[chave] || 0)) return null;
  let b = F1.batida(forca), derrapou = false;
  const outro0 = tipo !== 'muro' && String(chave).startsWith('carro:') ? String(chave).slice(6) : null;
  if (outro0 && forca >= 5) { // bateu num carro que derrapava: infração leve mesmo em baixa velocidade, se o outro não foi o causador
    const i0 = Contato.impactoDe(room, p.id, outro0);
    if (derrapando(i0, outro0) && !(i0.culpado && i0.culpado !== p.id)) { derrapou = true; b = b || F1.batida(F1.BATIDA_MIN); }
  }
  if (!b) return null;
  cd[chave] = agora + F1.BATIDA_INTERVALO;
  for (const k of Object.keys(cd)) if (cd[k] < agora) delete cd[k]; // (só guarda os que ainda valem)
  p.batidaAte = cd[chave];
  p.batidas = (p.batidas || 0) + 1;
  const outroId = tipo !== 'muro' && String(chave).startsWith('carro:') ? String(chave).slice(6) : null;
  const imp = outroId ? Contato.impactoDe(room, p.id, outroId) : null;
  // a gravidade vem da VELOCIDADE RELATIVA no impacto (o causador menos o atingido, na direção do contato, medida antes do impulso): `imp.forca`
  const grav = outroId ? F1.gravidadeDaBatida(imp ? imp.forca : forca) || (derrapou ? 'leve' : null) : null;
  const culpa = !!(grav && imp && (imp.culpado === p.id || (derrapou && !imp.culpado))), batido = !!(grav && imp && imp.culpado && imp.culpado !== p.id);
  const dano = culpa ? DANO_CAUSADOR[grav] : batido ? DANO_BATIDO[grav] : b.dano;
  p.dano = Math.min(100, Math.round(((p.dano || 0) + dano) * 10) / 10);
  p.ultimaBatida = { at: agora, nivel: grav || b.nivel, dano, tipo, ...(culpa ? { culpa: true } : batido ? { batido: true } : {}) };
  const nivel = grav ? ROTULO[grav] : { leve: 'leve', media: 'média', forte: 'forte' }[b.nivel];
  log(`💥 ${p.name}: batida ${nivel} ${tipo === 'muro' ? 'no muro' : 'com outro carro'}; dano ${Math.round(p.dano)}%${culpa ? '' : batido ? ' (atingido: sem punição)' : ' (sem punição de tempo)'}.`);
  if (culpa) {
    p.causadas = (p.causadas || 0) + 1;
    const dec = F1.nivelDaPunicao(grav), motivo = `causou uma batida ${nivel}`;
    if (dec.nivel === 'leve') penalizar(p, F1.PUNICAO_LEVE_S, motivo, log);
    else if (dec.nivel === 'media') penalizar(p, F1.PUNICAO_MEDIA_S, motivo, log);
    else aplicarStopGo(room, p, motivo, log);
    // a desclassificação é por batidas PROPOSITAIS (culpa clara, diferença de velocidade média ou grave, atingido sem derrapar nem freiar forte)
    if (F1.batidaProposital({ gravidade: grav, culpado: imp && imp.culpado === p.id, atingidoDerrapava: derrapando(imp, outroId), atingidoFreava: ((imp && imp.freada && imp.freada[outroId]) || 0) > FREADA_BRUSCA })) {
      p.propositais = (p.propositais || 0) + 1;
      if (p.propositais >= F1.DSQ_PROPOSITAIS) preta(room, p, `${p.propositais} batidas propositais na corrida`, log);
      else if (p.propositais >= F1.AVISO_PROPOSITAIS) log(`⚠️ ${p.name}: ${p.propositais}/${F1.DSQ_PROPOSITAIS} batidas propositais. Com ${F1.DSQ_PROPOSITAIS}, bandeira preta.`);
    }
  }
  if (p.dano >= 100 && !p.dnf) { p.dnf = true; log(`💥 ${p.name}: perda total! O carro é retirado da pista e ${p.name} está fora da corrida.`); }
  return b;
}
const atravessou = (antes, depois, marco) => Number.isFinite(antes) && depois >= antes && Math.floor(depois - marco) > Math.floor(antes - marco);

function iniciar(room) {
  const t = T.PISTAS[room.config.pista], r = F1.sorteio(`direcao:${room.semente}`);
  const bots = room.order.filter((id) => room.players[id]?.bot);
  room.direcao = { amarelo: null, safety: null, avisoIncidente: false, avisoSafety: false,
    setorIncidente: Math.floor(r() * T.SECTORS), incidenteId: bots[Math.floor(r() * bots.length)] || null,
    scEm: room.config.voltas >= 4 && r() < 0.4 ? 1.25 + r() * Math.max(1, room.config.voltas - 3) : null,
    scDura: 10000 + Math.floor(r() * 4000),
    pista: T.pontos(t, 6), ultimaAtualizacao: 0 };
  for (const id of room.order) Object.assign(room.players[id], { drsZona: -1, penal: 0, avisosLimite: 0,
    avisosAmarela: 0, avisosAzul: 0, dano: 0, dnf: false, dsq: false, causadas: 0, propositais: 0, stopGo: null, batidas: 0, batidaAte: 0, batidaPares: {}, ultimaBatida: null, queimou: false, gasNasLuzes: 0, azul: false, fora: false, frenteAoSair: null, deteccoes: {}, ultrapassagem: null });
}
function progresso(p, n) { return Number.isFinite(p.pos?.prog) ? p.pos.prog / n : -1; }
function ordem(room) {
  const n = room.direcao.pista.length;
  return room.order.map((id) => room.players[id]).filter((p) => p && p.finish == null && !p.dnf && p.pos)
    .sort((a, b) => progresso(b, n) - progresso(a, n));
}
function passo(room, agora, log) {
  const d = room.direcao; if (!d || agora < room.startAt) return false;
  const n = d.pista.length, lider = ordem(room)[0], pr = lider ? progresso(lider, n) : 0;
  let mudou = false;
  if (!d.avisoIncidente && pr >= 1.15) {
    d.avisoIncidente = true; d.amarelo = { setor: d.setorIncidente, ate: agora + 9000 };
    const envolvido = room.players[d.incidenteId]; if (envolvido) envolvido.incidenteAte = agora + 5000;
    log(`🟡 Bandeira amarela no setor ${d.setorIncidente + 1}: ${envolvido ? `${envolvido.name} saiu da trajetória.` : 'detritos na pista.'}`); mudou = true;
  }
  if (d.amarelo && agora >= d.amarelo.ate) { d.amarelo = null; log('🟢 Pista liberada.'); mudou = true; }
  if (!d.avisoSafety && d.scEm != null && pr >= d.scEm) {
    d.avisoSafety = true; d.safety = { ate: agora + d.scDura, ordem: ordem(room).map((p) => p.id), prog: pr + 0.035 };
    d.amarelo = null; log('🚨 Safety car na pista. Mantenha a posição e reduza.'); mudou = true;
  }
  if (d.safety) {
    d.safety.prog = Math.max(d.safety.prog, pr + 0.025);
    if (agora >= d.safety.ate) { d.safety = null; log('🟢 Safety car recolhido. Relargada!'); mudou = true; }
  }
  if (agora - d.ultimaAtualizacao >= 1000) { d.ultimaAtualizacao = agora; mudou = true; }
  for (const p of ordem(room)) if (p.ultrapassagem && agora >= p.ultrapassagem.ate) {
    const ultrapassado = room.players[p.ultrapassagem.id];
    if (ultrapassado && progresso(p, n) > progresso(ultrapassado, n) + 0.002)
      penalizar(p, 5, 'não devolveu a posição sob bandeira', log);
    p.ultrapassagem = null; mudou = true;
  }
  return mudou;
}
function registrar(room, p, pos, agora, log) {
  const d = room.direcao; if (!d || !Number.isFinite(pos.prog) || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
  largada(room, p, pos, agora, log);
  const n = d.pista.length, t = T.PISTAS[room.config.pista], pr = pos.prog / n, anterior = Number.isFinite(p.progressoF1) ? p.progressoF1 : pr;
  const idx = ((Math.round(pos.prog) % n) + n) % n, pt = d.pista[idx];
  const lat = (pos.x - pt.x) * -pt.ty + (pos.y - pt.y) * pt.tx;
  // Um aviso por saída completa. O limite inclui a zebra e a largura inteira do carro.
  const fora = Math.abs(lat) > t.width / 2 + 13;
  if (fora && !p.fora && !p.box) {
    // Guarda apenas os carros próximos que estavam à frente ao sair da pista.
    p.frenteAoSair = room.order.map((id) => room.players[id]).filter((q) => q && q.id !== p.id && !q.dnf && q.finish == null && !q.box && q.pos && progresso(q, n) > pr && progresso(q, n) - pr < 0.02).map((q) => q.id);
    p.avisosLimite++;
    log(`⚫⚪ ${p.name}: limite de pista (${p.avisosLimite}/4).`);
    if (p.avisosLimite === 4) penalizar(p, 5, 'quatro saídas de pista', log);
  }
  if (!fora && p.fora && p.frenteAoSair && !p.box) {
    const ganhou = p.frenteAoSair.some((id) => { const q = room.players[id]; return q && !q.dnf && q.finish == null && !q.box && q.pos && pr > progresso(q, n) + 0.0005; });
    if (ganhou) penalizar(p, 5, 'ganhou posição fora da pista', log);
    p.frenteAoSair = null;
  }
  p.fora = fora;
  const setor = Math.floor((((pr % 1) + 1) % 1) * T.SECTORS);
  const amarela = d.amarelo?.setor === setor && agora < d.amarelo.ate;
  const lider = ordem(room)[0], diferenca = lider && lider.id !== p.id ? progresso(lider, n) - pr : 0;
  const distancia = lider && Number.isFinite(lider.pos.x) && Number.isFinite(lider.pos.y) ? Math.hypot(lider.pos.x - pos.x, lider.pos.y - pos.y) : Infinity;
  // A diferença de volta sozinha pode apontar para outro trecho próximo do traçado.
  // A folga de saída evita avisos repetidos quando a distância oscila no limite.
  const azul = diferenca > 0.94 && diferenca < 1 && distancia < (p.azul ? 150 : 90) && ((1 - diferenca) * n * 6) / Math.max(1, lider.pos.v || 1) < (p.azul ? 2.5 : 1.5);
  if (azul && !p.azul) {
    p.avisosAzul++;
    log(`🔵 ${p.name}: deixe o líder passar (${p.avisosAzul}/3).`);
    if (p.avisosAzul === 3) penalizar(p, 5, 'ignorou três bandeiras azuis', log);
  }
  p.azul = azul;
  for (let i = 0; i < (t.drs || []).length; i++) {
    const [deteccao] = t.drs[i];
    if (!atravessou(anterior, pr, deteccao)) continue;
    const frente = ordem(room).find((q) => q.id !== p.id && progresso(q, n) > pr && progresso(q, n) - pr < 0.08);
    const ultimo = frente?.deteccoes?.[i], intervalo = ultimo && ultimo.volta === Math.floor(pr - deteccao) ? (agora - ultimo.at) / 1000 : Infinity;
    p.deteccoes[i] = { at: agora, volta: Math.floor(pr - deteccao) };
    p.drsZona = F1.drsHabilitado({ volta: Math.floor(pr), intervalo, amarela, safety: !!d.safety }) ? i : -1;
  }
  if (amarela || d.safety) p.drsZona = -1;
  // Se passou um carro em regime de bandeira, tem cinco segundos para devolver o lugar.
  if ((amarela || d.safety) && !p.ultrapassagem) {
    const antes = room.order.map((id) => room.players[id]).find((q) => q && q.id !== p.id && !q.dnf && q.finish == null && q.pos &&
      progresso(q, n) > anterior + 0.002 && progresso(q, n) < pr - 0.002 && pr - progresso(q, n) < 0.02);
    if (antes) { p.avisosAmarela++; p.ultrapassagem = { id: antes.id, ate: agora + 5000 }; log(`🟡 ${p.name}: devolva a posição para ${antes.name}.`); }
  }
  p.progressoF1 = Math.max(anterior, pr);
  p.pos = pos;
}
function publico(room) {
  const d = room.direcao; if (!d) return null;
  return { amarelo: d.amarelo, safety: d.safety ? { ate: d.safety.ate, prog: d.safety.prog } : null,
    limite: d.safety ? 0.54 : d.amarelo ? 0.82 : 1 };
}
module.exports = { iniciar, passo, registrar, publico, ordem, bater, aplicarStopGo, cumprirStopGo, voltaFechada, stopGoRestante, GAS_QUEIMA_MS };
