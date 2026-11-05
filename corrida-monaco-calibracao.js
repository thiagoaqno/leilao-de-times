// Protótipo de ar limpo em Mônaco, ajustado com a física do jogo para Leclerc, pneu médio novo.
// Valores escolhidos por busca offline com voltas limpas; não são um recorde ou ótimo global garantido.
const crypto = require("node:crypto"), fs = require("node:fs"), path = require("node:path");
function assinaturaFisica() {
  const h = crypto.createHash("sha256");
  for (const nome of ["public/corrida/sim.js", "public/corrida/dinamica.js", "public/corrida/f1-regras.js", "public/corrida/f1-equipes.js", "corrida-robos.js", "corrida-estilos.js", "corrida-contato.js", "corrida-linha.js", "corrida-monaco-calibracao.js"]) h.update(nome).update(fs.readFileSync(path.join(__dirname, nome), "utf8").replace(/\r\n/g, "\n"));
  return h.digest("hex");
}
function assinaturaPista(pts) {
  const t = require("./public/corrida/pistas.js").PISTAS.monaco, arredondar = (v) => Math.round(v * 1000) / 1000;
  // O arredondamento evita diferenças mínimas de ponto flutuante entre Windows e Linux.
  return crypto.createHash("sha256").update(JSON.stringify(t)).update(JSON.stringify(pts.map((p) => [p.x, p.y, p.h, p.tx, p.ty].map(arredondar)))).digest("hex");
}
const REFERENCIA = require("./public/corrida/monaco-calibracao.json");
const CALIBRACAO = Object.freeze({ piloto: "leclerc", pista: "monaco", montagem: "5-3-3-3-2-3", linha: 0.75, grampo: 1, olhar: 0.8,
  zonas: Object.freeze([{ inicio: 0.20, fim: 0.25, ritmo: 0.95 }, { inicio: 0.82, fim: 0.91, ritmo: 0.65 }]) });
const validade = new WeakMap();
const fisicaValida = REFERENCIA.assinaturaFisica === assinaturaFisica() && JSON.stringify(REFERENCIA.parametros) === JSON.stringify(CALIBRACAO);
function validaPara(pts) {
  if (!fisicaValida || !Array.isArray(pts) || pts.length !== REFERENCIA.pontos) return false;
  if (!validade.has(pts)) validade.set(pts, assinaturaPista(pts) === REFERENCIA.assinatura);
  return validade.get(pts);
}
function pesoDaLinha(fracao) {
  const suave = (v) => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
  const peso = suave((fracao - 0.27) / 0.05) * (1 - suave((fracao - 0.40) / 0.05));
  return CALIBRACAO.linha + (CALIBRACAO.grampo - CALIBRACAO.linha) * peso;
}
function ritmoNaVolta(fracao) {
  return CALIBRACAO.zonas.reduce((v, z) => fracao >= z.inicio && fracao <= z.fim ? Math.min(v, z.ritmo) : v, 1);
}
function podeUsar(room, p, ia, outros, agora, F1) {
  const c = ia.sim, pneu = c?.pneu;
  if (!ia.perfilCalibrado || room.config.pista !== CALIBRACAO.pista || room.config.nivel !== "dificil" || p.piloto?.id !== CALIBRACAO.piloto || p.spec?.chave !== CALIBRACAO.montagem ||
      !c || p.dnf || p.quebrou || p.dano || p.azul || ia.erro || c.inst || c.box?.fase ||
      room.direcao?.safety || room.direcao?.amarelo || F1.climaEm(room.clima, agora).agua > 0 ||
      pneu?.composto !== "medio" || pneu.desgaste > 0.5) return false;
  // No tráfego, preserva integralmente o comportamento anterior. A calibração foi feita em pista livre.
  return !(outros || []).some((o) => o !== p.pos && Math.hypot(o.x - c.x, o.y - c.y) < 600);
}
module.exports = { CALIBRACAO, REFERENCIA, validaPara, pesoDaLinha, ritmoNaVolta, podeUsar, assinaturaFisica, assinaturaPista };
