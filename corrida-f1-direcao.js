// Direção de prova da F1. O servidor mantém bandeiras, DRS e penalidades; o navegador só as mostra.
const F1 = require('./public/corrida/f1-regras.js');
const T = require('./public/corrida/pistas.js');

const penalizar = (p, segundos, motivo, log) => {
  p.penal = (p.penal || 0) + segundos;
  p.acrescimo = (p.acrescimo || 0) + segundos;
  log(`⏱️ ${p.name}: ${motivo}, +${segundos} s.`);
};
// A largada queimada: o carro já anda (mais de 45 u/s) antes de as luzes apagarem (com 150 ms de folga para o relógio).
function largada(room, p, pos, agora, log) {
  if (p.queimou || !(agora < room.startAt - 150) || !(pos.v > 45)) return;
  p.queimou = true; penalizar(p, 5, 'queimou a largada', log);
}
// Uma batida (no muro ou em outro carro) de `forca` (F1.batida diz o nível): 1% de dano, sem punição de tempo (e cada 1% de
// dano tira 1% de desempenho: F1.efeitoDoDano). Com 100%, perda total (`dnf`: o piloto está fora). Quem decide é o servidor, que
// vê o contato na física do carro. O mesmo contato não conta duas vezes: cada par (o muro, ou cada outro carro: `chave`) só volta
// a valer depois de BATIDA_INTERVALO (4 s). Quem já recebeu a bandeirada (fantasma) não bate nem leva batida.
function bater(room, p, forca, tipo, agora, log, chave = tipo) {
  if (!room.direcao || room.phase !== 'race' || !p || p.dnf || p.finish != null || p.box || agora < room.startAt) return null;
  const cd = p.batidaPares || (p.batidaPares = {});
  if (agora < (cd[chave] || 0)) return null;
  const b = F1.batida(forca); if (!b) return null;
  cd[chave] = agora + F1.BATIDA_INTERVALO;
  for (const k of Object.keys(cd)) if (cd[k] < agora) delete cd[k]; // (só guarda os que ainda valem)
  p.batidaAte = cd[chave];
  p.batidas = (p.batidas || 0) + 1;
  p.dano = Math.min(100, Math.round(((p.dano || 0) + b.dano) * 10) / 10);
  p.ultimaBatida = { at: agora, nivel: b.nivel, dano: b.dano, tipo };
  const nivel = { leve: 'leve', media: 'média', forte: 'forte' }[b.nivel];
  log(`💥 ${p.name}: batida ${nivel} ${tipo === 'muro' ? 'no muro' : 'com outro carro'}; dano ${Math.round(p.dano)}% (sem punição de tempo).`);
  if (p.dano >= 100) { p.dnf = true; log(`💥 ${p.name}: perda total! O carro é retirado da pista e ${p.name} está fora da corrida.`); }
  return b;
}
const atravessou = (antes, depois, marco) => Number.isFinite(antes) && depois >= antes && Math.floor(depois - marco) > Math.floor(antes - marco);

function iniciar(room) {
  const t = T.PISTAS[room.config.pista], r = F1.sorteio(`direcao:${room.semente}`);
  const bots = room.order.filter((id) => room.players[id]?.bot);
  room.direcao = { amarelo: null, safety: null, avisoIncidente: false, avisoSafety: false,
    setorIncidente: Math.floor(r() * T.SECTORS), incidenteId: bots[Math.floor(r() * bots.length)] || null,
    scDura: 10000 + Math.floor(r() * 4000),
    pista: T.pontos(t, 6), ultimaAtualizacao: 0 };
  for (const id of room.order) Object.assign(room.players[id], { drsZona: -1, penal: 0, avisosLimite: 0,
    avisosAmarela: 0, avisosAzul: 0, dano: 0, dnf: false, batidas: 0, batidaAte: 0, batidaPares: {}, ultimaBatida: null, queimou: false, azul: false, fora: false, deteccoes: {}, ultrapassagem: null });
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
  if (!d.avisoSafety && pr >= 2.25 && room.config.voltas >= 4) {
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
    p.avisosLimite++;
    log(`⚫⚪ ${p.name}: limite de pista (${p.avisosLimite}/4).`);
    if (p.avisosLimite === 4) penalizar(p, 5, 'quatro saídas de pista', log);
  }
  p.fora = fora;
  const setor = Math.floor((((pr % 1) + 1) % 1) * T.SECTORS);
  const amarela = d.amarelo?.setor === setor && agora < d.amarelo.ate;
  const lider = ordem(room)[0], diferenca = lider && lider.id !== p.id ? progresso(lider, n) - pr : 0;
  const azul = diferenca > 0.94 && diferenca < 1 && ((1 - diferenca) * n * 6) / Math.max(1, lider.pos.v || 1) < 1.5;
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
module.exports = { iniciar, passo, registrar, publico, ordem, bater };
